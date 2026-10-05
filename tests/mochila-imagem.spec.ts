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

/** PNG 1×1 válido (para o teste de upload). */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Abre a página da mochila e dispensa o onboarding se aparecer. */
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

describe("Imagem de cada item da mochila", () => {
  it.retry = 2;

  it("todo item do modelo 8h exibe a imagem referente (SVG carregado)", async () => {
    const page = await abrirMochila(browser);
    await page.getByRole("button", { name: /MOCHILA 8H/ }).click();
    await page.getByText("Adicionar equipamento").waitFor({ state: "visible", timeout: 10_000 });

    // Todos os itens têm o bloco de imagem com desenho SVG e carregado.
    await page.waitForFunction(
      () => {
        const imgs = document.querySelectorAll<HTMLImageElement>('li [data-test="item-imagem"]');
        return (
          imgs.length >= 10 &&
          Array.from(imgs).every(
            (i) =>
              i.src.startsWith("data:image/svg+xml") &&
              i.complete &&
              i.naturalWidth > 0 &&
              i.naturalHeight > 0,
          )
        );
      },
      undefined,
      { timeout: 15_000 },
    );

    // O formulário tem o bloco de imagem com a foto (galeria) e a câmera.
    await page.locator('[data-test="item-imagem-bloco"]').waitFor({ state: "visible" });
    await page.locator('[data-test="item-imagem-preview"]').waitFor({ state: "visible" });
    await page.locator('[data-test="item-foto-galeria"]').waitFor({ state: "visible" });
    await page.locator('[data-test="item-foto-camera"]').waitFor({ state: "visible" });
    // Os inputs ocultos existem: galeria e câmera do aparelho.
    expect(await page.locator('[data-test="item-input-galeria"]').count()).toBe(1);
    expect(await page.locator('[data-test="item-input-camera"]').count()).toBe(1);
    await page.context().close();
  }, 180_000);

  it("item novo com foto do aparelho (upload) guarda e mostra a foto", async () => {
    const page = await abrirMochila(browser);
    await page.getByRole("button", { name: /MOCHILA 8H/ }).click();
    await page.getByText("Adicionar equipamento").waitFor({ state: "visible", timeout: 10_000 });

    // Sem foto: o preview usa o desenho padrão (SVG).
    const preview = page.locator('[data-test="item-imagem-preview"]');
    expect(await preview.getAttribute("src")).toContain("data:image/svg+xml");

    // Preenche o nome e envia a foto pela galeria.
    await page.getByPlaceholder("Ex.: pederneira").fill("Item com foto teste");
    await page.locator('[data-test="item-input-galeria"]').setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: PNG_1PX,
    });
    await page.waitForFunction(
      () =>
        (
          document.querySelector<HTMLImageElement>('[data-test="item-imagem-preview"]')?.src ?? ""
        ).startsWith("data:image/jpeg"),
      undefined,
      { timeout: 10_000 },
    );
    // Botão de remover aparece quando há foto.
    await page.locator('[data-test="item-foto-remover"]').waitFor({ state: "visible" });

    // Salva: o item na lista mostra a foto (não o desenho padrão).
    await page.getByRole("button", { name: "Adicionar à mochila" }).click();
    const item = page.locator("li", { hasText: "Item com foto teste" });
    await item.waitFor({ state: "visible" });
    await page.waitForFunction(
      () => {
        const li = Array.from(document.querySelectorAll("li")).find((l) =>
          l.textContent?.includes("Item com foto teste"),
        );
        const src = li?.querySelector<HTMLImageElement>('[data-test="item-imagem"]')?.src ?? "";
        return src.startsWith("data:image/jpeg");
      },
      undefined,
      { timeout: 10_000 },
    );

    // Persistência local: recarregado, a foto continua no item.
    await page.reload({ waitUntil: "domcontentloaded" });
    const pular2 = page.getByRole("button", { name: "Pular configuração" });
    if (await pular2.isVisible().catch(() => false)) await pular2.click();
    await page.getByText("MOCHILA DE EMERGÊNCIA").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: /MOCHILA 8H/ }).click();
    await page.locator("li", { hasText: "Item com foto teste" }).waitFor({ state: "visible" });
    await page.waitForFunction(
      () => {
        const li = Array.from(document.querySelectorAll("li")).find((l) =>
          l.textContent?.includes("Item com foto teste"),
        );
        const src = li?.querySelector<HTMLImageElement>('[data-test="item-imagem"]')?.src ?? "";
        return src.startsWith("data:image/jpeg");
      },
      undefined,
      { timeout: 15_000 },
    );

    // Limpeza: remove o item de teste.
    page.on("dialog", (d) => void d.accept());
    await page
      .locator("li", { hasText: "Item com foto teste" })
      .getByRole("button", { name: "Remover" })
      .click();
    await page.context().close();
  }, 180_000);
});
