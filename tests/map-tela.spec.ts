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
  // Acomoda a hidratação e a resolução do GPS inicial antes das interações.
  await page.waitForTimeout(2_000);
  return page;
}

/** Espera até que a visibilidade de uma camada do mapa atinja o valor esperado. */
async function esperarVisibilidade(
  page: Page,
  camada: string,
  valor: "visible" | "none",
  timeout = 10_000,
) {
  await page.waitForFunction(
    ({ camada, valor }) => {
      const m = (
        window as unknown as {
          __tacticalMap?: {
            getLayer(id: string): unknown;
            getLayoutProperty(id: string, prop: string): string;
          };
        }
      ).__tacticalMap;
      return !!m?.getLayer(camada) && m.getLayoutProperty(camada, "visibility") === valor;
    },
    { camada, valor },
    { timeout },
  );
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

describe("Tela do mapa tático — limpar e escolher elementos", () => {
  it("seção Elementos da tela liga/desliga painéis, persiste e restaura", async () => {
    const page = await abrirMapaMobile(browser);

    // Painéis do HUD presentes (mobile + desktop, o desktop só aparece via CSS).
    await esperarContagem(page, "painel-centro", 2);

    // A folha de camadas abre pelo rail e mostra a seção com 7 toggles.
    await page.locator('button[title="Camadas"]').click();
    const secao = page.locator('[data-test="tela-elementos"]');
    await secao.waitFor({ state: "visible", timeout: 10_000 });
    expect(await secao.locator('[role="switch"]').count()).toBe(7);
    expect(await secao.locator('[data-test="tela-limpar"]').count()).toBe(1);
    expect(await secao.locator('[data-test="tela-restaurar"]').count()).toBe(1);

    // Oculta o painel de coordenadas — ambos os painéis CENTRO saem do DOM.
    await secao.locator('button[aria-label="Ativar elemento Coordenadas do centro"]').click();
    await page.keyboard.press("Escape");
    await esperarContagem(page, "painel-centro", 0);

    // Persistência: recarregado, o elemento continua oculto.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await esperarContagem(page, "painel-centro", 0, 15_000);

    // "Restaurar tudo" traz o painel de volta.
    await page.locator('button[title="Camadas"]').click();
    await page.locator('[data-test="tela-elementos"]').waitFor({ state: "visible" });
    await page.locator('[data-test="tela-restaurar"]').click();
    await esperarContagem(page, "painel-centro", 2);

    await page.context().close();
  }, 180_000);

  it("ocultar waypoints e controles do mapa reflete no MapLibre e no DOM", async () => {
    const page = await abrirMapaMobile(browser);

    // Controles nativos presentes antes do teste.
    await esperarContagem(page, "painel-centro", 2);
    expect(await page.locator(".maplibregl-ctrl-top-right").count()).toBe(1);

    await page.locator('button[title="Camadas"]').click();
    const secao = page.locator('[data-test="tela-elementos"]');
    await secao.waitFor({ state: "visible", timeout: 10_000 });

    // Oculta os waypoints: a camada wp-circles fica visibility none.
    await secao.locator('button[aria-label="Ativar elemento Waypoints no mapa"]').click();
    await esperarVisibilidade(page, "wp-circles", "none");

    // Oculta os controles nativos: os botões de zoom, GPS e escala saem do DOM
    // (os containers de canto do MapLibre permanecem).
    await secao.locator('button[aria-label="Ativar elemento Controles do mapa"]').click();
    await page.waitForFunction(
      () =>
        !document.querySelector(".maplibregl-ctrl-zoom-in") &&
        !document.querySelector(".maplibregl-ctrl-scale"),
      undefined,
      { timeout: 10_000 },
    );

    // "Restaurar tudo" devolve os waypoints e os controles.
    await page.locator('[data-test="tela-restaurar"]').click();
    await esperarVisibilidade(page, "wp-circles", "visible");
    await page.waitForFunction(
      () =>
        !!document.querySelector(".maplibregl-ctrl-zoom-in") &&
        !!document.querySelector(".maplibregl-ctrl-scale"),
      undefined,
      { timeout: 10_000 },
    );

    await page.context().close();
  }, 180_000);

  it("botão Limpar apaga a medição, oculta waypoints e desarma a ferramenta", async () => {
    const page = await abrirMapaMobile(browser);

    // Waypoint: Marcador → clique no mapa → salvar.
    await page.locator('button[title="Marcador"]').click();
    await page.getByText("Toque no mapa para marcar um waypoint").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.locator(".maplibregl-canvas").click({ position: { x: 200, y: 550 } });
    const dialogo = page.getByText("NOVO WAYPOINT");
    await dialogo.waitFor({ state: "visible", timeout: 10_000 });
    await page.locator('input[placeholder="Ex: Fonte de água #3"]').fill("Ponto de teste");
    await page.getByRole("button", { name: "Salvar waypoint" }).click();
    await dialogo.waitFor({ state: "hidden", timeout: 10_000 });

    // Medição linear com dois pontos — a leitura aparece no HUD mobile e desktop.
    await page.locator('button[title="Medir"]').click();
    await page.getByRole("button", { name: "Distância linear" }).click();
    await page.locator(".maplibregl-canvas").click({ position: { x: 120, y: 520 } });
    await page.locator(".maplibregl-canvas").click({ position: { x: 260, y: 640 } });
    await esperarContagem(page, "leitura-medicao", 2);

    // Waypoint visível antes da limpeza.
    await esperarVisibilidade(page, "wp-circles", "visible");

    // Limpar: leitura some, waypoints saem do mapa, ferramenta desarma.
    await page.locator('button[title="Limpar"]').click();
    await esperarContagem(page, "leitura-medicao", 0);
    await esperarVisibilidade(page, "wp-circles", "none");

    // Reexibe os waypoints pela seção Elementos da tela.
    await page.locator('button[title="Camadas"]').click();
    await page.locator('[data-test="tela-elementos"]').waitFor({ state: "visible" });
    await page.locator('button[aria-label="Ativar elemento Waypoints no mapa"]').click();
    await esperarVisibilidade(page, "wp-circles", "visible");

    await page.context().close();
  }, 180_000);
});
