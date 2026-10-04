/**
 * Coleta dos TLEs dos satélites de observação (Celestrak) — server function.
 *
 * O Celestrak bloqueia CORS para o navegador (e pode estar indisponível por
 * rede), então o servidor do aplicativo busca os grupos "stations",
 * "resource" e "weather" e devolve apenas os objetos da lista de interesse.
 * Cache de 6 horas: TLEs ficam bons por dias, não há motivo para pedir mais.
 *
 * Em produção (Vercel) a chamada sai do datacenter — o sandbox de
 * desenvolvimento pode ter o domínio bloqueado sem afetar a produção.
 */
import { createServerFn } from "@tanstack/react-start";
import { parseTle, type TleSatelite } from "@/lib/satelite-propagacao";

const TTL = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 12_000;

/** Números NORAD rastreados (exceto 25544/ISS, que tem camada dedicada). */
const NORAD_RASTREADOS = new Set<number>([
  48274, // CSS/Tiangong (estação chinesa)
  20580, // Hubble (HST)
  39084, // Landsat 8
  27424, // Aqua (NASA — observação da Terra)
  25994, // Terra (NASA — observação da Terra)
  40697, // Sentinel-2A (ESA)
  39634, // Sentinel-1A (ESA — radar)
  43013, // NOAA-20 (meteorológico)
  33591, // NOAA-19 (meteorológico)
  37849, // Suomi NPP (meteorológico)
  41866, // GOES-16 (meteorológico geoestacionário)
]);

/** Rótulos pt-BR complementares aos nomes oficiais do Celestrak. */
const NOMES_PT: Record<number, string> = {
  48274: "Tiangong (CSS)",
  20580: "Hubble (HST)",
  39084: "Landsat 8",
  27424: "Aqua",
  25994: "Terra",
  40697: "Sentinel-2A",
  39634: "Sentinel-1A",
  43013: "NOAA-20",
  33591: "NOAA-19",
  37849: "Suomi NPP",
  41866: "GOES-16",
};

export interface ColetaTle {
  tles: TleSatelite[];
  coletadoEm: number;
  /** Grupos que falharam nesta coleta (parciais são aceitos). */
  falhas: string[];
}

interface CacheGlobal {
  __msTleCache?: { dados: ColetaTle; em: number };
}
const G = globalThis as typeof globalThis & CacheGlobal;

const GRUPOS = ["stations", "resource", "weather"] as const;

async function buscarGrupo(grupo: string): Promise<TleSatelite[]> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${grupo}&FORMAT=TLE`, {
      signal: ctl.signal,
      headers: { Accept: "text/plain" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return parseTle(await r.text());
  } finally {
    clearTimeout(t);
  }
}

/** Filtra os TLEs de um grupo pela lista rastreada e ajusta os nomes pt-BR. */
function filtrar(todos: TleSatelite[]): TleSatelite[] {
  const mapa = new Map<number, TleSatelite>();
  for (const t of todos) {
    if (!NORAD_RASTREADOS.has(t.norad) || mapa.has(t.norad)) continue;
    mapa.set(t.norad, { ...t, nome: NOMES_PT[t.norad] ?? t.nome });
  }
  return Array.from(mapa.values());
}

export const tleServidor = createServerFn({ method: "GET" }).handler(
  async (): Promise<ColetaTle> => {
    const hit = G.__msTleCache;
    if (hit && Date.now() - hit.em < TTL) return hit.dados;

    const falhas: string[] = [];
    const resultados = await Promise.allSettled(GRUPOS.map((g) => buscarGrupo(g)));
    const filtrados: TleSatelite[] = [];
    resultados.forEach((r, i) => {
      if (r.status === "fulfilled") filtrados.push(...filtrar(r.value));
      else falhas.push(GRUPOS[i] as string);
    });

    const dados: ColetaTle = {
      tles: filtrados.sort((a, b) => a.norad - b.norad),
      coletadoEm: Date.now(),
      falhas,
    };
    if (filtrados.length) G.__msTleCache = { dados, em: Date.now() };
    return dados;
  },
);
