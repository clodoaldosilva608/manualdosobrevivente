/**
 * E2E da abertura em vídeo.
 *
 * O SplashAbertura se auto-pula sob automação (navigator.webdriver) para
 * não bloquear os outros testes E2E — este arquivo força a abertura via
 * __ABERTURA_SEMPRE__ e valida o ciclo completo: aparece, vídeo carrega,
 * "Pular" dispensa e marca a sessão.
 *
 * Este projeto roda Playwright sobre o expect do Vitest (sem matchers
 * @playwright/test) — use waitFor/waitForFunction/getAttribute + expect().
 */
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

async function abrirComAbertura(): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    (window as unknown as { __ABERTURA_SEMPRE__: boolean }).__ABERTURA_SEMPRE__ = true;
  });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  return page;
}

describe("abertura em vídeo (/)", () => {
  it("aparece no arranque, com vídeo e botão de pulo", async () => {
    const page = await abrirComAbertura();
    const splash = page.locator('[data-test="splash-abertura"]');
    await splash.waitFor({ state: "visible", timeout: 10_000 });

    const poster = await splash.locator("video").getAttribute("poster");
    expect(poster).toBe("/abertura-poster.jpg");
    // Duas fontes declaradas: mp4 e webm.
    const fontes = await splash.locator("video source").count();
    expect(fontes).toBe(2);

    // O vídeo realmente carrega dados (readyState >= 2 = HAVE_CURRENT_DATA).
    await page.waitForFunction(
      () => {
        const v = document.querySelector('[data-test="splash-abertura"] video');
        return v && v.readyState >= 2;
      },
      undefined,
      { timeout: 20_000 },
    );

    const pular = page.locator('[data-test="splash-pular"]');
    await pular.waitFor({ state: "visible", timeout: 5_000 });
    await page.context().close();
  });

  it('"Pular" dispensa a abertura e marca a sessão', async () => {
    const page = await abrirComAbertura();
    const splash = page.locator('[data-test="splash-abertura"]');
    await splash.waitFor({ state: "visible", timeout: 10_000 });
    await page.click('[data-test="splash-pular"]');
    await splash.waitFor({ state: "detached", timeout: 5_000 });
    const flag = await page.evaluate(() => sessionStorage.getItem("tgis:abertura"));
    expect(flag).toBe("1");
    await page.context().close();
  });
});
