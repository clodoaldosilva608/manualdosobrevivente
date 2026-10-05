/**
 * Nível universal do aparelho — funciona em QUALQUER posição.
 *
 * O nível de bolha tradicional só faz sentido com o aparelho deitado
 * (tela para cima). Aqui a leitura vem do VETOR GRAVIDADE completo
 * (devicemotion → accelerationIncludingGravity), portanto mede a inclinação
 * com o celular: deitado (tela para cima ou para baixo), em pé, de lado,
 * de cabeça para baixo ou em qualquer ângulo intermediário — em retrato ou
 * paisagem (a rotação da tela é compensada).
 *
 * Matemática (frame do aparelho: x → direita, y → topo, z → fora da tela):
 * - inclinação total = ângulo entre a gravidade e o eixo z (a normal da
 *   tela): acos(|gz|/|g|). 0° = deitado e nivelado (qualquer lado da tela);
 * - eixos: a gravidade é girada para o frame da TELA pela rotação dela
 *   (screen.orientation.angle) e projetada: angX = asin(gs_x/|g|) com
 *   positivo = lado DIREITO baixo; angY = −asin(gs_y/|g|) com positivo =
 *   borda INFERIOR baixa (gs_y aponta para o topo da tela);
 * - a bolha anda para o lado BAIXO da tela (comportamento de bola, igual
 *   ao nível antigo), limitada a ±30°, como no nível óptico.
 *
 * Biblioteca pura (sem APIs do navegador) — testável de ponta a ponta.
 */

export interface LeituraNivel {
  /** Inclinação no eixo X da tela, em graus (positiva = lado direito baixo). */
  angX: number;
  /** Inclinação no eixo Y da tela, em graus (positiva = borda inferior baixa). */
  angY: number;
  /** Inclinação total contra o plano horizontal, em graus (0 = nivelado). */
  total: number;
  /** Posição do bolhão no eixo X, em [-1, 1] (±30° enchem a escala). */
  bolhaX: number;
  /** Posição do bolhão no eixo Y, em [-1, 1] (±30° enchem a escala). */
  bolhaY: number;
  /** true com a tela virada para cima (deitado normal). */
  telaParaCima: boolean;
  /** true quando a inclinação total está dentro da tolerância. */
  nivelado: boolean;
  /** Postura detectada, para exibição. */
  postura: "deitado" | "de-pe" | "de-lado" | "inclinado";
}

/** Tolerância para considerar "nivelado" (graus) — igual ao nível óptico fino. */
export const TOLERANCIA_NIVEL = 2.5;
/** Ângulo que enche a escala do bolhão (graus), igual ao nível de bolha. */
const ESCALA_BOLHA = 30;

const RAD = Math.PI / 180;
const GRAD = 180 / Math.PI;

function limitar(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Calcula o nível universal a partir da leitura do acelerômetro no frame do
 * APARELHO (m/s², do accelerationIncludingGravity) e do ângulo de rotação
 * da tela (screen.orientation.angle: 0, 90, 180 ou 270).
 *
 * IMPORTANTE sobre o sinal: accelerationIncludingGravity mede a reação do
 * apoio (quando deitado com a tela para cima devolve +z ≈ +9,8) — ou seja,
 * o vetor OPOSTO à gravidade. Aqui invertemos para trabalhar com a
 * GRAVIDADE de verdade (aponta para onde cai a bolha/bola).
 *
 * Devolve null quando o vetor é inválido (ausente ou ~zero).
 */
export function nivelUniversal(
  medidoX: number,
  medidoY: number,
  medidoZ: number,
  anguloTela = 0,
  tolerancia = TOLERANCIA_NIVEL,
): LeituraNivel | null {
  const modulo = Math.hypot(medidoX, medidoY, medidoZ);
  // Menos de 0,5 m/s² de magnitude não é gravidade — é ruído/leitura vazia.
  if (!Number.isFinite(modulo) || modulo < 0.5) return null;

  // Inverte para a GRAVIDADE real (o medido é a reação do apoio).
  const gx = -medidoX;
  const gy = -medidoY;
  const gz = -medidoZ;

  // Gravidade para o frame da TELA: gira PELA rotação dela (a=90 leva o
  // topo do aparelho para a esquerda da tela — igual à convenção do rumo).
  const a = (anguloTela % 360) * RAD;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const gsx = gx * cos - gy * sin; // componente no eixo X da tela
  const gsy = gx * sin + gy * cos; // componente no eixo "topo da tela"

  // Ângulos por eixo da tela (asin mantém a leitura exata de pé também).
  // angX positivo = lado direito baixo; angY positivo = borda de baixo baixa.
  const angX = Math.asin(limitar(gsx / modulo, -1, 1)) * GRAD;
  const angY = -Math.asin(limitar(gsy / modulo, -1, 1)) * GRAD;
  // Total contra o plano horizontal: o |gz| basta (tela para cima ou baixo).
  const total = Math.acos(limitar(Math.abs(gz) / modulo, 0, 1)) * GRAD;

  const telaParaCima = medidoZ >= 0;
  const nivelado = total <= tolerancia;
  const postura: LeituraNivel["postura"] = nivelado
    ? "deitado"
    : total >= 75
      ? "de-pe"
      : total >= 45
        ? "de-lado"
        : "inclinado";

  return {
    angX,
    angY,
    total,
    bolhaX: limitar(angX / ESCALA_BOLHA, -1, 1),
    bolhaY: limitar(angY / ESCALA_BOLHA, -1, 1),
    telaParaCima,
    nivelado,
    postura,
  };
}

/**
 * Suaviza o vetor gravidade contra tremor do acelerômetro (filtro
 * passa-baixa por eixo). Fator 0 = congela; 1 = segue a leitura crua.
 */
export function suavizarGravidade(
  anterior: { x: number; y: number; z: number } | null,
  gx: number,
  gy: number,
  gz: number,
  fator = 0.25,
): { x: number; y: number; z: number } {
  if (!anterior) return { x: gx, y: gy, z: gz };
  const salto = Math.hypot(gx - anterior.x, gy - anterior.y, gz - anterior.z);
  // Troca brusca de postura (aparelho virado): aplica direto, sem inércia.
  if (salto > 6) return { x: gx, y: gy, z: gz };
  return {
    x: anterior.x + (gx - anterior.x) * fator,
    y: anterior.y + (gy - anterior.y) * fator,
    z: anterior.z + (gz - anterior.z) * fator,
  };
}
