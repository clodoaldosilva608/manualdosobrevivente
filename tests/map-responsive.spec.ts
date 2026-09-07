import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

async function measure(width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
  const size = await page.evaluate(() => {
    const map = document.querySelector(".maplibregl-map") as HTMLElement | null;
    const canvas = document.querySelector(".maplibregl-canvas") as HTMLCanvasElement | null;
    return {
      mapW: map?.clientWidth ?? 0,
      mapH: map?.clientHeight ?? 0,
      canvasW: canvas?.clientWidth ?? 0,
      canvasH: canvas?.clientHeight ?? 0,
    };
  });
  return { page, context, size };
}

describe("responsividade do mapa", () => {
  it("preenche a tela em celular", async () => {
    const { context, size } = await measure(390, 844);
    expect(size.mapW).toBeGreaterThan(300);
    expect(size.mapH).toBeGreaterThan(400);
    expect(size.canvasW).toBeGreaterThan(300);
    expect(size.canvasH).toBeGreaterThan(400);
    await context.close();
  }, 120_000);

  it("acompanha o redimensionamento da janela", async () => {
    const { page, context, size } = await measure(1280, 900);
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
      const canvas = document.querySelector(".maplibregl-canvas") as HTMLCanvasElement | null;
      return { w: canvas?.clientWidth ?? 0, h: canvas?.clientHeight ?? 0 };
    });
    expect(after.w).toBeLessThan(size.canvasW);
    expect(after.w).toBeGreaterThan(400);
    expect(after.h).toBeGreaterThan(400);
    await context.close();
  }, 120_000);
});
