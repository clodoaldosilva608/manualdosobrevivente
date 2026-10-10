/**
 * Traçado de rota de ruas no SERVIDOR (o OSRM público não exige chave, mas
 * chamá-lo daqui evita CORS, permite cache e mantém o pacote do navegador
 * leve — mesmo padrão do geocode/geo-reverso). Perfis: carro (OSRM demo),
 * a pé e bicicleta (roteadores oficiais do OSM na Alemanha).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parsearRotaOSRM, type RotaRuas } from "@/lib/rota-ruas";

export type PerfilRota = "carro" | "pe" | "bicicleta";

const InputSchema = z.object({
  origemLat: z.number().min(-90).max(90),
  origemLng: z.number().min(-180).max(180),
  destinoLat: z.number().min(-90).max(90),
  destinoLng: z.number().min(-180).max(180),
  nomeDestino: z.string().max(160).optional(),
  perfil: z.enum(["carro", "pe", "bicicleta"]).optional(),
});

const URL_BASE = process.env["OSRM_BASE"] ?? "https://router.project-osrm.org";
const URL_BASE_OSM = "https://routing.openstreetmap.de";

/** Caminho do perfil por serviço (OSRM usa /driving para tudo internamente). */
function enderecoPerfil(perfil: PerfilRota): string {
  if (perfil === "pe") return `${URL_BASE_OSM}/routed-foot/route/v1/driving`;
  if (perfil === "bicicleta") return `${URL_BASE_OSM}/routed-bike/route/v1/driving`;
  return `${URL_BASE}/route/v1/driving`;
}

const cache = new Map<string, RotaRuas | null>();
const CACHE_MAX = 120;
const TTL_MS = 10 * 60 * 1000;
const nascidos = new Map<string, number>();

export const tracarRotaRuas = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<RotaRuas | null> => {
    const nomeDestino = data.nomeDestino?.trim() || "Destino";
    const chave = [
      data.origemLat.toFixed(4),
      data.origemLng.toFixed(4),
      data.destinoLat.toFixed(4),
      data.destinoLng.toFixed(4),
      data.perfil ?? "carro",
    ].join("|");

    const nascido = nascidos.get(chave);
    if (cache.has(chave) && nascido && Date.now() - nascido < TTL_MS)
      return cache.get(chave) ?? null;

    const url =
      `${enderecoPerfil(data.perfil ?? "carro")}/` +
      `${data.origemLng},${data.origemLat};${data.destinoLng},${data.destinoLat}` +
      `?overview=full&geometries=geojson&steps=true&alternatives=false`;

    let resultado: RotaRuas | null = null;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 12_000);
      const res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
      clearTimeout(t);
      if (res.ok) {
        const json = (await res.json()) as Parameters<typeof parsearRotaOSRM>[0];
        resultado = parsearRotaOSRM(json, nomeDestino, {
          nome: nomeDestino,
          lat: data.destinoLat,
          lng: data.destinoLng,
          perfil: data.perfil ?? "carro",
        });
      }
    } catch {
      resultado = null;
    }

    if (cache.size >= CACHE_MAX) {
      const maisAntiga = cache.keys().next().value;
      if (maisAntiga !== undefined) {
        cache.delete(maisAntiga);
        nascidos.delete(maisAntiga);
      }
    }
    cache.set(chave, resultado);
    nascidos.set(chave, Date.now());
    return resultado;
  });
