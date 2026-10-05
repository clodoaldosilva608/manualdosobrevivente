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

async function abrirMochila(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/inventory`, { waitUntil: "domcontentloaded" });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  await page.getByText("MOCHILA DE EMERGÊNCIA").waitFor({ state: "visible", timeout: 15_000 });
  await page
    .getByRole("button", { name: /MOCHILA 8H/ })
    .waitFor({ state: "visible", timeout: 15_000 });
  return page;
}

const ONTEM = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d.toISOString().slice(0, 10);
})();

const EM_20_DIAS = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 20);
  return d.toISOString().slice(0, 10);
})();

describe("Lembretes de validade da mochila", () => {
  it.retry = 2;

  it("adiciona item vencido e vê selo, alerta na mochila e lembrete na lista", async () => {
    const page = await abrirMochila(browser);

    // Abre a mochila 8h e adiciona dois itens: um vencido e um vencendo
    await page.getByRole("button", { name: /MOCHILA 8H/ }).click();
    await page.getByText("Adicionar equipamento").waitFor({ state: "visible", timeout: 10_000 });

    await page.getByPlaceholder("Ex.: pederneira").fill("Medicação teste vencida");
    await page.locator('input[type="date"]').fill(ONTEM);
    await page.getByRole("button", { name: "Adicionar à mochila" }).click();
    const vencido = page
      .locator("li", { has: page.locator('input[type="checkbox"]') })
      .filter({ hasText: "Medicação teste vencida" });
    await vencido.waitFor({ state: "visible" });
    await vencido
      .locator('[data-test="selo-validade"]')
      .getByText(/Vencido/)
      .waitFor({ state: "visible" });

    await page.getByPlaceholder("Ex.: pederneira").fill("Barras teste vencendo");
    await page.locator('input[type="date"]').fill(EM_20_DIAS);
    await page.getByRole("button", { name: "Adicionar à mochila" }).click();
    const vencendo = page
      .locator("li", { has: page.locator('input[type="checkbox"]') })
      .filter({ hasText: "Barras teste vencendo" });
    await vencendo.waitFor({ state: "visible" });
    await vencendo
      .locator('[data-test="selo-validade"]')
      .getByText(/Vence em/)
      .waitFor({ state: "visible" });

    // Painel de lembretes dentro do detalhe
    await page.locator('[data-test="lembretes-validade-detalhe"]').waitFor({ state: "visible" });
    await page
      .locator('[data-test="lembretes-validade-detalhe"]')
      .getByText("Medicação teste vencida")
      .waitFor({ state: "visible" });

    // Volta à lista: painel geral + badge no cartão da mochila
    await page.getByRole("button", { name: "Todas as mochilas" }).click();
    await page
      .locator('[data-test="lembretes-validade"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .locator('[data-test="lembretes-validade"]')
      .getByText("Medicação teste vencida")
      .waitFor({ state: "visible" });
    const cartao = page.getByRole("button", { name: /^MOCHILA 8H/ });
    await cartao.locator('[data-test="badge-validade"]').waitFor({ state: "visible" });

    // Limpeza: remove os dois itens de teste
    await cartao.click();
    await page.getByText("Adicionar equipamento").waitFor({ state: "visible" });
    page.on("dialog", (d) => void d.accept());
    await vencido.getByRole("button", { name: "Remover" }).click();
    await vencido.waitFor({ state: "detached", timeout: 5_000 });
    await vencendo.getByRole("button", { name: "Remover" }).click();
    await vencendo.waitFor({ state: "detached", timeout: 5_000 });
    await page.context().close();
  });

  it("o botão SOS aparece em destaque vermelho com a sigla SOS", async () => {
    const page = await abrirMochila(browser);
    const sos = page.locator('[data-test="nav-sos"]');
    await sos.waitFor({ state: "visible" });
    expect(await sos.textContent()).toContain("SOS");
    const classe = await sos.getAttribute("class");
    expect(classe).toContain("bg-destructive");
    expect(classe).toContain("rounded-full");
    await page.context().close();
  });
});
