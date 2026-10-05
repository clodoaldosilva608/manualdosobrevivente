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

/** Abre o mapa em celular e dispensa o onboarding se ele aparecer. */
async function abrirMapaMobile(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
  await page.waitForTimeout(2_000);
  return page;
}

describe("Redline do boletim (barra inferior)", () => {
  it.retry = 2;

  it("letreiro fixo no rodapé com bússola, tempo, astros, mar e hemisfério", async () => {
    const page = await abrirMapaMobile(browser);
    const redline = page.locator('[data-test="redline"]');
    await redline.waitFor({ state: "visible", timeout: 15_000 });

    // Todas as seções do boletim + bússola passam no letreiro.
    for (const trecho of [
      "RUMO VERDADEIRO",
      "RUMO MAGNÉTICO",
      "DECLINAÇÃO",
      "CORREÇÃO DO SENSOR",
      "AZIMUTE P/ WAYPOINT",
      "TEMPERATURA",
      "VENTO",
      "SOL",
      "LUA",
      "CRUZEIRO DO SUL",
      "SENTIDO DO MAR",
      "NÍVEL DO MAR",
      "HEMISFÉRIO",
    ]) {
      expect(await redline.innerText()).toContain(trecho);
    }

    // Fica colado acima da barra inferior (não cobre o mapa inteiro).
    const caixa = await redline.boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.height).toBeLessThan(60);

    // A rolagem é animada (dois trilhos para o loop infinito).
    expect(await redline.locator(".redline-track").count()).toBe(2);
    await page.context().close();
  }, 180_000);

  it("toque pausa o letreiro e mostra o indicador", async () => {
    const page = await abrirMapaMobile(browser);
    const redline = page.locator('[data-test="redline"]');
    await redline.waitFor({ state: "visible", timeout: 15_000 });
    await redline.click();
    await page.locator(".redline-pausa-indicador").waitFor({ state: "visible", timeout: 5_000 });
    await redline.click();
    await page.locator(".redline-pausa-indicador").waitFor({ state: "hidden", timeout: 5_000 });
    await page.context().close();
  }, 120_000);

  it("o toggle da folha de camadas esconde e traz de volta a redline", async () => {
    const page = await abrirMapaMobile(browser);
    const redline = page.locator('[data-test="redline"]');
    await redline.waitFor({ state: "visible", timeout: 15_000 });

    await page.locator('button[title="Camadas"]').click();
    const secao = page.locator('[data-test="tela-elementos"]');
    await secao.waitFor({ state: "visible", timeout: 10_000 });
    await secao.locator('button[aria-label="Ativar elemento Redline do boletim"]').click();
    await page.keyboard.press("Escape");
    await redline.waitFor({ state: "detached", timeout: 10_000 });

    // Persistência: recarregado, continua oculto.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await page
      .locator('[data-test="redline"]')
      .waitFor({ state: "detached", timeout: 15_000 })
      .catch(async () => {
        // O onboarding pode reaparecer após o reload — dispensa e reconfere.
        const pular = page.getByRole("button", { name: "Pular configuração" });
        if (await pular.isVisible().catch(() => false)) {
          await pular.click();
        }
        await page.locator('[data-test="redline"]').waitFor({ state: "detached", timeout: 10_000 });
      });

    // Restaurar tudo devolve o letreiro.
    await page.locator('button[title="Camadas"]').click();
    await page.locator('[data-test="tela-restaurar"]').click();
    await page.keyboard.press("Escape");
    await page.locator('[data-test="redline"]').waitFor({ state: "visible", timeout: 10_000 });
    await page.context().close();
  }, 180_000);
});
