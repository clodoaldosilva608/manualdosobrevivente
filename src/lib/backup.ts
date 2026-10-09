/**
 * Backup em pasta do usuário (File System Access API).
 *
 * O usuário escolhe (ou cria) uma pasta no aparelho; o aplicativo guarda o
 * "handle" da pasta no IndexedDB e escreve automaticamente um snapshot JSON
 * com waypoints, mochila, checklist e preferências.
 *
 * Rotativa: a cada escrita, o backup atual vai para `backup-anterior.json`,
 * garantindo recuperação caso uma escrita corrompa o arquivo principal.
 *
 * Compatibilidade: Chrome/Edge/Android (suportado). Safari/iOS/Firefox não
 * expõem showDirectoryPicker — nesses aparelhos o app oferece exportar/importar
 * arquivo manualmente em Ajustes.
 */
import {
  listWaypoints,
  listGear,
  listMochilas,
  listChecklist,
  listContas,
  listNotas,
  getSetting,
  setSetting,
  saveWaypoint,
  saveGear,
  saveMochila,
  saveConta,
  saveNota,
  putChecklistState,
} from "@/lib/db";

export const BACKUP_HANDLE_KEY = "backup-folder-handle";
export const BACKUP_LAST_AT_KEY = "backup-last-at";
export const BACKUP_ARQUIVO = "backup-manual-do-sobrevivente.json";
export const BACKUP_ARQUIVO_ANTERIOR = "backup-manual-do-sobrevivente-anterior.json";
export const LEIA_ME = "LEIA-ME.txt";
const APP_ID = "manual-do-sobrevivente";
const VERSAO_BACKUP = 4;

/* Tipos mínimos da File System Access API (nem todos estão no lib.dom). */
interface OpcoesDirectoryPicker {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: string;
}
export type HandlePasta = FileSystemDirectoryHandle & {
  queryPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
};

export function seletorPastaSuportado(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      "function"
  );
}

/** Verifica (e opcionalmente pede) permissão de leitura/escrita na pasta. */
export async function pegarPermissao(
  handle: HandlePasta,
  solicitar: boolean,
): Promise<"granted" | "denied" | "prompt"> {
  if (!handle.queryPermission) return solicitar ? "granted" : "denied";
  const atual = await handle.queryPermission({ mode: "readwrite" });
  if (atual === "granted") return "granted";
  if (!solicitar || !handle.requestPermission) return atual === "prompt" ? "prompt" : atual;
  return (await handle.requestPermission({ mode: "readwrite" })) === "granted"
    ? "granted"
    : "denied";
}

/** Abre o seletor nativo para o usuário criar/escolher a pasta de backup. */
export async function escolherPastaBackup(): Promise<FileSystemDirectoryHandle> {
  const picker = (
    window as unknown as {
      showDirectoryPicker: (o?: OpcoesDirectoryPicker) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  const handle = (await picker({
    id: "backup-manual-do-sobrevivente",
    mode: "readwrite",
    startIn: "documents",
  })) as HandlePasta;
  const permissao = await pegarPermissao(handle, true);
  if (permissao !== "granted") {
    throw new Error("Permissão de escrita na pasta negada");
  }
  await setSetting(BACKUP_HANDLE_KEY, handle);
  return handle;
}

export async function obterPastaBackup(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await getSetting<FileSystemDirectoryHandle>(BACKUP_HANDLE_KEY);
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function desconectarPastaBackup(): Promise<void> {
  const db = await import("@/lib/db").then((m) => m.getDB());
  await db.delete("settings", BACKUP_HANDLE_KEY);
}

/** Estado da pasta guardada: "conectada" | "precisa-permissao" | "sem-pasta". */
export async function estadoPastaBackup(): Promise<{
  estado: "conectada" | "precisa-permissao" | "sem-pasta";
  nome: string | null;
}> {
  const handle = await obterPastaBackup();
  if (!handle) return { estado: "sem-pasta", nome: null };
  const permissao = await pegarPermissao(handle as HandlePasta, false);
  return {
    estado: permissao === "granted" ? "conectada" : "precisa-permissao",
    nome: handle.name ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

export interface BundleBackup {
  app: string;
  versao: number;
  gerado_em: string;
  waypoints: Array<Record<string, unknown>>;
  mochilas: Array<Record<string, unknown>>;
  mochila: Array<Record<string, unknown>>;
  checklist: Array<Record<string, unknown>>;
  /** Contas locais (com hash PBKDF2 — nunca a senha em claro). Desde a versão 3. */
  contas?: Array<Record<string, unknown>>;
  /** Notas de campo. Desde a versão 4. */
  notas?: Array<Record<string, unknown>>;
  preferencias: unknown;
  contagens: { waypoints: number; mochila: number; checklist: number };
}

export async function montarBundle(): Promise<BundleBackup> {
  const [waypoints, mochila, mochilas, checklist, contas, notas, preferencias] = await Promise.all([
    listWaypoints(),
    listGear(),
    listMochilas(),
    listChecklist(),
    listContas(),
    listNotas(),
    getSetting("preferences"),
  ]);
  return {
    app: APP_ID,
    versao: VERSAO_BACKUP,
    gerado_em: new Date().toISOString(),
    waypoints: waypoints as unknown as Array<Record<string, unknown>>,
    mochilas: mochilas as unknown as Array<Record<string, unknown>>,
    mochila: mochila as unknown as Array<Record<string, unknown>>,
    checklist: checklist as unknown as Array<Record<string, unknown>>,
    contas: contas as unknown as Array<Record<string, unknown>>,
    notas: notas as unknown as Array<Record<string, unknown>>,
    preferencias: preferencias ?? null,
    contagens: {
      waypoints: waypoints.length,
      mochila: mochila.length,
      checklist: checklist.length,
    },
  };
}

export function bundleEstaVazio(b: BundleBackup): boolean {
  return b.contagens.waypoints + b.contagens.mochila + b.contagens.checklist === 0;
}

/** Escreve um arquivo de texto dentro de uma pasta (cria/substitui). */
export async function escreverArquivo(
  handle: FileSystemDirectoryHandle,
  nome: string,
  conteudo: string,
) {
  const arquivo = await handle.getFileHandle(nome, { create: true });
  const stream = await arquivo.createWritable();
  await stream.write(conteudo);
  await stream.close();
}

/**
 * Escreve o snapshot na pasta (com rotação do backup anterior).
 * `forcar` = true ignora a proteção contra sobrescrever um backup cheio com dados vazios.
 */
export async function gravarBackupNaPasta(
  handle?: FileSystemDirectoryHandle | null,
  opcoes: { forcar?: boolean } = {},
): Promise<BundleBackup> {
  const pasta = handle ?? (await obterPastaBackup());
  if (!pasta) throw new Error("Nenhuma pasta de backup conectada");
  const permissao = await pegarPermissao(pasta as HandlePasta, !handle);
  if (permissao !== "granted") throw new Error("Permissão de escrita na pasta negada");

  const bundle = await montarBundle();

  // Proteção: backup automático nunca zera um backup existente com dados.
  if (!opcoes.forcar && bundleEstaVazio(bundle)) {
    try {
      const atual = await pasta.getFileHandle(BACKUP_ARQUIVO, { create: false });
      const texto = await (await atual.getFile()).text();
      const anterior = JSON.parse(texto) as BundleBackup;
      if (anterior?.app === APP_ID && !bundleEstaVazio(anterior)) {
        await setSetting(BACKUP_LAST_AT_KEY, Date.now());
        return anterior;
      }
    } catch {
      /* sem backup anterior — segue e grava o estado vazio */
    }
  }

  // Rotação: backup atual vira "anterior".
  try {
    const atual = await pasta.getFileHandle(BACKUP_ARQUIVO, { create: false });
    const texto = await (await atual.getFile()).text();
    await escreverArquivo(pasta, BACKUP_ARQUIVO_ANTERIOR, texto);
  } catch {
    /* primeiro backup — não há anterior */
  }

  await escreverArquivo(pasta, BACKUP_ARQUIVO, JSON.stringify(bundle, null, 2));
  try {
    await pasta.getFileHandle(LEIA_ME, { create: false });
  } catch {
    await escreverArquivo(pasta, LEIA_ME, textoLeiaMe());
  }
  await setSetting(BACKUP_LAST_AT_KEY, Date.now());
  return bundle;
}

function textoLeiaMe(): string {
  return [
    "Manual do Sobrevivente — TacticalGIS",
    "=====================================",
    "",
    "Esta pasta é o backup do seu aplicativo.",
    "",
    `• ${BACKUP_ARQUIVO} — snapshot mais recente (waypoints, mochila,`,
    "  checklist e preferências).",
    `• ${BACKUP_ARQUIVO_ANTERIOR} — cópia da versão anterior do backup.`,
    "",
    "Para restaurar: abra o aplicativo → Ajustes → Pasta de backup →",
    "'Restaurar do backup' e escolha esta pasta.",
    "",
    `Gerado automaticamente pelo aplicativo em ${new Date().toLocaleString("pt-BR")}.`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Restauração (mesclagem — o registro mais recente vence)             */
/* ------------------------------------------------------------------ */

export interface ResultadoRestauracao {
  waypoints: number;
  mochilas: number;
  mochila: number;
  checklist: number;
  /** Contas locais importadas (0 quando o aparelho já tinha conta). */
  contas: number;
  /** Notas de campo importadas (0 quando o backup é anterior à v4). */
  notas: number;
  gerado_em: string | null;
}

export async function restaurarDaPasta(
  handle?: FileSystemDirectoryHandle | null,
): Promise<ResultadoRestauracao> {
  const pasta = handle ?? (await obterPastaBackup());
  if (!pasta) throw new Error("Nenhuma pasta de backup conectada");
  const permissao = await pegarPermissao(pasta as HandlePasta, !handle);
  if (permissao !== "granted") throw new Error("Permissão de leitura na pasta negada");

  let texto: string;
  try {
    const arquivo = await pasta.getFileHandle(BACKUP_ARQUIVO, { create: false });
    texto = await (await arquivo.getFile()).text();
  } catch {
    throw new Error("Arquivo de backup não encontrado na pasta");
  }
  const bundle = JSON.parse(texto) as BundleBackup;
  if (bundle?.app !== APP_ID || typeof bundle.versao !== "number") {
    throw new Error("Arquivo de backup inválido");
  }

  let wp = 0;
  for (const bruto of bundle.waypoints ?? []) {
    const r = bruto as unknown as Parameters<typeof saveWaypoint>[0];
    if (!r?.id || typeof r.latitude !== "number" || typeof r.longitude !== "number") continue;
    await saveWaypoint({ ...r, dirty: false });
    wp++;
  }
  let mochilas = 0;
  for (const bruto of bundle.mochilas ?? []) {
    const m = bruto as unknown as Parameters<typeof saveMochila>[0];
    if (!m?.id || typeof m.nome !== "string") continue;
    await saveMochila({ ...m, dirty: false } as Parameters<typeof saveMochila>[0]);
    mochilas++;
  }
  let gear = 0;
  for (const bruto of bundle.mochila ?? []) {
    const g = bruto as unknown as Parameters<typeof saveGear>[0];
    if (!g?.id || typeof g.name !== "string") continue;
    await saveGear({ ...g, dirty: false });
    gear++;
  }
  let check = 0;
  for (const c of bundle.checklist ?? []) {
    const item = c as { key?: string; done?: boolean; updated_at?: number };
    if (!item?.key) continue;
    await putChecklistState({
      key: item.key,
      done: Boolean(item.done),
      updated_at: item.updated_at ?? Date.now(),
    });
    check++;
  }
  // Contas: só entram se o aparelho não tiver nenhuma — a conta local atual
  // sempre vence (evita sobrescrever o cadastro deste aparelho com o do backup).
  let contasRestauradas = 0;
  const locais = await listContas();
  if (!locais.length) {
    for (const bruto of bundle.contas ?? []) {
      const c = bruto as unknown as Parameters<typeof saveConta>[0];
      if (!c?.id || typeof c.email !== "string" || typeof c.senha_hash !== "string") continue;
      await saveConta({ ...c });
      contasRestauradas++;
    }
  }
  let notasRestauradas = 0;
  for (const bruto of bundle.notas ?? []) {
    const n = bruto as unknown as Parameters<typeof saveNota>[0];
    if (!n?.id || typeof n.titulo !== "string") continue;
    await saveNota({ ...n, etiquetas: Array.isArray(n.etiquetas) ? n.etiquetas : [] });
    notasRestauradas++;
  }
  if (bundle.preferencias && typeof bundle.preferencias === "object") {
    await setSetting("preferences", bundle.preferencias);
  }

  return {
    waypoints: wp,
    mochilas,
    mochila: gear,
    checklist: check,
    contas: contasRestauradas,
    notas: notasRestauradas,
    gerado_em: bundle.gerado_em ?? null,
  };
}

export async function obterUltimoBackupAt(): Promise<number | null> {
  try {
    return (await getSetting<number>(BACKUP_LAST_AT_KEY)) ?? null;
  } catch {
    return null;
  }
}
