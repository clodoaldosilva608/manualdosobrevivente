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

/**
 * A API pública tem cota POR IP — em redes compartilhadas (contêiner/CI) o
 * limite pode já ter sido consumido por outra carga, e aí o pedido do app
 * falha com HTTP 429 de forma persistente. Isso é limitação de rede, não
 * regressão do app: os testes que dependem do Open-Meteo pulam com motivo
 * claro (o controlador em si é exercitado pelos unitários clima-openmeteo).
 */
async function openMeteoDisponivel(): Promise<boolean> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-15.79&longitude=-47.88&current=temperature_2m",
    );
    return res.status !== 429;
  } catch {
    return false;
  }
}

const METEO_OK = await openMeteoDisponivel();

let browser: Browser;

const CHAVE_SESSAO = "sb-mbterwktxczsyevcudoz-auth-token";

/** Sessão falsa (mas estruturalmente válida) — o portão de operador libera
 * o mapa; sem ela o overlay intercepta os cliques do rail (padrão do
 * map-rotacao.spec). */
function injetarSessao(page: Page) {
  return page.addInitScript(
    ({ chave }) => {
      localStorage.setItem(
        chave,
        JSON.stringify({
          access_token: "sessao-de-teste",
          refresh_token: "refresh-de-teste",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: "usuario-de-teste",
            aud: "authenticated",
            email: "teste@local",
            app_metadata: { provider: "email", providers: ["email"] },
            user_metadata: { nome: "Operador de Teste" },
            created_at: new Date().toISOString(),
          },
        }),
      );
    },
    { chave: CHAVE_SESSAO },
  );
}

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
  it("liga o vento: canvas de partículas nasce e desliga: sai", async (ctx) => {
    ctx.skip(!METEO_OK, "Open-Meteo em 429 nesta rede (cota por IP) — não é regressão");
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

  it("liga a temperatura: fonte intel-temperatura nasce no estilo", async (ctx) => {
    ctx.skip(!METEO_OK, "Open-Meteo em 429 nesta rede (cota por IP) — não é regressão");
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
      // 30s: o primeiro pedido (e o addSource) pode levar mais que 15s sob
      // renderização por software; o controlador agora repete falhas a cada 3s.
      { timeout: 30_000 },
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
