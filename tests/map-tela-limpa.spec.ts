/**
 * MODO MAPA LIMPO — o botão de olho oculta TODOS os elementos da tela
 * (painéis, rail, bússola, redline e a própria navegação) deixando só o
 * mapa; um segundo toque restaura tudo.
 */
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

/**
 * Clique por coordenadas — o WebGL pesado do mapa derruba a heurística de
 * estabilidade de frames do Playwright de forma intermitente; o clique
 * confiável nas coordenadas do alvo é determinístico.
 */
async function clicarFirme(page: Page, teste: string, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    const loc = page.locator(`[data-test="${teste}"]`).first();
    const caixa = await loc.boundingBox({ timeout: 15_000 });
    if (!caixa) continue;
    await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await page.waitForTimeout(500);
    return;
  }
  throw new Error(`não consegui clicar em ${teste}`);
}

describe("modo mapa limpo", () => {
  it("oculta painéis, rail e navegação; restaurar traz tudo de volta", async () => {
    const page = await abrirMapaMobile(browser);

    // Antes: HUD presente (painéis dobráveis contam como presentes).
    const antes = await page.locator('[data-test="painel-centro"]').count();
    expect(antes).toBeGreaterThan(0);

    // Ativa o modo mapa limpo (clique por coordenadas: o botão existe no HUD
    // mobile e no desktop — o mouse acerta o visível).
    await clicarFirme(page, "btn-tela-limpa");
    await page
      .locator('[data-test="btn-tela-restaurar"]')
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });

    // Todos os elementos saem de cena — inclusive a navegação inferior.
    expect(await page.locator('[data-test="painel-centro"]').count()).toBe(0);
    expect(await page.locator('[data-test="painel-posicao"]').count()).toBe(0);
    expect(await page.locator('button[title="Camadas"]').count()).toBe(0);
    expect(await page.locator('[data-test="nav-sos"]').count()).toBe(0);

    // Restaura: tudo volta.
    await clicarFirme(page, "btn-tela-restaurar");
    await page.waitForTimeout(800);
    expect(await page.locator('[data-test="painel-centro"]').count()).toBe(antes);
    expect(await page.locator('button[title="Camadas"]').count()).toBeGreaterThan(0);
    expect(await page.locator('[data-test="nav-sos"]').count()).toBe(1);

    await page.context().close();
  }, 180_000);

  it("painéis dobráveis: no celular nascem recolhidos e abrem com um toque", async () => {
    const page = await abrirMapaMobile(browser);

    // Recolhido: o painel é uma pílula (sem as linhas DD/DMS/MGRS).
    const centro = page.locator('[data-test="painel-centro"]').first();
    await centro.waitFor({ state: "visible" });
    expect(await centro.getAttribute("aria-expanded")).toBe("false");

    // Toque no cabeçalho abre o painel completo (clique por coordenadas).
    const caixaCentro = await centro.boundingBox();
    await page.mouse.click(
      caixaCentro.x + caixaCentro.width / 2,
      caixaCentro.y + caixaCentro.height / 2,
    );
    await page.waitForTimeout(600);
    expect(await centro.getAttribute("aria-expanded")).toBe("true");

    // Coluna única no desktop: painéis empilham sem sobreposição.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktop = await context.newPage();
    await desktop.goto(BASE, { waitUntil: "domcontentloaded" });
    await desktop.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await desktop.waitForTimeout(2_000);
    const boxes = await desktop.evaluate(() => {
      const pegar = (teste: string) =>
        document.querySelector(`[data-test="${teste}"]`)?.getBoundingClientRect() ?? null;
      return { centro: pegar("painel-centro"), posicao: pegar("painel-posicao") };
    });
    if (boxes.centro && boxes.posicao) {
      // Sem interseção vertical: um termina antes do outro começar.
      const separados =
        boxes.centro.bottom <= boxes.posicao.top + 1 ||
        boxes.posicao.bottom <= boxes.centro.top + 1;
      expect(separados, "painéis da coluna esquerda não se sobrepõem").toBe(true);
    }
    await context.close();
    await page.context().close();
  }, 180_000);

  it("clicar num trecho vazio do mapa abre o popup de coordenadas", async () => {
    const page = await abrirMapaMobile(browser);
    const canvas = page.locator(".maplibregl-canvas");
    const caixa = await canvas.boundingBox();
    if (!caixa) throw new Error("canvas do mapa indisponível");
    // Clica num ponto central-baixo (fora dos painéis do topo).
    await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height * 0.62);
    await page.waitForSelector(".intel-popup", { timeout: 8_000 });
    const texto = await page.locator(".intel-popup").first().innerText();
    expect(texto).toMatch(/DD/);
    expect(texto).toMatch(/MGRS/);
    await page.context().close();
  }, 120_000);
});
