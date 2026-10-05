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

/** Dispensa o onboarding se ele aparecer (igual ao helper do mapa). */
async function dispensarOnboarding(page: Page) {
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
}

async function abrirSOS(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/sos`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-test="morse-entrada"]').waitFor({ state: "visible", timeout: 30_000 });
  await dispensarOnboarding(page);
  // Acomoda a hidratação após o onboarding.
  await page.waitForTimeout(1_000);
  return page;
}

/** Espera o texto do preview igual ao alvo (com espaços normalizados). */
async function esperarPreview(page: Page, alvo: string) {
  await page.waitForFunction(
    (esperado) =>
      (document.querySelector('[data-test="morse-preview"]')?.textContent ?? "").trim() ===
      esperado,
    alvo,
    { timeout: 10_000 },
  );
}

describe("SOS — mensagem escrita em código Morse no estrobo", () => {
  it("converte o texto escrito em Morse ao vivo", async () => {
    const page = await abrirSOS(browser);
    const entrada = page.locator('[data-test="morse-entrada"]');
    await entrada.fill("AJUDA");
    await esperarPreview(page, ".- .--- ..- -.. .-");

    // Acento é normalizado: ÁGUA transmite como AGUA.
    await entrada.fill("ÁGUA");
    await esperarPreview(page, ".- --. ..- .-");
    await page.context().close();
  }, 120_000);

  it("mensagens pré-definidas preenchem e traduzem", async () => {
    const page = await abrirSOS(browser);
    await page
      .locator('[data-test="morse-predefinidas"] button')
      .filter({ hasText: "SOCORRO" })
      .click();
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-test="morse-entrada"]') as HTMLInputElement | null)
          ?.value === "SOCORRO",
      null,
      { timeout: 10_000 },
    );
    // S O C O R R O
    await esperarPreview(page, "... --- -.-. --- .-. .-. ---");

    // O SOS pré-definido reproduz o padrão clássico.
    await page.locator('[data-test="morse-predefinidas"] button').first().click(); // primeira mensagem é SOS
    await esperarPreview(page, "... --- ...");
    await page.context().close();
  }, 120_000);

  it("transmite no estrobo, destaca a letra e para", async () => {
    const page = await abrirSOS(browser);
    const botao = page.locator('[data-test="morse-transmitir"]');
    await botao.click();

    // Transmitindo: botão vira PARAR e o destaque da letra atual aparece.
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-test="morse-transmitir"]')?.textContent ?? "").includes(
          "PARAR",
        ),
      null,
      { timeout: 10_000 },
    );
    await page
      .locator('[data-test="morse-letras"] span.bg-tactical-orange')
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });

    // Parar: o destaque some e o botão volta.
    await botao.click();
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-test="morse-transmitir"]')?.textContent ?? "").includes(
          "TRANSMITIR",
        ),
      null,
      { timeout: 10_000 },
    );
    await page.waitForFunction(
      () => !document.querySelector('[data-test="morse-letras"] span.bg-tactical-orange'),
      null,
      { timeout: 10_000 },
    );
    await page.context().close();
  }, 120_000);

  it("velocidade do ponto selecionável (lento, normal, rápido)", async () => {
    const page = await abrirSOS(browser);
    const rapido = page
      .locator('[data-test="morse-velocidade"] button')
      .filter({ hasText: "RÁPIDO" });
    await rapido.click();
    await page.waitForFunction(
      () =>
        (
          document.querySelector('[data-test="morse-velocidade"] button.border-tactical-orange')
            ?.textContent ?? ""
        ).includes("RÁPIDO"),
      null,
      { timeout: 10_000 },
    );
    await page.context().close();
  }, 120_000);
});
