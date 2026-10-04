import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".maplibregl-canvas", { timeout: 30000 });
await page.waitForTimeout(1500);
const pular = page.getByRole("button", { name: "Pular configuração" });
if (await pular.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)) {
  await pular.click();
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(1000);
for (const t of ["Osiris", "Limpar", "Marcador"]) {
  const b = await page.locator(`button[title="${t}"]`).first().boundingBox();
  console.log(t, JSON.stringify(b));
}
// abre painel da bússola
await page.locator('button[title="Bússola"]').click();
await page.waitForTimeout(1200);
const painel = await page.locator("div.compass-card:has(span:text-is('Bússola'))").first().boundingBox();
console.log("PAINEL", JSON.stringify(painel));
const attr = await page.locator(".maplibregl-ctrl-bottom-right").first().boundingBox();
console.log("ATRIB", JSON.stringify(attr));
const esc = await page.locator(".maplibregl-ctrl-bottom-left").first().boundingBox();
console.log("ESCALA", JSON.stringify(esc));
await browser.close();
