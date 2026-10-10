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
  return abrirMapa(browser, 390, 844);
}

/** Abre o mapa na resolução indicada e dispensa o onboarding se ele aparecer. */
async function abrirMapa(browser: Browser, largura: number, altura: number): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: largura, height: altura } });
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

/** Mede o cartão do painel e a janela de rolagem do conteúdo (rosa + controles). */
async function medirPainel(page: Page) {
  const painel = page.locator("div.compass-card").first();
  await painel.waitFor({ state: "visible", timeout: 10_000 });
  const retPainel = (await painel.boundingBox()) as Retangulo;
  const area = page.locator("div.compass-card .overflow-y-auto").first();
  const retArea = (await area.boundingBox()) as Retangulo;
  return { painel, retPainel, retArea };
}

describe("HUD do mapa em celular (390×844)", () => {
  it("abre o modal de boas-vindas no primeiro acesso", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    // O onboarding abre APÓS autenticação (decisão do portão — Task 26):
    // sessão falsa (estruturalmente válida) injetada antes do app subir.
    await page.addInitScript(() => {
      localStorage.setItem(
        "sb-mbterwktxczsyevcudoz-auth-token",
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
    });
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    const modal = page.getByText("BEM-VINDO, OPERADOR");
    await modal.waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Pular configuração" }).click();
    await modal.waitFor({ state: "hidden" });
    await context.close();
  }, 120_000);

  it("elementos do HUD não se sobrepõem", async () => {
    const page = await abrirMapaMobile(browser);

    const seletores = [
      'div.hud-panel:has(span:text-is("CENTRO"))',
      'div.hud-panel:has(span:text-is("MINHA POSIÇÃO"))',
      'button[title="Osiris"]',
      'button[title="Boletim"]',
      'button[title="Camadas"]',
      'button[title="Ir para"]',
      'button[title="Medir"]',
      'button[title="Marcador"]',
      'button[title="Bússola"]',
      'button[title="Globo"]',
      'button[title="Limpar"]',
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

describe("painel da bússola em telas baixas, paisagem e desktop", () => {
  it("celular baixo (360×640): rosa visível e controles alcançados por rolagem", async () => {
    const page = await abrirMapa(browser, 360, 640);
    await page.locator('[aria-label="Abrir bússola"]').click();
    const { retPainel, retArea } = await medirPainel(page);

    // Regressão: com rodapé fixo, a rosa era esmagada a ~16px e os controles
    // de rotação/posição tomavam o cartão.
    expect(retArea.height, "janela da rosa com espaço útil").toBeGreaterThanOrEqual(140);
    expect(retPainel.y).toBeGreaterThanOrEqual(0);
    expect(retPainel.y + retPainel.height).toBeLessThanOrEqual(640);
    const nav = (await page.locator("nav").boundingBox()) as Retangulo;
    expect(sobrepoe(retPainel, nav), "painel sobrepõe a navegação").toBe(false);

    // Controles de rotação/posição existem e rolam até ficarem dentro do cartão.
    const controles = page.locator('[data-test="mapa-controles"]');
    await page.evaluate(() => {
      const area = document.querySelector("div.compass-card .overflow-y-auto") as HTMLElement;
      area.scrollTop = area.scrollHeight;
    });
    await controles.waitFor({ state: "visible" });
    const retControles = (await controles.boundingBox()) as Retangulo;
    expect(
      retControles.y >= retPainel.y - 1 &&
        retControles.y + retControles.height <= retPainel.y + retPainel.height + 1,
      "controles fora do cartão após rolar",
    ).toBe(true);
    await page.context().close();
  }, 180_000);

  it("paisagem de celular (844×390): o cartão não colapsa e cabe na tela", async () => {
    const page = await abrirMapa(browser, 844, 390);
    await page.locator('[aria-label="Abrir bússola"]').click();
    const { retPainel, retArea } = await medirPainel(page);

    // Regressão: com max-h negativo, o cartão colapsava a ~2px na paisagem.
    expect(retPainel.height, "cartão com altura útil na paisagem").toBeGreaterThanOrEqual(240);
    expect(retArea.height).toBeGreaterThanOrEqual(140);
    expect(retPainel.y).toBeGreaterThanOrEqual(0);
    expect(retPainel.y + retPainel.height).toBeLessThanOrEqual(390);
    expect(retPainel.x).toBeGreaterThanOrEqual(0);
    expect(retPainel.x + retPainel.width).toBeLessThanOrEqual(844);
    await page.context().close();
  }, 180_000);

  it("desktop (1440×900): não cobre trilha de ações nem controles nativos", async () => {
    const page = await abrirMapa(browser, 1440, 900);
    await page.locator('[aria-label="Abrir bússola"]').click();
    const { retPainel } = await medirPainel(page);

    for (const titulo of [
      "Osiris",
      "Boletim",
      "Camadas",
      "Ir para",
      "Medir",
      "Marcador",
      "Bússola",
      "Limpar",
    ]) {
      const botao = page.locator(`button[title="${titulo}"]`).first();
      const box = (await botao.boundingBox()) as Retangulo | null;
      if (!box) continue;
      expect(sobrepoe(retPainel, box), `painel sobrepõe o botão ${titulo}`).toBe(false);
    }

    // Controles nativos do MapLibre (rotação, posição, escala e atribuição).
    const controles = await page.evaluate(() =>
      [...document.querySelectorAll(".maplibregl-ctrl")]
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ x: r.left, y: r.top, width: r.width, height: r.height })),
    );
    expect(controles.length, "controles nativos presentes").toBeGreaterThan(0);
    for (const c of controles) {
      expect(sobrepoe(retPainel, c), "painel sobrepõe controle nativo do mapa").toBe(false);
    }
    await page.context().close();
  }, 180_000);
});

/** Abre o mapa em desktop e dispensa o onboarding se ele aparecer. */
async function abrirMapaDesktop(browser: Browser, largura: number, altura: number): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: largura, height: altura } });
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
  // Acomoda a hidratação (painéis/persistência) antes de medir.
  await page.waitForTimeout(2_000);
  return page;
}

/** Nome → seletor de todos os elementos fixos do HUD desktop. */
function seletoresDesktop(): Array<[string, string]> {
  return [
    ["alternador+menu", '[data-test="modo-mapa-desktop"]'],
    ["controle nativo zoom", ".maplibregl-ctrl-top-right .maplibregl-ctrl-group >> nth=0"],
    ["controle nativo geo", ".maplibregl-ctrl-top-right .maplibregl-ctrl-group >> nth=1"],
    ["rail Osiris", 'button[title="Osiris"]'],
    ["rail Boletim", 'button[title="Boletim"]'],
    ["rail Camadas", 'button[title="Camadas"]'],
    ["rail Ir para", 'button[title="Ir para"]'],
    ["rail Medir", 'button[title="Medir"]'],
    ["rail Marcador", 'button[title="Marcador"]'],
    ["rail Bússola", 'button[title="Bússola"]'],
    ["rail Globo", 'button[title="Globo"]'],
    ["rail Limpar", 'button[title="Limpar"]'],
    ["bússola mini", '[aria-label="Abrir bússola"]'],
    ["painel centro", '[data-test="painel-centro"]:visible'],
    ["painel posição", '[data-test="painel-posicao"]:visible'],
    ["escala", ".maplibregl-ctrl-bottom-left"],
    ["atribuição", ".maplibregl-ctrl-bottom-right"],
  ];
}

describe("HUD do mapa em desktop", () => {
  // 1280×720 é a janela típica de notebook com a barra do navegador;
  // 1366×640 cobre janelas ainda mais baixas (onde a bússola mini invadia
  // os botões do rail na versão anterior).
  for (const [largura, altura] of [
    [1280, 720],
    [1366, 640],
  ] as const) {
    it(`miniatura, rail e controles não se sobrepõem em ${largura}×${altura}`, async () => {
      const page = await abrirMapaDesktop(browser, largura, altura);

      const caixas: Array<{ nome: string; ret: Retangulo }> = [];
      for (const [nome, seletor] of seletoresDesktop()) {
        const loc = page.locator(seletor).first();
        await loc.waitFor({ state: "visible", timeout: 15_000 });
        const box = (await loc.boundingBox()) as Retangulo | null;
        expect(box, `elemento visível: ${nome} (${seletor})`).not.toBeNull();
        caixas.push({ nome, ret: box as Retangulo });
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
        expect(ret.x + ret.width, `${nome} cortado à direita`).toBeLessThanOrEqual(largura);
        expect(ret.y + ret.height, `${nome} cortado embaixo`).toBeLessThanOrEqual(altura);
      }
      await page.context().close();
    }, 180_000);

    it(`bússola em painel não cobre rail nem painéis em ${largura}×${altura}`, async () => {
      const page = await abrirMapaDesktop(browser, largura, altura);

      // Abre a bússola em modo painel pelo rail.
      await page.locator('button[title="Bússola"]').click();
      const painel = page.locator('div.compass-card:has(span:text-is("Bússola"))').first();
      await painel.waitFor({ state: "visible", timeout: 10_000 });
      const retPainel = (await painel.boundingBox()) as Retangulo;

      const concorrentes: Array<[string, string]> = [
        ["rail Osiris", 'button[title="Osiris"]'],
        ["rail Boletim", 'button[title="Boletim"]'],
        ["rail Camadas", 'button[title="Camadas"]'],
        ["rail Ir para", 'button[title="Ir para"]'],
        ["rail Medir", 'button[title="Medir"]'],
        ["rail Marcador", 'button[title="Marcador"]'],
        ["rail Bússola", 'button[title="Bússola"]'],
        ["rail Globo", 'button[title="Globo"]'],
        ["rail Limpar", 'button[title="Limpar"]'],
        ["alternador+menu", '[data-test="modo-mapa-desktop"]'],
        ["painel centro", '[data-test="painel-centro"]:visible'],
        ["painel posição", '[data-test="painel-posicao"]:visible'],
        ["atribuição", ".maplibregl-ctrl-bottom-right"],
      ];
      for (const [nome, seletor] of concorrentes) {
        const loc = page.locator(seletor).first();
        const box = (await loc.boundingBox()) as Retangulo | null;
        if (!box) continue;
        expect(sobrepoe(retPainel, box), `painel da bússola sobrepõe ${nome}`).toBe(false);
      }

      // O painel inteiro deve ficar dentro da viewport.
      expect(retPainel.y).toBeGreaterThanOrEqual(0);
      expect(retPainel.y + retPainel.height).toBeLessThanOrEqual(altura);
      expect(retPainel.x).toBeGreaterThanOrEqual(0);
      expect(retPainel.x + retPainel.width).toBeLessThanOrEqual(largura);

      // Minimizar devolve a miniatura.
      await page.getByRole("button", { name: "Minimizar bússola" }).click();
      await page.locator('[aria-label="Abrir bússola"]').waitFor({ state: "visible" });
      await page.context().close();
    }, 180_000);
  }
});
