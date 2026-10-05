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

async function abrirOffline(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/offline`, { waitUntil: "domcontentloaded" });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  await page.locator('[data-test="prontidao"]').waitFor({ state: "visible", timeout: 15_000 });
  return page;
}

describe("Teste de prontidão offline", () => {
  it.retry = 2;

  it("roda as verificações e apresenta veredito com os 7 itens", async () => {
    const page = await abrirOffline(browser);
    await page.locator('[data-test="prontidao-executar"]').click();

    const veredito = page.locator('[data-test="prontidao-veredito"]');
    await veredito.waitFor({ state: "visible", timeout: 15_000 });
    const texto = await veredito.textContent();
    expect(texto).toMatch(/PRONTO PARA OPERAR OFFLINE|PARCIALMENTE PRONTO|NÃO PRONTO/);

    for (const id of ["sw", "shell", "offline-html", "mapas", "manual", "dados", "rede"]) {
      await page.locator(`[data-test="prontidao-item-${id}"]`).waitFor({ state: "visible" });
    }
    // Service Worker ativo no ambiente de teste
    const sw = await page.locator('[data-test="prontidao-item-sw"]').textContent();
    expect(sw).toMatch(/Service Worker/i);
    await page.context().close();
  });

  it("permite rodar o teste novamente", async () => {
    const page = await abrirOffline(browser);
    await page.locator('[data-test="prontidao-executar"]').click();
    await page
      .locator('[data-test="prontidao-veredito"]')
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Executar teste novamente" }).click();
    await page
      .locator('[data-test="prontidao-veredito"]')
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.context().close();
  });
});
