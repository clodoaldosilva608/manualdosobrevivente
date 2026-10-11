/**
 * Verificação ao vivo: os apoiadores do BANCO (manual_apoiadores) aparecem
 * nas duas redlines — letreiro do mapa e página /colaboradores — com o
 * VALOR já arrecadado de cada um e o total ARRECADADO.
 *
 * Provas:
 *   1. "Ricardo Menezes" é o apoiador de ordem 1 no banco e NÃO existe na
 *      lista semente estática — se aparece no letreiro, o banco alimenta a
 *      redline de verdade.
 *   2. Um apoiador TEMPORÁRIO com valor (inserido antes e removido depois)
 *      prova que o valor passa nos letreiros e entra no total arrecadado.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
/** Nome presente no banco (ordem 1) e AUSENTE da semente estática. */
const NOME_DO_BANCO = "Ricardo Menezes";
/** Nome presente na semente estática e AUSENTE do banco — só no fallback offline. */
const NOME_DA_SEMENTE = "Renata Farias";

/* Apoiador temporário que carrega o valor de prova (removido no afterAll).
 * A chave de escrita vem do ambiente/.env (gitignored) — JAMAIS embutida no
 * código: o GitHub Push Protection bloqueia pushes com segredo no conteúdo. */
function lerEnv(chave: string): string {
  try {
    const linha = readFileSync(join(process.cwd(), ".env"), "utf-8")
      .split("\n")
      .find((l) => l.startsWith(`${chave}=`));
    return linha ? linha.slice(chave.length + 1).trim() : "";
  } catch {
    return "";
  }
}
const CHAVE_SUPABASE =
  process.env["SUPABASE_SECRET_KEY"] ??
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  lerEnv("SUPABASE_SECRET_KEY") ??
  lerEnv("SUPABASE_SERVICE_ROLE_KEY");
const URL_SUPABASE = process.env["VITE_SUPABASE_URL"] ?? "https://mbterwktxczsyevcudoz.supabase.co";
const TESTE_NOME = "Operador Teste Redline";
const TESTE_VALOR = 25;
let testeId: string | null = null;

async function inserirApoiadorDeTeste(): Promise<void> {
  if (!CHAVE_SUPABASE) {
    throw new Error(
      "SUPABASE_SECRET_KEY ausente no ambiente — defina no .env para semear o apoiador de teste",
    );
  }
  const resp = await fetch(`${URL_SUPABASE}/rest/v1/manual_apoiadores`, {
    method: "POST",
    headers: {
      apikey: CHAVE_SUPABASE,
      Authorization: `Bearer ${CHAVE_SUPABASE}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      nome: TESTE_NOME,
      cidade: "Testelândia",
      nivel: "apoiador",
      ativo: true,
      ordem: 9999,
      valor: TESTE_VALOR,
    }),
  });
  if (!resp.ok) throw new Error(`seed falhou: ${resp.status} ${await resp.text()}`);
  const linha = (await resp.json())[0] as { id: string };
  testeId = linha.id;
}

async function removerApoiadorDeTeste(): Promise<void> {
  if (!testeId) return;
  await fetch(`${URL_SUPABASE}/rest/v1/manual_apoiadores?id=eq.${testeId}`, {
    method: "DELETE",
    headers: { apikey: CHAVE_SUPABASE, Authorization: `Bearer ${CHAVE_SUPABASE}` },
  });
  testeId = null;
}

/** O letreiro renderiza em CAIXA ALTA por CSS (uppercase): innerText reflete isso. */
function maiusculo(texto: string): string {
  return texto.toLocaleUpperCase("pt-BR");
}

/** Intl.NumberFormat usa espaço inseparável depois de "R$": normaliza para comparar. */
function espacosNormais(texto: string): string {
  return texto.replace(/[\u00a0\u202f]/g, " ");
}

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
  await inserirApoiadorDeTeste();
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await removerApoiadorDeTeste();
});

describe("Apoiadores do banco nas redlines", () => {
  it.retry = 1;

  it("letreiro do mapa traz os apoiadores do banco (não a semente)", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    const pular = page.getByRole("button", { name: "Pular configuração" });
    const apareceu = await pular
      .waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (apareceu) await pular.click();
    const redline = page.locator('[data-test="redline"]');
    await redline.waitFor({ state: "visible", timeout: 15_000 });

    // O segmento COLABORADORES entra no letreiro…
    await expect
      .poll(async () => (await redline.innerText()).includes("COLABORADORES ("), {
        timeout: 30_000,
        intervals: [500],
      })
      .toBe(true);
    // …com o nome do banco (que só existe lá)…
    await expect
      .poll(async () => (await redline.innerText()).includes(maiusculo(NOME_DO_BANCO)), {
        timeout: 30_000,
        intervals: [500],
      })
      .toBe(true);

    const texto = await redline.innerText();
    expect(texto).toContain(maiusculo(NOME_DO_BANCO));
    // e a semente estática sai de cena quando o banco responde.
    expect(texto).not.toContain(maiusculo(NOME_DA_SEMENTE));
    await context.close();
  }, 180_000);

  it("letreiro do mapa mostra ARRECADADO com o valor do apoiador de teste", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    const pular = page.getByRole("button", { name: "Pular configuração" });
    const apareceu = await pular
      .waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (apareceu) await pular.click();
    const redline = page.locator('[data-test="redline"]');
    await redline.waitFor({ state: "visible", timeout: 15_000 });

    // O total ARRECADADO entra no letreiro com os R$ do apoiador de teste.
    await expect
      .poll(
        async () => {
          const t = await redline.innerText();
          return t.includes("ARRECADADO") && t.includes("25,00");
        },
        { timeout: 45_000, intervals: [500] },
      )
      .toBe(true);
    // O apoiador com valor registrado passa com "Nome · R$ 25,00" (caixa alta via CSS).
    const texto = await redline.innerText();
    expect(texto).toContain(maiusculo(TESTE_NOME));
    expect(texto).toContain("25,00");
    await context.close();
  }, 180_000);

  it("página /colaboradores: ticker traz APOIADORES do banco e o valor do teste", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/colaboradores`, { waitUntil: "domcontentloaded" });
    const ticker = page.locator('[data-test="colaboradores-redline-texto"]');
    await expect
      .poll(async () => (await ticker.innerText().catch(() => "")).includes("APOIADORES (79)"), {
        timeout: 30_000,
        intervals: [500],
      })
      .toBe(true);
    const texto = await ticker.innerText();
    expect(texto).toContain("APOIADORES (79)"); // 78 da semente + 1 de teste
    expect(texto).toContain(NOME_DO_BANCO);
    // O valor já arrecadado acompanha o nome no letreiro (ticker sem CSS uppercase).
    expect(espacosNormais(texto)).toContain(`${TESTE_NOME} · R$ 25,00`);
    // O KPI Arrecadado inclui o valor do apoiador (R$ 25,00 do teste).
    const kpi = page.locator('[data-test="colaboradores-total"]');
    await expect(kpi.innerText()).resolves.toContain("25,00");
    // mural segue presente com os 79 chips
    await page.locator('[data-test="colaboradores-apoiadores"]').waitFor({ timeout: 15_000 });
    await context.close();
  }, 180_000);
});
