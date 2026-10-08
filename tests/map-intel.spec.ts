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

/** Abre a folha de camadas e espera a seção de inteligência (agora no tático). */
async function abrirCamadas(page: Page) {
  await page.locator('button[title="Camadas"]').click();
  await page
    .getByText("Camadas de inteligência", { exact: true })
    .waitFor({ state: "visible", timeout: 10_000 });
}

/** Consulta se uma camada existe no mapa tático exposto para os testes. */
async function camadaNoMapa(page: Page, id: string): Promise<boolean> {
  return page.evaluate((camada) => {
    const m = (
      window as unknown as {
        __tacticalMap?: { getLayer(id: string): unknown };
      }
    ).__tacticalMap;
    return !!m?.getLayer(camada);
  }, id);
}

describe("Camadas de inteligência no mapa tático", () => {
  it("mostra a seção no modo tático, liga/desliga Sismos no mapa e persiste", async () => {
    const page = await abrirMapaMobile(browser);
    await abrirCamadas(page);

    // 14 camadas de inteligência com alternadores próprios.
    const alternadores = page.getByRole("switch", { name: /^Ativar camada / });
    await alternadores.first().waitFor({ state: "visible" });
    expect(await alternadores.count()).toBe(15);

    // Sismos vem ativo por padrão: a camada existe no mapa tático.
    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-sismo-circle"),
      { timeout: 15_000 },
    );
    expect(await camadaNoMapa(page, "intel-sismo-circle")).toBe(true);

    // Desligar remove a camada do mapa (não só esconde).
    await page.getByRole("switch", { name: "Ativar camada Sismos" }).click();
    await page.waitForFunction(
      () =>
        !(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-sismo-circle"),
      { timeout: 10_000 },
    );

    // Persistência: recarrega e Sismos segue desligado, sem camada no mapa.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await abrirCamadas(page);
    const sismos = page.getByRole("switch", { name: "Ativar camada Sismos" });
    await sismos.waitFor({ state: "visible" });
    expect(await sismos.getAttribute("data-state")).toBe("unchecked");
    expect(await camadaNoMapa(page, "intel-sismo-circle")).toBe(false);

    // Religa e a camada volta ao mapa.
    await sismos.click();
    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-sismo-circle"),
      { timeout: 10_000 },
    );

    await page.context().close();
  }, 180_000);

  it("liga Navios ao vivo (AIS) no tático, persiste e remove ao desligar", async () => {
    const page = await abrirMapaMobile(browser);
    await abrirCamadas(page);

    const navios = page.getByRole("switch", { name: "Ativar camada Navios ao vivo (AIS)" });
    await navios.click();

    // A camada nasce no mapa (dados chegam pelo WebSocket AIS com a chave).
    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-navio-symbol"),
      { timeout: 15_000 },
    );
    await page.keyboard.press("Escape");

    // Persistência: recarrega, a camada segue ligada e presente.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await abrirCamadas(page);
    await navios.waitFor({ state: "visible" });
    expect(await navios.getAttribute("data-state")).toBe("checked");
    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-navio-symbol"),
      { timeout: 15_000 },
    );

    // Desliga (e encerra a conexão AIS deste teste).
    await navios.click();
    await page.waitForFunction(
      () =>
        !(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-navio-symbol"),
      { timeout: 10_000 },
    );

    await page.context().close();
  }, 180_000);

  it("liga as novas camadas Câmeras, Cabos submarinos e Notícias no tático", async () => {
    const page = await abrirMapaMobile(browser);
    await abrirCamadas(page);

    // Câmeras: dados curados locais — a camada nasce com ícone imediatamente.
    const cameras = page.getByRole("switch", { name: "Ativar camada Câmeras ao vivo" });
    await cameras.click();
    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-camera-symbol"),
      { timeout: 15_000 },
    );

    // Cabos submarinos: linha + pontos de desembarque.
    const cabos = page.getByRole("switch", { name: "Ativar camada Cabos submarinos" });
    await cabos.click();
    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-cabo-line"),
      { timeout: 15_000 },
    );
    expect(await camadaNoMapa(page, "intel-cabo-ponto-circle")).toBe(true);

    // Notícias ao vivo: camada nasce (pontos dependem da coleta GDELT).
    const noticias = page.getByRole("switch", { name: "Ativar camada Notícias ao vivo" });
    await noticias.click();
    await page.waitForFunction(
      () =>
        !!(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-noticia-circle"),
      { timeout: 15_000 },
    );

    // Satélites: a camada extra (TLE) pode ficar vazia sem rede, mas a fonte
    // da ISS dedicada segue existindo quando a camada Satélites está ligada.
    expect(await camadaNoMapa(page, "intel-camera-symbol")).toBe(true);

    // Desliga tudo e as camadas saem do mapa.
    await cameras.click();
    await page.waitForFunction(
      () =>
        !(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-camera-symbol"),
      { timeout: 10_000 },
    );
    await cabos.click();
    await noticias.click();
    await page.waitForFunction(
      () =>
        !(
          window as unknown as {
            __tacticalMap?: { getLayer(id: string): unknown };
          }
        ).__tacticalMap?.getLayer("intel-cabo-line"),
      { timeout: 10_000 },
    );

    await page.context().close();
  }, 180_000);
});
