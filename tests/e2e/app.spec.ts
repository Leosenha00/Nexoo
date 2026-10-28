import { test, expect, Page } from "@playwright/test";
const password = "browser-test-password";
async function register(p: Page, handle: string) {
  await p.goto("/");
  await p.getByLabel("Como podemos chamar você?").fill(handle);
  await p.getByPlaceholder("seunome").fill(handle);
  await p.getByLabel("E-mail", { exact: true }).fill(handle + "@example.com");
  await p.getByLabel("Senha", { exact: true }).fill(password);
  await expect(p.getByText("@" + handle + " está disponível")).toBeVisible();
  await p.getByRole("button", { name: "Criar meu perfil" }).click();
  await expect(
    p.getByRole("heading", { name: "Perto de quem importa." }),
  ).toBeVisible();
}
test("duas sessões: identidade, amizade, chat, voz/vídeo, tela, fullscreen e reconexão", async ({
  browser,
}) => {
  const ca = await browser.newContext({
      permissions: ["microphone", "camera"],
    }),
    cb = await browser.newContext({ permissions: ["microphone", "camera"] });
  const a = await ca.newPage(),
    b = await cb.newPage();
  const suffix = Date.now().toString(),
    ha = "alice" + suffix,
    hb = "bob" + suffix;
  await register(a, ha);
  await register(b, hb);
  await a.reload();
  await expect(
    a.getByRole("heading", { name: "Perto de quem importa." }),
  ).toBeVisible();
  await a
    .getByRole("button", { name: "Adicionar amigo", exact: true })
    .first()
    .click();
  await a.getByLabel("Buscar por @").fill(hb);
  await a.getByRole("button", { name: "Adicionar", exact: true }).click();
  await b.getByRole("button", { name: /Solicitações/ }).click();
  await b.getByTitle("Aceitar solicitação").click();
  await a.getByRole("button", { name: /^Todos/ }).click();
  await a.getByTitle("Mensagem").click();
  await a
    .getByLabel("Mensagem", { exact: true })
    .fill("Olá, esta mensagem é persistente.");
  await a.getByLabel("Enviar mensagem").click();
  await b.getByRole("button", { name: /^Todos/ }).click();
  await b.getByTitle("Mensagem").click();
  await expect(b.getByText("Olá, esta mensagem é persistente.")).toBeVisible();
  await a.getByRole("button", { name: "Vídeo", exact: true }).click();
  await expect(
    b.getByRole("dialog", { name: "Chamada recebida" }),
  ).toBeVisible();
  await b.getByRole("button", { name: "Atender", exact: true }).click();
  await expect(a.getByText("Conexão estabelecida")).toBeVisible({
    timeout: 20000,
  });
  await expect(b.getByText("Conexão estabelecida")).toBeVisible({
    timeout: 20000,
  });
  await expect
    .poll(() =>
      b.evaluate(() =>
        [...document.querySelectorAll("video")].some((v) => v.videoWidth > 0),
      ),
    )
    .toBe(true);
  await a.getByLabel("Microfone", { exact: true }).click();
  await expect(a.getByLabel("Microfone", { exact: true })).toHaveClass(
    /disabled-control/,
  );
  await a.getByLabel("Microfone", { exact: true }).click();
  await a.getByLabel("Câmera", { exact: true }).click();
  await a.getByLabel("Câmera", { exact: true }).click();
  await a.getByLabel("Compartilhar tela", { exact: true }).click();
  await expect(a.getByText("Você está compartilhando a tela")).toBeVisible({
    timeout: 15000,
  });
  await expect(b.getByText(ha + " está compartilhando")).toBeVisible();
  await b.getByLabel("Tela inteira", { exact: true }).click();
  await expect
    .poll(() => b.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await b.evaluate(() => document.exitFullscreen());
  await a.getByLabel("Parar compartilhamento").click();
  await expect(a.getByText("Você está compartilhando a tela")).toHaveCount(0);
  await expect(b.getByText("Conexão estabelecida")).toBeVisible();
  await ca.setOffline(true);
  await a.waitForTimeout(1500);
  await ca.setOffline(false);
  await expect(a.getByText("Conectado", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(a.getByText("Conexão estabelecida")).toBeVisible();
  await a.getByLabel("Encerrar chamada").click();
  await expect(b.getByLabel("Encerrar chamada")).toHaveCount(0);
  await b.getByRole("button", { name: "Voz", exact: true }).click();
  await a.getByRole("button", { name: "Recusar", exact: true }).click();
  await expect(b.getByLabel("Encerrar chamada")).toHaveCount(0);
  await ca.close();
  await cb.close();
});
test("mobile sem transbordamento e permissão negada", async ({ browser }) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    p = await c.newPage();
  await register(p, "mobile" + Date.now());
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await p.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await p.getByLabel("Editar perfil").click();
  await p.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Permissão negada", "NotAllowedError");
    };
  });
  await p.getByRole("button", { name: "Testar microfone" }).click();
  await expect(p.getByRole("alert")).toContainText("Permissão negada");
  await c.close();
});
test("captura da tela de boas-vindas", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/welcome.png", fullPage: true });
  await expect(
    page.getByRole("heading", { name: "Tudo começa com um @." }),
  ).toBeVisible();
});
