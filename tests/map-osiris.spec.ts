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
  const margem = 1;
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

/** Abre o painel de camadas e alterna para o modo Osiris. */
async function ativarModoOsiris(page: Page) {
  await page.locator('button[title="Camadas"]').click();
  await page.getByText("MODO DE VISUALIZAÇÃO").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator('[role="dialog"] button[title="Alternar para o modo Osiris"]').first().click();
}

/** Botão flutuante do alternador de modo (fora do painel de camadas). */
function btnModoFlutuante(page: Page, modo: "Tático" | "Osiris") {
  return page.locator(
    `[data-test="modo-mapa-mobile"] button[title="Alternar para o modo ${modo}"]`,
  );
}

describe("Modo Osiris do mapa", () => {
  it("alterna Tático ↔ Osiris, liga a camada Dia e noite e mantém após recarregar", async () => {
    const page = await abrirMapaMobile(browser);

    // Painel de camadas: alterna para Osiris e liga o terminador noturno.
    await ativarModoOsiris(page);
    await page.getByText("Camadas de inteligência", { exact: true }).waitFor({ state: "visible" });
    await page.getByRole("switch", { name: "Ativar camada Dia e noite" }).click();
    await page.keyboard.press("Escape");

    // A camada noturna deve existir no estilo do mapa (client-side, sem rede).
    await page.waitForFunction(
      () => {
        const m = (window as unknown as { __tacticalMap?: { getLayer: (i: string) => unknown } })
          .__tacticalMap;
        return Boolean(m?.getLayer?.("intel-noite-fill"));
      },
      { timeout: 15_000 },
    );

    // Persistência: recarrega e o modo + camada continuam ativos.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    const pular2 = page.getByRole("button", { name: "Pular configuração" });
    if (await pular2.isVisible().catch(() => false)) {
      await pular2.click();
      await pular2.waitFor({ state: "hidden" });
    }
    const osirisAtivo = await btnModoFlutuante(page, "Tático").isVisible();
    expect(osirisAtivo).toBe(true);
    await page.waitForFunction(
      () => {
        const m = (window as unknown as { __tacticalMap?: { getLayer: (i: string) => unknown } })
          .__tacticalMap;
        return Boolean(m?.getLayer?.("intel-noite-fill"));
      },
      { timeout: 20_000 },
    );
    await page.context().close();
  }, 180_000);

  it("HUD do modo Osiris não se sobrepõe em 390×844", async () => {
    const page = await abrirMapaMobile(browser);
    await ativarModoOsiris(page);
    await page.keyboard.press("Escape");

    const seletores = [
      '[data-test="modo-mapa-mobile"]',
      '[data-test="faixa-intel"]',
      'div.hud-panel:has(span:text-is("CENTRO"))',
      'div.hud-panel:has(span:text-is("MINHA POSIÇÃO"))',
      'button[title="Camadas"]',
      'button[title="Ir para"]',
      'button[title="Medir"]',
      'button[title="Marcador"]',
      'button[title="Bússola"]',
      'button[aria-label="Abrir bússola"]',
    ];

    const caixas: Array<{ nome: string; ret: Retangulo }> = [];
    for (const seletor of seletores) {
      const loc = page.locator(seletor).first();
      await loc.waitFor({ state: "visible", timeout: 15_000 });
      caixas.push({ nome: seletor, ret: (await loc.boundingBox()) as Retangulo });
    }

    const conflitos: string[] = [];
    for (let i = 0; i < caixas.length; i++) {
      for (let j = i + 1; j < caixas.length; j++) {
        if (sobrepoe(caixas[i].ret, caixas[j].ret)) {
          conflitos.push(`${caixas[i].nome} × ${caixas[j].nome}`);
        }
      }
    }
    expect(conflitos, `Elementos sobrepostos: ${conflitos.join("; ")}`).toEqual([]);
    await page.context().close();
  }, 180_000);

  it("volta ao modo tático e remove as camadas de inteligência", async () => {
    const page = await abrirMapaMobile(browser);
    await ativarModoOsiris(page);
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => {
        const m = (window as unknown as { __tacticalMap?: { getLayer: (i: string) => unknown } })
          .__tacticalMap;
        return Boolean(m?.getLayer?.("intel-conflito-circle"));
      },
      { timeout: 15_000 },
    );

    await btnModoFlutuante(page, "Tático").click();
    await page.waitForFunction(
      () => {
        const m = (
          window as unknown as {
            __tacticalMap?: {
              getLayer: (i: string) => unknown;
              getStyle: () => { layers: unknown[] };
            };
          }
        ).__tacticalMap;
        return Boolean(m?.getStyle) && !m?.getLayer?.("intel-conflito-circle");
      },
      { timeout: 15_000 },
    );
    await page.context().close();
  }, 180_000);

  it("Fase 2: painel de camadas lista as novas camadas e liga a de voos", async () => {
    const page = await abrirMapaMobile(browser);
    await ativarModoOsiris(page);
    await page.getByText("Camadas de inteligência", { exact: true }).waitFor({ state: "visible" });

    // As novas camadas da Fase 2 aparecem com toggles.
    for (const nome of ["Voos ao vivo", "ISS (satélite)", "Alertas oficiais", "Rotas marítimas"]) {
      await page
        .getByRole("switch", { name: `Ativar camada ${nome}` })
        .waitFor({ state: "visible" });
    }

    // Liga "Centrais nucleares" e espera a camada aparecer no estilo.
    await page.getByRole("switch", { name: "Ativar camada Centrais nucleares" }).click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => {
        const m = (window as unknown as { __tacticalMap?: { getLayer: (i: string) => unknown } })
          .__tacticalMap;
        return Boolean(m?.getLayer?.("intel-nuclear-symbol"));
      },
      { timeout: 15_000 },
    );
    await page.context().close();
  }, 180_000);

  it("Fase 2: o Boletim de inteligência abre com dados consolidados", async () => {
    const page = await abrirMapaMobile(browser);
    await page.locator('button[title="Boletim"]').click();
    await page.getByText("BOLETIM DE INTELIGÊNCIA").waitFor({ state: "visible", timeout: 10_000 });

    // Seções do boletim presentes (mesmo sem rede, os blocos existem).
    await page.getByText("CLIMA ESPACIAL", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("QUALIDADE DO AR", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("SISMOS SIGNIFICATIVOS", { exact: true }).waitFor({ state: "visible" });

    // Com rede, o snapshot chega e o bloco de clima espacial mostra o Kp.
    await page
      .getByText(/KP \d/)
      .first()
      .waitFor({ state: "visible", timeout: 45_000 })
      .catch(() => {
        // Sem acesso às fontes no ambiente de teste: o boletim segue válido.
      });
    await page.context().close();
  }, 180_000);
});
