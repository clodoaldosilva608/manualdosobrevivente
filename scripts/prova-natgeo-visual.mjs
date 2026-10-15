/** Prova visual do NatGeo em z13 (overzoom do z12 real) — screenshot limpo. */
import { chromium } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 640, height: 900 } });
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
// Fecha o balão de ajuda se existir (toque fora).
await page.locator(".maplibregl-canvas").click({ position: { x: 320, y: 700 } });

await page.locator('button[title="Camadas"]').click();
await page.getByRole("button", { name: "NatGeo", exact: true }).click();
await page.waitForTimeout(1200);

await page.evaluate(() => {
  const map = window.__tacticalMap;
  map.jumpTo({ center: [-34.93, -7.99], zoom: 13 });
});
await page.waitForTimeout(9000);
await page.screenshot({
  path: "/home/z/my-project/download/natgeo-z13-prova-visual.png",
});
console.log("screenshot salvo");
await browser.close();
