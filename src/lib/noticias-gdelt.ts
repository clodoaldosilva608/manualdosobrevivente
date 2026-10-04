/**
 * GDELT DOC 2.0 — constantes e mapeamento puros, compartilhados entre o
 * servidor (intel-v2.functions.ts) e o navegador (MapShell busca direto do
 * navegador primeiro: o limite de 1 req/5 s do GDELT vale por IP, e o IP do
 * usuário bate na API no máximo 1× a cada 5 min — já o IP do Vercel é
 * compartilhado entre muitas instâncias e vive permanentemente limitado).
 */
import type { IntelNoticia } from "./intel.types";

export const CONSULTA_GDELT =
  '("earthquake" OR "volcanic eruption" OR "wildfire" OR "flood" OR "evacuation" OR "typhoon" OR "hurricane" OR "airstrike" OR "armed clash")';

// A API DOC 2.0 é volátil em parâmetros (medido em produção, out/2026):
// — "timespan=24h" devolve {"articles":[]} SEM EXCEÇÃO (o mesmo pedido sem
//   timespan devolve artigos) — por isso NENHUMA variante manda timespan;
// — consultas só de grupo OR também podem devolver vazio: um qualificador
//   obrigatório (sourcelang) ajuda.
// A 1ª variante tenta ordenar por data; a 2ª usa só os parâmetros mínimos
// (formato comprovadamente estável) — a primeira que trouxer artigos vence.
export interface VarianteGdelt {
  consulta: string;
  extra: string;
}

const QUALIFICADOR = "(sourcelang:eng OR sourcelang:por)";

export const VARIANTES_GDELT: VarianteGdelt[] = [
  {
    consulta: `${CONSULTA_GDELT} ${QUALIFICADOR}`,
    extra: "&mode=ArtList&maxrecords=40&format=json&sort=datedesc",
  },
  {
    consulta: `${CONSULTA_GDELT} ${QUALIFICADOR}`,
    extra: "&mode=ArtList&maxrecords=40&format=json",
  },
];

export function urlGdelt(variante: VarianteGdelt): string {
  return (
    "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
    encodeURIComponent(variante.consulta) +
    variante.extra
  );
}

export function parseGdeltData(s: string): number {
  // "20261003T083000Z" -> unix ms
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s ?? "");
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

export interface GdeltDoc {
  articles?: Array<{
    title?: string;
    url?: string;
    domain?: string;
    sourcecountry?: string;
    language?: string;
    seendate?: string;
  }>;
}

export const MAX_NOTICIAS = 14;

export function mapearNoticias(doc: GdeltDoc): IntelNoticia[] {
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
  return noticias;
}

/**
 * Busca direto do NAVEGADOR: o limite de 1 req/5 s do GDELT vale por IP, e o
 * IP do usuário respeita-o trivialmente (1 chamada a cada 5 min). Falha se a
 * API não mandar CORS — aí o chamador recorre à função do servidor.
 */
export async function buscarNoticiasNavegador(): Promise<IntelNoticia[]> {
  for (const [i, variante] of VARIANTES_GDELT.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1_100));
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 10_000);
      const res = await fetch(urlGdelt(variante), { signal: ctl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const ns = mapearNoticias((await res.json()) as GdeltDoc);
      if (ns.length > 0) return ns;
    } catch {
      /* CORS, limite de taxa ou rede — tenta a variante seguinte */
    }
  }
  throw new Error("GDELT indisponível no navegador");
}
