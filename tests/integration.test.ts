import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { io, Socket } from "socket.io-client";
import { createApp, db, handleSchema } from "../server/app";
let service: Awaited<ReturnType<typeof createApp>>,
  url: string,
  a: any,
  b: any,
  c: any;
const sockets: Socket[] = [];
const prefix = "t" + Date.now();
const origin = process.env.APP_ORIGIN || "http://localhost:5173";
const password = "a-secure-test-password";
const post = (path: string, cookie?: string) =>
  request(service.app)
    .post("/api" + path)
    .set("Origin", origin)
    .set("Cookie", cookie || "");
async function signup(name: string) {
  const r = await post("/auth/register").send({
    handle: prefix + name,
    name,
    email: prefix + name + "@example.com",
    password,
    avatar: "#a697ff",
  });
  expect(r.status).toBe(201);
  return { ...r.body, cookie: r.headers["set-cookie"][0].split(";")[0] };
}
async function connect(u: any) {
  const s = io(url, {
    extraHeaders: { Origin: origin, Cookie: u.cookie },
    transports: ["websocket"],
    forceNew: true,
  });
  sockets.push(s);
  await new Promise<void>((resolve, reject) => {
    s.once("connect", resolve);
    s.once("connect_error", reject);
  });
  return s;
}
const event = (s: Socket, e: string) =>
  new Promise<any>((resolve) => s.once(e, resolve));
const emit = (s: Socket, e: string, p: any) =>
  new Promise<any>((resolve, reject) =>
    s
      .timeout(4000)
      .emit(e, p, (err: any, r: any) => (err ? reject(err) : resolve(r))),
  );
beforeAll(async () => {
  service = await createApp();
  await new Promise<void>((r) => service.http.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + (service.http.address() as any).port;
  a = await signup("alice");
  b = await signup("bob");
  c = await signup("carol");
});
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await db.message.deleteMany({
    where: { fromId: { in: [a?.id, b?.id, c?.id].filter(Boolean) } },
  });
  await db.relation.deleteMany({
    where: { fromId: { in: [a?.id, b?.id, c?.id].filter(Boolean) } },
  });
  await db.call.deleteMany({
    where: { fromId: { in: [a?.id, b?.id, c?.id].filter(Boolean) } },
  });
  await db.user.deleteMany({ where: { handle: { startsWith: prefix } } });
  await service.close();
});
describe("identidade e proteção", () => {
  it("normaliza @, rejeita caracteres e nomes reservados", () => {
    expect(handleSchema.parse("AbC")).toBe("abc");
    for (const h of ["ADMIN", "a!b", "a", "123abc"])
      expect(handleSchema.safeParse(h).success).toBe(false);
  });
  it("rejeita @ duplicado sem diferenciar caixa", async () => {
    const r = await post("/auth/register").send({
      handle: a.handle.toUpperCase(),
      name: "Outro",
      email: prefix + "other@example.com",
      password,
      avatar: "#a697ff",
    });
    expect(r.status).toBe(409);
  });
  it("login, sessão persistente, senha inválida e disponibilidade", async () => {
    const r = await post("/auth/login").send({
      email: prefix + "alice@example.com",
      password,
    });
    expect(r.status).toBe(200);
    expect(r.headers["set-cookie"][0]).toContain("HttpOnly");
    const me = await request(service.app)
      .get("/api/me")
      .set("Cookie", a.cookie);
    expect(me.body.handle).toBe(a.handle);
    expect(me.body.password).toBeUndefined();
    expect(
      (
        await post("/auth/login").send({
          email: prefix + "alice@example.com",
          password: "wrong",
        })
      ).status,
    ).toBe(401);
    expect(
      (await request(service.app).get("/api/handles/" + a.handle)).body
        .available,
    ).toBe(false);
  });
  it("exige autenticação e origem válida", async () => {
    expect((await request(service.app).get("/api/relations")).status).toBe(401);
    expect(
      (
        await request(service.app)
          .post("/api/relations")
          .set("Cookie", a.cookie)
          .send({ toId: b.id })
      ).status,
    ).toBe(403);
  });
});
describe("amigos, mensagens e sinalização real", () => {
  let sa: Socket, sb: Socket, sc: Socket, relation: string;
  it("busca, solicita e aceita amizade", async () => {
    const r = await request(service.app)
      .get("/api/users?q=" + b.handle)
      .set("Cookie", a.cookie);
    expect(r.body[0].id).toBe(b.id);
    const friend = await post("/relations", a.cookie).send({ toId: b.id });
    expect(friend.status).toBe(200);
    relation = friend.body.id;
    expect(
      (
        await request(service.app)
          .patch("/api/relations/" + relation)
          .set("Origin", origin)
          .set("Cookie", a.cookie)
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await request(service.app)
          .patch("/api/relations/" + relation)
          .set("Origin", origin)
          .set("Cookie", b.cookie)
          .send({})
      ).status,
    ).toBe(200);
    sa = await connect(a);
    sb = await connect(b);
    sc = await connect(c);
  });
  it("persiste chat e emite digitação", async () => {
    const typing = event(sb, "typing");
    expect((await emit(sa, "typing", { toId: b.id })).ok).toBe(true);
    expect((await typing).fromId).toBe(a.id);
    const recv = event(sb, "message");
    expect(
      (await emit(sa, "message", { toId: b.id, text: "Olá de verdade" })).ok,
    ).toBe(true);
    expect((await recv).text).toBe("Olá de verdade");
    const history = await request(service.app)
      .get("/api/messages/" + a.id)
      .set("Cookie", b.cookie);
    expect(history.body.at(-1).text).toBe("Olá de verdade");
    expect(
      (await emit(sc, "message", { toId: a.id, text: "intruso" })).ok,
    ).toBe(false);
  });
  it("inicia, aceita, sinaliza, reconecta e encerra; impede intruso", async () => {
    const incoming = event(sb, "call:incoming");
    const r = await emit(sa, "call:start", { toId: b.id, video: true });
    expect(r.ok).toBe(true);
    const id = r.data.id;
    expect((await incoming).id).toBe(id);
    expect(
      (
        await emit(sc, "signal", {
          id,
          description: { type: "offer", sdp: "fake" },
        })
      ).ok,
    ).toBe(false);
    const accepted = event(sa, "call:accepted");
    expect((await emit(sb, "call:answer", { id, accept: true })).ok).toBe(true);
    await accepted;
    const signal = event(sb, "signal");
    expect(
      (
        await emit(sa, "signal", {
          id,
          description: { type: "offer", sdp: "test-sdp" },
        })
      ).ok,
    ).toBe(true);
    expect((await signal).description.sdp).toBe("test-sdp");
    const resume = await emit(sa, "call:resume", {});
    expect(resume.data.id).toBe(id);
    const ended = event(sb, "call:end");
    expect((await emit(sa, "call:end", { id })).ok).toBe(true);
    await ended;
    expect((await emit(sa, "signal", { id, candidate: {} })).ok).toBe(false);
  });
  it("recusa chamadas e bloqueia tentativas posteriores", async () => {
    const r = await emit(sb, "call:start", { toId: a.id, video: false });
    expect(r.ok).toBe(true);
    expect(
      (await emit(sa, "call:answer", { id: r.data.id, accept: false })).ok,
    ).toBe(true);
    expect(
      (await db.call.findUnique({ where: { id: r.data.id } }))?.state,
    ).toBe("declined");
    expect((await post("/block", a.cookie).send({ toId: b.id })).status).toBe(
      200,
    );
    expect(
      (await post("/relations", b.cookie).send({ toId: a.id })).status,
    ).toBe(403);
    expect(
      (await emit(sb, "message", { toId: a.id, text: "não deve enviar" })).ok,
    ).toBe(false);
  });
});
