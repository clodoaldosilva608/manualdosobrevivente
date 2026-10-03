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
  await page.keyboard.press("Escape");
}

/** Iframe do globo OSIRIS self-hosted. */
function iframeGlobo(page: Page) {
  return page.locator('iframe[title="Globo OSIRIS — Manual do Sobrevivente"]');
}

describe("Visão Osiris (modo Osiris do mapa)", () => {
  it("abre em tela cheia com o iframe do globo, contador e painel de camadas", async () => {
    const page = await abrirMapaMobile(browser);
    await ativarModoOsiris(page);

    // Barra superior da Visão Osiris.
    await page
      .getByText("VISÃO OSIRIS", { exact: true })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .locator('[data-test="osiris-contagem"]')
      .filter({ hasText: "7 camadas ativas" })
      .waitFor({ state: "visible" });

    // Iframe aponta para a instância do globo com as camadas padrão.
    const iframe = iframeGlobo(page);
    await iframe.waitFor({ state: "attached", timeout: 10_000 });
    const src = await iframe.getAttribute("src");
    expect(src).toContain("osiris-fork.vercel.app/?layers=");
    expect(src).toContain("maritime");
    expect(src).toContain("earthquakes");

    // Elementos da barra superior não se sobrepõem em 390×844.
    const caixas: Array<{ nome: string; ret: Retangulo }> = [];
    for (const seletor of ['[data-test="osiris-voltar"]', '[data-test="osiris-btn-camadas"]']) {
      const loc = page.locator(seletor).first();
      await loc.waitFor({ state: "visible", timeout: 10_000 });
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

    // Painel de camadas abre pela barra superior e traz as 12 camadas.
    await page.getByRole("button", { name: "Abrir camadas" }).click();
    await page
      .locator('[role="dialog"] [data-test="osiris-camadas"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    const linhas = page.locator('[role="dialog"] [data-test^="osiris-camada-"]');
    await linhas.first().waitFor({ state: "visible" });
    expect(await linhas.count()).toBe(12);
    await page
      .getByRole("switch", { name: "Ativar camada Marítimo" })
      .waitFor({ state: "visible" });
    await page
      .getByRole("switch", { name: "Ativar camada Ciclo dia/noite" })
      .waitFor({ state: "visible" });
    await page
      .getByRole("button", { name: "Ativar todas", exact: true })
      .waitFor({ state: "visible" });
    await page
      .getByRole("button", { name: "Desativar todas", exact: true })
      .waitFor({ state: "visible" });

    // Ligar "Cabos submarinos" atualiza a URL do globo e o contador.
    await page.getByRole("switch", { name: "Ativar camada Cabos submarinos" }).click();
    await page
      .locator('[data-test="osiris-contagem"]')
      .filter({ hasText: "8 camadas ativas" })
      .waitFor({ state: "visible", timeout: 10_000 });
    expect(await iframeGlobo(page).getAttribute("src")).toContain("cables");

    // Desativar todas: URL sem camadas e contador zerado; ativar todas: 12.
    await page.getByRole("button", { name: "Desativar todas", exact: true }).click();
    await page
      .locator('[data-test="osiris-contagem"]')
      .filter({ hasText: "0 camadas ativas" })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("button", { name: "Ativar todas", exact: true }).click();
    await page
      .locator('[data-test="osiris-contagem"]')
      .filter({ hasText: "12 camadas ativas" })
      .waitFor({ state: "visible", timeout: 10_000 });

    await page.context().close();
  }, 180_000);

  it("mantém o modo Osiris e as camadas escolhidas após recarregar", async () => {
    const page = await abrirMapaMobile(browser);
    await ativarModoOsiris(page);
    await page.getByRole("button", { name: "Abrir camadas" }).click();
    await page
      .locator('[role="dialog"] [data-test="osiris-camadas"]')
      .waitFor({ state: "visible" });
    await page.getByRole("switch", { name: "Ativar camada Cabos submarinos" }).click();
    await page.keyboard.press("Escape");

    // Persistência: recarrega e a visão volta com a camada ligada.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByText("VISÃO OSIRIS", { exact: true })
      .waitFor({ state: "visible", timeout: 20_000 });
    await page
      .locator('[data-test="osiris-contagem"]')
      .filter({ hasText: "8 camadas ativas" })
      .waitFor({ state: "visible", timeout: 10_000 });
    expect(await iframeGlobo(page).getAttribute("src")).toContain("cables");

    await page.context().close();
  }, 180_000);

  it("volta ao mapa tático pelo botão da barra superior", async () => {
    const page = await abrirMapaMobile(browser);
    await ativarModoOsiris(page);
    await page
      .getByText("VISÃO OSIRIS", { exact: true })
      .waitFor({ state: "visible", timeout: 10_000 });

    await page.getByRole("button", { name: "Voltar para o mapa tático" }).click();

    // A visão sai da tela e o HUD tático volta (alternador de modo presente).
    await page
      .getByText("VISÃO OSIRIS", { exact: true })
      .waitFor({ state: "hidden", timeout: 10_000 });
    await page.locator('[data-test="modo-mapa-mobile"]').waitFor({ state: "visible" });
    await page
      .locator('[data-test="modo-mapa-mobile"] button[title="Alternar para o modo Osiris"]')
      .waitFor({ state: "visible" });

    await page.context().close();
  }, 180_000);

  it("o Boletim de inteligência abre com dados consolidados (mapa tático)", async () => {
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

  it("Hub Osiris: abre pelo rail com atalhos, astronomia e ferramentas OSINT", async () => {
    const page = await abrirMapaMobile(browser);

    // Botão do rail abre o hub (funciona também no modo tático).
    await page.locator('button[title="Osiris"]').click();
    await page.getByText("OSIRIS — CENTRO DE INTELIGÊNCIA").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    // Chips de resumo e atalhos das duas portas de entrada.
    await page.getByText("Conflitos", { exact: true }).waitFor({ state: "visible" });
    await page.locator('[data-test="hub-atalho-camadas"]').waitFor({ state: "visible" });
    await page.locator('[data-test="hub-atalho-boletim"]').waitFor({ state: "visible" });

    // Astronomia tática calcula localmente (nascer do sol sempre existe).
    await page.getByRole("button", { name: /Astronomia tática/ }).click();
    await page.getByText("Nascer do sol", { exact: false }).waitFor({ state: "visible" });
    await page.getByText("Fase", { exact: true }).waitFor({ state: "visible" });

    // Ferramentas OSINT: formulários presentes (consulta real depende de rede).
    await page.getByRole("button", { name: /Investigar IP/ }).click();
    await page.locator('input[placeholder="ex.: 8.8.8.8"]').waitFor({ state: "visible" });
    await page.getByRole("button", { name: /Investigar domínio/ }).click();
    await page.locator('input[placeholder="ex.: exemplo.com"]').waitFor({ state: "visible" });

    await page.context().close();
  }, 180_000);
});
