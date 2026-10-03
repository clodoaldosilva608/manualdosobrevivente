/**
 * Server functions das camadas de inteligência (modo Osiris).
 *
 * Reúne fontes públicas oficiais e keyless — USGS (sismos), NASA EONET
 * (eventos naturais), NASA FIRMS (focos de calor, requer chave gratuita
 * opcional) e NOAA SWPC (clima espacial/Kp) — em um único instantâneo JSON
 * com cache em memória (60 s) e fallback para os últimos dados bons em caso
 * de falha upstream. O cliente nunca acessa as fontes diretamente.
 */
import { createServerFn } from "@tanstack/react-start";
import type {
  IntelClimaEspacial,
  IntelEvento,
  IntelIncendio,
  IntelSismo,
  IntelSnapshot,
} from "./intel.types";

const TTL_SNAPSHOT = 60_000;
const MAX_SISMOS = 500;
const MAX_EVENTOS = 80;
const MAX_INCENDIOS = 3000;

interface EstadoCache {
  ultimo: IntelSnapshot | null;
  em: number;
  bons: {
    sismos?: IntelSismo[];
    eventos?: IntelEvento[];
    incendios?: IntelIncendio[];
    climaEspacial?: IntelClimaEspacial | null;
  };
}

const G = globalThis as typeof globalThis & { __msIntelCache?: EstadoCache };
const cache: EstadoCache = (G.__msIntelCache ??= { ultimo: null, em: 0, bons: {} });

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

interface FirmsResultado {
  disponivel: boolean;
  pontos: IntelIncendio[];
}

/** CSV do FIRMS (VIIRS SNPP, últimas 24 h, mundo). Requer chave gratuita. */
async function buscarIncendios(): Promise<FirmsResultado> {
  const chave = process.env["FIRMS_MAP_KEY"];
  if (!chave) return { disponivel: false, pontos: [] };
  const url =
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(chave)}` +
    `/VIIRS_SNPP_NRT/-180,-90,180,90/1`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20_000);
  let texto: string;
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    texto = await res.text();
  } finally {
    clearTimeout(t);
  }
  const linhas = texto.trim().split("\n");
  if (linhas.length < 2 || /invalid|error/i.test(linhas[0])) {
    return { disponivel: false, pontos: [] };
  }
  const cab = linhas[0].split(",").map((c) => c.trim());
  const iLat = cab.indexOf("latitude");
  const iLng = cab.indexOf("longitude");
  const iData = cab.indexOf("acq_date");
  const iHora = cab.indexOf("acq_time");
  const iConf = cab.indexOf("confidence");
  if (iLat < 0 || iLng < 0) return { disponivel: false, pontos: [] };

  const pontos: IntelIncendio[] = [];
  // Subamostragem por passo quando exceder o limite (mantém a distribuição global).
  const total = linhas.length - 1;
  const passo = Math.max(1, Math.ceil(total / MAX_INCENDIOS));
  for (let i = 1; i < linhas.length; i += passo) {
    const c = linhas[i].split(",");
    const lat = Number(c[iLat]);
    const lng = Number(c[iLng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const hhmm = (c[iHora] ?? "").padStart(4, "0");
    pontos.push({
      id: `f-${i}`,
      lng,
      lat,
      hora: `${c[iData]}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00Z`,
      confianca: (c[iConf] ?? "").trim(),
    });
  }
  return { disponivel: true, pontos };
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

export const fetchIntelSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntelSnapshot> => {
    const agora = Date.now();
    if (cache.ultimo && agora - cache.em < TTL_SNAPSHOT) return cache.ultimo;

    const falhas: string[] = [];

    const [sismosR, eventosR, incendiosR, climaR] = await Promise.allSettled([
      buscarSismos(),
      buscarEventos(),
      buscarIncendios(),
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

    let incendios: IntelIncendio[];
    let incendiosDisponivel: boolean;
    if (incendiosR.status === "fulfilled") {
      incendios = incendiosR.value.pontos;
      incendiosDisponivel = incendiosR.value.disponivel;
      cache.bons.incendios = incendios;
    } else {
      incendios = cache.bons.incendios ?? [];
      incendiosDisponivel = true;
      falhas.push("Focos de calor indisponíveis — exibindo os últimos dados salvos");
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
      incendios,
      incendiosDisponivel,
      climaEspacial,
      atualizadoEm: agora,
      falhas,
    };
    cache.ultimo = snapshot;
    cache.em = agora;
    return snapshot;
  },
);
