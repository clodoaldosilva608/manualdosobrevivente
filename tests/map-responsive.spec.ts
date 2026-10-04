import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Locator, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

async function measure(width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
  const size = await page.evaluate(() => {
    const map = document.querySelector(".maplibregl-map") as HTMLElement | null;
    const canvas = document.querySelector(".maplibregl-canvas") as HTMLCanvasElement | null;
    return {
      mapW: map?.clientWidth ?? 0,
      mapH: map?.clientHeight ?? 0,
      canvasW: canvas?.clientWidth ?? 0,
      canvasH: canvas?.clientHeight ?? 0,
    };
  });
  return { page, context, size };
}

describe("responsividade do mapa", () => {
  it("preenche a tela em celular", async () => {
    const { context, size } = await measure(390, 844);
    expect(size.mapW).toBeGreaterThan(300);
    expect(size.mapH).toBeGreaterThan(400);
    expect(size.canvasW).toBeGreaterThan(300);
    expect(size.canvasH).toBeGreaterThan(400);
    await context.close();
  }, 120_000);

  it("acompanha o redimensionamento da janela", async () => {
    const { page, context, size } = await measure(1280, 900);
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
      const canvas = document.querySelector(".maplibregl-canvas") as HTMLCanvasElement | null;
      return { w: canvas?.clientWidth ?? 0, h: canvas?.clientHeight ?? 0 };
    });
    expect(after.w).toBeLessThan(size.canvasW);
    expect(after.w).toBeGreaterThan(400);
    expect(after.h).toBeGreaterThan(400);
    await context.close();
  }, 120_000);
});

describe("páginas sem estouro horizontal", () => {
  // Testes de UI pesada (mapa + SVG) podem oscilar sob carga paralela do CI.
  it.retry = 2;
  const routes = [
    "/",
    "/manual",
    "/manual/water-purification",
    "/inventory",
    "/sos",
    "/dashboard",
    "/offline",
    "/settings",
    "/login",
  ];

  for (const path of routes) {
    it(`${path} cabe em uma tela móvel estreita`, async () => {
      const context = await browser.newContext({ viewport: { width: 320, height: 700 } });
      const page = await context.newPage();
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
      await context.close();
    }, 120_000);
  }

  it("mantém os controles da bússola acessíveis no celular", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    // Dispensa o modal de boas-vindas, que abre por cima do HUD.
    const pular = page.getByRole("button", { name: "Pular configuração" });
    const modal = await pular
      .waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (modal) {
      await pular.click();
      await pular.waitFor({ state: "hidden" });
    }
    const mini = page.getByRole("button", { name: "Abrir bússola" });
    await mini.click();
    const full = page.getByRole("button", { name: "Ver bússola em tela cheia" });
    await full.waitFor({ state: "visible" });
    await page.waitForTimeout(400); // aguarda o painel assentar antes do clique
    const box = await full.boundingBox();
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
    await full.click();
    await page.getByRole("button", { name: "Reduzir bússola" }).waitFor({ state: "visible" });
    await context.close();
  }, 120_000);
});

describe("aba Camadas (folha inferior)", () => {
  it.retry = 2; // UI pesada (mapa + SVG) oscila sob carga paralela do CI

  /** Abre o mapa, dispensa o onboarding e abre a folha de Camadas. */
  async function abrirCamadas(width: number, height: number) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
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
    await page.locator('button[title="Camadas"]').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: "visible" });
    await page.waitForTimeout(650); // animação de entrada da folha (500 ms)
    return { context, page, dialog };
  }

  /** Confere que a última seção da folha fica dentro dos limites dela após rolar. */
  async function rolarAteOFim(page: Page, dialog: Locator) {
    const rolagem = dialog.locator("> div").last();
    const medidas = await rolagem.evaluate((el) => ({
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    }));
    // A aba tem conteúdo demais para caber — precisa ser rolável.
    expect(medidas.scrollH).toBeGreaterThan(medidas.clientH);
    await rolagem.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);
    const folha = await dialog.boundingBox();
    const ultima = await dialog.locator("section").last().boundingBox();
    expect(folha).not.toBeNull();
    expect(ultima).not.toBeNull();
    expect(ultima!.y).toBeGreaterThanOrEqual(folha!.y - 1);
    expect(ultima!.y + ultima!.height).toBeLessThanOrEqual(folha!.y + folha!.height + 1);
  }

  it("celular: cabe na tela, título visível e rola até o fim", async () => {
    const { context, page, dialog } = await abrirCamadas(390, 844);
    const folha = await dialog.boundingBox();
    expect(folha).not.toBeNull();
    expect(folha!.y).toBeGreaterThanOrEqual(0);
    expect(folha!.y + folha!.height).toBeLessThanOrEqual(844);
    await dialog.locator("h2").waitFor({ state: "visible" });
    await rolarAteOFim(page, dialog);
    await context.close();
  }, 120_000);

  it("celular estreito (320×700): cabe na tela e rola até o fim", async () => {
    const { context, page, dialog } = await abrirCamadas(320, 700);
    const folha = await dialog.boundingBox();
    expect(folha).not.toBeNull();
    expect(folha!.y).toBeGreaterThanOrEqual(0);
    expect(folha!.y + folha!.height).toBeLessThanOrEqual(700);
    await rolarAteOFim(page, dialog);
    await context.close();
  }, 120_000);

  it("desktop: cartão centralizado com largura limitada e rolagem", async () => {
    const { context, page, dialog } = await abrirCamadas(1440, 900);
    const folha = await dialog.boundingBox();
    expect(folha).not.toBeNull();
    // Cartão de largura limitada, centrado horizontalmente.
    expect(folha!.width).toBeLessThanOrEqual(576);
    const centroX = folha!.x + folha!.width / 2;
    expect(Math.abs(centroX - 720)).toBeLessThanOrEqual(8);
    expect(folha!.y).toBeGreaterThanOrEqual(0);
    expect(folha!.y + folha!.height).toBeLessThanOrEqual(900);
    await rolarAteOFim(page, dialog);
    await context.close();
  }, 120_000);
});
