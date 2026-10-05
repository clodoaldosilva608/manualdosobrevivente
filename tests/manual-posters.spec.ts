import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

/** Os dez pôsteres enviados pelo usuário — um verbete por imagem. */
const POSTERES = [
  "conhecimento-salva-vidas",
  "agua-e-vida",
  "cinco-pilares",
  "seu-futuro-e-preparacao",
  "preparacao-e-liberdade",
  "mente-forte-sobrevive",
  "disciplina-gera-resultados",
  "sobreviver-e-uma-escolha",
  "equipamento-e-vida",
  "sobrevivencia-nao-e-sorte",
];

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

async function abrirManual(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/manual`, { waitUntil: "domcontentloaded" });
  await page.getByText("MANUAL DE SOBREVIVÊNCIA").waitFor({ state: "visible", timeout: 30_000 });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  await page.waitForTimeout(1_000);
  return page;
}

describe("manual de sobrevivência — todos os pôsteres enviados com ensino", () => {
  it("o índice lista os 17 verbetes (7 técnicos + 10 dos pôsteres) com miniatura", async () => {
    const page = await abrirManual(browser);
    const cartoes = page.locator('a[href^="/manual/"]');
    await cartoes.first().waitFor({ state: "visible", timeout: 15_000 });
    expect(await cartoes.count()).toBe(17);

    // Cada cartão traz imagem com texto alternativo descritivo.
    const semAlt = await cartoes.evaluateAll(
      (els) => els.filter((el) => !el.querySelector("img")?.getAttribute("alt")).length,
    );
    expect(semAlt).toBe(0);
    await page.context().close();
  }, 120_000);

  for (const slug of POSTERES) {
    it(`o pôster ${slug} aparece com a imagem e o ensino completo`, async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(`${BASE}/manual/${slug}`, { waitUntil: "domcontentloaded" });

      // Imagem do pôster carregada (naturalWidth > 0 = bytes reais no DOM).
      const imagem = page.locator("main img, body img").first();
      await imagem.waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForFunction(
        () => {
          const el = document.querySelector("img");
          return el ? (el as HTMLImageElement).naturalWidth > 0 : false;
        },
        null,
        { timeout: 30_000 },
      );

      // Ensino: artigo com conteúdo substancial + checklist de campo.
      const corpo = await page.locator("article").innerText();
      expect(corpo.length).toBeGreaterThan(400);
      await page.getByText("CHECKLIST DE CAMPO").waitFor({ state: "visible", timeout: 10_000 });
      await context.close();
    }, 120_000);
  }
});
