/**
 * Integração com o Obsidian — o aplicativo escreve notas Markdown direto na
 * pasta do "vault" (baú de notas) do usuário.
 *
 * Como funciona: o Obsidian é, no fim das contas, uma pasta cheia de arquivos
 * .md. O app pede ao usuário uma pasta (de preferência o vault dele), cria a
 * subpasta "Manual do Sobrevivente" dentro dela e grava lá as notas — o
 * Obsidian reindexa sozinho. Nada passa por servidor: escrita local direta
 * (File System Access API), igual ao backup em pasta (src/lib/backup.ts).
 *
 * Degradê gracioso em três níveis:
 *  1. Pasta conectada (Chrome/Edge, PC e Android) — gravação direta;
 *  2. Esquema obsidian:// (Obsidian instalado) — cria a nota pelo URI;
 *  3. Baixar .md — funciona em qualquer navegador.
 */
import { getSetting, setSetting, listWaypoints, type LocalWaypoint } from "@/lib/db";
import {
  escreverArquivo,
  pegarPermissao,
  seletorPastaSuportado,
  type HandlePasta,
} from "@/lib/backup";
import { formatDMS, formatMGRS } from "@/lib/coords";
import { formatInteger, formatNumber } from "@/lib/format";
import type {
  IntelAlerta,
  IntelAr,
  IntelClima,
  IntelIss,
  IntelNoticia,
  IntelSnapshot,
} from "@/lib/intel.types";

export const OBSIDIAN_HANDLE_KEY = "obsidian-folder-handle";
export const OBSIDIAN_BASE_KEY = "obsidian-folder-base";
export const OBSIDIAN_LAST_AT_KEY = "obsidian-last-at";

/** Pasta criada dentro do vault escolhido pelo usuário. */
export const PASTA_OBSIDIAN = "Manual do Sobrevivente";
export const SUBPASTA_WAYPOINTS = "Waypoints";
export const SUBPASTA_BOLETINS = "Boletins";
export const SUBPASTA_LOCALIZACOES = "Localizações";

/** Limite seguro de caracteres para um URI obsidian:// (varia por aparelho). */
const LIMITE_URI = 15000;

/** O seletor de pastas está disponível neste navegador? */
export const obsidianSuportado = seletorPastaSuportado;

/* ------------------------------------------------------------------ */
/* Conexão da pasta                                                    */
/* ------------------------------------------------------------------ */

/** Abre o seletor nativo, cria a pasta do app dentro da escolhida e conecta. */
export async function conectarPastaObsidian(): Promise<{ baseNome: string | null }> {
  const picker = (
    window as unknown as {
      showDirectoryPicker: (o?: {
        id?: string;
        mode?: "read" | "readwrite";
        startIn?: string;
      }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  const base = (await picker({
    id: "obsidian-manual-do-sobrevivente",
    mode: "readwrite",
    startIn: "documents",
  })) as HandlePasta;
  const permissao = await pegarPermissao(base, true);
  if (permissao !== "granted") {
    throw new Error("Permissão de escrita na pasta negada");
  }
  const pasta = await base.getDirectoryHandle(PASTA_OBSIDIAN, { create: true });
  await escreverArquivo(pasta, "LEIA-ME.md", textoLeiaMe(new Date().toISOString()));
  await setSetting(OBSIDIAN_HANDLE_KEY, pasta);
  await setSetting(OBSIDIAN_BASE_KEY, base.name ?? null);
  await setSetting(OBSIDIAN_LAST_AT_KEY, Date.now());
  return { baseNome: base.name ?? null };
}

export async function obterPastaObsidian(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await getSetting<FileSystemDirectoryHandle>(OBSIDIAN_HANDLE_KEY);
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function desconectarPastaObsidian(): Promise<void> {
  await setSetting(OBSIDIAN_HANDLE_KEY, null);
  await setSetting(OBSIDIAN_BASE_KEY, null);
}

/** Estado da pasta guardada: "conectada" | "precisa-permissao" | "sem-pasta". */
export async function estadoPastaObsidian(): Promise<{
  estado: "conectada" | "precisa-permissao" | "sem-pasta";
  nome: string | null;
  baseNome: string | null;
}> {
  const handle = await obterPastaObsidian();
  if (!handle) return { estado: "sem-pasta", nome: null, baseNome: null };
  const baseNome = await getSetting<string | null>(OBSIDIAN_BASE_KEY).catch(() => null);
  const permissao = await pegarPermissao(handle as HandlePasta, false);
  return {
    estado: permissao === "granted" ? "conectada" : "precisa-permissao",
    nome: handle.name ?? PASTA_OBSIDIAN,
    baseNome: baseNome ?? null,
  };
}

export async function obterUltimaSincronizacaoObsidian(): Promise<number | null> {
  try {
    return (await getSetting<number>(OBSIDIAN_LAST_AT_KEY)) ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Escrita de notas                                                    */
/* ------------------------------------------------------------------ */

/**
 * Grava uma nota Markdown na pasta conectada (cria a subpasta quando preciso).
 * `solicitar` = true pede permissão de novo quando o navegador zera o acesso
 * (deve vir de um gesto do usuário — clique no botão).
 */
export async function salvarNotaObsidian(opcoes: {
  subpasta?: string;
  nomeArquivo: string;
  markdown: string;
}): Promise<void> {
  const pasta = await obterPastaObsidian();
  if (!pasta) throw new Error("Nenhuma pasta do Obsidian conectada");
  const permissao = await pegarPermissao(pasta as HandlePasta, true);
  if (permissao !== "granted") throw new Error("Permissão de escrita na pasta negada");
  const destino = opcoes.subpasta
    ? await pasta.getDirectoryHandle(opcoes.subpasta, { create: true })
    : pasta;
  await escreverArquivo(destino, opcoes.nomeArquivo, opcoes.markdown);
  await setSetting(OBSIDIAN_LAST_AT_KEY, Date.now());
}

/**
 * Sincroniza tudo que é local: LEIA-ME + uma nota por waypoint ( Waypoints/).
 * Reexecutar não duplica — o nome do arquivo é estável por waypoint.
 */
export async function sincronizarObsidian(): Promise<{ waypoints: number }> {
  const pasta = await obterPastaObsidian();
  if (!pasta) throw new Error("Nenhuma pasta do Obsidian conectada");
  const permissao = await pegarPermissao(pasta as HandlePasta, true);
  if (permissao !== "granted") throw new Error("Permissão de escrita na pasta negada");

  await escreverArquivo(pasta, "LEIA-ME.md", textoLeiaMe(new Date().toISOString()));

  const waypoints = await listWaypoints();
  for (const wp of waypoints) {
    const nome = nomeArquivoSeguro(wp.title || "waypoint", { sufixo: wp.id.slice(0, 8) });
    await salvarNotaObsidian({
      subpasta: SUBPASTA_WAYPOINTS,
      nomeArquivo: nome,
      markdown: notaWaypointMarkdown(wp),
    });
  }
  return { waypoints: waypoints.length };
}

/* ------------------------------------------------------------------ */
/* Fallbacks: URI obsidian:// e download                               */
/* ------------------------------------------------------------------ */

/**
 * Monta o URI obsidian://new para criar a nota no app do Obsidian.
 * Devolve null quando o conteúdo excede o limite seguro de URI.
 */
export function uriObsidianNovaNota(opcoes: { caminho: string; conteudo: string }): string | null {
  const uri =
    `obsidian://new?file=${encodeURIComponent(opcoes.caminho)}` +
    `&content=${encodeURIComponent(opcoes.conteudo)}`;
  return uri.length > LIMITE_URI ? null : uri;
}

/** Abre um URI obsidian:// (o navegador oferece abrir o app instalado). */
export function abrirUriObsidian(uri: string): void {
  window.open(uri, "_blank", "noopener,noreferrer");
}

/** Abre o Obsidian no último vault usado (obsidian://open). */
export function abrirObsidianApp(): void {
  abrirUriObsidian("obsidian://open");
}

/* ------------------------------------------------------------------ */
/* Construtores de Markdown                                            */
/* ------------------------------------------------------------------ */

function cabecalhoFrontmatter(linhas: string[]): string {
  return ["---", ...linhas, "---", ""].join("\n");
}

function dataIso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Nome de arquivo seguro e estável: minúsculas, sem acento, hífen como
 * separador. `data` acrescenta carimbo (boletim/localização); `sufixo`
 * garante unicidade (id curto do waypoint).
 */
export function nomeArquivoSeguro(
  base: string,
  opcoes: { data?: number; sufixo?: string } = {},
): string {
  const limpo = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48)
    .replace(/-+$/g, "");
  const partes = [limpo || "nota"];
  if (opcoes.sufixo) partes.push(opcoes.sufixo.replace(/[^a-zA-Z0-9-]/g, ""));
  if (opcoes.data !== undefined) {
    const d = new Date(opcoes.data);
    const p2 = (n: number) => String(n).padStart(2, "0");
    partes.push(
      `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`,
    );
  }
  return `${partes.join("-")}.md`;
}

/** Nota de um waypoint — compatível com o plug-in Map View do Obsidian. */
export function notaWaypointMarkdown(wp: LocalWaypoint): string {
  const local = `${wp.latitude.toFixed(5)},${wp.longitude.toFixed(5)}`;
  const front = cabecalhoFrontmatter([
    `tipo: waypoint`,
    `tags:`,
    `  - sobrevivencia`,
    `  - waypoint`,
    `criado: ${wp.created_at}`,
    `atualizado: ${wp.updated_at}`,
    `categoria: ${wp.category}`,
    `location: "${local}"`,
  ]);
  const corpo: string[] = [`# ${wp.title}`, ""];
  corpo.push(`- **Coordenadas (DD):** ${wp.latitude.toFixed(5)}, ${wp.longitude.toFixed(5)}`);
  corpo.push(`- **DMS:** ${formatDMS(wp.longitude, wp.latitude)}`);
  corpo.push(`- **MGRS:** ${formatMGRS(wp.longitude, wp.latitude)}`);
  if (wp.elevation !== null && wp.elevation !== undefined) {
    corpo.push(`- **Altitude:** ${Math.round(wp.elevation)} m`);
  }
  corpo.push("");
  if (wp.description) {
    corpo.push(wp.description, "");
  }
  corpo.push("---", "", `Salvo pelo Manual do Sobrevivente em ${dataIso(Date.now())}.`);
  return `${front}\n${corpo.join("\n")}\n`;
}

/** Instantâneo do boletim de inteligência (igual ao mostrado no mapa). */
export function notaBoletimMarkdown(dados: {
  geradoEm: number;
  intel: IntelSnapshot | null;
  ar: IntelAr | null;
  alertas: IntelAlerta[] | null;
  iss: IntelIss | null;
  noticias: IntelNoticia[] | null;
  /** Clima pontual do centro do mapa (Open-Meteo) — opcional. */
  clima?: IntelClima | null;
}): string {
  const front = cabecalhoFrontmatter([
    `tipo: boletim`,
    `tags:`,
    `  - sobrevivencia`,
    `  - boletim`,
    `criado: ${dataIso(dados.geradoEm)}`,
  ]);
  const c: string[] = [
    `# Boletim de inteligência`,
    "",
    `Gerado em ${dataIso(dados.geradoEm)} pelo Manual do Sobrevivente.`,
    "",
  ];

  if (dados.clima) {
    const cl = dados.clima;
    c.push(
      `## Clima pontual (Open-Meteo)`,
      "",
      `- Temperatura ${formatNumber(cl.temperatura, 1)} °C (sensação ${formatNumber(cl.aparente, 1)} °C) — ${cl.rotulo}`,
      `- Umidade ${formatNumber(cl.umidade, 0)}% · Precipitação ${formatNumber(cl.precipitacao, 1)} mm/h · Nuvens ${formatNumber(cl.nuvens, 0)}%`,
      `- Vento ${formatNumber(cl.ventoKmh, 0)} km/h ${cl.direcao} · rajadas ${formatNumber(cl.rajadaKmh, 0)} km/h`,
      "",
    );
  }

  if (dados.intel?.climaEspacial) {
    const ce = dados.intel.climaEspacial;
    c.push(`## Clima espacial`, "", `- KP ${formatNumber(ce.kp, 1)} — ${ce.classificacao}`, "");
  }
  if (dados.ar) {
    c.push(
      `## Qualidade do ar`,
      "",
      `- IQAr ${formatInteger(dados.ar.aqiEuropeu)} — ${dados.ar.classificacao}`,
      `- PM2,5 ${formatNumber(dados.ar.pm25, 1)} · PM10 ${formatNumber(dados.ar.pm10, 1)} · Ozônio ${formatInteger(dados.ar.ozonio)} µg/m³`,
      "",
    );
  }
  const fortes = (dados.alertas ?? []).filter((a) => a.nivel !== "Green");
  c.push(`## Alertas oficiais fortes (GDACS)`, "");
  if (fortes.length > 0) {
    for (const a of fortes.slice(0, 6)) {
      c.push(`- **${a.tipo}** — ${a.pais}: ${a.nome} (nível ${a.nivel})`);
    }
    c.push("");
  } else {
    c.push(`- Nenhum alerta laranja/vermelho ativo agora.`, "");
  }

  const sismos = [...(dados.intel?.sismos ?? [])]
    .filter((s) => s.mag >= 4.5)
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 6);
  c.push(`## Sismos significativos (USGS, M4,5+ em 24 h)`, "");
  if (sismos.length > 0) {
    for (const s of sismos) {
      c.push(
        `- M${formatNumber(s.mag, 1)} — ${s.lugar} · ${s.lat.toFixed(2)}, ${s.lng.toFixed(2)}`,
      );
    }
    c.push("");
  } else {
    c.push(`- Nenhum sismo M4,5+ nas últimas 24 horas.`, "");
  }

  const eventos = [...(dados.intel?.eventos ?? [])].sort((a, b) => b.hora - a.hora).slice(0, 5);
  c.push(`## Eventos naturais ativos (NASA EONET)`, "");
  if (eventos.length > 0) {
    for (const e of eventos) {
      c.push(`- **${e.categoria}** — ${e.titulo} · ${e.lat.toFixed(2)}, ${e.lng.toFixed(2)}`);
    }
    c.push("");
  } else {
    c.push(`- Sem eventos ativos registrados.`, "");
  }

  if (dados.iss) {
    c.push(
      `## ISS — Estação Espacial Internacional`,
      "",
      `- Altitude ${Math.round(dados.iss.altitudeKm)} km · ${Math.round(dados.iss.velocidadeKmh)} km/h`,
      `- Posição ${dados.iss.lat.toFixed(3)}, ${dados.iss.lng.toFixed(3)}`,
      "",
    );
  }

  const noticias = (dados.noticias ?? []).slice(0, 8);
  c.push(`## Manchetes globais de emergência (GDELT, 24 h)`, "");
  if (noticias.length > 0) {
    for (const n of noticias) {
      c.push(`- ${n.titulo} — ${n.fonte}`);
    }
    c.push("");
  } else {
    c.push(`- Sem manchetes coletadas.`, "");
  }

  c.push(
    "---",
    "",
    "Fontes: USGS · NASA EONET/FIRMS · NOAA SWPC · GDACS · GDELT · WhereTheISS.at · Open-Meteo.",
  );
  return `${front}\n${c.join("\n")}\n`;
}

/** Nota genérica de localização compartilhada (folha de compartilhar). */
export function notaLocalizacaoMarkdown(opcoes: {
  titulo: string;
  texto: string;
  mapUrl?: string | null;
}): string {
  const agora = Date.now();
  const front = cabecalhoFrontmatter([
    `tipo: localizacao`,
    `tags:`,
    `  - sobrevivencia`,
    `  - localizacao`,
    `criado: ${dataIso(agora)}`,
  ]);
  const c: string[] = [`# ${opcoes.titulo}`, "", opcoes.texto.trim(), ""];
  if (opcoes.mapUrl) {
    c.push(`[Ver no mapa](${opcoes.mapUrl})`, "");
  }
  c.push("---", "", `Salvo pelo Manual do Sobrevivente em ${dataIso(agora)}.`);
  return `${front}\n${c.join("\n")}\n`;
}

function textoLeiaMe(geradoEm: string): string {
  return [
    "# Manual do Sobrevivente — notas do Obsidian",
    "",
    "Esta pasta é criada e mantida pelo aplicativo Manual do Sobrevivente (TacticalGIS).",
    "",
    `- ${SUBPASTA_WAYPOINTS}/ — uma nota por waypoint salvo no mapa.`,
    `- ${SUBPASTA_BOLETINS}/ — instantâneos do boletim de inteligência.`,
    `- ${SUBPASTA_LOCALIZACOES}/ — localizações compartilhadas para cá.`,
    "",
    "Todas as notas são Markdown com frontmatter — funcionam no Obsidian,",
    "inclusive com o plug-in Map View (campo `location`).",
    "",
    `Atualizado em ${geradoEm}.`,
    "",
  ].join("\n");
}
