/**
 * Prova ao vivo (produção) da isenção da vitrine do portão — semana 1.
 *
 * Visitante 100% anônimo (sem storage, sem cookies):
 *   • /colaboradores, /manual e /apoiar abrem SEM o portão de autenticação;
 *   • / (mapa) fica ATRÁS do portão — o núcleo segue trancado.
 */
import { chromium } from "playwright";

const BASE = "https://manualdosobrevivente.vercel.app";
const vitrine = [
  { caminho: "/colaboradores", prova: '[data-test="colaboradores"]' },
  { caminho: "/manual", prova: '[data-test="manual-tutorial-banner"]' },
  { caminho: "/apoiar", prova: "main" },
];

const browser = await chromium.launch({ channel: "chromium" });
let falhas = 0;

for (const rota of vitrine) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${rota.caminho}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(rota.prova, { timeout: 45_000 });
  await page.waitForTimeout(3_000); // margem para o portão aparecer se existir
  const portao = await page.locator('[data-test="portao-auth"]').count();
  const ok = portao === 0;
  if (!ok) falhas++;
  console.log(`${ok ? "OK " : "FALHA"} ${rota.caminho} — portão: ${portao}`);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-test="portao-auth"]', { timeout: 45_000 });
  console.log("OK   / — núcleo trancado pelo portão (como esperado)");
  await context.close();
}

await browser.close();
process.exit(falhas === 0 ? 0 : 1);
