/**
 * Radar de proximidade do MODO ALERTA.
 *
 * Cruza o snapshot de inteligência já coletado pelo aplicativo (focos de
 * calor da NASA FIRMS, sismos da USGS, eventos da NASA EONET), os alertas
 * oficiais do GDACS e o clima espacial da NOAA com a posição de referência
 * do operador (minha posição quando disponível; senão o centro do mapa) e
 * devolve apenas as ameaças que estão PERTO — com nível de urgência por
 * distância e severidade.
 *
 * Módulo puro e sem Efeito: fácil de testar (tests/alerta-radar.spec.ts) e
 * reutilizável em qualquer painel. A UI consome via useMemo no MapShell.
 */
import { distanceMeters } from "@/lib/geo";
import type { IntelAlerta, IntelSnapshot } from "@/lib/intel.types";

/** Nível de urgência de uma ameaça próxima. */
export type NivelAlerta = "critico" | "atencao" | "informativo";

export interface AlertaProximidade {
  /** Identificador estável (fonte: id original) — chave de lista e testes. */
  id: string;
  /** Fonte em texto curto ("USGS", "NASA FIRMS", "GDACS"…). */
  fonte: string;
  titulo: string;
  /** Texto de apoio (magnitude, confiança, tipo de alerta…). */
  detalhe: string;
  nivel: NivelAlerta;
  /** Distância até a referência em km; null quando a ameaça é global. */
  distanciaKm: number | null;
  /** Unix em milissegundos do evento; null quando a fonte não informa. */
  hora: number | null;
  lng: number | null;
  lat: number | null;
  /** Link oficial da fonte, quando existe. */
  url: string | null;
}

// Limiares do radar (km) — deliberadamente conservadores: melhor avisar do
// que silenciar. Foco de calor é crítico dentro de 15 km porque a direção do
// vento pode levar a fumaça/faíscas a quilômetros de distância em minutos.
const MAX_INCENDIO_KM = 50;
const INCENDIO_CRITICO_KM = 15;
const SISMO_MIN_MAG = 4;
const MAX_SISMO_KM = 600;
const SISMO_FORTE_KM = 300;
const SISMO_PROXIMO_KM = 150;
const MAX_GDACS_KM = 1000;
const GDACS_VERDE_KM = 300;
const MAX_EVENTO_KM = 500;
/** Quantidade máxima listada por fonte (evita afogar o operador em focos). */
const MAX_POR_FONTE = { incendio: 5, sismo: 5, evento: 3 } as const;
/** Teto total da lista, após a ordenação por urgência. */
const MAX_TOTAL = 20;

const ORDEM_NIVEL: Record<NivelAlerta, number> = { critico: 0, atencao: 1, informativo: 2 };

function km(from: { lng: number; lat: number }, to: { lng: number; lat: number }): number {
  return distanceMeters([from.lng, from.lat], [to.lng, to.lat]) / 1000;
}

function horaIso(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** "agora" · "há 5 min" · "há 3 h" · "há 2 dias" — null quando sem hora. */
export function horaRelativa(ms: number | null, agora: number): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const s = Math.max(0, Math.round((agora - ms) / 1000));
  if (s < 90) return "agora";
  const min = Math.round(s / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 36) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} dias`;
}

/**
 * Avalia o radar. `referencia` é a posição do operador (ou o centro do mapa,
 * fallback do painel). Sem referência nenhuma, só ameaças globais entram
 * (clima espacial) — radar de proximidade sem ponto de referência não existe.
 */
export function avaliarProximidade(
  snapshot: IntelSnapshot | null,
  alertasGdacs: IntelAlerta[] | null,
  referencia: { lng: number; lat: number } | null,
): AlertaProximidade[] {
  const itens: AlertaProximidade[] = [];
  if (!referencia) return itens;

  // ---- Focos de calor (NASA FIRMS, satélite VIIRS) ----
  const focos = (snapshot?.incendios ?? [])
    .map((f) => ({ f, d: km(referencia, f) }))
    .filter(({ d }) => d <= MAX_INCENDIO_KM)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_POR_FONTE.incendio);
  for (const { f, d } of focos) {
    itens.push({
      id: `firms:${f.id}`,
      fonte: "NASA FIRMS",
      titulo: "Foco de calor",
      detalhe:
        `Detectado pelo satélite VIIRS com confiança ${f.confianca || "desconhecida"}` +
        (d <= INCENDIO_CRITICO_KM ? " — risco imediato de fumaça e faíscas" : ""),
      nivel: d <= INCENDIO_CRITICO_KM ? "critico" : "atencao",
      distanciaKm: d,
      hora: horaIso(f.hora),
      lng: f.lng,
      lat: f.lat,
      url: null,
    });
  }

  // ---- Sismos (USGS M2,5+ nas últimas 24 h; radar filtra M4+ perto) ----
  const sismos = (snapshot?.sismos ?? [])
    .filter((s) => s.mag >= SISMO_MIN_MAG)
    .map((s) => ({ s, d: km(referencia, s) }))
    .filter(({ d }) => d <= MAX_SISMO_KM)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_POR_FONTE.sismo);
  for (const { s, d } of sismos) {
    const forte = s.mag >= 5.5 && d <= SISMO_FORTE_KM;
    const alerta =
      (s.mag >= 4.5 && d <= SISMO_FORTE_KM) || (s.mag >= SISMO_MIN_MAG && d <= SISMO_PROXIMO_KM);
    itens.push({
      id: `usgs:${s.id}`,
      fonte: "USGS",
      titulo: `Sismo M${s.mag.toFixed(1)}`,
      detalhe:
        `Profundidade de ${s.profundidade.toFixed(0)} km · ${s.lugar}` +
        (s.tsunami ? " · AVISO DE TSUNAMI EM AVALIAÇÃO" : ""),
      nivel: forte || s.tsunami ? "critico" : alerta ? "atencao" : "informativo",
      distanciaKm: d,
      hora: s.hora,
      lng: s.lng,
      lat: s.lat,
      url: s.url || null,
    });
  }

  // ---- Alertas oficiais de desastre (GDACS — UE/ONU) ----
  for (const a of alertasGdacs ?? []) {
    const d = km(referencia, a);
    const dentro = d <= MAX_GDACS_KM;
    const verde = a.nivel === "Green" && d <= GDACS_VERDE_KM;
    if (!dentro || (a.nivel === "Green" && !verde)) continue;
    itens.push({
      id: `gdacs:${a.id}`,
      fonte: "GDACS",
      titulo: `${a.tipo}${a.nome ? ` — ${a.nome}` : ""}`,
      detalhe: `Alerta oficial ${a.nivel === "Red" ? "VERMELHO" : a.nivel === "Orange" ? "LARANJA" : "verde"} · ${a.pais}`,
      nivel: a.nivel === "Red" ? "critico" : a.nivel === "Orange" ? "atencao" : "informativo",
      distanciaKm: d,
      hora: horaIso(a.inicio),
      lng: a.lng,
      lat: a.lat,
      url: a.url || null,
    });
  }

  // ---- Eventos naturais (NASA EONET: ciclones, vulcões, tempestades) ----
  const eventos = (snapshot?.eventos ?? [])
    .map((e) => ({ e, d: km(referencia, e) }))
    .filter(({ d }) => d <= MAX_EVENTO_KM)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_POR_FONTE.evento);
  for (const { e, d } of eventos) {
    itens.push({
      id: `eonet:${e.id}`,
      fonte: "NASA EONET",
      titulo: e.titulo,
      detalhe: `Evento natural ativo · ${e.categoria}`,
      nivel: "atencao",
      distanciaKm: d,
      hora: e.hora,
      lng: e.lng,
      lat: e.lat,
      url: e.url || null,
    });
  }

  // ---- Clima espacial (NOAA SWPC) — ameaça global, sem distância ----
  if (snapshot?.climaEspacial?.nivel === "tempestade") {
    const c = snapshot.climaEspacial;
    itens.push({
      id: "noaa:kp",
      fonte: "NOAA SWPC",
      titulo: `Tempestade geomagnética (Kp ${c.kp})`,
      detalhe:
        `${c.classificacao} — risco para rádio HF, GPS e redes elétricas. ` +
        `Medido em ${c.medidoEm}.`,
      nivel: "informativo",
      distanciaKm: null,
      hora: horaIso(c.medidoEm),
      lng: null,
      lat: null,
      url: null,
    });
  }

  return itens
    .sort(
      (a, b) =>
        ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel] ||
        (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity) ||
        (b.hora ?? 0) - (a.hora ?? 0),
    )
    .slice(0, MAX_TOTAL);
}

/** Quantidade que acende o selo do botão: críticos + atenção. */
export function contarAmeacas(itens: AlertaProximidade[]): number {
  return itens.filter((i) => i.nivel === "critico" || i.nivel === "atencao").length;
}
