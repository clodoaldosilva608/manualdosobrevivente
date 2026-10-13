/**
 * Server functions das camadas de inteligência (modo Osiris).
 *
 * Reúne fontes públicas oficiais e keyless — USGS (sismos), NASA EONET
 * (eventos naturais) e NOAA SWPC (clima espacial/Kp) — em um único
 * instantâneo JSON com cache em memória (60 s) e fallback para os últimos
 * dados bons em caso de falha upstream. O cliente nunca acessa as fontes
 * diretamente. Os focos de calor migraram para uma camada raster direta
 * (NASA GIBS/WMS, sem chave) no cliente — o CSV mundial do FIRMS exigia
 * chave e estourava o tempo do serverless.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { IntelClimaEspacial, IntelEvento, IntelSismo, IntelSnapshot } from "./intel.types";

const TTL_SNAPSHOT = 60_000;
const MAX_SISMOS = 500;
const MAX_EVENTOS = 80;

interface EstadoCache {
  ultimo: IntelSnapshot | null;
  em: number;
  /** Chave FIRMS usada na coleta do snapshot em cache (invalida se mudar). */
  chaveFirms: string;
  bons: {
    sismos?: IntelSismo[];
    eventos?: IntelEvento[];
    climaEspacial?: IntelClimaEspacial | null;
  };
}

const G = globalThis as typeof globalThis & { __msIntelCache?: EstadoCache };
const cache: EstadoCache = (G.__msIntelCache ??= {
  ultimo: null,
  em: 0,
  chaveFirms: "",
  bons: {},
});

/** Busca JSON com tempo limite para não travar a resposta do servidor. */
async function buscarJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "ManualDoSobrevivente/1.0 (PWA offline-first)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

interface UsgsFeed {
  features: Array<{
    id: string;
    properties: {
      mag: number | null;
      place: string | null;
      time: number;
      url: string;
      tsunami: number;
      type: string;
    } | null;
    geometry: { coordinates: [number, number, number] } | null;
  }>;
}

async function buscarSismos(): Promise<IntelSismo[]> {
  const feed = await buscarJson<UsgsFeed>(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  );
  const sismos: IntelSismo[] = [];
  for (const f of feed.features ?? []) {
    if (!f?.geometry?.coordinates || !f.properties) continue;
    const mag = f.properties.mag;
    if (typeof mag !== "number") continue;
    const [lng, lat, prof] = f.geometry.coordinates;
    sismos.push({
      id: f.id,
      lng,
      lat,
      mag,
      profundidade: Math.max(0, Math.round(prof ?? 0)),
      lugar: f.properties.place ?? "Local não informado",
      hora: f.properties.time ?? Date.now(),
      url: f.properties.url ?? "",
      tsunami: f.properties.tsunami === 1,
    });
    if (sismos.length >= MAX_SISMOS) break;
  }
  return sismos;
}

const CATEGORIAS_PT: Record<string, string> = {
  severeStorms: "Tempestade severa",
  volcanoes: "Atividade vulcânica",
  seaLakeIce: "Gelo marinho",
  wildfires: "Incêndio florestal",
  drought: "Seca",
  dustHaze: "Poeira e névoa",
  floods: "Enchente",
  landslides: "Deslizamento",
  earthquakes: "Terremoto",
};

interface EonetFeed {
  events: Array<{
    id: string;
    title: string;
    link: string;
    categories: Array<{ id: string; title: string }>;
    geometry: Array<{ date: string; type: string; coordinates: number[] | number[][] }>;
  }>;
}

async function buscarEventos(): Promise<IntelEvento[]> {
  const feed = await buscarJson<EonetFeed>(
    "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200&days=30",
  );
  const eventos: IntelEvento[] = [];
  for (const ev of feed.events ?? []) {
    if (!ev) continue;
    // Interessa apenas geometria pontual (última observação do evento).
    const pontos = (ev.geometry ?? []).filter((g) => g.type === "Point");
    const ultimo = pontos[pontos.length - 1];
    if (!ultimo) continue;
    const coords = ultimo.coordinates as number[];
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const cat = ev.categories?.[0];
    eventos.push({
      id: ev.id,
      titulo: ev.title ?? "Evento natural",
      categoriaId: cat?.id ?? "desconhecido",
      categoria: CATEGORIAS_PT[cat?.id ?? ""] ?? cat?.title ?? "Evento natural",
      lng: Number(coords[0]),
      lat: Number(coords[1]),
      hora: new Date(ultimo.date).getTime(),
      url: ev.link ?? "",
    });
    if (eventos.length >= MAX_EVENTOS) break;
  }
  return eventos;
}

/** A NOAA devolve um array cru: [[time_tag, Kp, a_running, station_count], …]. */
async function buscarClimaEspacial(): Promise<IntelClimaEspacial | null> {
  const bruto = await buscarJson<unknown[][]>(
    "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  );
  if (!Array.isArray(bruto) || bruto.length < 2) return null;
  const ultima = bruto[bruto.length - 1];
  const kp = Number(ultima?.[1]);
  if (!Number.isFinite(kp)) return null;
  const nivel: IntelClimaEspacial["nivel"] =
    kp >= 5 ? "tempestade" : kp >= 4 ? "instavel" : "calmo";
  const classificacao =
    kp >= 5
      ? `Tempestade geomagnética G${Math.min(5, Math.max(1, Math.floor(kp - 4)))}`
      : kp >= 4
        ? "Instável — auroras possíveis, GPS pode oscilar"
        : "Calmo — sem impactos relevantes";
  return {
    kp,
    classificacao,
    nivel,
    medidoEm: typeof ultima?.[0] === "string" ? (ultima[0] as string) : "",
  };
}

const SnapInputSchema = z.object({ firmsKey: z.string().max(200).optional() }).default({});

export const fetchIntelSnapshot = createServerFn({ method: "GET" })
  .inputValidator((input) => SnapInputSchema.parse(input))
  .handler(async ({ data }): Promise<IntelSnapshot> => {
    void data; // firmsKey mantido por compatibilidade — focos agora vêm do GIBS no cliente.
    const agora = Date.now();
    if (cache.ultimo && agora - cache.em < TTL_SNAPSHOT) {
      return cache.ultimo;
    }

    const falhas: string[] = [];

    const [sismosR, eventosR, climaR] = await Promise.allSettled([
      buscarSismos(),
      buscarEventos(),
      buscarClimaEspacial(),
    ]);

    let sismos: IntelSismo[];
    if (sismosR.status === "fulfilled") {
      sismos = sismosR.value;
      cache.bons.sismos = sismos;
    } else {
      sismos = cache.bons.sismos ?? [];
      falhas.push("Sismos indisponíveis — exibindo os últimos dados salvos");
    }

    let eventos: IntelEvento[];
    if (eventosR.status === "fulfilled") {
      eventos = eventosR.value;
      cache.bons.eventos = eventos;
    } else {
      eventos = cache.bons.eventos ?? [];
      falhas.push("Eventos naturais indisponíveis — exibindo os últimos dados salvos");
    }

    let climaEspacial: IntelClimaEspacial | null;
    if (climaR.status === "fulfilled") {
      climaEspacial = climaR.value;
      cache.bons.climaEspacial = climaEspacial;
    } else {
      climaEspacial = cache.bons.climaEspacial ?? null;
    }

    const snapshot: IntelSnapshot = {
      sismos,
      eventos,
      // Focos de calor são uma camada raster agora (NASA GIBS/WMS, sem
      // chave): o CSV mundial do FIRMS demorava demais e derrubava a
      // disponibilidade da camada inteira.
      incendios: [],
      incendiosDisponivel: true,
      climaEspacial,
      atualizadoEm: agora,
      falhas,
    };
    cache.ultimo = snapshot;
    cache.em = agora;
    cache.chaveFirms = "";
    return snapshot;
  });

// ---------------------------------------------------------------------------
// Chaves de inteligência providas pelo servidor (variáveis de ambiente)
// ---------------------------------------------------------------------------

export interface ChavesServidor {
  /** Chave AISStream.io do servidor (vazia quando não configurada). */
  chaveAis: string;
  /** true quando o servidor já tem FIRMS_MAP_KEY (focos funcionam sem chave pessoal). */
  firmsServidor: boolean;
}

/** Lê as chaves do ambiente do servidor — pura para facilitar teste. */
export function chavesDoAmbiente(env: NodeJS.ProcessEnv = process.env): ChavesServidor {
  return {
    chaveAis: (env["AISSTREAM_API_KEY"] ?? "").trim(),
    firmsServidor: Boolean((env["FIRMS_MAP_KEY"] ?? "").trim()),
  };
}

/**
 * Entrega ao cliente a chave AIS do servidor quando o usuário não cadastrou
 * a própria (a conexão AIS nasce no navegador, logo a chave precisa chegar
 * até ele — sem ela a camada "Navios ao vivo" fica desligada). A chave FIRMS
 * nunca sai do servidor: a coleta dos focos é feita lá via fetchIntelSnapshot.
 */
export const chavesServidor = createServerFn({ method: "GET" }).handler(
  async (): Promise<ChavesServidor> => chavesDoAmbiente(),
);
