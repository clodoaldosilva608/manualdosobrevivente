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

/** Abre o mapa em desktop e dispensa o onboarding se ele aparecer. */
async function abrirMapaDesktop(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
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
  await page.waitForTimeout(1_500);
  return page;
}

type TipoProjecao = string | undefined;

async function projecaoAtual(page: Page): Promise<TipoProjecao> {
  return page.evaluate(
    () =>
      (
        window as unknown as { __tacticalMap?: { getProjection(): { type?: string } } }
      ).__tacticalMap?.getProjection()?.type,
  );
}

async function esperarProjecao(page: Page, tipo: string): Promise<void> {
  await page.waitForFunction(
    (esperado) =>
      (
        window as unknown as {
          __tacticalMap?: { getProjection(): { type?: string } };
        }
      ).__tacticalMap?.getProjection()?.type === esperado,
    tipo,
    { timeout: 15_000 },
  );
}

describe("projeção globo do mapa tático", () => {
  it("o botão Globo do rail alterna mercator ↔ globe e persiste", async () => {
    const page = await abrirMapaDesktop(browser);

    // Padrão: mapa plano (mercator).
    await esperarProjecao(page, "mercator");

    // Rail: Globo ativa a projeção esférica.
    const btnGlobo = page.locator('button[title="Globo"]');
    await btnGlobo.click();
    await esperarProjecao(page, "globe");
    expect(await projecaoAtual(page)).toBe("globe");
    // Estado ativo visível no botão do rail.
    await page.waitForFunction(
      () =>
        document
          .querySelector('button[title="Globo"]')
          ?.className.includes("border-tactical-orange"),
      undefined,
      { timeout: 5_000 },
    );

    // Persistência: sobrevive ao recarregamento (preferência hidratada).
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await esperarProjecao(page, "globe");

    // Volta para plano pelo mesmo botão.
    await page.locator('button[title="Globo"]').click();
    await esperarProjecao(page, "mercator");
    await page.context().close();
  }, 180_000);

  it("a folha de camadas oferece Plana/Globo e a projeção sobrevive à troca de base", async () => {
    const page = await abrirMapaDesktop(browser);
    await esperarProjecao(page, "mercator");

    // Ativa o globo direto pelo rail e abre a folha de camadas.
    await page.locator('button[title="Globo"]').click();
    await esperarProjecao(page, "globe");
    await page.locator('button[title="Camadas"]').click();
    const opcoes = page.locator('[data-test="projecao-opcoes"]');
    await opcoes.waitFor({ state: "visible", timeout: 10_000 });
    const classeGlobo = await page.locator('[data-test="projecao-globo"]').getAttribute("class");
    expect(classeGlobo ?? "").toContain("border-tactical-orange");

    // Troca para plano pela folha.
    await page.locator('[data-test="projecao-plano"]').click();
    await esperarProjecao(page, "mercator");

    // Troca a camada base (Ruas) — a projeção escolhida deve ser
    // reapresentada após o styledata do novo estilo.
    const botaoBase = page.locator('[role="dialog"] button', { hasText: "Ruas" }).first();
    await botaoBase.waitFor({ state: "visible", timeout: 10_000 });
    await botaoBase.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    await botaoBase.click();
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await page.waitForTimeout(2_000);
    await esperarProjecao(page, "mercator");
    await page.context().close();
  }, 180_000);
});
