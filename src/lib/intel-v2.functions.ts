/**
 * Server functions das fontes de inteligência da Fase 2 (modo Osiris completo).
 *
 * Fontes públicas oficiais e keyless:
 * - ADS-B.lol — voos ao vivo (militares globais + civis ao redor do centro);
 * - WhereTheISS.at — posição e trajetória da ISS;
 * - GDACS — alertas oficiais de desastre (UE/ONU, 5 tipos de evento);
 * - GDELT DOC — manchetes globais de emergência (24 h);
 * - Open-Meteo Air Quality — qualidade do ar pontual.
 *
 * Todas passam por cache em memória (globalThis) com fallback para os
 * últimos dados bons. O cliente nunca acessa as fontes diretamente,
 * evitando CORS e expondo uma única superfície controlada.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { IntelAlerta, IntelAr, IntelIss, IntelNoticia, IntelVoo } from "./intel.types";

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

// ---------------------------------------------------------------------------
// Cache genérico por chave, com fallback para o último valor bom
// ---------------------------------------------------------------------------

interface Slot<T> {
  em: number;
  valor: T;
  bons: T;
}

const G = globalThis as typeof globalThis & {
  __msIntelV2Cache?: Map<string, Slot<unknown>>;
};

function cacheV2(): Map<string, Slot<unknown>> {
  G.__msIntelV2Cache ??= new Map<string, Slot<unknown>>();
  return G.__msIntelV2Cache;
}

async function comCache<T>(chave: string, ttlMs: number, buscar: () => Promise<T>): Promise<T> {
  const cache = cacheV2();
  const atual = cache.get(chave) as Slot<T> | undefined;
  if (atual && Date.now() - atual.em < ttlMs) return atual.valor;
  try {
    const valor = await buscar();
    cache.set(chave, { em: Date.now(), valor, bons: valor });
    return valor;
  } catch (erro) {
    if (atual) return atual.bons;
    throw erro;
  }
}

// ---------------------------------------------------------------------------
// Voos ao vivo (ADS-B.lol) — militares globais + civis ao redor do centro
// ---------------------------------------------------------------------------

const TTL_VOOS = 45_000;
const MAX_VOOS_CIVIS = 900;

const VoosInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Raio da busca regional em milhas náuticas (máx. 250 permitido pela fonte). */
  raioNm: z.number().min(25).max(250).optional(),
});

interface AdsbAeronave {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  lat: number;
  lon: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  emergency?: string;
  dbFlags?: number;
}

interface AdsbResposta {
  ac: AdsbAeronave[] | null;
}

function normalizarVoo(a: AdsbAeronave, militar: boolean): IntelVoo | null {
  if (typeof a.lat !== "number" || typeof a.lon !== "number") return null;
  const noSolo = a.alt_baro === "ground";
  return {
    id: a.hex,
    indicativo: (a.flight ?? "").trim() || "—",
    tipo: (a.t ?? "").trim(),
    matricula: (a.r ?? "").trim(),
    lng: a.lon,
    lat: a.lat,
    altitude: noSolo ? null : typeof a.alt_baro === "number" ? a.alt_baro : null,
    velocidade: typeof a.gs === "number" ? a.gs : null,
    rumo: typeof a.track === "number" ? a.track : null,
    militar,
    emergencia: a.emergency && a.emergency !== "none" ? a.emergency : "",
  };
}

export const fetchVoos = createServerFn({ method: "GET" })
  .inputValidator((input) => VoosInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ voos: IntelVoo[]; militar: number; civis: number }> => {
    const raioNm = data.raioNm ?? 250;
    const { voos, militar, civis } = await comCache(
      `voos:${data.lat.toFixed(1)}:${data.lng.toFixed(1)}:${raioNm}`,
      TTL_VOOS,
      async () => {
        const [milR, pontoR] = await Promise.allSettled([
          buscarJson<AdsbResposta>("https://api.adsb.lol/v2/mil", 14_000),
          buscarJson<AdsbResposta>(
            `https://api.adsb.lol/v2/point/${data.lat.toFixed(3)}/${data.lng.toFixed(3)}/${Math.round(raioNm)}`,
            14_000,
          ),
        ]);

        const lista: IntelVoo[] = [];
        const vistos = new Set<string>();
        let militar = 0;
        let civis = 0;

        if (milR.status === "fulfilled") {
          for (const a of milR.value.ac ?? []) {
            const v = normalizarVoo(a, true);
            if (!v || vistos.has(v.id)) continue;
            vistos.add(v.id);
            lista.push(v);
            militar++;
          }
        }
        if (pontoR.status === "fulfilled") {
          for (const a of pontoR.value.ac ?? []) {
            const v = normalizarVoo(a, false);
            if (!v || vistos.has(v.id)) continue;
            vistos.add(v.id);
            if (civis >= MAX_VOOS_CIVIS) break;
            lista.push(v);
            civis++;
          }
        }
        if (lista.length === 0) {
          // Distinguir "fonte vazia" de "fonte falhou": se ambas falharam, joga.
          if (milR.status === "rejected" && pontoR.status === "rejected") {
            throw new Error("ADS-B indisponível");
          }
        }
        return { voos: lista, militar, civis };
      },
    );
    return { voos, militar, civis };
  });

// ---------------------------------------------------------------------------
// ISS (WhereTheISS.at) — posição atual + trajetória ~3 órbitas
// ---------------------------------------------------------------------------

const TTL_ISS = 40_000;

interface IssPosicao {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
}

/** Anel geográfico aproximado de raio em km (elipse em graus).
 *
 * A longitude NÃO é clampada em ±180: perto do antimeridiano o clamp
 * empilhava pontos degenerados e o preenchimento do anel (pegada da ISS,
 * raios dos estreitos) saía como um polígono preto gigante no mapa. O
 * MapLibre aceita longitudes fora de ±180 e renderiza na cópia vizinha.
 */
export function anelGeo(
  lat: number,
  lng: number,
  raioKm: number,
  pontos = 64,
): Array<[number, number]> {
  const dLat = Math.min(89, raioKm / 110.574);
  const cosLat = Math.max(0.08, Math.cos((lat * Math.PI) / 180));
  const dLng = Math.min(179, raioKm / (111.32 * cosLat));
  const anel: Array<[number, number]> = [];
  for (let i = 0; i < pontos; i++) {
    const ang = (2 * Math.PI * i) / pontos;
    const la = Math.max(-89.9, Math.min(89.9, lat + dLat * Math.sin(ang)));
    const ln = lng + dLng * Math.cos(ang);
    anel.push([ln, la]);
  }
  anel.push(anel[0]);
  return anel;
}

export const fetchIss = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntelIss | null> => {
    return comCache<IntelIss | null>("iss", TTL_ISS, async () => {
      const atual = await buscarJson<IssPosicao>("https://api.wheretheiss.at/v1/satellites/25544");
      const base = atual.timestamp;
      // Trajetória futura: 18 pontos a cada 10 min (~3 órbitas). A fonte aceita
      // no máximo 10 timestamps por requisição — duas chamadas.
      const ts1 = Array.from({ length: 10 }, (_, i) => base + (i + 1) * 600);
      const ts2 = Array.from({ length: 8 }, (_, i) => base + (i + 11) * 600);
      const [p1, p2] = await Promise.allSettled([
        buscarJson<IssPosicao[]>(
          `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${ts1.join(",")}`,
          12_000,
        ),
        buscarJson<IssPosicao[]>(
          `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${ts2.join(",")}`,
          12_000,
        ),
      ]);
      const trajetoria: Array<[number, number]> = [[atual.longitude, atual.latitude]];
      for (const lot of [p1, p2]) {
        if (lot.status !== "fulfilled" || !Array.isArray(lot.value)) continue;
        for (const p of lot.value) {
          if (typeof p?.latitude === "number" && typeof p?.longitude === "number") {
            trajetoria.push([p.longitude, p.latitude]);
          }
        }
      }
      return {
        lng: atual.longitude,
        lat: atual.latitude,
        altitudeKm: Math.round(atual.altitude),
        velocidadeKmh: Math.round(atual.velocity),
        visibilidade: atual.visibility,
        pegadaKm: Math.round(atual.footprint),
        hora: atual.timestamp * 1000,
        trajetoria,
      };
    });
  },
);

// ---------------------------------------------------------------------------
// Alertas oficiais de desastre (GDACS) — 5 tipos consultados em paralelo
// ---------------------------------------------------------------------------

const TTL_ALERTAS = 300_000;
const MAX_ALERTAS = 160;

const TIPOS_GDACS: Array<{ id: string; nome: string }> = [
  { id: "EQ", nome: "Terremoto" },
  { id: "TC", nome: "Ciclone tropical" },
  { id: "VO", nome: "Vulcão" },
  { id: "FL", nome: "Enchente" },
  { id: "WF", nome: "Incêndio florestal" },
];

interface GdacsFeed {
  features: Array<{
    geometry: { coordinates: [number, number] } | null;
    properties: {
      eventtype?: string;
      eventid?: number;
      name?: string;
      description?: string;
      country?: string;
      iso3?: string;
      alertlevel?: string;
      fromdate?: string;
      todate?: string;
      url?: { report?: string } | null;
    } | null;
  }>;
}

export const fetchAlertas = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ alertas: IntelAlerta[] }> => {
    const { alertas } = await comCache("alertas", TTL_ALERTAS, async () => {
      const resultados = await Promise.allSettled(
        TIPOS_GDACS.map((t) =>
          buscarJson<GdacsFeed>(
            `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=${t.id}`,
            15_000,
          ),
        ),
      );
      const porNivel: Record<string, number> = { Red: 0, Orange: 1, Green: 2 };
      const alertas: IntelAlerta[] = [];
      const vistos = new Set<string>();
      for (let i = 0; i < resultados.length; i++) {
        const r = resultados[i];
        if (r.status !== "fulfilled") continue;
        const tipo = TIPOS_GDACS[i];
        for (const f of r.value.features ?? []) {
          const p = f.properties;
          if (!p?.eventid || !f.geometry?.coordinates) continue;
          const nivel = (p.alertlevel ?? "Green") as IntelAlerta["nivel"];
          if (!["Green", "Orange", "Red"].includes(nivel)) continue;
          const id = `${p.eventtype ?? tipo.id}-${p.eventid}`;
          if (vistos.has(id)) continue;
          vistos.add(id);
          alertas.push({
            id,
            tipoId: p.eventtype ?? tipo.id,
            tipo: tipo.nome,
            nome: p.name || p.description || `${tipo.nome} — evento ${p.eventid}`,
            pais: p.country || p.iso3 || "—",
            nivel,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            inicio: p.fromdate ?? "",
            url: p.url?.report ?? "",
          });
        }
      }
      alertas.sort(
        (a, b) => porNivel[a.nivel] - porNivel[b.nivel] || b.inicio.localeCompare(a.inicio),
      );
      return { alertas: alertas.slice(0, MAX_ALERTAS) };
    });
    return { alertas };
  },
);

// ---------------------------------------------------------------------------
// Manchetes globais de emergência (GDELT DOC 2.0)
// ---------------------------------------------------------------------------

const TTL_NOTICIAS = 300_000;
const MAX_NOTICIAS = 14;

const CONSULTA_GDELT =
  '("earthquake" OR "volcanic eruption" OR "wildfire" OR "flood" OR "evacuation" OR "typhoon" OR "hurricane" OR "airstrike" OR "armed clash")';

function parseGdeltData(s: string): number {
  // "20261003T083000Z" -> unix ms
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s ?? "");
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

interface GdeltDoc {
  articles?: Array<{
    title?: string;
    url?: string;
    domain?: string;
    sourcecountry?: string;
    language?: string;
    seendate?: string;
  }>;
}

export const fetchNoticias = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ noticias: IntelNoticia[] }> => {
    const { noticias } = await comCache("noticias", TTL_NOTICIAS, async () => {
      const url =
        "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
        encodeURIComponent(CONSULTA_GDELT) +
        "&mode=ArtList&maxrecords=40&format=json&timespan=24h&sort=datedesc";
      let doc: GdeltDoc;
      try {
        doc = await buscarJson<GdeltDoc>(url, 15_000);
      } catch (e) {
        // A GDELT limita 1 req/5 s por IP: uma única retentativa após 7 s.
        await new Promise((r) => setTimeout(r, 7_000));
        doc = await buscarJson<GdeltDoc>(url, 15_000);
      }
      const noticias: IntelNoticia[] = [];
      const vistos = new Set<string>();
      for (const a of doc.articles ?? []) {
        if (!a.title || !a.url) continue;
        const chave = a.title.slice(0, 80);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        noticias.push({
          titulo: a.title,
          url: a.url,
          fonte: a.domain ?? "—",
          pais: a.sourcecountry ?? "",
          hora: parseGdeltData(a.seendate ?? ""),
        });
        if (noticias.length >= MAX_NOTICIAS) break;
      }
      return { noticias };
    });
    return { noticias };
  },
);

// ---------------------------------------------------------------------------
// Qualidade do ar pontual (Open-Meteo Air Quality)
// ---------------------------------------------------------------------------

const TTL_AR = 900_000;

const ArInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

interface ArResposta {
  current?: {
    time?: string;
    european_aqi?: number;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
  };
}

function classificarAr(aqi: number): { classificacao: string; nivel: IntelAr["nivel"] } {
  if (aqi <= 20) return { classificacao: "Boa — ar puro, sem cuidados", nivel: "boa" };
  if (aqi <= 40) return { classificacao: "Razoável — sem risco para a maioria", nivel: "razoavel" };
  if (aqi <= 60)
    return { classificacao: "Moderada — sensíveis devem evitar esforço longo", nivel: "moderada" };
  if (aqi <= 80) return { classificacao: "Pobre — reduza atividades ao ar livre", nivel: "pobre" };
  if (aqi <= 100)
    return { classificacao: "Muito pobre — use proteção respiratória", nivel: "muito-pobre" };
  return { classificacao: "Extremamente pobre — permaneça abrigado", nivel: "extrema" };
}

export const fetchAr = createServerFn({ method: "GET" })
  .inputValidator((input) => ArInputSchema.parse(input))
  .handler(async ({ data }): Promise<IntelAr | null> => {
    const chave = `ar:${data.lat.toFixed(1)}:${data.lng.toFixed(1)}`;
    return comCache<IntelAr | null>(chave, TTL_AR, async () => {
      const url =
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${data.lat.toFixed(3)}` +
        `&longitude=${data.lng.toFixed(3)}&current=european_aqi,us_aqi,pm2_5,pm10,ozone&timezone=auto`;
      const r = await buscarJson<ArResposta>(url, 10_000);
      const c = r.current;
      const aqi = typeof c?.european_aqi === "number" ? c.european_aqi : -1;
      if (aqi < 0) return null;
      const { classificacao, nivel } = classificarAr(aqi);
      return {
        aqiEuropeu: Math.round(aqi),
        usAqi: typeof c?.us_aqi === "number" ? Math.round(c.us_aqi) : 0,
        pm25: typeof c?.pm2_5 === "number" ? Math.round(c.pm2_5 * 10) / 10 : 0,
        pm10: typeof c?.pm10 === "number" ? Math.round(c.pm10 * 10) / 10 : 0,
        ozonio: typeof c?.ozone === "number" ? Math.round(c.ozone) : 0,
        classificacao,
        nivel,
        medidoEm: c?.time ?? "",
      };
    });
  });
