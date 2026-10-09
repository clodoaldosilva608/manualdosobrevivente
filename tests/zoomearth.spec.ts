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

/** Espera até que a contagem de elementos com o data-test atinja o esperado. */
async function esperarContagem(page: Page, teste: string, esperado: number, timeout = 10_000) {
  await page.waitForFunction(
    ({ teste, esperado }) =>
      document.querySelectorAll(`[data-test="${teste}"]`).length === esperado,
    { teste, esperado },
    { timeout },
  );
}

describe("Satélite ao vivo (Zoom Earth), radar de chuva e mira central", () => {
  it("folha de camadas traz o radar, a seção satélite e liga o radar com chip e status", async () => {
    const page = await abrirMapaMobile(browser);

    // Seção "Satélite e clima ao vivo" com o botão do Zoom Earth.
    await page.locator('button[title="Camadas"]').click();
    const secaoSatelite = page.locator('[data-test="secao-satelite"]');
    await secaoSatelite.waitFor({ state: "visible", timeout: 10_000 });
    expect(await secaoSatelite.locator('[data-test="btn-zoom-earth"]').count()).toBe(1);

    // Camada "Radar de chuva" presente entre as inteligências (17 alternadores com vento/temperatura).
    const alternadores = page.getByRole("switch", { name: /^Ativar camada / });
    expect(await alternadores.count()).toBe(19);

    // Liga o radar: chip HUD nasce (mobile no fluxo superior, desktop oculto).
    await page.getByRole("switch", { name: "Ativar camada Radar de chuva" }).click();
    await page.keyboard.press("Escape");
    await esperarContagem(page, "chip-radar", 2, 15_000);

    // O chip mostra o estado de coleta (ativo com quadros ou conectando/erro).
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-test="radar-quadro"]');
        return !!el && el.textContent!.trim().length > 0;
      },
      undefined,
      { timeout: 15_000 },
    );

    // Recarrega: o radar continua ligado (persistência em intelVis).
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await esperarContagem(page, "chip-radar", 2, 20_000);

    // Desliga pela folha para não sujar o estado do operador.
    await page.locator('button[title="Camadas"]').click();
    await page.getByRole("switch", { name: "Ativar camada Radar de chuva" }).click();
    await page.keyboard.press("Escape");
    await esperarContagem(page, "chip-radar", 0);

    await page.context().close();
  }, 180_000);

  it("mira central liga pela seção Elementos da tela e persiste pós-reload", async () => {
    const page = await abrirMapaMobile(browser);

    await page.locator('button[title="Camadas"]').click();
    const secao = page.locator('[data-test="tela-elementos"]');
    await secao.waitFor({ state: "visible", timeout: 10_000 });

    // Liga a mira: a cruz nasce centralizada (elemento único, vale para
    // mobile e desktop — fica no centro do mapa).
    await secao.locator('button[aria-label="Ativar elemento Mira central"]').click();
    await page.keyboard.press("Escape");
    await esperarContagem(page, "mira-central", 1, 15_000);

    // Persistência: recarregado, a mira continua no centro.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await esperarContagem(page, "mira-central", 1, 20_000);

    // Desliga e restaura.
    await page.locator('button[title="Camadas"]').click();
    await page.locator('[data-test="tela-restaurar"]').click();
    await esperarContagem(page, "mira-central", 0);

    await page.context().close();
  }, 180_000);

  it("menu tático traz 'Satélite ao vivo' e a URL do Zoom Earth usa o centro atual", async () => {
    const page = await abrirMapaMobile(browser);

    // Captura o pop-up do deep link ao acionar o item do menu.
    await page.locator('[data-test="btn-menu-app"]:visible').click();
    await page.locator('[data-test="menu-app"]').waitFor({ state: "visible", timeout: 10_000 });
    const promessaPopup = page.waitForEvent("popup", { timeout: 15_000 });
    await page.getByRole("button", { name: /Satélite ao vivo/ }).click();
    const popup = await promessaPopup;
    const url = popup.url();

    expect(url).toContain("https://zoom.earth/maps/satellite/#view=");
    // Paridade Zoom Earth (Task 21): radar, vento, focos, temperatura e mira.
    expect(url).toContain("z/overlays=radar,wind,fires,temperatures,crosshair");
    // Coordenadas reais (não zeros) — o link carrega o centro do mapa.
    const view = url.split("#view=")[1]?.split(",") ?? [];
    expect(Math.abs(Number(view[0]))).toBeGreaterThan(0.01);
    await popup.context().close();
    await page.context().close();
  }, 180_000);
});
