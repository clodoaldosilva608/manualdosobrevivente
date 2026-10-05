/**
 * Fonte única de formatação de números, datas, distâncias, áreas,
 * pesos, ângulos e coordenadas. Nenhuma tela deve usar toLocaleString/toFixed
 * diretamente — sempre passar por aqui.
 *
 * O locale padrão é pt-BR; o seletor de idiomas troca o locale em tempo de
 * execução via definirLocale() (datas e números seguem o idioma escolhido).
 */

let LOCALE = "pt-BR";

/** Troca o locale de formatação (chamado pelo provedor de idioma). */
export function definirLocale(locale: string) {
  if (!locale || locale === LOCALE) return;
  LOCALE = locale;
  cache.clear();
}

const cache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${LOCALE}:${min}:${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
    cache.set(key, f);
  }
  return f;
}

/** Número genérico com casas decimais fixas. */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return nf(decimals, decimals).format(value);
}

/** Inteiro. */
export function formatInteger(value: number): string {
  return formatNumber(value, 0);
}

/** Percentual (0–100). */
export function formatPercent(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)}%`;
}

/** Distância em metros → "875,0 m" ou "12,34 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (Math.abs(meters) < 1000) return `${formatNumber(meters, 1)} m`;
  return `${formatNumber(meters / 1000, 2)} km`;
}

/** Distância em metros → milhas náuticas. */
export function formatNautical(meters: number): string {
  return `${formatNumber(meters / 1852, 2)} NM`;
}

/** Altitude/elevação em metros. */
export function formatElevation(meters: number): string {
  return `${formatNumber(meters, 0)} m`;
}

/** Área em m² → objeto com m², hectares e acres. */
export function formatAreaAll(sqm: number): { m2: string; ha: string; acres: string } {
  return {
    m2: `${formatNumber(sqm, 1)} m²`,
    ha: `${formatNumber(sqm / 10000, 3)} ha`,
    acres: `${formatNumber(sqm / 4046.8564224, 3)} ac`,
  };
}

/** Peso em gramas → "850 g" ou "12,35 kg". */
export function formatWeight(grams: number): string {
  if (!Number.isFinite(grams)) return "—";
  if (Math.abs(grams) < 1000) return `${formatNumber(grams, 0)} g`;
  return `${formatNumber(grams / 1000, 2)} kg`;
}

/** Peso em gramas sempre exibido em kg. */
export function formatKilograms(grams: number, decimals = 2): string {
  return `${formatNumber(grams / 1000, decimals)} kg`;
}

/** Ângulo/azimute em graus → "127°". */
export function formatDegrees(deg: number, decimals = 0): string {
  if (!Number.isFinite(deg)) return "—";
  return `${formatNumber(deg, decimals)}°`;
}

/** Declinação com sinal explícito → "-21,3°". */
export function formatSignedDegrees(deg: number, decimals = 1): string {
  if (!Number.isFinite(deg)) return "—";
  const sign = deg > 0 ? "+" : "";
  return `${sign}${formatNumber(deg, decimals)}°`;
}

/** Velocidade em m/s → km/h. */
export function formatSpeed(metersPerSecond: number): string {
  return `${formatNumber(metersPerSecond * 3.6, 1)} km/h`;
}

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Data curta → "07/09/2026". */
export function formatDate(value: string | number | Date): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString(LOCALE) : "—";
}

/** Data e hora → "07/09/2026 04:46". */
export function formatDateTime(value: string | number | Date): string {
  const d = toDate(value);
  return d
    ? d.toLocaleString(LOCALE, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

/** Hora → "04:46". */
export function formatTime(value: string | number | Date): string {
  const d = toDate(value);
  return d ? d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" }) : "—";
}

/** Duração em segundos → "1 h 05 min" / "45 s". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${formatInteger(s)} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${formatInteger(m)} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return `${formatInteger(h)} h ${String(rest).padStart(2, "0")} min`;
}

/**
 * Coordenada decimal: mantém o ponto decimal, padrão geodésico
 * internacional para latitude/longitude.
 */
export function formatDecimalDegrees(value: number, decimals = 5): string {
  return value.toFixed(decimals);
}
