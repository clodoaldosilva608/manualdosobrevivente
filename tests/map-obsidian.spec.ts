import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

/** Nota gravada pelo sistema de arquivos falso. */
interface Escrita {
  caminho: string;
  nome: string;
  conteudo: string;
}

/**
 * Substitui showDirectoryPicker por um sistema de arquivos em memória e
 * intercepta o IndexedDB para persistir o handle como descritor (handles de
 * pasta não são serializáveis fora dos handles nativos). As escritas ficam em
 * window.__obsidianEscritas para asserções.
 */
async function comFakeSeletor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    const escritas: Array<{ caminho: string; nome: string; conteudo: string }> = [];
    w.__obsidianEscritas = escritas;
    const pastas = new Map<string, Map<string, string>>();
    const arquivosDe = (path: string[]): Map<string, string> => {
      const chave = path.join("/");
      let m = pastas.get(chave);
      if (!m) {
        m = new Map();
        pastas.set(chave, m);
      }
      return m;
    };

    type FakeArq = {
      kind: "file";
      name: string;
      getFile: () => Promise<{ text: () => Promise<string> }>;
      createWritable: () => Promise<{
        write: (d: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    };
    type FakeDir = {
      kind: "directory";
      name: string;
      __fake: true;
      __path: string[];
      queryPermission: () => Promise<PermissionState>;
      requestPermission: () => Promise<PermissionState>;
      getDirectoryHandle: (nome: string) => Promise<FakeDir>;
      getFileHandle: (nome: string) => Promise<FakeArq>;
    };

    const dirDe = (path: string[]): FakeDir => ({
      kind: "directory",
      name: path[path.length - 1] ?? "",
      __fake: true,
      __path: path,
      queryPermission: async () => "granted" as PermissionState,
      requestPermission: async () => "granted" as PermissionState,
      getDirectoryHandle: async (nome: string) => dirDe([...path, nome]),
      getFileHandle: async (nome: string): Promise<FakeArq> => ({
        kind: "file",
        name: nome,
        getFile: async () => ({ text: async () => arquivosDe(path).get(nome) ?? "" }),
        createWritable: async () => {
          const partes: string[] = [];
          return {
            write: async (d: string) => {
              partes.push(d);
            },
            close: async () => {
              const conteudo = partes.join("");
              arquivosDe(path).set(nome, conteudo);
              escritas.push({ caminho: path.join("/"), nome, conteudo });
            },
          };
        },
      }),
    });

    w.showDirectoryPicker = async () => dirDe(["Vault-de-teste"]);

    // IndexedDB: guarda o handle fake como descritor e reconstrói na leitura.
    const origPut = IDBObjectStore.prototype.put as (
      this: IDBObjectStore,
      valor: unknown,
      ...resto: unknown[]
    ) => IDBRequest;
    IDBObjectStore.prototype.put = function (valor: unknown, ...resto: unknown[]) {
      if (valor && typeof valor === "object" && (valor as FakeDir).__fake === true) {
        return origPut.call(this, { __fakeDirPath: (valor as FakeDir).__path }, ...resto);
      }
      return origPut.call(this, valor, ...resto);
    } as typeof IDBObjectStore.prototype.put;

    const origGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (chave: IDBValidKey) {
      const req = origGet.call(this, chave);
      req.addEventListener("success", () => {
        const r = req.result as { __fakeDirPath?: string[] } | undefined;
        if (r && Array.isArray(r.__fakeDirPath)) {
          Object.defineProperty(req, "result", {
            value: dirDe(r.__fakeDirPath),
            configurable: true,
          });
        }
      });
      return req;
    };
  });
}

async function escritasDaPagina(page: Page): Promise<Escrita[]> {
  return page.evaluate(() => {
    return (window as unknown as { __obsidianEscritas: Escrita[] }).__obsidianEscritas;
  });
}

async function dispensarOnboarding(page: Page): Promise<void> {
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
}

describe("integração Obsidian", () => {
  it("explica o Obsidian, conecta pasta e sincroniza notas", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await comFakeSeletor(page);
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    await dispensarOnboarding(page);

    // Explicação sobre o que é o Obsidian sempre visível (usuário sem o app).
    const cartao = page.locator('[data-test="obsidian-card"]');
    await cartao.waitFor({ state: "visible" });
    await cartao.getByText("O que é o Obsidian?").waitFor({ state: "visible" });
    await cartao.locator("summary").click();
    await cartao.getByText("aplicativo de anotações").waitFor({ state: "visible" });

    // Conectar: cria a pasta do app dentro do vault escolhido.
    await page.locator('[data-test="obsidian-conectar"]').click();
    await page
      .locator('[data-test="obsidian-estado"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    const estadoTxt = (await page.locator('[data-test="obsidian-estado"]').textContent()) ?? "";
    expect(estadoTxt).toContain("Manual do Sobrevivente");
    expect(estadoTxt).toContain("Vault-de-teste");

    // LEIA-ME gravado dentro de Vault-de-teste/Manual do Sobrevivente.
    const escritasConexao = await escritasDaPagina(page);
    const leiaMe = escritasConexao.find((e) => e.nome === "LEIA-ME.md");
    expect(leiaMe).toBeTruthy();
    expect(leiaMe!.caminho).toBe("Vault-de-teste/Manual do Sobrevivente");
    expect(leiaMe!.conteudo).toContain("Waypoints/");

    // Sincronizar agora (sem waypoints no banco — grava e mostra contagem zero).
    await page.locator('[data-test="obsidian-sincronizar"]').click();
    await page.getByText("Sincronizado: 0 waypoints como notas").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    // Desconectar pede confirmação (dialog aceito) e volta ao estado vazio.
    page.on("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "Desconectar pasta" }).click();
    await cartao.getByText("Nenhuma pasta conectada").waitFor({ state: "visible" });

    await context.close();
  }, 120_000);

  it("boletim salva nota no Obsidian quando a pasta está conectada", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await comFakeSeletor(page);
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    await dispensarOnboarding(page);

    // Conecta em Ajustes e volta ao mapa.
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-test="obsidian-conectar"]').click();
    await page.locator('[data-test="obsidian-estado"]').waitFor({ state: "visible" });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });

    // Abre o boletim e salva a nota.
    await page.locator('button[title="Boletim"]').click();
    await page.getByText("BOLETIM DE INTELIGÊNCIA").waitFor({ state: "visible" });
    await page.locator('[data-test="boletim-obsidian"]').click();
    await page.getByText("Boletim salvo como nota no Obsidian").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    const escritas = await escritasDaPagina(page);
    const nota = escritas.find((e) => e.caminho.includes("Boletins"));
    expect(nota).toBeTruthy();
    expect(nota!.nome.startsWith("boletim-")).toBe(true);
    expect(nota!.conteudo).toContain("# Boletim de inteligência");
    expect(nota!.conteudo).toContain("---");

    await context.close();
  }, 120_000);

  it("navegador sem seletor de pastas mostra alternativas e sem botão conectar", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      Object.defineProperty(w, "showDirectoryPicker", {
        get: () => undefined,
        configurable: true,
      });
    });
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    await dispensarOnboarding(page);

    const cartao = page.locator('[data-test="obsidian-card"]');
    await cartao.waitFor({ state: "visible" });
    // A explicação sobre a funcionalidade continua visível (pedido do usuário).
    await cartao.getByText("O que é o Obsidian?").waitFor({ state: "visible" });
    await cartao.getByText("não permite gravar em pastas").waitFor({ state: "visible" });
    const botoesConectar = await page.locator('[data-test="obsidian-conectar"]').count();
    expect(botoesConectar).toBe(0);

    await context.close();
  }, 120_000);
});
