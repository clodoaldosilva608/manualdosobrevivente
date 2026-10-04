import * as SunCalc from "suncalc";

export interface CelestialInfo {
  isDay: boolean;
  phaseLabel: string;
  sunrise: Date | null;
  sunset: Date | null;
  dawn: Date | null;
  dusk: Date | null;
  solarNoon: Date | null;
  sunAzimuth: number | null;
  sunriseAzimuth: number | null;
  sunsetAzimuth: number | null;
  sunAltitude: number;

  moonAzimuth: number;
  moonAltitude: number;
  moonPhase: number;
  moonPhaseLabel: string;
  moonIllumination: number;
  moonUp: boolean;
  hemisphere: "N" | "S";
  hemisphereLabel: string;
  starName: string;
  starHint: string;
  starAzimuth: number;
  starAltitude: number;
  starUp: boolean;
}

function norm(deg: number) {
  return ((deg % 360) + 360) % 360;
}

const toDeg = (rad: number) => (rad * 180) / Math.PI;

function moonPhaseLabel(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "Nova";
  if (phase < 0.22) return "Crescente côncava";
  if (phase < 0.28) return "Quarto crescente";
  if (phase < 0.47) return "Crescente gibosa";
  if (phase < 0.53) return "Cheia";
  if (phase < 0.72) return "Minguante gibosa";
  if (phase < 0.78) return "Quarto minguante";
  return "Minguante côncava";
}

/**
 * Centro do Cruzeiro do Sul (constelação Crux), ponto médio entre Acrux
 * (α Crucis) e Gacrux (γ Crucis) — a referência clássica de orientação no
 * hemisfério sul.
 */
export const CRUZEIRO_DO_SUL = { raDeg: 187.25, decDeg: -60.15 };

/** Polaris (α Ursae Minoris), a Estrela do Norte do hemisfério norte. */
export const POLARIS = { raDeg: 37.95, decDeg: 89.35 };

/**
 * Converte coordenadas equatoriais (ascensão reta e declinação de um astro
 * fixo) para coordenadas horizontais (azimute a partir do norte e altura)
 * no local e momento informados, via tempo sideral greenwichano.
 */
export function posicaoEquatorialParaHorizontal(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lngDeg: number,
  date: Date,
): { azimuth: number; altitude: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const horarioLocal = norm(gmst + lngDeg - raDeg); // ângulo horário em graus
  const phi = (latDeg * Math.PI) / 180;
  const delta = (decDeg * Math.PI) / 180;
  const h = (horarioLocal * Math.PI) / 180;
  const senoAltura =
    Math.sin(delta) * Math.sin(phi) + Math.cos(delta) * Math.cos(phi) * Math.cos(h);
  const altura = Math.asin(Math.max(-1, Math.min(1, senoAltura)));
  // Azimute medido a partir do sul, sentido oeste — corrigido para o norte.
  const azimuteDoSul = Math.atan2(
    Math.sin(h),
    Math.cos(h) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi),
  );
  return { azimuth: norm(toDeg(azimuteDoSul) + 180), altitude: toDeg(altura) };
}

function dayPhaseLabel(altitude: number): string {
  // Limiares em graus (suncalc 2.x devolve graus): −6° crepúsculo civil,
  // −12° náutico, −18° astronômico.
  if (altitude > 5) return "Dia";
  if (altitude > -1) return "Nascer/pôr do sol";
  if (altitude > -6) return "Crepúsculo civil";
  if (altitude > -12) return "Crepúsculo náutico";
  return "Noite";
}

export function getCelestial(lat: number, lng: number, date = new Date()): CelestialInfo {
  // suncalc 2.x: azimute já é norte-based em GRAUS (0 = N, 90 = L, 180 = S,
  // 270 = O) e altitude em graus — sem conversão de radianos nem +180.
  const times = SunCalc.getTimes(date, lat, lng);
  const sunPos = SunCalc.getPosition(date, lat, lng);
  const moonPos = SunCalc.getMoonPosition(date, lat, lng);
  const illum = SunCalc.getMoonIllumination(date);

  const valid = (d: Date | null | undefined) => (d && !Number.isNaN(d.getTime()) ? d : null);
  const isDay = sunPos.altitude > 0;
  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";
  const sunriseAt = valid(times.sunrise);
  const sunsetAt = valid(times.sunset);
  const azAt = (d: Date | null) => (d ? norm(SunCalc.getPosition(d, lat, lng).azimuth) : null);

  return {
    isDay,
    phaseLabel: dayPhaseLabel(sunPos.altitude),
    sunrise: sunriseAt,
    sunset: sunsetAt,
    dawn: valid(times.dawn),
    dusk: valid(times.dusk),
    solarNoon: valid(times.solarNoon),
    sunAzimuth: norm(sunPos.azimuth),
    sunriseAzimuth: azAt(sunriseAt),
    sunsetAzimuth: azAt(sunsetAt),

    sunAltitude: sunPos.altitude,
    moonAzimuth: norm(moonPos.azimuth),
    moonAltitude: moonPos.altitude,
    moonPhase: illum.phase,
    moonPhaseLabel: moonPhaseLabel(illum.phase),
    moonIllumination: illum.fraction * 100,
    moonUp: moonPos.altitude > 0,
    hemisphere,
    hemisphereLabel: hemisphere === "N" ? "Hemisfério Norte" : "Hemisfério Sul",
    starName: hemisphere === "N" ? "Polaris (Estrela do Norte)" : "Cruzeiro do Sul",
    starHint:
      hemisphere === "N"
        ? `Polaris marca o norte verdadeiro, a cerca de ${Math.round(Math.abs(lat))}° acima do horizonte.`
        : `Prolongue 4,5 vezes o eixo maior do Cruzeiro do Sul e desça ao horizonte: ali está o sul verdadeiro (cerca de ${Math.round(Math.abs(lat))}° de altura polar).`,
    // Posição real e atual do astro de referência (Cruzeiro do Sul no sul,
    // Polaris no norte) — o azimute gira com o tempo sideral.
    ...(() => {
      const estrela = hemisphere === "N" ? POLARIS : CRUZEIRO_DO_SUL;
      const pos = posicaoEquatorialParaHorizontal(estrela.raDeg, estrela.decDeg, lat, lng, date);
      return { starAzimuth: pos.azimuth, starAltitude: pos.altitude, starUp: pos.altitude > 0 };
    })(),
  };
}
