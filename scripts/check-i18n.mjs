#!/usr/bin/env node
// Auditoria PT-BR: procura palavras suspeitas em inglês em strings visíveis
// (JSX text, placeholders, aria-labels, toasts, meta head) e valida lang="pt-BR".
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src/routes", "src/components", "src/lib/manual-content.ts", "src/lib/error-page.ts"];

const ALLOW = new Set([
  "mgrs","dd","dms","gpx","kml","wms","wmts","sos","gps","hud","tactical","gis",
  "google","email","e-mail","open","sans","regular","arial","unicode","ms",
  "m","km","ha","kg","g","nm","nmi","ac","m²","ok","id","url","json","png","jpg","svg",
  "utf","viewport","charset","width","height","initial","scale","href","content","type","name","rel","property",
  "app","bug","out","bag","fatwood","cryptosporidium","ranger","frame","point","plow","lean","to","a",
  // categoria/enum keys internas
  "water","shelter","danger","foraging","cache","custom","tools","nutrition","hydration","medical","warmth",
  "first-aid","fire","knots","navigation",
]);

const BAD = /\b(the|and|for|with|save|load|search|weight|expires|download|upload|export|import|layer|waypoint|compass|flashlight|inventory|login|logout|error|success|loading|cancel|confirm|delete|edit|home|about|profile|account|password|submit|send|reset|update|create|remove|category|title|description|notes|date|time|today|distance|speed|altitude|elevation|heading|bearing|north|south|east|west|route|track|marker|menu|back|next|previous|open|close)\b/i;

function walk(p) {
  const s = statSync(p);
  if (s.isFile()) return p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  return readdirSync(p).flatMap((n) => walk(join(p, n)));
}

const files = TARGETS.flatMap((t) => walk(join(ROOT, t)));
const findings = [];

const patterns = [
  /(?:placeholder|title|aria-label|alt|content)\s*=\s*["'`]([^"'`]+)["'`]/g,
  />\s*([A-Za-zÀ-ÿ0-9][^<>{}\n]{2,}?)\s*</g,
  /toast\.(?:success|error|message|info|warning)\(\s*["'`]([^"'`]+)["'`]/g,
  /(?:title|description|content|label)\s*:\s*["'`]([^"'`]+)["'`]/g,
];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const txt = m[1].trim();
      if (!txt || txt.length < 3) continue;
      if (!BAD.test(txt)) continue;
      const words = txt.toLowerCase().match(/[a-zà-ÿ']+/g) || [];
      const suspects = words.filter((w) => BAD.test(w) && !ALLOW.has(w));
      if (!suspects.length) continue;
      const idx = src.slice(0, m.index).split("\n").length;
      findings.push({ file: relative(ROOT, file), line: idx, text: txt, suspects });
    }
  }
}

// Verificar lang="pt-BR" no root
const root = readFileSync(join(ROOT, "src/routes/__root.tsx"), "utf8");
if (!/lang=["']pt-BR["']/.test(root)) {
  findings.push({ file: "src/routes/__root.tsx", line: 0, text: 'missing lang="pt-BR"', suspects: ["lang"] });
}
if (!/og:locale[^]*pt_BR/.test(root)) {
  findings.push({ file: "src/routes/__root.tsx", line: 0, text: "missing og:locale pt_BR", suspects: ["og:locale"] });
}

if (findings.length) {
  console.error(`\n❌ ${findings.length} string(s) suspeita(s) em inglês:\n`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.suspects.join(", ")}]  "${f.text}"`);
  }
  process.exit(1);
}
console.log("✅ i18n OK: nenhuma string suspeita em inglês encontrada.");
