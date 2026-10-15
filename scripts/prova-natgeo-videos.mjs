/**
 * Prova local das duas correções (dev server deve estar na 8080):
 *  1. NatGeo: após trocar a base, MESMO no zoom 15 (onde o Esri agora só
 *     devolve placeholder "Map data not yet available") o MapLibre NÃO pode
 *     pedir tile NatGeo com z > 12 — com maxzoom 12 ele sobre-amplia os
 *     tiles reais. Captura os pedidos e salva screenshot.
 *  2. Briefings: os três vídeos existem no Manual e tocam (currentTime avança).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

// 1) NatGeo ----------------------------------------------------------------
const pedidosNatgeo = [];
page.on("request", (req) => {
  const url = req.url();
  if (url.includes("NatGeo_World_Map/MapServer/tile/")) {
    const partes = url.split("/MapServer/tile/")[1].split("/");
    pedidosNatgeo.push(Number(partes[0]));
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

await page.locator('button[title="Camadas"]').click();
await page.getByRole("button", { name: "NatGeo", exact: true }).click();
await page.waitForTimeout(1500);

// Vai para o zoom 15 em João Pessoa — antes da correção, tudo aqui era placeholder.
await page.evaluate(() => {
  const map = window.__tacticalMap;
  map.jumpTo({ center: [-34.93, -7.99], zoom: 15 });
});
await page.waitForTimeout(6000);

const acima12 = pedidosNatgeo.filter((z) => z > 12);
const resumo1 = {
  totalPedidos: pedidosNatgeo.length,
  zoomsPedidos: [...new Set(pedidosNatgeo)].sort((a, b) => a - b),
  pedidosAcimaDe12: acima12.length,
};
console.log("NATGEO:", JSON.stringify(resumo1));
if (pedidosNatgeo.length === 0) throw new Error("Nenhum tile NatGeo pedido — base não trocou?");
if (acima12.length > 0)
  throw new Error(`FALHA: ${acima12.length} pedidos NatGeo com z>12 (placeholder garantido)`);

mkdirSync("/home/z/my-project/download", { recursive: true });
writeFileSync(
  "/home/z/my-project/download/natgeo-z15-corrigido.png",
  await page.screenshot({ path: undefined }),
);

// 2) Briefings -------------------------------------------------------------
await page.goto(`${BASE}/manual`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-test="briefings-video"]', { timeout: 20_000 });
// O manual é SSR — o botão só responde depois da hidratação do React.
await page.waitForTimeout(3000);
const resultadoVideos = [];
for (const id of ["preparador-urbano", "sobrevivente-mato", "operadora-tatica"]) {
  const video = page.locator(`video[data-test="briefing-${id}"]`);
  await video.scrollIntoViewIfNeeded();
  // Toca com tentativas: o clique do overlay é o gesto que autoriza o áudio.
  let tocou = false;
  for (let tentativa = 0; tentativa < 3 && !tocou; tentativa++) {
    const tocando = await page
      .locator(`[data-test="briefing-${id}-tocar"]`)
      .isVisible()
      .then(async (visivel) => {
        if (!visivel) return false;
        await page.locator(`[data-test="briefing-${id}-tocar"]`).click();
        await page.waitForTimeout(2500);
        const estado = await video.evaluate((v) => ({
          tempo: v.currentTime,
          pausado: v.paused,
          erro: v.error ? v.error.code : null,
        }));
        return !estado.pausado && estado.tempo > 0 && !estado.erro;
      })
      .catch(() => false);
    tocou = tocando;
  }
  const estado = await video.evaluate((v) => ({
    tempo: v.currentTime,
    pausado: v.paused,
    erro: v.error ? v.error.code : null,
  }));
  resultadoVideos.push({ id, ...estado });
  if (estado.erro) throw new Error(`Vídeo ${id} com erro code=${estado.erro}`);
  if (!tocou || estado.tempo <= 0)
    throw new Error(`Vídeo ${id} não tocou (pausado=${estado.pausado}, t=${estado.tempo})`);
}
console.log("VIDEOS:", JSON.stringify(resultadoVideos));

await browser.close();
console.log("VERIFICACAO LOCAL OK");
