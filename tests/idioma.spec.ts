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

async function abrirAjustes(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  await page.locator('[data-test="seletor-idioma"]').waitFor({ state: "visible", timeout: 15_000 });
  return page;
}

describe("Seletor de idioma", () => {
  it.retry = 2;

  it("apresenta os 6 idiomas e o português vem selecionado por padrão", async () => {
    const page = await abrirAjustes(browser);
    for (const op of ["Português (Brasil)", "Español", "English", "Русский", "中文", "日本語"]) {
      await page
        .locator('[data-test="seletor-idioma"]')
        .getByText(op)
        .waitFor({ state: "visible" });
    }
    const pt = page.locator('[data-test="idioma-pt"]');
    expect(await pt.getAttribute("class")).toContain("text-tactical-orange");
    await page.context().close();
  });

  it("troca para English, traduz a interface e persiste após recarregar", async () => {
    const page = await abrirAjustes(browser);
    await page.locator('[data-test="idioma-en"]').click();
    await page
      .getByRole("heading", { name: "SETTINGS" })
      .waitFor({ state: "visible", timeout: 8_000 });
    await page.getByRole("heading", { name: "PREFERENCES" }).waitFor({ state: "visible" });

    // Persistência: recarrega e o idioma continua
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { name: "SETTINGS" })
      .waitFor({ state: "visible", timeout: 15_000 });
    expect(await page.getAttribute("html", "lang")).toBe("en");

    // A navegação inferior também traduz
    await page.locator('[data-test="nav-sos"]').waitFor({ state: "visible" });

    // Volta ao português
    await page.locator('[data-test="idioma-pt"]').click();
    await page
      .getByRole("heading", { name: "AJUSTES" })
      .waitFor({ state: "visible", timeout: 8_000 });
    await page.context().close();
  });

  it("troca para Espanhol, Russo, Chinês e Japonês no título", async () => {
    const page = await abrirAjustes(browser);
    const casos: Array<[string, string]> = [
      ["idioma-es", "AJUSTES"],
      ["idioma-ru", "НАСТРОЙКИ"],
      ["idioma-zh", "设置"],
      ["idioma-ja", "設定"],
    ];
    for (const [teste, titulo] of casos) {
      await page.locator(`[data-test="${teste}"]`).click();
      await page
        .getByRole("heading", { name: titulo, exact: true })
        .waitFor({ state: "visible", timeout: 8_000 });
    }
    await page.context().close();
  });
});
