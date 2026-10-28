import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { randomBytes, createHash, createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { parse } from "cookie";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { Server } from "socket.io";
import { z } from "zod";
import nodemailer from "nodemailer";
import path from "node:path";

export const db = new PrismaClient();
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export function parseCookies(str: string): Record<string, string | undefined> {
  if (!str) return {};
  try {
    if (typeof parse === "function") return parse(str);
  } catch {}
  const res: Record<string, string> = {};
  for (const pair of str.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    res[key] = decodeURIComponent(val);
  }
  return res;
}

const reserved = new Set([
  "admin",
  "support",
  "nexo",
  "root",
  "system",
  "moderator",
  "api",
  "suporte",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{2,23}$/)
  .refine((s) => !reserved.has(s), "Nome reservado");

const publicUser = {
  id: true,
  handle: true,
  name: true,
  avatar: true,
  photo: true,
  status: true,
} as const;

const origin =
  process.env.APP_ORIGIN ||
  process.env.APP_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "http://localhost:3000";

const production = process.env.NODE_ENV === "production";

export function isAllowedOrigin(reqOrigin?: string, host?: string) {
  if (!reqOrigin) return false;
  if (origin && reqOrigin === origin) return true;
  if (process.env.APP_URL && reqOrigin === process.env.APP_URL) return true;
  if (
    reqOrigin.includes("localhost") ||
    reqOrigin.includes("127.0.0.1") ||
    reqOrigin.includes("run.app") ||
    reqOrigin.includes("google")
  ) {
    return true;
  }
  if (host && reqOrigin.includes(host)) return true;
  return false;
}

export async function createApp(options: { isDev?: boolean } = {}) {
  const app = express();
  const http = createServer(app);
  const io = new Server(http, {
    cors: {
      origin: (requestOrigin, callback) => {
        if (!requestOrigin || isAllowedOrigin(requestOrigin)) {
          callback(null, true);
        } else {
          callback(new Error("Origem inválida"));
        }
      },
      credentials: true,
    },
    maxHttpBufferSize: 65536,
  });

  app.set("trust proxy", 1);
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: "512kb" }), cookieParser());
  app.use("/api", rateLimit({ windowMs: 60000, limit: 240 }));

  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (!req.headers.origin || !isAllowedOrigin(req.headers.origin, req.headers.host)) {
        return res.status(403).json({ error: "Origem inválida" });
      }
    }
    if (
      production &&
      !req.secure &&
      req.headers["x-forwarded-proto"] !== "https" &&
      !req.headers.host?.includes("localhost")
    ) {
      return res.status(400).json({ error: "HTTPS obrigatório" });
    }
    next();
  });

  const authRate = rateLimit({ windowMs: 15 * 60000, limit: 60 });
  app.use("/api/auth", authRate);

  async function userFor(token?: string) {
    if (!token) return null;
    const s = await db.session.findUnique({
      where: { token: hash(token) },
      include: { user: true },
    });
    return s && s.expires > new Date() ? s.user : null;
  }

  const session = async (res: express.Response, id: string) => {
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        token: hash(token),
        userId: id,
        expires: new Date(Date.now() + 30 * 86400000),
      },
    });
    const isSecure = production || process.env.APP_URL?.startsWith("https");
    res.cookie("session", token, {
      httpOnly: true,
      secure: Boolean(isSecure),
      sameSite: isSecure ? "none" : "lax",
      maxAge: 30 * 86400000,
      path: "/",
    });
    res.setHeader("X-Session-Token", token);
    res.setHeader("Access-Control-Expose-Headers", "X-Session-Token");
    return token;
  };

  app.get("/api/health", async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  });

  app.get("/api/handles/:handle", async (req, res) => {
    const p = handleSchema.safeParse(req.params.handle);
    res.json({
      available:
        p.success && !(await db.user.findUnique({ where: { handle: p.data } })),
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    const p = z
      .object({
        handle: handleSchema,
        email: z.string().email().toLowerCase(),
        password: z.string().min(12).max(72),
        name: z.string().trim().min(1).max(50),
        avatar: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .parse(req.body);
    const u = await db.user.create({
      data: { ...p, password: await bcrypt.hash(p.password, 12) },
      select: publicUser,
    });
    const token = await session(res, u.id);
    res.status(201).json({ ...u, token });
  });

  app.post("/api/auth/login", async (req, res) => {
    const p = z
      .object({ email: z.string().email().toLowerCase(), password: z.string().max(72) })
      .parse(req.body);
    const u = await db.user.findUnique({ where: { email: p.email } });
    if (!u || !(await bcrypt.compare(p.password, u.password)))
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    const token = await session(res, u.id);
    res.json({ ok: true, token });
  });

  app.post("/api/auth/recover", async (req, res) => {
    const email = z.string().email().toLowerCase().parse(req.body.email);
    const u = await db.user.findUnique({ where: { email } });
    if (u && process.env.SMTP_URL) {
      const token = randomBytes(32).toString("hex");
      await db.reset.create({
        data: {
          token: hash(token),
          userId: u.id,
          expires: new Date(Date.now() + 1800000),
        },
      });
      await nodemailer
        .createTransport(process.env.SMTP_URL)
        .sendMail({
          from: process.env.MAIL_FROM,
          to: email,
          subject: "Recuperar sua conta Nexo",
          text: `Defina uma nova senha: ${origin}/?reset=${token}`,
        });
    }
    res.json({ message: "Se a conta existir, você receberá um e-mail." });
  });

  app.post("/api/auth/reset", async (req, res) => {
    const p = z
      .object({ token: z.string(), password: z.string().min(12).max(72) })
      .parse(req.body);
    const password = await bcrypt.hash(p.password, 12);
    await db.$transaction(async (tx) => {
      const r = await tx.reset.findUnique({ where: { token: hash(p.token) } });
      if (!r || r.expires < new Date())
        throw Error("Link inválido ou expirado");
      await tx.reset.delete({ where: { token: r.token } });
      await tx.user.update({ where: { id: r.userId }, data: { password } });
      await tx.session.deleteMany({ where: { userId: r.userId } });
    });
    res.json({ ok: true });
  });

  app.use("/api", async (req, res, next) => {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const token = req.cookies.session || bearer;
    const u = await userFor(token);
    if (!u) return res.status(401).json({ error: "Entre na sua conta" });
    res.locals.user = u;
    next();
  });

  app.get("/api/me", (_req, res) => {
    const { id, handle, name, avatar, photo, status } = res.locals.user;
    res.json({ id, handle, name, avatar, photo, status });
  });

  app.post("/api/logout", async (req, res) => {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const token = req.cookies.session || bearer;
    if (token) {
      await db.session.deleteMany({
        where: { token: hash(token) },
      });
    }
    io.in(res.locals.user.id).disconnectSockets(true);
    res.clearCookie("session").json({ ok: true });
  });

  app.patch("/api/me", async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(1).max(50).optional(),
        avatar: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        photo: z
          .string()
          .max(400000)
          .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
          .nullable()
          .optional(),
        status: z.enum(["online", "busy", "away"]).optional(),
      })
      .parse(req.body);
    res.json(
      await db.user.update({
        where: { id: res.locals.user.id },
        data,
        select: publicUser,
      }),
    );
    io.emit("refresh");
  });

  const blocked = async (a: string, b: string) =>
    !!(await db.relation.findFirst({
      where: {
        state: "blocked",
        OR: [
          { fromId: a, toId: b },
          { fromId: b, toId: a },
        ],
      },
    }));

  const friends = async (a: string, b: string) =>
    !(await blocked(a, b)) &&
    !!(await db.relation.findFirst({
      where: {
        state: "accepted",
        OR: [
          { fromId: a, toId: b },
          { fromId: b, toId: a },
        ],
      },
    }));

  app.get("/api/users", async (req, res) => {
    const q = String(req.query.q || "")
      .replace(/^@/, "")
      .toLowerCase()
      .slice(0, 24);
    const blocks = await db.relation.findMany({
      where: {
        state: "blocked",
        OR: [{ fromId: res.locals.user.id }, { toId: res.locals.user.id }],
      },
    });
    const excluded = blocks.flatMap((b) => [b.fromId, b.toId]);
    res.json(
      q.length > 1
        ? await db.user.findMany({
            where: {
              handle: { startsWith: q },
              id: { notIn: [res.locals.user.id, ...excluded] },
            },
            select: publicUser,
            take: 15,
          })
        : [],
    );
  });

  app.get("/api/relations", async (_req, res) => {
    const id = res.locals.user.id;
    const rows = await db.relation.findMany({
      where: { OR: [{ fromId: id }, { toId: id }] },
    });
    const result = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        user: await db.user.findUnique({
          where: { id: r.fromId === id ? r.toId : r.fromId },
          select: publicUser,
        }),
      })),
    );
    res.json(result.filter((r) => r.state !== "blocked" || r.fromId === id));
  });

  app.post("/api/relations", async (req, res) => {
    const { toId } = z.object({ toId: z.string().uuid() }).parse(req.body);
    const fromId = res.locals.user.id;
    if (
      toId === fromId ||
      !(await db.user.findUnique({ where: { id: toId } })) ||
      (await blocked(fromId, toId))
    )
      return res.status(403).json({ error: "Solicitação indisponível" });

    const existing = await db.relation.findFirst({
      where: {
        OR: [
          { fromId, toId },
          { fromId: toId, toId: fromId },
        ],
      },
    });
    if (existing)
      return res
        .status(409)
        .json({ error: "Já existe uma solicitação ou amizade" });
    res.json(
      await db.relation.create({ data: { fromId, toId, state: "pending" } }),
    );
    io.to(toId).emit("refresh");
  });

  app.patch("/api/relations/:id", async (req, res) => {
    const r = await db.relation.findUnique({ where: { id: req.params.id } });
    const id = res.locals.user.id;
    if (!r || r.toId !== id || r.state !== "pending")
      return res.sendStatus(403);
    res.json(
      await db.relation.update({
        where: { id: r.id },
        data: { state: "accepted" },
      }),
    );
    io.to(r.fromId).emit("refresh");
  });

  app.delete("/api/relations/:id", async (req, res) => {
    const r = await db.relation.findUnique({ where: { id: req.params.id } });
    if (
      !r ||
      ![r.fromId, r.toId].includes(res.locals.user.id) ||
      (r.state === "blocked" && r.fromId !== res.locals.user.id)
    )
      return res.sendStatus(403);
    await db.relation.delete({ where: { id: r.id } });
    io.to(r.fromId).to(r.toId).emit("refresh");
    res.json({ ok: true });
  });

  app.post("/api/block", async (req, res) => {
    const toId = z.string().uuid().parse(req.body.toId);
    const fromId = res.locals.user.id;
    if (toId === fromId) return res.sendStatus(400);
    await db.$transaction([
      db.relation.deleteMany({
        where: {
          OR: [
            { fromId, toId },
            { fromId: toId, toId: fromId },
          ],
          state: { not: "blocked" },
        },
      }),
      db.relation.upsert({
        where: { fromId_toId: { fromId, toId } },
        create: { fromId, toId, state: "blocked" },
        update: { state: "blocked" },
      }),
    ]);
    for (const c of active.values()) {
      if (
        [c.fromId, c.toId].includes(fromId) &&
        [c.fromId, c.toId].includes(toId)
      ) {
        await finish(c.id, "ended");
      }
    }
    io.to(fromId).to(toId).emit("refresh");
    res.json({ ok: true });
  });

  app.get("/api/messages/:id", async (req, res) => {
    const a = res.locals.user.id;
    const b = req.params.id;
    if (!(await friends(a, b))) return res.sendStatus(403);
    res.json(
      (
        await db.message.findMany({
          where: {
            OR: [
              { fromId: a, toId: b },
              { fromId: b, toId: a },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      ).reverse(),
    );
  });

  app.get("/api/calls", async (_req, res) => {
    res.json(
      await db.call.findMany({
        where: {
          OR: [{ fromId: res.locals.user.id }, { toId: res.locals.user.id }],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    );
  });

  app.get("/api/ice", (_req, res) => {
    const iceServers: any[] = [
      { urls: process.env.STUN_URL || "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
    if (process.env.TURN_SECRET && process.env.TURN_URL) {
      const username = `${Math.floor(Date.now() / 1000) + 3600}:${res.locals.user.id}`;
      iceServers.push({
        urls: process.env.TURN_URL.split(","),
        username,
        credential: createHmac("sha1", process.env.TURN_SECRET)
          .update(username)
          .digest("base64"),
      });
    }
    res.json({ iceServers });
  });

  const active = new Map<
    string,
    {
      id: string;
      fromId: string;
      toId: string;
      state: string;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  async function finish(id: string, state: string) {
    const c = active.get(id);
    if (!c) return;
    clearTimeout(c.timer);
    active.delete(id);
    await db.call.update({
      where: { id },
      data: { state, endedAt: new Date() },
    });
    io.to(c.fromId).to(c.toId).emit("call:end", { id, state });
  }

  await db.call.updateMany({
    where: { state: { in: ["ringing", "active"] } },
    data: { state: "interrupted", endedAt: new Date() },
  });

  io.use(async (s, next) => {
    try {
      const orig = s.handshake.headers.origin;
      if (orig) {
        if (!isAllowedOrigin(orig, s.handshake.headers.host))
          return next(Error("Origem inválida"));
      } else if (
        s.handshake.headers["sec-fetch-site"] &&
        s.handshake.headers["sec-fetch-site"] !== "same-origin"
      ) {
        return next(Error("Origem inválida"));
      }

      const cookieHeader = parseCookies(s.handshake.headers.cookie || "");
      const authHeader =
        (s.handshake.auth?.token as string) ||
        (s.handshake.headers.authorization as string)?.replace(/^Bearer\s+/i, "");
      const token = cookieHeader.session || authHeader;
      const u = await userFor(token);
      if (!u) return next(Error("Não autenticado"));
      s.data.user = u;
      next();
    } catch {
      next(Error("Falha na sessão"));
    }
  });

  let startQueue: Promise<unknown> = Promise.resolve();
  const serializeStart = (fn: () => Promise<any>) => {
    const result = startQueue.then(fn);
    startQueue = result.catch(() => {});
    return result;
  };

  const online = new Map<string, number>();
  const lastCall = new Map<string, number>();

  io.on("connection", (s) => {
    const uid = s.data.user.id;
    s.join(uid);
    online.set(uid, (online.get(uid) || 0) + 1);
    io.emit("presence", [...online.keys()]);

    let count = 0;
    const interval = setInterval(() => (count = 0), 10000);
    const expiry = setInterval(async () => {
      const cookieHeader = parseCookies(s.handshake.headers.cookie || "");
      const authHeader =
        (s.handshake.auth?.token as string) ||
        (s.handshake.headers.authorization as string)?.replace(/^Bearer\s+/i, "");
      const token = cookieHeader.session || authHeader;
      if (!(await userFor(token))) {
        s.disconnect(true);
      }
    }, 60000);

    const on = (event: string, fn: (p: any) => Promise<any>) =>
      s.on(event, async (p, ack) => {
        try {
          if (++count > 100) throw Error("Muitas ações. Aguarde.");
          const data = await fn(p);
          if (typeof ack === "function") ack({ ok: true, data });
        } catch (e) {
          if (typeof ack === "function")
            ack({ ok: false, error: e instanceof Error ? e.message : "Erro" });
        }
      });

    on("message", async (p) => {
      const { toId, text } = z
        .object({ toId: z.string().uuid(), text: z.string().trim().min(1).max(2000) })
        .parse(p);
      if (!(await friends(uid, toId)))
        throw Error("Adicione esta pessoa como amiga");
      const m = await db.message.create({ data: { fromId: uid, toId, text } });
      io.to(uid).to(toId).emit("message", m);
      return m;
    });

    on("typing", async (p) => {
      const toId = z.string().uuid().parse(p.toId);
      if (await friends(uid, toId)) io.to(toId).emit("typing", { fromId: uid });
    });

    on("call:start", async (p) =>
      serializeStart(async () => {
        const { toId, video } = z
          .object({ toId: z.string().uuid(), video: z.boolean() })
          .parse(p);
        if (Date.now() - (lastCall.get(uid) || 0) < 5000)
          throw Error("Aguarde antes de ligar novamente");
        lastCall.set(uid, Date.now());
        if (!(await friends(uid, toId))) throw Error("Chamada não permitida");
        if (!online.has(toId)) throw Error("Esta pessoa está offline");
        if (
          [...active.values()].some((c) =>
            [c.fromId, c.toId].some((x) => x === uid || x === toId),
          )
        )
          throw Error("Usuário ocupado");
        const c = await db.call.create({ data: { fromId: uid, toId, video } });
        active.set(c.id, {
          ...c,
          timer: setTimeout(() => void finish(c.id, "missed"), 30000),
        });
        io.to(toId).emit("call:incoming", {
          ...c,
          user: await db.user.findUnique({
            where: { id: uid },
            select: publicUser,
          }),
        });
        return c;
      }),
    );

    on("call:answer", async (p) => {
      const c = active.get(p.id);
      if (!c || c.toId !== uid || c.state !== "ringing")
        throw Error("Chamada expirada");
      if (!p.accept) {
        await finish(c.id, "declined");
        return;
      }
      clearTimeout(c.timer);
      c.state = "active";
      await db.call.update({
        where: { id: c.id },
        data: { state: "active", answeredAt: new Date() },
      });
      io.to(c.fromId).emit("call:accepted", { id: c.id });
    });

    on("call:end", async (p) => {
      const c = active.get(p.id);
      if (!c || ![c.fromId, c.toId].includes(uid))
        throw Error("Chamada inválida");
      await finish(c.id, "ended");
    });

    on("signal", async (p) => {
      const data = z
        .object({
          id: z.string().uuid(),
          description: z
            .object({
              type: z.enum(["offer", "answer"]),
              sdp: z.string().max(60000),
            })
            .optional(),
          candidate: z.any().optional(),
          screen: z.boolean().optional(),
        })
        .parse(p);
      const c = active.get(data.id);
      if (!c || c.state !== "active" || ![c.fromId, c.toId].includes(uid))
        throw Error("Sala não autorizada");
      io.to(c.fromId === uid ? c.toId : c.fromId).emit("signal", data);
    });

    on("call:resume", async () => {
      const c = [...active.values()].find((c) =>
        [c.fromId, c.toId].includes(uid),
      );
      if (c) {
        io.to(c.fromId)
          .to(c.toId)
          .emit("call:reconnect", { id: c.id, initiator: c.fromId });
        return { id: c.id };
      }
    });

    s.on("disconnect", () => {
      clearInterval(interval);
      clearInterval(expiry);
      const n = (online.get(uid) || 1) - 1;
      if (n) online.set(uid, n);
      else {
        online.delete(uid);
        setTimeout(() => {
          if (!online.has(uid))
            for (const c of active.values())
              if ([c.fromId, c.toId].includes(uid))
                void finish(c.id, "disconnected");
        }, 20000);
      }
      io.emit("presence", [...online.keys()]);
    });
  });

  if (!options.isDev) {
    app.use(express.static(path.resolve("dist")));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.resolve("dist/index.html")),
    );
  }

  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(
          err.code === "P2002" ? 409 : err instanceof z.ZodError ? 400 : 500,
        )
        .json({
          error:
            err.code === "P2002"
              ? "Este @ ou e-mail já está em uso"
              : err instanceof z.ZodError
                ? "Confira os campos informados"
                : err.message || "Não foi possível concluir a operação",
        });
    },
  );

  return {
    app,
    http,
    io,
    close: async () => {
      for (const c of active.values()) clearTimeout(c.timer);
      io.close();
      http.close();
      await db.$disconnect();
    },
  };
}
