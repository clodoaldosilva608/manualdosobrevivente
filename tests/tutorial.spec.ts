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

async function abrirTutorial(): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/tutorial`, { waitUntil: "domcontentloaded" });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  await page.waitForTimeout(1_500);
  return page;
}

/** Completa o exercício da lição atual ajustando com o teclado e aguarda o sucesso. */
async function concluirExercicio(page: Page, modo: "marcacao" | "rumo", alvo: number) {
  const slider = page.locator('[data-test="rosa-tutorial"] [role="slider"]');
  await slider.focus();
  if (modo === "marcacao") {
    // Leitura inicial = alvo + 120; Shift+ArrowLeft move 15° na leitura.
    for (let i = 0; i < 8; i++) await slider.press("Shift+ArrowLeft");
  } else {
    // Rumo simulado começa em 0; Shift+ArrowRight sobe 15°.
    const passos = Math.round((((alvo % 360) + 360) % 360) / 15);
    for (let i = 0; i < passos; i++) await slider.press("Shift+ArrowRight");
  }
  await page.waitForSelector('[data-test="tutorial-sucesso"]', { timeout: 6_000 });
}

describe("Treinamento de bússola (/tutorial)", () => {
  it("carrega o curso com as 8 lições e o quiz", async () => {
    const page = await abrirTutorial();
    await page.waitForSelector("text=APRENDA A USAR A BÚSSOLA", { timeout: 10_000 });
    expect(await page.getByText("0/8").count()).toBeGreaterThan(0);
    expect(await page.getByText("Por que a bússola salva vidas").first().isVisible()).toBe(true);
    await page.context().close();
  });

  it("avança lições e conclui os exercícios de luneta/sensor", async () => {
    const page = await abrirTutorial();
    // Lições 1–3: explorar/sem exercício não bloqueiam.
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /Próxima lição/ }).click();
      await page.waitForTimeout(400);
    }
    // Lição 4: exercício de marcação do rumo 0°.
    await page.waitForSelector('[data-test="rosa-tutorial"]', { timeout: 6_000 });
    await concluirExercicio(page, "marcacao", 0);
    await page.getByRole("button", { name: /Próxima lição/ }).click();
    // Lição 5: marcação do rumo 60°.
    await concluirExercicio(page, "marcacao", 60);
    await page.getByRole("button", { name: /Próxima lição/ }).click();
    // Lição 6: rumo 90° (sem sensor, simulado por teclado).
    await concluirExercicio(page, "rumo", 90);
    await page.getByRole("button", { name: /Próxima lição/ }).click();
    // Lição 7: contra-rumo 30°.
    await concluirExercicio(page, "marcacao", 30);
    await page.getByRole("button", { name: /Próxima lição/ }).click();
    // Lição 8: dicas → botão vai para o quiz.
    await page.getByRole("button", { name: /Ir para o quiz/ }).click();
    await page.waitForSelector("text=QUIZ DE CAMPO", { timeout: 6_000 });
    await page.context().close();
  }, 90_000);

  it("quiz com respostas corretas registra o resultado e persiste ao recarregar", async () => {
    const page = await abrirTutorial();
    await page.getByRole("button", { name: "QUIZ" }).click();
    await page.getByRole("button", { name: "o norte magnético" }).click();
    await page.getByRole("button", { name: "250°", exact: true }).click();
    await page.getByRole("button", { name: "ler o grau no índice e guardá-lo" }).click();
    await page
      .getByRole("button", { name: "objetos metálicos e eletrônicos que desviam a agulha" })
      .click();
    await page.waitForSelector('[data-test="tutorial-final"]', { timeout: 6_000 });
    // Faltam as lições → tela final mostra "QUASE LÁ".
    expect(await page.getByText("QUASE LÁ").first().isVisible()).toBe(true);

    // Recarrega: chip do quiz fica verde (progresso persistido).
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    const quizChip = page.getByRole("button", { name: "QUIZ" });
    await quizChip.waitFor({ state: "visible", timeout: 10_000 });
    expect(await quizChip.getAttribute("class")).toMatch(/text-tactical-green/);
    await page.context().close();
  }, 60_000);

  it("o banner do manual aponta para o treinamento", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/manual`, { waitUntil: "domcontentloaded" });
    const pular = page.getByRole("button", { name: "Pular configuração" });
    const apareceu = await pular
      .waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (apareceu) await pular.click();
    await page.waitForSelector('[data-test="manual-tutorial-banner"]', { timeout: 10_000 });
    await page.locator('[data-test="manual-tutorial-banner"]').click();
    await page.waitForSelector("text=APRENDA A USAR A BÚSSOLA", { timeout: 10_000 });
    await context.close();
  }, 60_000);
});
