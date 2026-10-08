/**
 * E2E das camadas de vento e temperatura (OpenWeatherMap).
 *
 * Cobre o ciclo completo do padrão "chave opcional em Ajustes" (mesmo
 * padrão da chave AIS):
 *  1. Sem chave: o alternador não liga e o guard explica o caminho (toast).
 *  2. Com chave cadastrada em Ajustes: o alternador liga e a fonte raster
 *     (intel-vento / intel-temperatura) aparece no mapa via __tacticalMap.
 *
 * Este projeto roda Playwright sobre o expect do Vitest (sem matchers
 * @playwright/test) — use waitFor/waitForFunction + expect().
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const CHAVE_TESTE = "chave-e2e-openweathermap-1234";

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
  // Onboarding do primeiro arranque bloqueia toques — dispensa se aparecer.
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

async function abrirCamadas(page: Awaited<ReturnType<typeof abrirMapaMobile>>) {
  await page.locator('button[title="Camadas"]').click();
  const alternadores = page.getByRole("switch", { name: /^Ativar camada / });
  await alternadores.first().waitFor({ state: "visible", timeout: 10_000 });
  return alternadores;
}

describe("Vento e temperatura (OpenWeatherMap)", () => {
  it("sem chave: alternador não liga e o toast aponta para Ajustes", async () => {
    const page = await abrirMapaMobile();
    await abrirCamadas(page);

    const alvoVento = page.getByRole("switch", { name: "Ativar camada Vento (superfície)" });
    const alvoTemp = page.getByRole("switch", {
      name: "Ativar camada Temperatura (superfície)",
    });
    expect(await alvoVento.count()).toBe(1);
    expect(await alvoTemp.count()).toBe(1);

    await alvoVento.click();
    await page.waitForTimeout(400);
    // Guard: o switch permanece desligado e o toast explica o caminho.
    expect(await alvoVento.getAttribute("data-state")).toBe("unchecked");
    await page.getByText("Camada requer chave OpenWeatherMap").waitFor({
      state: "visible",
      timeout: 5_000,
    });
    await page.context().close();
  });

  it("com chave em Ajustes: as fontes raster intel-vento/intel-temperatura nascem no mapa", async () => {
    const page = await abrirMapaMobile();

    // Cadastra a chave em Ajustes (IndexedDB do aparelho). A pausa cobre a
    // regeneração pós-hidratação: digitando antes dela, o React descarta a
    // árvore e a chave nunca persiste.
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    const campo = page.locator('[data-test="chave-owm"]');
    await campo.waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(1_500);
    await campo.fill(CHAVE_TESTE);
    await page.waitForTimeout(800); // update() persiste no IndexedDB

    // De volta ao mapa: liga as duas camadas (onboarding pode reaparecer
    // em contexto novo — dispensa antes de tocar na folha).
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    const pular2 = page.getByRole("button", { name: "Pular configuração" });
    const voltou = await pular2
      .waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (voltou) {
      await pular2.click();
      await pular2.waitFor({ state: "hidden" });
    }
    await abrirCamadas(page);
    await page.getByRole("switch", { name: "Ativar camada Vento (superfície)" }).click();
    await page.getByRole("switch", { name: "Ativar camada Temperatura (superfície)" }).click();

    // serialize() devolve a definição original da fonte — API estável do
    // MapLibre, mais confiável que o objeto interno pós-transformação.
    const pegaTile = `const pegaTile = (id) => {
      const m = window.__tacticalMap;
      if (!m) return "";
      try {
        const s = m.getSource(id);
        return (s && s.serialize && s.serialize().tiles && s.serialize().tiles[0]) || "";
      } catch {
        return "";
      }
    };`;
    await page.waitForFunction(
      `() => {
        ${pegaTile}
        return pegaTile("intel-vento").includes("tile.openweathermap.org") &&
          pegaTile("intel-temperatura").includes("tile.openweathermap.org");
      }`,
      undefined,
      { timeout: 15_000 },
    );

    // Os templates apontam para o OpenWeatherMap com a chave cadastrada.
    const urls = await page.evaluate(`(() => {
      ${pegaTile}
      return { vento: pegaTile("intel-vento"), temperatura: pegaTile("intel-temperatura") };
    })()`);
    expect(urls.vento).toContain("https://tile.openweathermap.org/map/wind_new/");
    expect(urls.vento).toContain(`appid=${CHAVE_TESTE}`);
    expect(urls.temperatura).toContain("https://tile.openweathermap.org/map/temp_new/");

    // Desligar remove a fonte do estilo.
    await page.getByRole("switch", { name: "Ativar camada Vento (superfície)" }).click();
    await page.waitForTimeout(400);
    const restou = await page.evaluate(() => {
      const map = (
        window as unknown as {
          __tacticalMap?: { getSource: (id: string) => object | undefined };
        }
      ).__tacticalMap;
      return !!map?.getSource("intel-vento");
    });
    expect(restou).toBe(false);
    await page.context().close();
  });
});
