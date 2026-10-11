/**
 * Narração de navegação (estilo Waze) — a SKILL pré-ativada do assistente.
 *
 * Estado puro e testável: recebe as transições do status de navegação e
 * decide QUAL frase falar (e quando calar). A fala em si é do navegador
 * (speechSynthesis, voz pt-BR) — ver falar() no fim do módulo.
 *
 * Regras de narração:
 *  - Virada (esquerda/direita) só fala quando o alvo está a menos de 500 m,
 *    com antecedência em faixas: 300 m ("a 300 metros…"), 100 m ("em 100
 *    metros…"), 30 m ("agora…");
 *  - Não repete a mesma faixa para a mesma perna;
 *  - Fora da rota fala uma vez até voltar;
 *  - Chegada fala uma vez;
 *  - Mudança de alvo (perna nova) reseta as faixas.
 */

export interface EstadoNav {
  distanciaM: number;
  correcao: "esquerda" | "direita" | "ok";
  foraDaRota: boolean;
  chegou: boolean;
}

export type FaixaNav = "300" | "100" | "30" | "fora" | "chegou";

interface EstadoInterno {
  /** Índice do alvo atual (perna) — muda ao alcançar o ponto. */
  perna: number;
  /** Faixas já faladas na perna atual. */
  faladas: Set<FaixaNav>;
}

const LIMIARES: Array<{ faixa: FaixaNav; ateM: number }> = [
  { faixa: "300", ateM: 500 },
  { faixa: "100", ateM: 130 },
  { faixa: "30", ateM: 45 },
];

/** Estado de narração do app (um por página de mapa). */
let interno: EstadoInterno | null = null;

/** Reseta a narração (navegação iniciada/parada). */
export function reiniciarNarracao(): void {
  interno = null;
}

/** Muda a perna atual (índice do ponto alvo na rota). */
export function definirPerna(indice: number): void {
  if (!interno || interno.perna !== indice) {
    interno = { perna: indice, faladas: new Set() };
  }
}

function faixaPara(distanciaM: number): FaixaNav | null {
  // A faixa aplicável é a mais apertada cujo limiar ainda contém a distância.
  let atual: FaixaNav | null = null;
  for (const l of LIMIARES) {
    if (distanciaM <= l.ateM) atual = l.faixa;
  }
  return atual;
}

/**
 * Decide a próxima frase da narração (ou null para calar).
 * Chame a cada atualização do status; devolve no máximo uma frase por vez.
 */
export function fraseNavegacao(estado: EstadoNav): string | null {
  if (estado.chegou) {
    if (!interno || !interno.faladas.has("chegou")) {
      interno = { perna: interno?.perna ?? 0, faladas: new Set(["chegou"]) };
      return "Você chegou ao destino.";
    }
    return null;
  }

  if (estado.foraDaRota) {
    if (!interno) interno = { perna: 0, faladas: new Set() };
    if (!interno.faladas.has("fora")) {
      interno.faladas.add("fora");
      return "Você saiu da rota. Volte para a linha da trilha — estou calculando o retorno.";
    }
    return null;
  }

  if (!interno) interno = { perna: 0, faladas: new Set() };
  // Voltou para a rota: libera o aviso de fora na próxima vez.
  interno.faladas.delete("fora");

  const faixa = faixaPara(estado.distanciaM);
  if (!faixa || interno.faladas.has(faixa)) return null;

  // Rumo correto nas faixas intermediárias: cala e NÃO marca a faixa —
  // a manobra que aparecer depois ainda precisa ser falada.
  if (estado.correcao === "ok" && faixa !== "30") return null;

  const direcao =
    estado.correcao === "esquerda"
      ? "vire à esquerda"
      : estado.correcao === "direita"
        ? "vire à direita"
        : "siga em frente";

  const texto = faixa === "30" ? `Agora: ${direcao}.` : `A ${faixa} metros: ${direcao}.`;

  interno.faladas.add(faixa);
  return texto;
}

// ---------------------------------------------------------------------------
// Voz do navegador (não testada em unidade; graciosamente ausente sem voz)
// ---------------------------------------------------------------------------

let vozPt: SpeechSynthesisVoice | null = null;

function acharVoz(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  if (vozPt) return vozPt;
  const vozes = speechSynthesis.getVoices();
  vozPt =
    vozes.find((v) => v.lang?.toLowerCase().startsWith("pt-br")) ??
    vozes.find((v) => v.lang?.toLowerCase().startsWith("pt")) ??
    null;
  return vozPt;
}

/** Fala o texto em pt-BR (cancela o anterior — o trânsito não espera). */
export function falar(texto: string): void {
  if (typeof speechSynthesis === "undefined" || !texto) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 1.08;
    const voz = acharVoz();
    if (voz) u.voice = voz;
    speechSynthesis.speak(u);
  } catch {
    /* sem voz disponível — o banner da navegação segue valendo */
  }
}
