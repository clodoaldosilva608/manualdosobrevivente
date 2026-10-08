/**
 * E2E das camadas de clima SEM CHAVE (Open-Meteo): vento em partículas
 * (canvas sobre o mapa) e temperatura em pontos coloridos (fonte GeoJSON).
 *
 * Substitui o E2E do OpenWeatherMap — as duas camadas agora são keyless:
 * o alternador liga direto, sem toast de chave.
 *
 * Este projeto roda Playwright sobre o expect do Vitest (sem matchers
 * @playwright/test) — use waitFor/waitForFunction + expect().
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

async function abrirMapaMobile() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
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
  await page.waitForFunction(
    () => !!(window as unknown as { __tacticalMap?: unknown }).__tacticalMap,
    undefined,
    { timeout: 20_000 },
  );
  return page;
}

async function alternador(page: Awaited<ReturnType<typeof abrirMapaMobile>>, nome: string) {
  await page.locator('button[title="Camadas"]').click();
  const alvo = page.getByRole("switch", { name: `Ativar camada ${nome}` });
  await alvo.waitFor({ state: "visible", timeout: 10_000 });
  return alvo;
}

describe("Vento e temperatura ao vivo (Open-Meteo, sem chave)", () => {
  it("liga o vento: canvas de partículas nasce e desliga: sai", async () => {
    const page = await abrirMapaMobile();

    const alvoVento = await alternador(page, "Vento (superfície)");
    expect(await alvoVento.count()).toBe(1);
    await alvoVento.click();
    await page.locator('[data-test="intel-vento-canvas"]').waitFor({
      state: "visible",
      timeout: 10_000,
    });

    await alvoVento.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-test="intel-vento-canvas"]'),
      undefined,
      { timeout: 5_000 },
    );
    await page.context().close();
  });

  it("liga a temperatura: fonte intel-temperatura nasce no estilo", async () => {
    const page = await abrirMapaMobile();

    const alvoTemp = await alternador(page, "Temperatura (superfície)");
    await alvoTemp.click();

    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getSource(id: string): unknown };
          }
        ).__tacticalMap?.getSource("intel-temperatura"),
      undefined,
      { timeout: 15_000 },
    );

    await alvoTemp.click();
    await page.waitForFunction(
      () =>
        !(
          window as unknown as {
            __tacticalMap?: { getSource(id: string): unknown };
          }
        ).__tacticalMap?.getSource("intel-temperatura"),
      undefined,
      { timeout: 5_000 },
    );
    await page.context().close();
  });
});
