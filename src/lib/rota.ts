/**
 * Guia de Rota — modelo, armazenamento local e matemática de navegação.
 *
 * Tudo offline: a rota e a trilha gravada vivem no banco local do aparelho
 * (loja de settings do IndexedDB), e a matemática é pura para poder ser
 * testada sem navegador. Convenções: coordenadas [lng, lat] nos arrays de
 * trilha (ordem MapLibre/GeoJSON); { lat, lng } nos pontos nomeados.
 */
import { getSetting, setSetting } from "@/lib/db";
import { bearingDeg, distanceMeters } from "@/lib/geo";

/** Ponto nomeado de uma rota (waypoint da sequência). */
export interface PontoRota {
  lat: number;
  lng: number;
  nome: string;
}

/** Rota salva: sequência ordenada de pontos a serem perseguidos. */
export interface RotaSalva {
  id: string;
  nome: string;
  pontos: PontoRota[];
  criada_em: string;
}

/** Estado persistido da navegação (retoma ao reabrir o app). */
export interface EstadoNavegacao {
  rota: RotaSalva;
  /** Índice do ponto alvo atual dentro de rota.pontos. */
  indice: number;
}

/** Trilha gravada (breadcrumbs) — [lng, lat] na ordem MapLibre. */
export interface TrilhaSalva {
  pontos: Array<[number, number]>;
  iniciada_em: string;
  atualizada_em: string;
}

export const CHAVE_ROTA_ATIVA = "guia-rota-ativa";
export const CHAVE_TRILHA_ATIVA = "guia-trilha-ativa";

/** Raio de chegada do waypoint: dentro dele avança para o próximo ponto. */
export const RAIO_CHEGADA_M = 25;
/** Desvio transversal tolerado da perna ativa: acima disso é FORA DA ROTA. */
export const DESVIO_TOLERADO_M = 100;
/** Intervalo mínimo entre pontos da trilha (economia de memória/tela). */
export const PASSO_TRILHA_M = 10;
/** Percorrido mínimo antes de acusar "andando em círculos". */
export const MINIMO_CIRCULOS_M = 400;
/** Fração máxima de deslocamento líquido/percorrido para acusar círculos. */
export const RAZAO_CIRCULOS = 0.3;

// ---------------------------------------------------------------------------
// Armazenamento (loja de settings — mesma do restante das preferências)
// ---------------------------------------------------------------------------

export async function carregarNavegacao(): Promise<EstadoNavegacao | null> {
  return (await getSetting<EstadoNavegacao>(CHAVE_ROTA_ATIVA)) ?? null;
}

export async function salvarNavegacao(estado: EstadoNavegacao | null): Promise<void> {
  await setSetting(CHAVE_ROTA_ATIVA, estado);
}

export async function carregarTrilha(): Promise<TrilhaSalva | null> {
  return (await getSetting<TrilhaSalva>(CHAVE_TRILHA_ATIVA)) ?? null;
}

export async function salvarTrilha(trilha: TrilhaSalva | null): Promise<void> {
  await setSetting(CHAVE_TRILHA_ATIVA, trilha);
}

// ---------------------------------------------------------------------------
// Matemática pura de navegação
// ---------------------------------------------------------------------------

/** Contra-rumo (back bearing): o rumo de volta do ponto de partida. */
export function contraRumo(rumo: number): number {
  return (((rumo + 180) % 360) + 360) % 360;
}

/**
 * Desvio transversal (cross-track error) da posição em relação à perna
 * reta a→b, em metros. Fórmula clássica do triângulo esférico:
 * dxt = asin(sin(d13/R) · sin(θ13 − θ12)) · R.
 */
export function desvioTransversalM(
  pos: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  // d13 já é ângulo em radianos (distância / raio da Terra).
  const d13 = distanceMeters([a.lng, a.lat], [pos.lng, pos.lat]) / R;
  const t13 = bearingDeg([a.lng, a.lat], [pos.lng, pos.lat]);
  const t12 = bearingDeg([a.lng, a.lat], [b.lng, b.lat]);
  return Math.abs(Math.asin(Math.sin(d13) * Math.sin((t13 - t12) * rad)) * R);
}

/** Comprimento percorrido pela trilha até agora, em metros. */
export function comprimentoTrilhaM(pontos: Array<[number, number]>): number {
  let total = 0;
  for (let i = 1; i < pontos.length; i++) {
    total += distanceMeters([pontos[i - 1][0], pontos[i - 1][1]], [pontos[i][0], pontos[i][1]]);
  }
  return total;
}

/** Deslocamento líquido (linha reta início → fim) da trilha, em metros. */
export function deslocamentoLiquidoM(pontos: Array<[number, number]>): number {
  if (pontos.length < 2) return 0;
  const inicio = pontos[0];
  const fim = pontos[pontos.length - 1];
  return distanceMeters([inicio[0], inicio[1]], [fim[0], fim[1]]);
}

/**
 * Detecção de "andando em círculos": percorreu bastante (≥ MINIMO_CIRCULOS_M)
 * mas afastou-se pouco do ponto onde começou (razão líquido/percorrido
 * < RAZAO_CIRCULOS). Complemento direto do pedido do usuário.
 */
export function andandoEmCirculos(pontos: Array<[number, number]>): boolean {
  const percorrido = comprimentoTrilhaM(pontos);
  if (percorrido < MINIMO_CIRCULOS_M) return false;
  return deslocamentoLiquidoM(pontos) / percorrido < RAZAO_CIRCULOS;
}

export interface StatusNavegacao {
  /** Distância em linha reta até o ponto alvo, em metros. */
  distanciaM: number;
  /** Rumo (azimute) do operador para o ponto alvo, em graus. */
  rumoAlvo: number;
  /** Correção a aplicar: "esquerda" | "direita" | "ok" (±10° considera ok). */
  correcao: "esquerda" | "direita" | "ok";
  /** Desvio transversal da perna ativa (início da perna → alvo), em metros. */
  desvioM: number;
  /** Fora da rota: desvio ultrapassou a tolerância. */
  foraDaRota: boolean;
  /** Dentro do raio de chegada do ponto alvo. */
  chegou: boolean;
  /** Rumo para voltar ao eixo da perna (só faz sentido fora da rota). */
  rumoDeVolta: number | null;
}

/**
 * Estado completo da navegação a partir da posição atual. A correção é
 * calculada contra o RUMO DO OPERADOR (sensor/GPS) quando disponível —
 * rumoOperador null degrada para "ok" (sem seta), mantendo distância/rumo.
 */
export function statusNavegacao(params: {
  pos: { lat: number; lng: number };
  rota: RotaSalva;
  indice: number;
  rumoOperador: number | null;
}): StatusNavegacao {
  const { pos, rota, indice } = params;
  const alvo = rota.pontos[indice];
  const distanciaM = distanceMeters([pos.lng, pos.lat], [alvo.lng, alvo.lat]);
  const rumoAlvo = bearingDeg([pos.lng, pos.lat], [alvo.lng, alvo.lat]);

  let correcao: StatusNavegacao["correcao"] = "ok";
  if (params.rumoOperador != null) {
    const delta = ((rumoAlvo - params.rumoOperador + 540) % 360) - 180;
    if (delta > 10) correcao = "direita";
    else if (delta < -10) correcao = "esquerda";
  }

  // Perna ativa: ponto anterior (ou a própria posição na primeira perna).
  const inicioPerna = indice > 0 ? rota.pontos[indice - 1] : pos;
  const desvioM = desvioTransversalM(pos, inicioPerna, alvo);
  const foraDaRota = desvioM > DESVIO_TOLERADO_M && indice > 0;

  return {
    distanciaM,
    rumoAlvo,
    correcao,
    desvioM,
    foraDaRota,
    chegou: distanciaM <= RAIO_CHEGADA_M,
    rumoDeVolta: foraDaRota ? rumoAlvo : null,
  };
}

/** Diferença com sinal (−180..180) entre dois rumos (alvo − atual). */
export function deltaRumo(alvo: number, atual: number): number {
  return ((alvo - atual + 540) % 360) - 180;
}

/** ETA textual a partir da distância e da velocidade média recente (m/s). */
export function etaTexto(distanciaM: number, velocidadeMS: number | null): string | null {
  if (velocidadeMS == null || !Number.isFinite(velocidadeMS) || velocidadeMS <= 0.2) return null;
  const segundos = distanciaM / velocidadeMS;
  const minutos = Math.round(segundos / 60);
  if (minutos < 1) return "<1 min";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas}h ${String(minutos % 60).padStart(2, "0")}min`;
}
