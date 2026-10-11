/* Depuração: o que o letreiro do mapa realmente exibe e se a consulta do
 * banco dispara/falha na página do mapa. */
import { chromium } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const NOME_DO_BANCO = "Ricardo Menezes";
const NOME_DO_BANCO_MAIUSCULO = NOME_DO_BANCO.toLocaleUpperCase("pt-BR");

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

page.on("console", (msg) => {
  const t = msg.text();
  if (t.includes("apoiador") || t.includes("manual_apoiadores") || t.includes("Error"))
    console.log("[console]", msg.type(), t.slice(0, 300));
});
page.on("request", (req) => {
  if (req.url().includes("manual_apoiadores"))
    console.log("[req]", req.method(), req.url().slice(0, 160));
});
page.on("response", (res) => {
  if (res.url().includes("manual_apoiadores"))
    console.log("[res]", res.status(), res.url().slice(0, 160));
});
page.on("pageerror", (err) => console.log("[pageerror]", err.stack?.slice(0, 900) ?? String(err)));

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
const pular = page.getByRole("button", { name: "Pular configuração" });
if (
  await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false)
) {
  await pular.click();
}
const redline = page.locator('[data-test="redline"]');
await redline.waitFor({ state: "visible", timeout: 15_000 });

for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(5_000);
  const texto = await redline.innerText();
  const temCabecalho = texto.includes("COLABORADORES (");
  const temBanco = texto.includes(NOME_DO_BANCO_MAIUSCULO);
  const m = texto.match(/COLABORADORES \(\d+\)[^•]*•[^•]*•[^•]*/);
  console.log(
    `t=${(i + 1) * 5}s cabecalho=${temCabecalho} banco=${temBanco} inicio="${m ? m[0].slice(0, 120) : "?"}"`,
  );
  if (temBanco) break;
}
await browser.close();
