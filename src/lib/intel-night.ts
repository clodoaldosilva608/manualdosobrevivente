/**
 * Terminador dia/noite — polígono do hemisfério noturno para overlay no mapa.
 *
 * Para cada meridiano, a latitude da linha do terminador é encontrada por
 * bisseção usando a altitude solar do SunCalc (biblioteca já usada pelo app
 * em src/lib/celestial.ts). O anel é fechado pelo polo do lado noturno.
 */
import * as SunCalc from "suncalc";

const PASSO_LNG = 3; // graus por amostra (121 amostras de -180 a 180)
const ITERACOES = 22; // precisão ~0,0001°

function altitudeSolar(data: Date, lat: number, lng: number): number {
  return SunCalc.getPosition(data, lat, lng).altitude;
}

export function poligonoNoturno(data: Date = new Date()): GeoJSON.Feature | null {
  const pontos: Array<[number, number]> = [];
  for (let lng = -180; lng <= 180; lng += PASSO_LNG) {
    let lo = -90;
    let hi = 90;
    const altLo = altitudeSolar(data, lo, lng);
    const altHi = altitudeSolar(data, hi, lng);
    if (altLo * altHi > 0) {
      // Meridiano inteiro iluminado ou escuro (polar): fecha no polo escuro.
      pontos.push([lng, altLo > 0 ? -90 : 90]);
      continue;
    }
    for (let i = 0; i < ITERACOES; i++) {
      const mid = (lo + hi) / 2;
      if (altLo * altitudeSolar(data, mid, lng) > 0) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    pontos.push([lng, Math.max(-89.9, Math.min(89.9, (lo + hi) / 2))]);
  }

  // Lado noturno: polo oposto ao hemisfério iluminado.
  const altPoloNorte = altitudeSolar(data, 89.9, 0);
  const poloNoturno = altPoloNorte > 0 ? -90 : 90;

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  if (!primeiro || !ultimo) return null;
  const anel: Array<[number, number]> = [
    ...pontos,
    [180, poloNoturno],
    [-180, poloNoturno],
    primeiro,
  ];
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [anel] },
  };
}
