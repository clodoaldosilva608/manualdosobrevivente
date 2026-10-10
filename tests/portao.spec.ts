/**
 * Portão de Autenticação — o app só abre autenticado (após o vídeo).
 *
 * Este spec sobe UM servidor Vite próprio na porta 8081 com o portão ATIVO
 * (VITE_PORTAO_AUTH=1 — os demais testes rodam com o portão desligado no
 * .env local). Nada de nuvem: a sessão "válida" é fabricada no localStorage
 * (o supabase-js resolve getSession localmente, sem rede).
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";

const BASE = "http://localhost:8081";
const CHAVE_SESSAO = "sb-mbterwktxczsyevcudoz-auth-token";

let browser: Browser;
let servidor: ChildProcess | null = null;

async function esperarServidor(url: string, tentativas = 90): Promise<void> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`servidor de teste não respondeu em ${url}`);
}

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
  servidor = spawn(
    process.execPath === process.argv[0] ? "bun" : "bun",
    ["run", "dev", "--port", "8081", "--strictPort"],
    {
      cwd: process.cwd(),
      env: { ...process.env, VITE_PORTAO_AUTH: "1" },
      stdio: "ignore",
      detached: false,
    },
  );
  await esperarServidor(BASE);
}, 150_000);

afterAll(async () => {
  await browser?.close();
  servidor?.kill("SIGTERM");
});

/** Sessão falsa (mas estruturalmente válida) injetada antes do app subir. */
function injetarSessao(page: Page) {
  return page.addInitScript(
    ({ chave }) => {
      localStorage.setItem(
        chave,
        JSON.stringify({
          access_token: "sessao-de-teste",
          refresh_token: "refresh-de-teste",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: "usuario-de-teste",
            aud: "authenticated",
            email: "teste@local",
            app_metadata: { provider: "email", providers: ["email"] },
            user_metadata: { nome: "Operador de Teste" },
            created_at: new Date().toISOString(),
          },
        }),
      );
    },
    { chave: CHAVE_SESSAO },
  );
}

describe("portão de autenticação", () => {
  it("sem sessão, o mapa fica atrás do portão de login/cadastro", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-test="portao-auth"]', { timeout: 30_000 });
    await page.waitForSelector('[data-test="formulario-login"]', { timeout: 10_000 });
    // O formulário nasce no modo entrar.
    const entrar = page.getByRole("button", { name: "Entrar", exact: true });
    await entrar.waitFor({ state: "visible", timeout: 10_000 });
    await context.close();
  }, 120_000);

  it("alternar para cadastro pede o nome de exibição", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-test="login-alternar"]', { timeout: 30_000 });
    // Clique por coordenadas com retentativa: sob paralelismo, a heurística
    // de eventos do Playwright oscila com o WebGL pesado do mapa por trás.
    let virouCadastro = false;
    for (let i = 0; i < 3 && !virouCadastro; i++) {
      const alternar = await page.locator('[data-test="login-alternar"]').boundingBox();
      if (!alternar) break;
      await page.mouse.click(alternar.x + alternar.width / 2, alternar.y + alternar.height / 2);
      virouCadastro = await page
        .locator('[data-test="login-nome"]')
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
    }
    expect(virouCadastro, "alternou para o modo cadastro").toBe(true);
    // A etapa de verificação de e-mail só aparece depois de cadastrar — o
    // formulário em si permanece na etapa credenciais.
    await page.locator('[data-test="login-email"]').waitFor({ state: "visible" });
    await context.close();
  }, 120_000);

  it("a rota /login continua acessível sem o portão por cima", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-test="formulario-login"]', { timeout: 30_000 });
    const portao = await page.locator('[data-test="portao-auth"]').count();
    expect(portao).toBe(0);
    await context.close();
  }, 120_000);

  it("com sessão, o portão libera o mapa (persistência da autenticação)", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await injetarSessao(page);
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 45_000 });
    // O portão não pode existir — a sessão liberou o aplicativo.
    await page.waitForTimeout(2_500);
    const portao = await page.locator('[data-test="portao-auth"]').count();
    expect(portao).toBe(0);
    // Recarga: a sessão persiste e o mapa segue aberto.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 45_000 });
    await page.waitForTimeout(2_500);
    expect(await page.locator('[data-test="portao-auth"]').count()).toBe(0);
    await context.close();
  }, 180_000);
});
