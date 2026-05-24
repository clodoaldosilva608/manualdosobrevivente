import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  points: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(1)
    .max(500),
});

export const fetchElevations = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    // Open-Meteo Elevation API: lat&lng with semicolon-separated values, up to 100/req
    const batchSize = 100;
    const elevations: number[] = [];
    for (let i = 0; i < data.points.length; i += batchSize) {
      const batch = data.points.slice(i, i + batchSize);
      const lats = batch.map((p) => p[1].toFixed(5)).join(",");
      const lngs = batch.map((p) => p[0].toFixed(5)).join(",");
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          for (let k = 0; k < batch.length; k++) elevations.push(0);
          continue;
        }
        const json = (await res.json()) as { elevation?: number[] };
        if (Array.isArray(json.elevation)) {
          elevations.push(...json.elevation);
        } else {
          for (let k = 0; k < batch.length; k++) elevations.push(0);
        }
      } catch {
        for (let k = 0; k < batch.length; k++) elevations.push(0);
      }
    }
    return { elevations };
  });
