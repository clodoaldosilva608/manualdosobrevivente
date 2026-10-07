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

async function novaPagina(): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  return context.newPage();
}

async function dispensarOnboarding(page: Page) {
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
}

const classeModoNoturno = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains("modo-noturno"));

describe("Modo noturno", () => {
  it("liga, mostra controles, persiste ao recarregar e desliga em Ajustes", async () => {
    const page = await novaPagina();
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    await dispensarOnboarding(page);
    await page.waitForTimeout(1_200);

    expect(await classeModoNoturno(page)).toBe(false);

    // Liga a visão noturna
    await page.getByRole("button", { name: "Visão noturna" }).click();
    await page.waitForTimeout(600);
    expect(await classeModoNoturno(page)).toBe(true);
    await page.waitForSelector('[data-test="noturno-vermelho"]', { timeout: 6_000 });
    expect(await page.locator('[data-test="noturno-escurecer"]').count()).toBe(1);
    // Overlays criados
    const overlay = await page.evaluate(() => ({
      vermelho: !!document.getElementById("tgis-noturno-vermelho"),
      dimmer: !!document.getElementById("tgis-noturno-dimmer"),
    }));
    expect(overlay.vermelho).toBe(true);
    expect(overlay.dimmer).toBe(true);

    // Persiste ao recarregar (espelho pré-hidratação + prefs)
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    expect(await classeModoNoturno(page)).toBe(true);

    // Desliga
    await page.getByRole("button", { name: "Desligado" }).click();
    await page.waitForTimeout(600);
    expect(await classeModoNoturno(page)).toBe(false);
    await page.context().close();
  }, 60_000);

  it("alterna pelo item Modo noturno do menu hambúrguer", async () => {
    const page = await novaPagina();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await dispensarOnboarding(page);
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await page.waitForTimeout(1_500);

    await page.locator('[data-test="btn-menu-app"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('[data-test="menu-item-noturno"]').click();
    await page.waitForTimeout(600);
    expect(await classeModoNoturno(page)).toBe(true);

    // Desliga pelo mesmo item
    await page.locator('[data-test="btn-menu-app"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('[data-test="menu-item-noturno"]').click();
    await page.waitForTimeout(600);
    expect(await classeModoNoturno(page)).toBe(false);
    await page.context().close();
  }, 60_000);
});

describe("Guia de Rota", () => {
  it("abre a folha pelo menu, mostra o estado vazio e alterna a gravação", async () => {
    const page = await novaPagina();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await dispensarOnboarding(page);
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await page.waitForTimeout(1_500);

    await page.locator('[data-test="btn-menu-app"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('[data-test="menu-item-rota"]').click();
    await page.waitForSelector('[data-test="painel-rota"]', { timeout: 6_000 });
    await page.waitForSelector("text=GUIA DE ROTA", { timeout: 6_000 });

    // Sem GPS no teste: botão de posição atual desabilitado, navegação também
    expect(await page.locator('[data-test="rota-add-posicao"]').isDisabled()).toBe(true);
    expect(await page.locator('[data-test="rota-iniciar"]').isDisabled()).toBe(true);

    // Alternar gravação de trilha
    const gravar = page.locator('[data-test="trilha-gravar"]');
    await gravar.click();
    await page.waitForSelector("text=Parar gravação", { timeout: 6_000 });
    await gravar.click();
    await page.waitForSelector("text=/Gravar trilha/", { timeout: 6_000 });
    await page.context().close();
  }, 60_000);

  it("o menu geral abre a folha do guia de rota", async () => {
    const page = await novaPagina();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await dispensarOnboarding(page);
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await page.waitForTimeout(1_500);

    await page.locator('[data-test="btn-menu-app"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('[data-test="menu-item-rota"]').click();
    await page.waitForSelector('[data-test="painel-rota"]', { timeout: 6_000 });
    await page.waitForSelector("text=GUIA DE ROTA", { timeout: 6_000 });
    await page.context().close();
  }, 60_000);
});
