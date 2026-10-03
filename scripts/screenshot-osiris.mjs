/**
 * Screenshot de verificação visual do modo Osiris (não é um teste).
 * Uso: node scripts/screenshot-osiris.mjs [url]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:8080";
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
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
console.log("passo: onboarding dispensado");

// Modo tático
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/osiris-1-tatico.png" });

// Abre camadas e vai para Osiris
await page.locator('button[title="Camadas"]').click();
console.log("passo: painel aberto");
await page.getByText("MODO DE VISUALIZAÇÃO").first().waitFor({ state: "visible" });
console.log("passo: seção modo visível");
await page.screenshot({ path: "/tmp/osiris-2-painel.png" });
await page
  .locator('[role="dialog"] button[title="Alternar para o modo Osiris"]')
  .first()
  .click();
console.log("passo: clique Osiris");
await page.getByText("Camadas de inteligência", { exact: true }).waitFor({ state: "visible" });
console.log("passo: seção inteligência visível");
await page.getByRole("switch", { name: "Ativar camada Dia e noite" }).click();
console.log("passo: noite ligada");
await page.keyboard.press("Escape");
await page.waitForTimeout(9000); // aguarda fetch de dados + render
await page.screenshot({ path: "/tmp/osiris-3-modo-osiris.png" });

// Confere camadas criadas
const camadas = await page.evaluate(() => {
  const m = window.__tacticalMap;
  if (!m) return [];
  return m
    .getStyle()
    .layers.map((l) => l.id)
    .filter((i) => i.startsWith("intel-"));
});
console.log("Camadas intel no mapa:", camadas);
await browser.close();
console.log("Screenshots salvos em /tmp/osiris-*.png");
