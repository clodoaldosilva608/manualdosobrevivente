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

/** Abre a página da mochila em celular e dispensa o onboarding se aparecer. */
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
  // A semeadura dos modelos é assíncrona; aguarda o cartão do modelo 72h.
  await page
    .getByRole("button", { name: /MOCHILA 72H/ })
    .waitFor({ state: "visible", timeout: 15_000 });
  return page;
}

describe("Mochilas pré-definidas", () => {
  it.retry = 2;

  it("apresenta os 5 modelos com itens e descrição, além do cartão criar", async () => {
    const page = await abrirMochila(browser);
    for (const nome of [
      "MOCHILA 8H",
      "MOCHILA 12H",
      "MOCHILA 48H",
      "MOCHILA 72H",
      "MOCHILA 300H",
    ]) {
      await page.getByRole("button", { name: new RegExp(nome) }).waitFor({ state: "visible" });
    }
    await page.getByText("Criar mochila").waitFor({ state: "visible" });
    // Descrição do modelo aparece no cartão
    await page.getByText(/clássica bug-out bag/i).waitFor({ state: "visible" });
    // Badge de modelo no cartão
    await page.getByText("modelo 72h", { exact: true }).waitFor({ state: "visible" });
    await page.context().close();
  });

  it("abre o modelo 72h com itens pré-definidos, descrições e marca um item", async () => {
    const page = await abrirMochila(browser);
    await page.getByRole("button", { name: /MOCHILA 72H/ }).click();
    await page.getByText("Empacotados").waitFor({ state: "visible", timeout: 10_000 });

    // Itens pré-definidos com descrição de cada um
    const agua = page.locator("li", { hasText: "Água (3 L em garrafas resistentes)" });
    await agua.waitFor({ state: "visible" });
    await agua.getByText(/3 litros\/dia/i).waitFor({ state: "visible" });
    await page.getByText(/A clássica bug-out bag/i).waitFor({ state: "visible" });
    await page.locator("li", { hasText: "Rádio AM/FM à pilha" }).waitFor({ state: "visible" });

    // Marca um item como empacotado e vê contador e peso mudarem
    expect(await page.locator('input[type="checkbox"]:checked').count()).toBe(0);
    await agua.locator('input[type="checkbox"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll('input[type="checkbox"]:checked').length === 1,
      { timeout: 5_000 },
    );
    // Água: 3 L × 1000 g = 3,00 kg empacotados
    await page.getByText("3,00 kg").waitFor({ state: "visible" });
    await page.context().close();
  });

  it("adiciona, edita e remove um item no modelo 8h", async () => {
    const page = await abrirMochila(browser);
    await page.getByRole("button", { name: /MOCHILA 8H/ }).click();
    await page.getByText("Adicionar equipamento").waitFor({ state: "visible", timeout: 10_000 });

    // Adiciona
    await page.getByPlaceholder("Ex.: pederneira").fill("Teste kit sinalizador");
    await page
      .getByPlaceholder("Para que serve, dica de uso, observação…")
      .fill("Descrição de teste");
    await page.getByRole("button", { name: "Adicionar à mochila" }).click();
    const item = page.locator("li", { hasText: "Teste kit sinalizador" });
    await item.waitFor({ state: "visible" });
    await item.getByText("Descrição de teste").waitFor({ state: "visible" });

    // Edita (renomeia e descreve)
    await item.getByRole("button", { name: "Editar item" }).click();
    await page.getByPlaceholder("Ex.: pederneira").fill("Sinalizador editado");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    const editado = page.locator("li", { hasText: "Sinalizador editado" });
    await editado.waitFor({ state: "visible" });
    await editado.getByText("Descrição de teste").waitFor({ state: "visible" });

    // Remove
    page.on("dialog", (d) => void d.accept());
    await editado.getByRole("button", { name: "Remover" }).click();
    await editado.waitFor({ state: "detached", timeout: 5_000 });
    expect(await page.locator("li", { hasText: "Sinalizador editado" }).count()).toBe(0);
    await page.context().close();
  });

  it("cria mochila personalizada, renomeia-a e a exclui com itens preservados", async () => {
    const page = await abrirMochila(browser);

    // Cria
    await page.getByRole("button", { name: /Criar mochila/ }).click();
    await page.getByPlaceholder("Ex.: mochila do carro").fill("MOCHILA DE TESTE");
    await page
      .getByPlaceholder(/kit que fica pronto no porta-malas/)
      .fill("Kit de teste para validação");
    await page.getByRole("button", { name: "Salvar" }).click();

    // Abre direto após criar e adiciona um item
    await page.getByText("MOCHILA DE TESTE").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByPlaceholder("Ex.: pederneira").fill("Item da mochila teste");
    await page.getByRole("button", { name: "Adicionar à mochila" }).click();
    await page.locator("li", { hasText: "Item da mochila teste" }).waitFor({ state: "visible" });

    // Volta e edita a mochila (renomeia)
    await page.getByRole("button", { name: "Todas as mochilas" }).click();
    const cartao = page.locator("div.group", { hasText: "MOCHILA DE TESTE" });
    await cartao.getByRole("button", { name: "Editar mochila" }).click();
    await page.getByPlaceholder("Ex.: mochila do carro").fill("MOCHILA EDITADA");
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.getByText("MOCHILA EDITADA").waitFor({ state: "visible" });

    // Exclui — os itens devem sobreviver em SEM MOCHILA
    page.on("dialog", (d) => void d.accept());
    const cartao2 = page.locator("div.group", { hasText: "MOCHILA EDITADA" });
    await cartao2.getByRole("button").first().click();
    await page.getByRole("button", { name: "Excluir" }).click();

    // De volta à lista, o item aparece em SEM MOCHILA
    const semMochila = page.getByRole("button", { name: /SEM MOCHILA/ });
    await semMochila.waitFor({ state: "visible" });
    await semMochila.click();
    await page.locator("li", { hasText: "Item da mochila teste" }).waitFor({ state: "visible" });
    await page.context().close();
  });
});
