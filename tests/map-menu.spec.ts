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

/** Entra na Visão Osiris pelo painel de camadas (fluxo do usuário). */
async function ativarModoOsiris(page: Page) {
  await page.locator('button[title="Camadas"]').click();
  await page.getByText("MODO DE VISUALIZAÇÃO").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator('[role="dialog"] button[title="Alternar para o modo Osiris"]').first().click();
  await page.keyboard.press("Escape");
}

describe("Menu geral (hambúrguer)", () => {
  it("reúne navegação, ferramentas do mapa e submenu do Osiris; navega e abre painéis", async () => {
    const page = await abrirMapaMobile(browser);

    // O hambúrguer abre o menu geral ao lado do alternador de modo.
    await page.locator('[data-test="btn-menu-app"]:visible').click();
    await page.locator('[data-test="menu-app"]').waitFor({ state: "visible", timeout: 10_000 });

    // Seções presentes.
    await page.getByText("Navegação", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("Ferramentas do mapa", { exact: true }).waitFor({ state: "visible" });
    await page.locator('[data-test="menu-osiris-botao"]').waitFor({ state: "visible" });

    // Submenu do Osiris nasce aberto com as 9 funcionalidades.
    const submenu = page.locator('[data-test="menu-osiris-submenu"]');
    await submenu.waitFor({ state: "visible" });
    expect(await submenu.locator("button").count()).toBe(9);

    // Sobreposição: hambúrguer e alternador de modo coexistem sem colidir.
    const hamb = await page.locator('[data-test="btn-menu-app"]:visible').boundingBox();
    const modo = await page.locator('[data-test="modo-mapa-mobile"]').boundingBox();
    expect(hamb).toBeTruthy();
    expect(modo).toBeTruthy();
    expect(sobrepoe(hamb as Retangulo, modo as Retangulo)).toBe(false);

    // Item do submenu abre o Boletim.
    await page.locator('[data-test="menu-item-boletim"]').click();
    await page.getByText("BOLETIM DE INTELIGÊNCIA").waitFor({ state: "visible", timeout: 10_000 });
    await page.keyboard.press("Escape");

    // Rota do menu navega para o Manual.
    await page.locator('[data-test="btn-menu-app"]:visible').click();
    await page.locator('[data-test="menu-rota-manual"]').click();
    await page.waitForURL("**/manual", { timeout: 15_000 });

    await page.context().close();
  }, 180_000);

  it("submenu do Osiris abre o Hub na seção correta (astronomia)", async () => {
    const page = await abrirMapaMobile(browser);

    await page.locator('[data-test="btn-menu-app"]:visible').click();
    await page.locator('[data-test="menu-app"]').waitFor({ state: "visible", timeout: 10_000 });
    await page.locator('[data-test="menu-item-astro"]').click();

    // Hub abre direto na seção de astronomia tática (cálculo local).
    await page.getByText("OSIRIS — CENTRO DE INTELIGÊNCIA").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByText("Nascer do sol", { exact: false }).waitFor({ state: "visible" });

    await page.context().close();
  }, 180_000);

  it("hambúrguer na Visão Osiris devolve ao tático com o menu aberto e permite voltar ao globo", async () => {
    const page = await abrirMapaMobile(browser);
    await ativarModoOsiris(page);
    await page
      .locator('[data-test="osiris-voltar"]')
      .waitFor({ state: "visible", timeout: 10_000 });

    // O hambúrguer no cabeçalho da Visão Osiris devolve ao tático e abre o menu.
    await page.locator('[data-test="osiris-btn-menu"]').click();
    await page.locator('[data-test="menu-app"]').waitFor({ state: "visible", timeout: 10_000 });
    await page.locator('[data-test="modo-mapa-mobile"]').waitFor({ state: "visible" });

    // O item "Visão Osiris" retorna ao globo.
    await page.locator('[data-test="menu-item-visao"]').click();
    await page
      .locator('[data-test="osiris-voltar"]')
      .waitFor({ state: "visible", timeout: 10_000 });

    await page.context().close();
  }, 180_000);
});
