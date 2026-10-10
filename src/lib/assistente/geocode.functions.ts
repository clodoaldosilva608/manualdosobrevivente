/**
 * Geocodificação (nome de lugar → coordenada) para o assistente IA:
 * "trace uma rota até o centro de Recife" resolve o destino aqui, no
 * servidor, com cache em memória e User-Agent identificável (política do
 * Nominatim). Resultado None = lugar não reconhecido.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  busca: z.string().min(2).max(120),
  /** Dica de país para priorizar (BR por padrão). */
  pais: z.string().max(8).optional(),
});

export interface Lugar {
  nome: string;
  lat: number;
  lng: number;
}

const cache = new Map<string, Lugar | null>();
const CACHE_MAX = 300;

export const geoBuscar = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<Lugar | null> => {
    const chave = `${data.busca.toLowerCase()}|${data.pais ?? "br"}`;
    if (cache.has(chave)) return cache.get(chave) ?? null;

    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1" +
      `&accept-language=pt-BR&countrycodes=${encodeURIComponent(data.pais ?? "br")}` +
      `&q=${encodeURIComponent(data.busca)}`;

    let resultado: Lugar | null = null;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 7000);
      const res = await fetch(url, {
        signal: ctl.signal,
        headers: {
          "User-Agent": "ManualDoSobrevivente/1.0 (assistente de rota offline-first)",
          Accept: "application/json",
        },
      });
      clearTimeout(t);
      if (res.ok) {
        const lista = (await res.json()) as Array<{
          lat?: string;
          lon?: string;
          display_name?: string;
        }>;
        const primeiro = lista?.[0];
        const lat = Number(primeiro?.lat);
        const lng = Number(primeiro?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          resultado = {
            nome: (primeiro?.display_name ?? data.busca).split(",").slice(0, 3).join(", "),
            lat,
            lng,
          };
        }
      }
    } catch {
      resultado = null;
    }

    if (cache.size >= CACHE_MAX) {
      const maisAntiga = cache.keys().next().value;
      if (maisAntiga !== undefined) cache.delete(maisAntiga);
    }
    cache.set(chave, resultado);
    return resultado;
  });
