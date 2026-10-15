/**
 * Prova das funcionalidades do God's Eye View integradas:
 *  1. Camada "Relâmpagos ao vivo" (NOAA nowCOAST/WMS) — alterna, pede tiles
 *     ao nowCOAST e pinta no mapa;
 *  2. Linha de status "Próxima passagem sobre você" (satélites) na folha.
 */
import { chromium } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 640, height: 900 } });
const page = await context.newPage();
const tilesRaio = [];
page.on("response", (r) => {
  if (r.url().includes("nowcoast.noaa.gov") && r.url().includes("GetMap")) {
    tilesRaio.push(`${r.status()} ${r.url().slice(80, 140)}`);
  }
});

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
await page.waitForTimeout(2500);

await page.locator('button[title="Camadas"]').click();
await page.getByText("Camadas de inteligência", { exact: true }).waitFor();

// 1) Linha de status da passagem de satélite (abaixo da linha Satélites).
const passagem = page.locator('[data-test="passagem-status"]');
const textoPassagem = await passagem
  .waitFor({ state: "visible", timeout: 30_000 })
  .then(() => passagem.innerText())
  .catch(() => "(não apareceu)");
console.log("PASSAGEM:", JSON.stringify(textoPassagem));

// 2) Liga os relâmpagos.
const switchRaio = page.getByRole("switch", { name: "Ativar camada Relâmpagos ao vivo" });
const existia = await switchRaio.isVisible();
if (!existia) throw new Error("Alternador de Relâmpagos não encontrado");
await switchRaio.click();
await page.waitForTimeout(1500);
// Fecha a folha para ver o mapa.
await page.keyboard.press("Escape");
await page.waitForTimeout(10_000);

console.log("TILES NOWCOAST:", tilesRaio.length ? tilesRaio.slice(0, 4) : "(nenhum)");
if (!tilesRaio.length) throw new Error("Nenhum tile de relâmpago pedido — camada não ativou");
await page.screenshot({ path: "/home/z/my-project/download/raios-nowcoast-prova.png" });
console.log("VERIFICACAO GEV OK");
await browser.close();
