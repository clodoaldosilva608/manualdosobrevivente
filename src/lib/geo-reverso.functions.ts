/**
 * Geocodificação reversa (coordenada → endereço/local) para o popup de
 * clique do mapa tático — paridade Zoom Earth com informação a mais: além
 * de DD/DMS/MGRS, o operador vê QUE LUGAR é aquele (rua, bairro, cidade).
 *
 * Corre no servidor (Nominatim exige User-Agent identificável e bloqueia
 * CORS anônimo em rajada) com cache em memória: o mapa de chave arredonda
 * as coordenadas a 3 casas (~110 m), então cliques vizinhos reutilizam a
 * mesma resposta e a política de uso do serviço é respeitada.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export interface LocalReverso {
  /** Nome principal do lugar (rua, POI ou cidade). */
  nome: string;
  /** Contexto (bairro/cidade/estado/país) separado por " · ". */
  contexto: string;
}

const cache = new Map<string, LocalReverso | null>();
const CACHE_MAX = 400;

export const geoReverso = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<LocalReverso | null> => {
    // Arredonda a ~110 m: cliques próximos dividem a mesma entrada.
    const chave = `${data.lat.toFixed(3)},${data.lng.toFixed(3)}`;
    if (cache.has(chave)) return cache.get(chave) ?? null;

    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${data.lat.toFixed(6)}` +
      `&lon=${data.lng.toFixed(6)}&format=jsonv2&zoom=16&accept-language=pt-BR`;

    let resultado: LocalReverso | null = null;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 7000);
      const res = await fetch(url, {
        signal: ctl.signal,
        headers: {
          // Política de uso do Nominatim: identificação do aplicativo.
          "User-Agent": "ManualDoSobrevivente/1.0 (app de sobrevivência offline-first)",
          Accept: "application/json",
        },
      });
      clearTimeout(t);
      if (res.ok) {
        const j = (await res.json()) as {
          name?: string;
          display_name?: string;
          address?: Record<string, string>;
        };
        if (j.name || j.display_name) {
          const a = j.address ?? {};
          const partes = [
            a.suburb ?? a.neighbourhood,
            a.city ?? a.town ?? a.village ?? a.municipality,
            a.state,
            a.country,
          ].filter(Boolean);
          resultado = {
            nome: j.name || (j.display_name ?? "").split(",")[0],
            contexto: partes.slice(0, 3).join(" · "),
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
