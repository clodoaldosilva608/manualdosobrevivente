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

/** Abre a página da conta com IndexedDB limpo (contexto novo a cada teste). */
async function abrirConta(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/conta`, { waitUntil: "domcontentloaded" });
  // O formulário de criação (ou o de entrar/perfil) confirma que o IndexedDB v4 abriu.
  await page.waitForSelector('[data-test="conta-form-criar"], [data-test="conta-perfil"]', {
    timeout: 20_000,
  });
  return page;
}

describe("Conta local do operador", () => {
  it("cria a conta, mostra o perfil, sai e entra novamente — com persistência", async () => {
    const page = await abrirConta(browser);

    // ── Criar conta ──
    await page.fill("#conta-nome", "Operador E2E");
    await page.fill("#conta-email", "operador@e2e.com");
    await page.fill("#conta-senha", "senhaforte");
    await page.fill("#conta-senha2", "senhaforte");
    await page.locator('[data-test="conta-form-criar"] button[type="submit"]').click();

    // Perfil aparece com nome e e-mail normalizados.
    await page.waitForSelector('[data-test="conta-perfil"]', { timeout: 10_000 });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-test="conta-nome"]')?.textContent === "Operador E2E" &&
        document.querySelector('[data-test="conta-email"]')?.textContent === "operador@e2e.com",
      { timeout: 10_000 },
    );

    // ── Persistência: recarrega e a sessão continua (sem formulário de entrar) ──
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-test="conta-perfil"]', { timeout: 20_000 });
    await page.waitForFunction(
      () => document.querySelector('[data-test="conta-nome"]')?.textContent === "Operador E2E",
      { timeout: 10_000 },
    );

    // ── Sair → formulário de entrar ──
    await page.locator('[data-test="conta-sair"]').click();
    await page.waitForSelector('[data-test="conta-form-entrar"]', { timeout: 10_000 });

    // Senha errada não abre sessão (toast de erro).
    await page.fill("#conta-entrar-senha", "senhaerrada");
    await page.locator('[data-test="conta-form-entrar"] button[type="submit"]').click();
    await page.waitForSelector("[data-sonner-toast]", { timeout: 8_000 });
    expect(await page.locator('[data-test="conta-form-entrar"]').count()).toBe(1);

    // Senha correta entra.
    await page.fill("#conta-entrar-senha", "senhaforte");
    await page.locator('[data-test="conta-form-entrar"] button[type="submit"]').click();
    await page.waitForSelector('[data-test="conta-perfil"]', { timeout: 10_000 });
    await page.waitForFunction(
      () => document.querySelector('[data-test="conta-nome"]')?.textContent === "Operador E2E",
      { timeout: 10_000 },
    );

    await page.context().close();
  }, 120_000);

  it("edita o perfil e apaga a conta (exige senha) — volta ao formulário de criar", async () => {
    const page = await abrirConta(browser);

    // Cria a conta para o teste.
    await page.fill("#conta-nome", "Operador Dois");
    await page.fill("#conta-email", "dois@e2e.com");
    await page.fill("#conta-senha", "chave777");
    await page.fill("#conta-senha2", "chave777");
    await page.locator('[data-test="conta-form-criar"] button[type="submit"]').click();
    await page.waitForSelector('[data-test="conta-perfil"]', { timeout: 10_000 });

    // ── Editar perfil ──
    await page.locator('[data-test="conta-cartao"] button:has-text("Editar")').click();
    await page.fill("#conta-editar-nome", "Operador Renomeado");
    await page.locator('[data-test="conta-editar"] button:has-text("Salvar perfil")').click();
    // A edição recarrega a página para revalidar a sessão.
    await page.waitForSelector('[data-test="conta-nome"]', { timeout: 20_000 });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-test="conta-nome"]')?.textContent === "Operador Renomeado",
      { timeout: 10_000 },
    );

    // ── Excluir conta: senha errada é recusada ──
    await page.locator('[data-test="conta-excluir"]').click();
    await page.waitForSelector('[data-test="conta-excluir-confirmar"]', { timeout: 5_000 });
    await page.fill('[data-test="conta-excluir-confirmar"] input[type="password"]', "0000");
    await page
      .locator('[data-test="conta-excluir-confirmar"] button:has-text("Confirmar exclusão")')
      .click();
    await page.waitForSelector("[data-sonner-toast]", { timeout: 8_000 });
    expect(await page.locator('[data-test="conta-perfil"]').count()).toBe(1);

    // ── Excluir com a senha correta ──
    await page.fill('[data-test="conta-excluir-confirmar"] input[type="password"]', "chave777");
    await page
      .locator('[data-test="conta-excluir-confirmar"] button:has-text("Confirmar exclusão")')
      .click();
    await page.waitForSelector('[data-test="conta-form-criar"]', { timeout: 10_000 });

    await page.context().close();
  }, 120_000);

  it("Ajustes mostra a conta local criada e aponta para /conta", async () => {
    const page = await abrirConta(browser);
    await page.fill("#conta-nome", "Operador Ajustes");
    await page.fill("#conta-email", "ajustes@e2e.com");
    await page.fill("#conta-senha", "segredo9");
    await page.fill("#conta-senha2", "segredo9");
    await page.locator('[data-test="conta-form-criar"] button[type="submit"]').click();
    await page.waitForSelector('[data-test="conta-perfil"]', { timeout: 10_000 });

    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-test="ajustes-conta-local"]', { timeout: 20_000 });
    const textoConta = await page.locator('[data-test="ajustes-conta-local"]').textContent();
    expect(textoConta).toContain("Operador Ajustes");
    expect(textoConta).toContain("ajustes@e2e.com");

    await page.context().close();
  }, 120_000);
});
