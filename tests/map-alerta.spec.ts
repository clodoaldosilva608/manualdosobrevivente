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

/** Abre o mapa em celular e dispensa o onboarding se ele aparecer. */
async function abrirMapaMobile(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
  // Acomoda a hidratação e a resolução do GPS inicial antes das interações.
  await page.waitForTimeout(2_000);
  return page;
}

describe("MODO ALERTA — radar de proximidade", () => {
  it("resumo do radar no topo do boletim, com selo coerente e radar completo", async () => {
    const page = await abrirMapaMobile(browser);

    // Botão BOLETIM no rail, com selo de ameaças quando há crítico/atenção.
    const botao = page.locator('button[title="Boletim"]');
    await botao.waitFor({ state: "visible", timeout: 15_000 });
    const selo = botao.locator('[data-test="radar-badge"]');
    const seloVisivel = await selo.isVisible().catch(() => false);

    await botao.click();
    await page.getByText("BOLETIM DE INTELIGÊNCIA", { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    const resumo = page.locator('[data-test="radar-resumo"]');
    await resumo.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText("Radar de proximidade").waitFor({ state: "visible" });

    // Coerência do selo: críticos + atenção na lista ⟺ contagem exibida.
    const total = await page.locator('[data-test="radar-total"]').count();
    if (total > 0) {
      const ameacas = await resumo.locator("li").evaluateAll(
        (els) =>
          els.filter((el) => {
            const ponto = el.querySelector("span[aria-hidden]");
            return (
              ponto?.className.includes("bg-red-500") || ponto?.className.includes("bg-amber-400")
            );
          }).length,
      );
      const textoTotal = (
        await page.locator('[data-test="radar-total"]').first().textContent()
      )?.trim();
      // O selo do boletim lista no máximo 5 itens — o número completo pode
      // ser maior; basta ser coerente (≥ ameaças visíveis).
      expect(Number(textoTotal ?? "0")).toBeGreaterThanOrEqual(Math.min(ameacas, 5));
      if (seloVisivel) {
        const textoSelo = (await selo.textContent())?.trim() ?? "";
        expect(Number(textoSelo)).toBe(Number(textoTotal));
      }
    } else {
      await page.getByText("NENHUMA AMEAÇA NO RADAR").waitFor({ state: "visible" });
      expect(seloVisivel).toBe(false);
    }

    // "Radar completo" abre a folha dedicada do MODO ALERTA.
    await page.getByRole("button", { name: "Radar completo" }).click();
    const folha = page.getByRole("heading", { name: "MODO ALERTA" });
    await folha.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText("Critérios do radar").waitFor({ state: "visible" });

    // Fechar: o mapa continua operante.
    await page.keyboard.press("Escape");
    await folha.waitFor({ state: "hidden", timeout: 10_000 });
    await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 10_000 });
    await page.context().close();
  }, 180_000);

  it("o menu hambúrguer também abre o Modo Alerta", async () => {
    const page = await abrirMapaMobile(browser);
    await page.locator('button[aria-label="Abrir menu"]:visible').first().click();
    await page.getByText("MENU OPERACIONAL").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator('button:has-text("Modo Alerta")').first().click();
    await page
      .getByRole("heading", { name: "MODO ALERTA" })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.context().close();
  }, 180_000);
});
