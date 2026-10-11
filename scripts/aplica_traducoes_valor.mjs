/**
 * Insere/atualiza chaves de tradução nos 5 dicionários mantendo a ordem
 * alfabética (mesma collation do gerar-dicionarios.py: localeCompare pt-BR).
 * Idempotente: chave existente é apenas atualizada.
 */
import { readFileSync, writeFileSync } from "node:fs";

const NOVAS = [
  [
    "Valor já arrecadado (R$, opcional)",
    {
      "dic-en": "Amount raised so far (R$, optional)",
      "dic-es": "Valor ya recaudado (R$, opcional)",
      "dic-ja": "すでに集めた金額（R$、任意）",
      "dic-ru": "Уже собранная сумма (R$, необязательно)",
      "dic-zh": "已筹集金额（R$，可选）",
    },
  ],
  [
    "Valor inválido — use um número maior que zero",
    {
      "dic-en": "Invalid amount — use a number greater than zero",
      "dic-es": "Valor inválido — use un número mayor que cero",
      "dic-ja": "無効な金額です — ゼロより大きい数値を入力してください",
      "dic-ru": "Неверная сумма — укажите число больше нуля",
      "dic-zh": "金额无效 — 请输入大于零的数字",
    },
  ],
  [
    "ex.: 25,00",
    {
      "dic-en": "e.g. 25.00",
      "dic-es": "ej.: 25,00",
      "dic-ja": "例: 25.00",
      "dic-ru": "напр. 25,00",
      "dic-zh": "如：25.00",
    },
  ],
  [
    "Já arrecadou",
    {
      "dic-en": "Has raised",
      "dic-es": "Ya aportó",
      "dic-ja": "支援済み",
      "dic-ru": "Уже внёс",
      "dic-zh": "已捐助",
    },
  ],
];

const BASE = "/home/z/my-project/manualdosobrevivente/src/lib/i18n";
const collator = new Intl.Collator("pt-BR");

/** Extrai a chave de uma linha de entrada do dicionário (com ou sem aspas). */
function chaveDaLinha(linha) {
  const m = linha.match(/^  "(.+?)":/s) ?? linha.match(/^  ([A-Za-z0-9À-ſ_]+):/);
  return m ? m[1] : null;
}

function entradaLinha(chave, valor) {
  const k = /^[A-Za-z0-9_]+$/.test(chave) ? chave : JSON.stringify(chave);
  return `  ${k}: ${JSON.stringify(valor)},\n`;
}

for (const dic of ["dic-en", "dic-es", "dic-ja", "dic-ru", "dic-zh"]) {
  const caminho = `${BASE}/${dic}.ts`;
  const linhas = readFileSync(caminho, "utf-8").split("\n");

  // Índice (linha, chave) das entradas de nível superior.
  const entradas = linhas.map((linha, i) => [i, chaveDaLinha(linha)]).filter(([, k]) => k !== null);

  for (const [chave, porDic] of NOVAS) {
    const valor = porDic[dic];
    const existente = entradas.find(([, k]) => k === chave);
    if (existente) {
      // Atualiza o valor mantendo a chave.
      const [i] = existente;
      linhas[i] = entradaLinha(chave, valor).trimEnd();
      console.log(`${dic}: atualizada "${chave}"`);
      continue;
    }
    // Insere antes da primeira chave maior (mantém a ordenação).
    const pos = entradas.findIndex(([, k]) => collator.compare(k, chave) > 0);
    const idx = pos >= 0 ? entradas[pos][0] : linhas.length - 1; // fim: antes do fecho "}\n"
    linhas.splice(idx, 0, entradaLinha(chave, valor).trimEnd());
    console.log(`${dic}: inserida "${chave}"`);
    entradas.splice(pos >= 0 ? pos : entradas.length, 0, [idx, chave]);
    // Reindexa as entradas após a inserção.
    for (let e = 0; e < entradas.length; e++) {
      const [linhaOriginal, k] = entradas[e];
      if (linhaOriginal >= idx) entradas[e] = [linhaOriginal + 1, k];
    }
  }

  writeFileSync(caminho, linhas.join("\n"));
  console.log(`${dic}: salvo`);
}
console.log("OK — 4 chaves × 5 dicionários");
