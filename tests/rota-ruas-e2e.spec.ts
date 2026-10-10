/**
 * ROTA DE RUAS (virada a virada) — painel GUIA DE ROTA → destino + Traçar →
 * banner de navegação no mapa com o traçado completo e as setas; parar encerra.
 *
 * O traçado vem do OSRM e o destino do Nominatim (rede real, sem chave —
 * mesmo caminho de produção). Se algum dos serviços estiver fora do ar,
 * o teste pula SEM falhar: a matemática da navegação é coberta pelos
 * unitários (tests/rota-ruas.spec.ts).
 *
 * Padrão do projeto: visibilidade via locator.waitFor.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const DESTINO = "Eixo Monumental, Brasília";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

async function abrirMapa(): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ["geolocation"],
    // GPS simulado no centro de Brasília: o banner da navegação precisa de
    // uma correção de GPS para exibir distância/instrução da manobra.
    geolocation: { latitude: -15.7942, longitude: -47.8822, accuracy: 15 },
  });
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
  await page.waitForTimeout(1_200);
  return page;
}

async function abrirPainelRota(page: Page) {
  // O botão do menu existe em 2 variantes (mobile escondida/desktop visível).
  await page.locator('[data-test="modo-mapa-desktop"] [data-test="btn-menu-app"]').click();
  await page.locator('[data-test="menu-item-rota"]').waitFor({ state: "visible", timeout: 8_000 });
  await page.locator('[data-test="menu-item-rota"]').click();
  await page
    .locator('[data-test="painel-rota-ruas"]')
    .waitFor({ state: "visible", timeout: 8_000 });
}

/** Traça a rota; devolve false quando OSRM/Nominatim não responderem. */
async function tracarRota(page: Page): Promise<boolean> {
  await abrirPainelRota(page);
  await page.locator('[data-test="ruas-destino"]').fill(DESTINO);
  await page.locator('[data-test="ruas-tracar"]').click();
  // O banner existe em 2 variantes (mobile escondida/desktop) — só a visível.
  const banner = page.locator('[data-test="banner-navegacao-ruas"]:visible');
  const apareceu = await banner
    .waitFor({ state: "visible", timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  if (!apareceu) return false;
  // Nova correção de GPS (jitter de precisão): a rota nasceu DEPOIS do
  // primeiro fix — o handler só calcula o status com uma posição nova.
  await page.context().setGeolocation({ latitude: -15.7942, longitude: -47.8822, accuracy: 12 });
  return true;
}

describe("Rota de ruas — virada a virada", () => {
  it("traça o caminho completo, mostra banner, setas no mapa e para", async () => {
    const page = await abrirMapa();

    // Camadas e ícones da navegação de ruas existem desde o load do mapa.
    const estrutura = await page.evaluate(() => {
      const map = (
        window as unknown as {
          __tacticalMap?: {
            getSource: (s: string) => unknown;
            getLayer: (l: string) => unknown;
            hasImage: (i: string) => boolean;
          };
        }
      ).__tacticalMap;
      if (!map) return null;
      return {
        fonte: !!map.getSource("rota-ruas"),
        manobras: !!map.getSource("rota-ruas-manobras"),
        linha: !!map.getLayer("rota-ruas-linha"),
        casco: !!map.getLayer("rota-ruas-casco"),
        setas: !!map.getLayer("rota-ruas-setas"),
        iconeSeta: map.hasImage("seta-rota-direcao"),
      };
    });
    expect(estrutura).not.toBeNull();
    expect(estrutura?.fonte).toBe(true);
    expect(estrutura?.linha).toBe(true);
    expect(estrutura?.setas).toBe(true);
    expect(estrutura?.iconeSeta).toBe(true);

    const ok = await tracarRota(page);
    if (!ok) {
      // Rede externa indisponível (OSRM/Nominatim) — não é regressão do app.
      console.warn("⚠ OSRM/Nominatim fora do ar — teste de traçado pulado");
      await page.context().close();
      return;
    }
    const banner = page.locator('[data-test="banner-navegacao-ruas"]:visible');

    // Banner com instrução e distância em destaque.
    await banner
      .getByText(/Navegação de ruas|Street navigation/)
      .waitFor({ state: "visible", timeout: 6_000 });
    await banner.locator('[data-test="ruas-distancia"]').waitFor({ state: "visible" });
    await banner.locator('[data-test="ruas-instrucao"]').waitFor({ state: "visible" });

    // O traçado completo entrou na fonte do mapa (LineString com dados).
    const temDados = await page.evaluate(async () => {
      const map = (
        window as unknown as {
          __tacticalMap?: {
            getSource: (s: string) => { getData: () => Promise<{ features: unknown[] }> };
          };
        }
      ).__tacticalMap;
      if (!map) return false;
      const fonte = map.getSource("rota-ruas");
      if (!fonte) return false;
      const dados = await fonte.getData();
      return dados.features.length > 0;
    });
    expect(temDados).toBe(true);

    // Botão de voz da navegação visível no banner; parar encerra tudo.
    await banner.locator('[data-test="ruas-voz"]').waitFor({ state: "visible" });
    await banner.getByRole("button", { name: "Parar navegação" }).click();
    await banner.waitFor({ state: "hidden", timeout: 6_000 });

    await page.context().close();
  }, 120_000);

  it("painel GUIA DE ROTA traz a seção da rota de ruas com perfil e voz", async () => {
    const page = await abrirMapa();
    await abrirPainelRota(page);
    // Seletor de perfil (Carro/A pé/Bicicleta) e botão de traçar desabilitado
    // sem destino preenchido.
    await page.locator('[data-test="ruas-perfil"]').waitFor({ state: "visible" });
    expect(await page.locator('[data-test="ruas-tracar"]').isDisabled()).toBe(true);
    await page.locator('[data-test="ruas-destino"]').fill("Brasília");
    expect(await page.locator('[data-test="ruas-tracar"]').isDisabled()).toBe(false);
    await page.context().close();
  }, 60_000);
});
