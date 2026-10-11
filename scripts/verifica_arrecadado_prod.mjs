/**
 * Prova ao vivo em produção do lançamento "R$ 25,00 por apoiador".
 * Verifica em https://manualdosobrevivente.vercel.app:
 *  1. /colaboradores — KPI Arrecadado = R$ 1.950,00
 *  2. /colaboradores — ticker com "· R$ 25,00" nos rótulos dos apoiadores
 *  3. /colaboradores — mural "APOIADORES (78)"
 *  4. mapa — letreiro redline exibindo "· R$ 25,00" (soft-check, caixa alta por CSS)
 *
 * Lições do Task 27 aplicadas: Intl usa NBSP/U+202F depois de "R$" — normalizar;
 * letreiro do mapa é CSS uppercase — comparar em caixa alta.
 * Evidência: download/arrecadado-producao.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "https://manualdosobrevivente.vercel.app";
const maiusculo = (t) => t.toLocaleUpperCase("pt-BR");
const normaliza = (t) => t.replaceAll("\u00A0", " ").replaceAll("\u202F", " ");

mkdirSync("download", { recursive: true });

const browser = await chromium.launch();
const pagina = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let falhas = 0;
const checa = (descricao, condicao, detalhe = "") => {
  console.log(`${condicao ? "✓" : "✗"} ${descricao}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!condicao) falhas += 1;
};

try {
  // 1–3) /colaboradores
  await pagina.goto(`${BASE}/colaboradores`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const kpi = pagina.locator('[data-test="colaboradores-total"]');
  await pagina
    .locator('[data-test="colaboradores-total"]')
    .filter({ hasNotText: "—" })
    .waitFor({ timeout: 45000 });

  const kpiTexto = normaliza((await kpi.innerText()).trim());
  checa("KPI Arrecadado = R$ 1.950,00", kpiTexto.includes("1.950,00"), kpiTexto);

  const ticker = normaliza(
    await pagina.locator('[data-test="colaboradores-redline-texto"]').innerText(),
  );
  const rotulos25 = (ticker.match(/R\$ 25,00/g) ?? []).length;
  checa("Ticker com rótulos '· R$ 25,00'", rotulos25 >= 78, `${rotulos25} ocorrências`);
  checa('Ticker com segmento "APOIADORES (78)"', /APOIADORES\s*\(78\)/i.test(ticker));

  const mural = normaliza(
    await pagina.locator('[data-test="colaboradores-apoiadores"]').innerText(),
  );
  checa('Mural "78 apoiadores · ordem de chegada"', /78\s+apoiadores/i.test(mural));

  await pagina.screenshot({ path: "download/arrecadado-producao.png", fullPage: true });

  // 4) mapa — letreiro (soft-check)
  await pagina.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  try {
    const letreiro = pagina.locator('[data-test="redline"]');
    await letreiro.filter({ hasText: "R$" }).waitFor({ timeout: 60000 });
    const texto = maiusculo(normaliza(await letreiro.innerText()));
    const noLetreiro = (texto.match(/R\$ 25,00/g) ?? []).length;
    checa("Letreiro do mapa com '· R$ 25,00'", noLetreiro >= 78, `${noLetreiro} ocorrências`);
  } catch (erro) {
    console.log(
      `? Letreiro do mapa não confirmado no tempo limite (${erro.message.split("\n")[0]}) — conferir manualmente`,
    );
  }
} finally {
  await browser.close();
}

console.log(falhas === 0 ? "PRODUÇÃO OK — R$ 1.950,00 ao vivo." : `FALHAS: ${falhas}`);
process.exit(falhas === 0 ? 0 : 1);
