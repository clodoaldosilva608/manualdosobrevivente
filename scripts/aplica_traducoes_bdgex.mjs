/**
 * Insere/atualiza chaves de tradução nos 5 dicionários mantendo a ordem
 * alfabética (mesma collation do gerar-dicionarios.py: localeCompare pt-BR).
 * Idempotente: chave existente é apenas atualizada.
 * Chaves da integração BDGEx (Carta do Exército) no mapa tático.
 */
import { readFileSync, writeFileSync } from "node:fs";

const NOVAS = [
  [
    "Carta do Exército",
    {
      "dic-en": "Army Map Sheet",
      "dic-es": "Carta del Ejército",
      "dic-ja": "陸軍の地形図",
      "dic-ru": "Карта армии",
      "dic-zh": "陆军地形图",
    },
  ],
  [
    "Carta do Exército indisponível no mapa",
    {
      "dic-en": "Army map sheet unavailable on the map",
      "dic-es": "Carta del Ejército no disponible en el mapa",
      "dic-ja": "陸軍の地形図は地図上で利用できません",
      "dic-ru": "Карта армии недоступна на карте",
      "dic-zh": "陆军地形图在地图上不可用",
    },
  ],
  [
    "O servidor do BDGEx recusou o carregamento direto (bloqueio de rede ou CORS). Use a carta no aplicativo oficial do Exército com a mesma visão atual.",
    {
      "dic-en":
        "The BDGEx server refused direct loading (network block or CORS). View the map sheet in the official Army app with the same current view.",
      "dic-es":
        "El servidor del BDGEx rechazó la carga directa (bloqueo de red o CORS). Use la carta en la aplicación oficial del Ejército con la misma vista actual.",
      "dic-ja":
        "BDGExサーバーが直接読み込みを拒否しました（ネットワークブロックまたはCORS）。現在の表示のまま、陸軍の公式アプリで地図をご利用ください。",
      "dic-ru":
        "Сервер BDGEx отклонил прямую загрузку (сетевая блокировка или CORS). Откройте карту в официальном приложении армии с тем же текущим видом.",
      "dic-zh":
        "BDGEx服务器拒绝了直接加载（网络封锁或CORS）。请在陆军官方应用中查看同一视野的地图。",
    },
  ],
  [
    "Abrir carta embutida",
    {
      "dic-en": "Open embedded map sheet",
      "dic-es": "Abrir carta integrada",
      "dic-ja": "埋め込み地図を開く",
      "dic-ru": "Открыть встроенную карту",
      "dic-zh": "打开内嵌地图",
    },
  ],
  [
    "Abrir app oficial",
    {
      "dic-en": "Open official app",
      "dic-es": "Abrir aplicación oficial",
      "dic-ja": "公式アプリを開く",
      "dic-ru": "Открыть официальное приложение",
      "dic-zh": "打开官方应用",
    },
  ],
  [
    "Dispensar",
    {
      "dic-en": "Dismiss",
      "dic-es": "Descartar",
      "dic-ja": "解除",
      "dic-ru": "Скрыть",
      "dic-zh": "关闭",
    },
  ],
  [
    "BDGEx — Banco de Dados Geográficos do Exército",
    {
      "dic-en": "BDGEx — Brazilian Army Geographic Database",
      "dic-es": "BDGEx — Base de Datos Geográfica del Ejército",
      "dic-ja": "BDGEx — 陸軍地理データベース",
      "dic-ru": "BDGEx — Географическая база данных армии",
      "dic-zh": "BDGEx — 陆军地理数据库",
    },
  ],
  [
    "Nova aba",
    {
      "dic-en": "New tab",
      "dic-es": "Nueva pestaña",
      "dic-ja": "新しいタブ",
      "dic-ru": "Новая вкладка",
      "dic-zh": "新标签页",
    },
  ],
  [
    "Fechar carta do Exército",
    {
      "dic-en": "Close Army map sheet",
      "dic-es": "Cerrar carta del Ejército",
      "dic-ja": "陸軍の地図を閉じる",
      "dic-ru": "Закрыть карту армии",
      "dic-zh": "关闭陆军地图",
    },
  ],
  [
    "Fechar",
    {
      "dic-en": "Close",
      "dic-es": "Cerrar",
      "dic-ja": "閉じる",
      "dic-ru": "Закрыть",
      "dic-zh": "关闭",
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
console.log("OK — 10 chaves × 5 dicionários");
