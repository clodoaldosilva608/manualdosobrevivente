/**
 * Rotação real da Terra para o Globo 3D.
 *
 * O globo do mapa tático gira no MESMO sentido e na MESMA velocidade
 * angular do planeta: um giro completo por dia sideral (23 h 56 min 4 s),
 * com o disco avançando da esquerda para a direita (oeste → leste), como
 * visto da espaço.
 *
 * Física do sentido: a Terra gira para leste; um observador fixo no espaço
 * vê os continentes atravessar o disco em direção ao limbo leste (direita).
 * Com a câmera parada, isso equivale ao meridiano central CAMINHAR PARA
 * OESTE — por isso a rotação aqui DECRESCENTA a longitude do centro.
 *
 * A longitude subsolar (onde o Sol está a pino neste instante) dá o âncora
 * "real": centralizar nela mostra o hemisfério diurno de frente, e girando
 * em tempo real o globo acompanha a orientação verdadeira do planeta em
 * relação ao Sol.
 */
import * as SunCalc from "suncalc";

/** Dia sideral em segundos — a volta completa da Terra no referencial inercial. */
export const DIA_SIDERAL_S = 86164.0905;

/** Velocidade angular real da Terra, em graus por segundo (~0,004178°/s). */
export const GRAUS_POR_SEGUNDO = 360 / DIA_SIDERAL_S;

/** Normaliza a longitude para o intervalo [-180, 180). */
export function normalizarLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** Altitude solar em graus num ponto (embrulho fino do SunCalc, em graus). */
function altitudeGraus(data: Date, lat: number, lng: number): number {
  return (SunCalc.getPosition(data, lat, lng).altitude * 180) / Math.PI;
}

/**
 * Longitude subsolar — o meridiano onde o Sol está exatamente a pino agora.
 *
 * A altitude solar numa latitude fixa é unimodal na longitude (um único
 * pico: o meio-dio solar daquele instante), então uma varredura de 3°
 * seguida de refinamento por seção áurea acha o pico com precisão de
 * centésimos de grau — muito além do que o globo precisa.
 */
export function longitudeSubsolar(data: Date = new Date()): number {
  const PASSO = 3;
  // Varredura grosseira: acha o melhor meridiano de 3° em 3°.
  let melhorLng = -180;
  let melhorAlt = -Infinity;
  for (let lng = -180; lng <= 180; lng += PASSO) {
    const alt = altitudeGraus(data, 0, lng);
    if (alt > melhorAlt) {
      melhorAlt = alt;
      melhorLng = lng;
    }
  }
  // Refino por seção áurea no intervalo ao redor do pico (±PASSO).
  let lo = melhorLng - PASSO;
  let hi = melhorLng + PASSO;
  const PHI = (Math.sqrt(5) - 1) / 2;
  let a = hi - PHI * (hi - lo);
  let b = lo + PHI * (hi - lo);
  let fa = altitudeGraus(data, 0, a);
  let fb = altitudeGraus(data, 0, b);
  for (let i = 0; i < 30; i++) {
    if (fa > fb) {
      hi = b;
      b = a;
      fb = fa;
      a = hi - PHI * (hi - lo);
      fa = altitudeGraus(data, 0, a);
    } else {
      lo = a;
      a = b;
      fa = fb;
      b = lo + PHI * (hi - lo);
      fb = altitudeGraus(data, 0, b);
    }
  }
  return normalizarLng((lo + hi) / 2);
}
