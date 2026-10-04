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

interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

function sobrepoe(a: Retangulo, b: Retangulo): boolean {
  const margem = 1; // tolerância de arredondamento
  return (
    a.x + a.width > b.x + margem &&
    b.x + b.width > a.x + margem &&
    a.y + a.height > b.y + margem &&
    b.y + b.height > a.y + margem
  );
}

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
  return page;
}

describe("HUD do mapa em celular (390×844)", () => {
  it("abre o modal de boas-vindas no primeiro acesso", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    const modal = page.getByText("BEM-VINDO, OPERADOR");
    await modal.waitFor({ state: "visible", timeout: 8_000 });
    await page.getByRole("button", { name: "Pular configuração" }).click();
    await modal.waitFor({ state: "hidden" });
    await context.close();
  }, 120_000);

  it("elementos do HUD não se sobrepõem", async () => {
    const page = await abrirMapaMobile(browser);

    const seletores = [
      'div.hud-panel:has(span:text-is("CENTRO"))',
      'div.hud-panel:has(span:text-is("MINHA POSIÇÃO"))',
      'button[title="Camadas"]',
      'button[title="Ir para"]',
      'button[title="Medir"]',
      'button[title="Marcador"]',
      'button[title="Bússola"]',
      '[aria-label="Abrir bússola"]',
    ];

    const caixas: Array<{ nome: string; ret: Retangulo }> = [];
    for (const seletor of seletores) {
      const loc = page.locator(seletor).first();
      await loc.waitFor({ state: "visible", timeout: 10_000 });
      const box = (await loc.boundingBox()) as Retangulo | null;
      expect(box, `elemento visível: ${seletor}`).not.toBeNull();
      caixas.push({ nome: seletor, ret: box as Retangulo });
    }

    // Nenhum par de elementos do HUD pode se sobrepor.
    for (let i = 0; i < caixas.length; i++) {
      for (let j = i + 1; j < caixas.length; j++) {
        expect(
          sobrepoe(caixas[i].ret, caixas[j].ret),
          `${caixas[i].nome} sobrepõe ${caixas[j].nome}`,
        ).toBe(false);
      }
    }

    // Tudo dentro da viewport.
    for (const { nome, ret } of caixas) {
      expect(ret.x, `${nome} à esquerda da tela`).toBeGreaterThanOrEqual(0);
      expect(ret.y, `${nome} acima da tela`).toBeGreaterThanOrEqual(0);
      expect(ret.x + ret.width, `${nome} cortado à direita`).toBeLessThanOrEqual(390);
      expect(ret.y + ret.height, `${nome} cortado embaixo`).toBeLessThanOrEqual(844);
    }

    await page.context().close();
  }, 180_000);

  it("leitura de medição não colide com o HUD", async () => {
    const page = await abrirMapaMobile(browser);
    await page.locator('button[title="Medir"]').click();
    await page.getByRole("button", { name: "Distância linear" }).click();
    const leitura = page.locator('div.md\\:hidden div.hud-panel:has(span:text-is("DIST"))').first();
    await leitura.waitFor({ state: "visible", timeout: 10_000 });
    const retLeitura = (await leitura.boundingBox()) as Retangulo;

    const concorrentes = [
      'div.hud-panel:has(span:text-is("CENTRO"))',
      'div.hud-panel:has(span:text-is("MINHA POSIÇÃO"))',
      'button[title="Camadas"]',
      'button[title="Marcador"]',
      '[aria-label="Abrir bússola"]',
    ];
    for (const seletor of concorrentes) {
      const loc = page.locator(seletor).first();
      const box = (await loc.boundingBox()) as Retangulo | null;
      if (!box) continue;
      expect(sobrepoe(retLeitura, box), `leitura de medição sobrepõe ${seletor}`).toBe(false);
    }
    await page.context().close();
  }, 180_000);

  it("barra de navegação inferior permanece acessível e sem sobrepor o HUD", async () => {
    const page = await abrirMapaMobile(browser);
    const nav = page.locator("nav");
    const retNav = (await nav.boundingBox()) as Retangulo;
    expect(retNav.y).toBeGreaterThanOrEqual(844 - retNav.height - 1);

    const bussola = page.locator('[aria-label="Abrir bússola"]');
    const retBussola = (await bussola.boundingBox()) as Retangulo;
    expect(sobrepoe(retNav, retBussola), "navegação sobrepõe a bússola mini").toBe(false);

    // Navegação por toque: 7 destinos visíveis no celular.
    const destinos = ["Mapa", "Manual", "Mochila", "SOS", "Painel", "Offline", "Ajustes"];
    for (const d of destinos) {
      const link = page.locator(`nav a[aria-label="${d}"]`);
      expect(await link.isVisible(), `destino ${d} visível na barra`).toBe(true);
    }
    await page.context().close();
  }, 120_000);

  it("painel da bússola não cobre o HUD (painéis de cima, rail e navegação)", async () => {
    const page = await abrirMapaMobile(browser);
    await page.locator('[aria-label="Abrir bússola"]').click();
    const painel = page.locator("div.compass-card").first();
    await painel.waitFor({ state: "visible", timeout: 10_000 });
    const retPainel = (await painel.boundingBox()) as Retangulo;
    expect(retPainel).not.toBeNull();

    const concorrentes = [
      'div.hud-panel:has(span:text-is("CENTRO"))',
      'div.hud-panel:has(span:text-is("MINHA POSIÇÃO"))',
      'button[title="Camadas"]',
      'button[title="Ir para"]',
      'button[title="Medir"]',
      'button[title="Marcador"]',
      'button[title="Bússola"]',
      'button[title="Limpar"]',
      "nav",
    ];
    for (const seletor of concorrentes) {
      const loc = page.locator(seletor).first();
      const box = (await loc.boundingBox()) as Retangulo | null;
      if (!box) continue;
      expect(sobrepoe(retPainel, box), `painel da bússola sobrepõe ${seletor}`).toBe(false);
    }
    await page.context().close();
  }, 180_000);

  it("declara o manifest e o ícone de instalação", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const manifest = await page.evaluate(() =>
      document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
    );
    expect(manifest).toBe("/manifest.webmanifest");
    const apple = await page.evaluate(() =>
      document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
    );
    expect(apple).toBe("/icons/apple-touch-icon.png");
    const resposta = await page.request.get(`${BASE}/manifest.webmanifest`);
    expect(resposta.ok()).toBe(true);
    const corpo = (await resposta.json()) as { icons?: unknown[]; display?: string };
    expect(corpo.display).toBe("standalone");
    expect((corpo.icons ?? []).length).toBeGreaterThanOrEqual(3);
    await context.close();
  }, 120_000);
});
