/**
 * CAPE — Convective Available Potential Energy (J/kg).
 *
 * Mede a energia que a atmosfera tem disponível para formar tempestades.
 * É o número que o alerta do boletim e o assistente observam: quando o
 * CAPE das próximas horas sobe, a tempestade está se formando perto do
 * operador — e o aviso precisa sair ANTES da primeira gota.
 *
 * Escala de referência de campo:
 *   < 300       estável — sem risco convectivo
 *   300–1000    instabilidade moderada — pancadas isoladas possíveis
 *   1000–2500   CAPE ALTO — tempestades prováveis
 *   > 2500      ambiente severo — granizo/rajada/tornado possíveis
 */

export interface NivelCape {
  nivel: "estavel" | "moderado" | "alto" | "severo";
  /** true quando o aviso vermelho entra no boletim e no assistente. */
  alerta: boolean;
  rotulo: string;
}

const LIMIAR_ALTO = 1000;
const LIMIAR_SEVERO = 2500;

export function nivelCape(cape: number | null | undefined): NivelCape {
  if (cape == null || !Number.isFinite(cape)) {
    return { nivel: "estavel", alerta: false, rotulo: "sem dados" };
  }
  if (cape >= LIMIAR_SEVERO) {
    return { nivel: "severo", alerta: true, rotulo: "ambiente severo" };
  }
  if (cape >= LIMIAR_ALTO) {
    return { nivel: "alto", alerta: true, rotulo: "CAPE alto" };
  }
  if (cape >= 300) {
    return { nivel: "moderado", alerta: false, rotulo: "instabilidade moderada" };
  }
  return { nivel: "estavel", alerta: false, rotulo: "estável" };
}

/** Frase curta do aviso — mesma no boletim e na saudação do assistente. */
export function avisoCape(cape: number | null | undefined): string | null {
  const n = nivelCape(cape);
  if (!n.alerta || cape == null) return null;
  const valor = Math.round(cape);
  if (n.nivel === "severo") {
    return `ATENÇÃO, TEMPESTADE SE FORMANDO PERTO DE VOCÊ — CAPE ${valor} J/KG (ambiente severo: granizo e rajada possíveis). Procure abrigo e proteja o equipamento`;
  }
  return `ATENÇÃO, TEMPESTADE SE FORMANDO PERTO DE VOCÊ — CAPE ${valor} J/KG. Pancadas fortes nas próximas horas: proteja o equipamento e evite cristas expostas`;
}
