import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { longitudeSubsolar } from "@/lib/rotacao-terra";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const CHAVE_SESSAO = "sb-mbterwktxczsyevcudoz-auth-token";

let browser: Browser;

/** Sessão falsa (mas estruturalmente válida) — o supabase-js resolve local. */
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

/** Abre o mapa em desktop e dispensa o onboarding se ele aparecer. */
async function abrirMapaDesktop(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await injetarSessao(page);
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

type Projecao = { type?: string };

async function projecaoAtual(page: Page): Promise<Projecao | undefined> {
  return page.evaluate(() =>
    (
      window as unknown as {
        __tacticalMap?: { getProjection(): Projecao };
      }
    ).__tacticalMap?.getProjection(),
  );
}

async function lngCentral(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (
        window as unknown as { __tacticalMap?: { getCenter(): { lng: number } } }
      ).__tacticalMap?.getCenter().lng ?? NaN,
  );
}

describe("rotação real da Terra no globo", () => {
  it("gira para oeste a ~0,25°/s (60×), pausa ao toque e retoma sozinho", async () => {
    const page = await abrirMapaDesktop(browser);
    await page.locator('button[title="Globo"]').click();
    await page.waitForFunction(
      () =>
        (
          window as unknown as { __tacticalMap?: { getProjection(): Projecao } }
        ).__tacticalMap?.getProjection()?.type === "globe",
      undefined,
      { timeout: 15_000 },
    );
    expect((await projecaoAtual(page))?.type).toBe("globe");
    await page.waitForTimeout(2_500); // estilo assenta; sem movestart → giro ativo

    // 5 s de rotação a 60× — o giro agora é ESTRANGULADO pelo portão de
    // tiles (cada passo espera o cachê assentar; sem isso o MapLibre, sob
    // globo, expulsa os loads em voo e o mapa fica bege — bug corrigido).
    // Em cache frio a marcha rasteja (teto de espera por passo); em cache
    // quente corre ~1,25° no intervalo. A asserção prova DIREÇÃO (oeste,
    // longitude decrescente) e sanidade (nada de corrida desgovernada).
    const lng0 = await lngCentral(page);
    expect(Number.isFinite(lng0)).toBe(true);
    await page.waitForTimeout(5_000);
    const lng1 = await lngCentral(page);
    const delta = lng1 - lng0;
    expect(delta).toBeLessThan(-0.15);
    expect(delta).toBeGreaterThan(-2.5);

    // Movimento externo da câmera (arrasto do operador, GPS, flyTo) pausa
    // o giro — mesmo caminho movestart. flyTo é determinístico: sem inércia.
    await page.evaluate(() => {
      const m = (
        window as unknown as {
          __tacticalMap?: {
            flyTo(o: { center: [number, number]; duration: number }): void;
            getCenter(): { lng: number; lat: number };
          };
        }
      ).__tacticalMap;
      const c = m!.getCenter();
      m!.flyTo({ center: [c.lng + 0.5, c.lat], duration: 400 });
    });
    await page.waitForTimeout(1_500); // flyTo (0,4 s) assenta dentro da pausa
    const lngPausa0 = await lngCentral(page);
    await page.waitForTimeout(2_500);
    const lngPausa1 = await lngCentral(page);
    expect(Math.abs(lngPausa1 - lngPausa0)).toBeLessThan(0.2);

    // 5 s de quietude: o giro retoma sozinho, do ponto onde ficou.
    await page.waitForTimeout(6_000);
    const lng2 = await lngCentral(page);
    expect(lng2).toBeLessThan(lngPausa1 - 0.3);
    await page.context().close();
  }, 180_000);

  it("Ajustes: interruptor reflete o padrão e 'Centrar no lado do dia' pousa no subsolar", async () => {
    const page = await abrirMapaDesktop(browser);
    await page.locator('button[title="Globo"]').click();
    await page.waitForFunction(
      () =>
        (
          window as unknown as { __tacticalMap?: { getProjection(): Projecao } }
        ).__tacticalMap?.getProjection()?.type === "globe",
      undefined,
      { timeout: 15_000 },
    );

    await page.locator('button[title="Camadas"]').click();
    const linha = page.locator('[data-test="rotacao-terra-linha"]');
    await linha.waitFor({ state: "visible", timeout: 10_000 });
    // Padrão: rotação ligada (o pedido do operador).
    const checked = await page.locator('[data-test="rotacao-terra"]').getAttribute("aria-checked");
    expect(checked).toBe("true");
    await page.locator('[data-test="rotacao-velocidades"]').waitFor({ state: "visible" });

    // Centrar no lado do dia: o meridiano central vira o ponto subsolar.
    await page.locator('[data-test="rotacao-dia"]').click();
    await page.waitForTimeout(2_500); // flyTo de 1,2 s + assentamento
    const esperado = longitudeSubsolar(new Date());
    const lng = await lngCentral(page);
    expect(Math.abs(lng - esperado)).toBeLessThan(0.5);

    // Desligar a rotação: o globo para.
    await page.locator('[data-test="rotacao-terra"]').click();
    await page
      .locator('[data-test="rotacao-velocidades"]')
      .waitFor({ state: "hidden", timeout: 5_000 });
    const lngParado0 = await lngCentral(page);
    await page.waitForTimeout(3_000);
    const lngParado1 = await lngCentral(page);
    expect(Math.abs(lngParado1 - lngParado0)).toBeLessThan(0.1);
    await page.context().close();
  }, 180_000);
});
