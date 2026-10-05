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

const NOVOS = [
  ["Preparação", "Sobrevivência Não É Sorte"],
  ["Preparação", "Esteja Pronto Antes da Emergência"],
  ["Mentalidade", "Mente Forte Sobrevive"],
  ["Água", "Água É Vida"],
  ["Equipamento", "Equipamento É Vida"],
] as const;

async function abrirManual(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/manual`, { waitUntil: "domcontentloaded" });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  await page.getByRole("heading", { name: "MANUAL DE SOBREVIVÊNCIA" }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  return page;
}

describe("Manuais dos pôsteres do Centro de Sobrevivência", () => {
  it.retry = 2;

  it("lista os 10 novos verbetes organizados por categoria", async () => {
    const page = await abrirManual(browser);
    for (const [categoria, titulo] of NOVOS) {
      const secao = page.locator("section", {
        has: page.getByRole("heading", { name: categoria }),
      });
      await secao.getByText(titulo).waitFor({ state: "visible" });
    }
    const esperados = [
      "Conhecimento Salva Vidas",
      "Seu Futuro É Preparação",
      "Preparação É Liberdade",
      "Disciplina Gera Resultados",
      "Sobreviver É Uma Escolha",
    ];
    for (const titulo of esperados) {
      await page.getByText(titulo).waitFor({ state: "visible" });
    }
    await page.context().close();
  });

  it("abre o verbete Equipamento É Vida com imagem do pôster e checklist", async () => {
    const page = await abrirManual(browser);
    await page.getByText("Equipamento É Vida").first().click();
    await page.getByRole("heading", { name: "Equipamento É Vida" }).waitFor({
      state: "visible",
      timeout: 15_000,
    });
    await page.getByRole("heading", { name: "Equipamento" }).first().waitFor({ state: "visible" });
    await page.getByText("CHECKLIST DE CAMPO").waitFor({ state: "visible" });

    const img = page.locator('img[alt*="mochila tática"]');
    await img.waitFor({ state: "visible" });
    await page.waitForFunction((el) => el?.naturalWidth > 0, await img.elementHandle(), {
      timeout: 10_000,
    });
    await page.context().close();
  });

  it("abre o verbete Mente Forte com o método STOP", async () => {
    const page = await abrirManual(browser);
    await page.getByText("Mente Forte Sobrevive").first().click();
    await page.getByRole("heading", { name: "Mente Forte Sobrevive" }).waitFor({
      state: "visible",
      timeout: 15_000,
    });
    await page.getByText(/método militar/i).waitFor({ state: "visible" });
    await page.context().close();
  });
});
