import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

const WEATHER_TEXT: Record<number, string> = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Encoberto",
  45: "Nevoeiro",
  48: "Nevoeiro com geada",
  51: "Garoa fraca",
  53: "Garoa moderada",
  55: "Garoa intensa",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve moderada",
  75: "Neve forte",
  80: "Pancadas de chuva",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  95: "Tempestade",
  96: "Tempestade com granizo",
  99: "Tempestade com granizo forte",
};

export const fetchWeather = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${data.lat.toFixed(4)}` +
      `&longitude=${data.lng.toFixed(4)}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code` +
      `&wind_speed_unit=ms&timezone=auto`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = (await res.json()) as {
        current?: {
          temperature_2m?: number;
          apparent_temperature?: number;
          relative_humidity_2m?: number;
          pressure_msl?: number;
          wind_speed_10m?: number;
          wind_direction_10m?: number;
          weather_code?: number;
        };
      };
      const c = json.current;
      if (!c) return null;
      return {
        temperature: c.temperature_2m ?? null,
        apparent: c.apparent_temperature ?? null,
        humidity: c.relative_humidity_2m ?? null,
        pressure: c.pressure_msl ?? null,
        windSpeed: c.wind_speed_10m ?? null,
        windDirection: c.wind_direction_10m ?? null,
        condition: WEATHER_TEXT[c.weather_code ?? -1] ?? "Sem dados",
      };
    } catch {
      return null;
    }
  });
