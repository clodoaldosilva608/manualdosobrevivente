/**
 * Cálculos puros da bússola do aparelho — rumo compensado por inclinação,
 * correção da rotação de tela, declinação magnética e suavização.
 *
 * Mantido livre de APIs do navegador para ser testável de ponta a ponta.
 */

/** Normaliza um ângulo para [0, 360). */
export function norm360(graus: number): number {
  return ((graus % 360) + 360) % 360;
}

/** Diferência assinada mínima entre dois rumos, em [-180, 180). */
export function diferencaAngulo(de: number, para: number): number {
  return ((para - de + 540) % 360) - 180;
}

/** Leitura crua do evento deviceorientation (com o extra do iOS). */
export interface LeituraOrientacao {
  alpha: number | null | undefined;
  beta: number | null | undefined;
  gamma: number | null | undefined;
  /** iOS Safari: rumo do aparelho já compensado (graus, 0 = norte). */
  webkitCompassHeading?: number;
  /** Ângulo da rotação de tela (screen.orientation.angle): 0, 90, 180 ou 270. */
  anguloTela?: number;
}

const GRAUS = Math.PI / 180;

/**
 * Rumo MAGNÉTICO do aparelho a partir de alpha/beta/gamma, compensado por
 * inclinação e pela rotação de tela.
 *
 * Convenção W3C (a do Chrome/Android): o referencial do aparelho chega ao
 * referencial da Terra pela rotação R = Rz(α)·Rx(β)·Ry(γ), com a Terra em
 * Leste–Norte–Para cima. Projetando o eixo "topo do aparelho" (0,1,0) no
 * plano horizontal:
 *
 *   dx = sin γ · cos α − cos γ · cos β · sin α
 *   dy = sin γ · sin α + cos γ · cos β · cos α
 *   rumo = atan2(dx, dy)
 *
 * Essa fórmula devolve exatamente 360 − α quando γ = 0 (uso em retrato, com
 * qualquer inclinação β) e continua correta com o aparelho de lado (γ ≠ 0),
 * caso em que a fórmula ingênua 360 − α erra por dezenas de graus.
 *
 * Depois soma o ângulo de tela: quando a interface está deitada (paisagem),
 * o "topo da tela" vira outra borda do aparelho (+90°/−90°/180°).
 */
export function rumoMagneticoDeEixos(leitura: LeituraOrientacao): number | null {
  const { alpha, beta, gamma } = leitura;
  if (typeof alpha !== "number" || typeof beta !== "number" || typeof gamma !== "number") {
    return null;
  }
  const a = alpha * GRAUS;
  const b = beta * GRAUS;
  const g = gamma * GRAUS;
  const dx = Math.sin(g) * Math.cos(a) - Math.cos(g) * Math.cos(b) * Math.sin(a);
  const dy = Math.sin(g) * Math.sin(a) + Math.cos(g) * Math.cos(b) * Math.cos(a);
  const rumo = (Math.atan2(dx, dy) * 180) / Math.PI;
  return norm360(rumo + (leitura.anguloTela ?? 0));
}

/**
 * Rumo VERDADEIRO (norte geográfico) da leitura do aparelho:
 * - iOS: webkitCompassHeading já vem do CoreLocation compensado por
 *   inclinação e contra o norte VERDADEIRO — só falta a rotação de tela.
 * - Demais: rumo magnético da matriz + declinação magnética do lugar
 *   (verdadeiro = magnético + declinação, leste positivo).
 * Devolve o rumo bruto ANTES da correção de calibração do usuário.
 */
export function rumoVerdadeiroBruto(
  leitura: LeituraOrientacao,
  declinacaoGraus: number,
): number | null {
  if (typeof leitura.webkitCompassHeading === "number") {
    return norm360(leitura.webkitCompassHeading + (leitura.anguloTela ?? 0));
  }
  const magnetico = rumoMagneticoDeEixos(leitura);
  if (magnetico == null) return null;
  return norm360(magnetico + declinacaoGraus);
}

/**
 * Suavização circular (filtro passa-baixa) para o tremor do magnetômetro:
 * caminha uma fração do caminho mais curto até o alvo. Saltos grandes
 * (recalibração, troca brusca de orientação) aplicam direto, sem inércia.
 */
export function suavizarRumo(anterior: number | null, alvo: number, fator = 0.35): number {
  if (anterior == null) return norm360(alvo);
  const diff = diferencaAngulo(anterior, alvo);
  if (Math.abs(diff) > 45) return norm360(alvo);
  return norm360(anterior + diff * fator);
}
