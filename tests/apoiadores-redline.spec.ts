/**
 * Verificação ao vivo: os apoiadores do BANCO (manual_apoiadores) aparecem
 * nas duas redlines — letreiro do mapa e página /colaboradores.
 *
 * Prova: "Ricardo Menezes" é o apoiador de ordem 1 no banco e NÃO existe na
 * lista semente estática. Se ele aparece no letreiro, o banco alimenta a
 * redline de verdade.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
/** Nome presente no banco (ordem 1) e AUSENTE da semente estática. */
const NOME_DO_BANCO = "Ricardo Menezes";
/** Nome presente na semente estática e AUSENTE do banco — só no fallback offline. */
const NOME_DA_SEMENTE = "Renata Farias";

/** O letreiro renderiza em CAIXA ALTA por CSS (uppercase): innerText reflete isso. */
function maiusculo(texto: string): string {
  return texto.toLocaleUpperCase("pt-BR");
}

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

describe("Apoiadores do banco nas redlines", () => {
  it.retry = 1;

  it("letreiro do mapa traz os apoiadores do banco (não a semente)", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    const pular = page.getByRole("button", { name: "Pular configuração" });
    const apareceu = await pular
      .waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (apareceu) await pular.click();
    const redline = page.locator('[data-test="redline"]');
    await redline.waitFor({ state: "visible", timeout: 15_000 });

    // O segmento COLABORADORES entra no letreiro…
    await expect
      .poll(async () => (await redline.innerText()).includes("COLABORADORES ("), {
        timeout: 30_000,
        intervals: [500],
      })
      .toBe(true);
    // …com o nome do banco (que só existe lá)…
    await expect
      .poll(async () => (await redline.innerText()).includes(maiusculo(NOME_DO_BANCO)), {
        timeout: 30_000,
        intervals: [500],
      })
      .toBe(true);

    const texto = await redline.innerText();
    expect(texto).toContain(maiusculo(NOME_DO_BANCO));
    // e a semente estática sai de cena quando o banco responde.
    expect(texto).not.toContain(maiusculo(NOME_DA_SEMENTE));
    await context.close();
  }, 180_000);

  it("página /colaboradores: ticker traz APOIADORES (78) do banco", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/colaboradores`, { waitUntil: "domcontentloaded" });
    const ticker = page.locator('[data-test="colaboradores-redline-texto"]');
    await expect
      .poll(async () => (await ticker.innerText().catch(() => "")).includes("APOIADORES (78)"), {
        timeout: 30_000,
        intervals: [500],
      })
      .toBe(true);
    const texto = await ticker.innerText();
    expect(texto).toContain("APOIADORES (78)");
    expect(texto).toContain(NOME_DO_BANCO);
    // mural segue presente com os 78 chips
    await page.locator('[data-test="colaboradores-apoiadores"]').waitFor({ timeout: 15_000 });
    await context.close();
  }, 180_000);
});
