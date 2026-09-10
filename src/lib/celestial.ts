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

function dayPhaseLabel(altitude: number, isDay: boolean): string {
  if (altitude > 0.1) return isDay ? "Dia" : "Dia";
  if (altitude > -0.105) return "Nascer/pôr do sol";
  if (altitude > -0.105 - 0.1047) return "Crepúsculo civil";
  if (altitude > -0.2094) return "Crepúsculo náutico";
  return "Noite";
}

export function getCelestial(lat: number, lng: number, date = new Date()): CelestialInfo {
  const times = SunCalc.getTimes(date, lat, lng);
  const sunPos = SunCalc.getPosition(date, lat, lng);
  const moonPos = SunCalc.getMoonPosition(date, lat, lng);
  const illum = SunCalc.getMoonIllumination(date);

  const valid = (d: Date | null | undefined) => (d && !Number.isNaN(d.getTime()) ? d : null);
  const isDay = sunPos.altitude > 0;
  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";
  const sunriseAt = valid(times.sunrise);
  const sunsetAt = valid(times.sunset);
  const azAt = (d: Date | null) =>
    d ? norm(toDeg(SunCalc.getPosition(d, lat, lng).azimuth) + 180) : null;

  return {
    isDay,
    phaseLabel: dayPhaseLabel(sunPos.altitude, isDay),
    sunrise: sunriseAt,
    sunset: sunsetAt,
    dawn: valid(times.dawn),
    dusk: valid(times.dusk),
    solarNoon: valid(times.solarNoon),
    sunAzimuth: norm(toDeg(sunPos.azimuth) + 180),
    sunriseAzimuth: azAt(sunriseAt),
    sunsetAzimuth: azAt(sunsetAt),

    sunAltitude: toDeg(sunPos.altitude),
    moonAzimuth: norm(toDeg(moonPos.azimuth) + 180),
    moonAltitude: toDeg(moonPos.altitude),
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
    starAzimuth: hemisphere === "N" ? 0 : 180,
  };
}
