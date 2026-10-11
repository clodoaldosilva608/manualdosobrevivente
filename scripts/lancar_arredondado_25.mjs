/**
 * Lançamento retroativo — "como se todos os apoiadores tivessem contribuído
 * com R$ 25,00 até o momento".
 *
 * O que faz:
 *  1. Snapshot: quantos apoiadores ativos/inativos, quantos já têm valor e soma atual;
 *  2. PATCH manual_apoiadores?ativo=eq.true → valor = 25.00 (sobrescreve o que existir,
 *     que é exatamente o pedido: TODOS com 25,00);
 *  3. Reconsulta e valida: soma dos ativos == nº de ativos × 25.
 *
 * Credenciais vêm SEMPRE do .env (SUPABASE_URL + SUPABASE_SECRET_KEY) — nada de
 * segredo no código (GitHub Push Protection bloqueia commit com sb_secret_).
 *
 * Uso: node scripts/lancar_arredondado_25.mjs [--valor 25] [--reverter]
 *   --reverter  zera o valor (valor = null) de todos os ativos — desfaz o lançamento.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- .env (sem dotenv no escopo do script; parser mínimo) ---
const env = Object.fromEntries(
  readFileSync(join(raiz, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((linha) => /^[A-Z0-9_]+\s*=/.test(linha))
    .map((linha) => {
      const i = linha.indexOf("=");
      let v = linha.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [linha.slice(0, i).trim(), v];
    }),
);

const URL_BASE = env.SUPABASE_URL;
const CHAVE = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !CHAVE) {
  console.error("✗ SUPABASE_URL/SUPABASE_SECRET_KEY ausentes no .env");
  process.exit(1);
}

// --- argumentos ---
const args = process.argv.slice(2);
const pegaArg = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 ? Number(args[i + 1]) : padrao;
};
const VALOR = pegaArg("--valor", 25);
const REVERTER = args.includes("--reverter");

const cabecalhos = {
  apikey: CHAVE,
  Authorization: `Bearer ${CHAVE}`,
  "Content-Type": "application/json",
};

const colunas = "id, nome, ativo, ordem, valor";

async function listarApoiadores() {
  const url = `${URL_BASE}/rest/v1/manual_apoiadores?select=${encodeURIComponent(colunas)}&order=ordem.asc&limit=1000`;
  const resp = await fetch(url, { headers: { ...cabecalhos, Prefer: "count=exact" } });
  if (!resp.ok) throw new Error(`GET ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

const fmt = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function resumo(lista, rotulo) {
  const ativos = lista.filter((a) => a.ativo);
  const comValor = ativos.filter((a) => a.valor != null);
  const soma = ativos.reduce((t, a) => t + Number(a.valor ?? 0), 0);
  console.log(
    `[${rotulo}] total=${lista.length} ativos=${ativos.length} inativos=${lista.length - ativos.length} ` +
      `comValor=${comValor.length} somaAtivos=${fmt(soma)}`,
  );
  return { ativos, soma };
}

console.log(
  `— Lançamento arredondamento: ${REVERTER ? "REVERTER (valor=null)" : `R$ ${VALOR.toFixed(2)}`} —`,
);

// 1) snapshot ANTES
const antes = resumo(await listarApoiadores(), "ANTES");

// 2) PATCH em massa
const corpo = REVERTER ? { valor: null } : { valor: VALOR };
const patchResp = await fetch(
  `${URL_BASE}/rest/v1/manual_apoiadores?ativo=eq.true&select=id,valor`,
  {
    method: "PATCH",
    headers: { ...cabecalhos, Prefer: "return=representation,count=exact" },
    body: JSON.stringify(corpo),
  },
);
if (!patchResp.ok) throw new Error(`PATCH ${patchResp.status}: ${await patchResp.text()}`);
const alteradas = (await patchResp.json()).length;
console.log(`PATCH aplicado em ${alteradas} linha(s) ativa(s).`);

// 3) verificação DEPOIS
const depois = resumo(await listarApoiadores(), "DEPOIS");
const esperado = REVERTER ? 0 : depois.ativos.length * VALOR;
const ok = Math.abs(depois.soma - esperado) < 0.005;
console.log(
  ok
    ? `✓ Verificação OK: soma dos ativos = ${fmt(depois.soma)} (esperado ${fmt(esperado)}).`
    : `✗ Divergência: soma ${fmt(depois.soma)} ≠ esperado ${fmt(esperado)}`,
);
if (!ok) process.exit(2);
console.log("Concluído.");
