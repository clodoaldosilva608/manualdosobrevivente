/**
 * ASSISTENTE IA + POP-UPS + APOIADORES — o orbe flutuante abre o chat, a
 * IA local responde sobrevivência sem rede, as habilidades executam no
 * mapa, e os cartões de crescimento aparecem no dashboard (com override
 * de teste para os tempos). /colaboradores mostra o mural dos 78.
 *
 * Padrão do projeto: visibilidade via locator.waitFor (expect do Vitest
 * não tem os matchers do @playwright/test).
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

/** Abre o mapa com overrides de teste: tempos curtos dos pop-ups. */
async function abrirMapa(browser: Browser, viewport = { width: 1280, height: 800 }): Promise<Page> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem(
      "manual:popups-teste",
      JSON.stringify({ primeiro_segundos: 3, intervalo_segundos: 3 }),
    );
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  await page.waitForTimeout(1_500);
  return page;
}

describe("Assistente IA flutuante", () => {
  it(
    "orbe minimizado abre o chat e a IA local responde offline",
    { timeout: 120_000 },
    async () => {
      const page = await abrirMapa(browser);
      const orbe = page.locator('[data-test="assistente-orbe"]');
      await orbe.waitFor({ state: "visible", timeout: 20_000 });
      // indicador "IA local" no orbe
      await orbe.filter({ hasText: "IA local" }).waitFor({ state: "visible", timeout: 10_000 });
      await orbe.click();
      const painel = page.locator('[data-test="assistente-painel"]');
      await painel.waitFor({ state: "visible", timeout: 10_000 });

      // pergunta de sobrevivência (base local, sem chave e sem rede)
      await page.locator('[data-test="assistente-input"]').fill("como purificar água?");
      await page.locator('[data-test="assistente-enviar"]').click();
      await page
        .locator('[data-test="assistente-mensagens"]')
        .filter({ hasText: "Ferv" })
        .first()
        .waitFor({ state: "visible", timeout: 25_000 });

      // minimize
      await page.locator('[data-test="assistente-fechar"]').click();
      await orbe.waitFor({ state: "visible", timeout: 10_000 });
      await page.context().close();
    },
  );

  it("executa habilidade no mapa: 'ative o radar de chuva'", { timeout: 120_000 }, async () => {
    const page = await abrirMapa(browser);
    const orbe = page.locator('[data-test="assistente-orbe"]');
    await orbe.waitFor({ state: "visible", timeout: 20_000 });
    await orbe.click();
    await page.locator('[data-test="assistente-input"]').fill("ative o radar de chuva");
    await page.locator('[data-test="assistente-enviar"]').click();
    await page
      .locator('[data-test="assistente-mensagens"]')
      .filter({ hasText: "ativada" })
      .first()
      .waitFor({ state: "visible", timeout: 25_000 });
    await page.context().close();
  });
});

describe("Pop-ups de crescimento no dashboard do mapa", () => {
  it(
    "primeiro cartão entra após o override de 3 s e alterna os tipos",
    { timeout: 150_000 },
    async () => {
      const page = await abrirMapa(browser);
      // social não tem URL configurada no teste → o primeiro disponível é apoiar
      const cartao = page.locator('[data-test^="popup-"]').first();
      await cartao.waitFor({ state: "visible", timeout: 40_000 });
      const dataTest = await cartao.getAttribute("data-test");
      expect(["popup-apoiar", "popup-compartilhar"]).toContain(dataTest);
      // dispensa e aguarda o próximo (intervalo de 3 s)
      await cartao.getByRole("button", { name: "Fechar" }).click();
      const proximo = page.locator('[data-test^="popup-"]').first();
      await proximo.waitFor({ state: "visible", timeout: 40_000 });
      const proximoTipo = await proximo.getAttribute("data-test");
      expect(proximoTipo).not.toBe(dataTest);
      await page.context().close();
    },
  );

  it("'não mostrar novamente' silencia o cartão para sempre", { timeout: 150_000 }, async () => {
    const page = await abrirMapa(browser);
    const cartao = page.locator('[data-test^="popup-"]').first();
    await cartao.waitFor({ state: "visible", timeout: 40_000 });
    const silenciado = (await cartao.getAttribute("data-test")) ?? "";
    await cartao.getByText("Não mostrar novamente").click();
    // aguarda mais que o intervalo: o silenciado NÃO volta nesta sessão
    await page.waitForTimeout(4_000);
    const tipo = await page
      .locator('[data-test^="popup-"]')
      .first()
      .getAttribute("data-test")
      .catch(() => null);
    if (tipo) expect(tipo).not.toBe(silenciado);
    await page.context().close();
  });
});

describe("Mural dos apoiadores", () => {
  it("/colaboradores lista o mural em ordem não alfabética", { timeout: 90_000 }, async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/colaboradores`, { waitUntil: "domcontentloaded" });
    const mural = page.locator('[data-test="colaboradores-apoiadores"]');
    await mural.waitFor({ state: "visible", timeout: 30_000 });
    const chips = mural.locator("span.rounded-full");
    await chips.first().waitFor({ state: "visible", timeout: 20_000 });
    const total = await chips.count();
    expect(total).toBeGreaterThanOrEqual(70);
    const nomes = await chips.allInnerTexts();
    // a ordem do mural NÃO é alfabética (decisão do dono do projeto)
    const soNome = nomes.map((n) => n.replace("◆", "").trim());
    expect(soNome.slice(0, 10)).not.toEqual(
      [...soNome.slice(0, 10)].sort((a, b) => a.localeCompare(b)),
    );
    await context.close();
  });
});
