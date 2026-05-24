import length from "@turf/length";
import area from "@turf/area";
import bearing from "@turf/bearing";
import distance from "@turf/distance";
import { lineString, point, polygon } from "@turf/helpers";

export type LngLat = [number, number];

export function pathLengthMeters(coords: LngLat[]): number {
  if (coords.length < 2) return 0;
  const ls = lineString(coords);
  return length(ls, { units: "meters" });
}

export function polygonAreaSqMeters(coords: LngLat[]): number {
  if (coords.length < 3) return 0;
  const ring = [...coords, coords[0]];
  const poly = polygon([ring]);
  return area(poly);
}

export function bearingDeg(from: LngLat, to: LngLat): number {
  const b = bearing(point(from), point(to));
  return (b + 360) % 360;
}

export function distanceMeters(from: LngLat, to: LngLat): number {
  return distance(point(from), point(to), { units: "meters" });
}

export function formatMeters(m: number): string {
  if (m < 1000) return `${m.toFixed(1)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function formatNauticalMiles(m: number): string {
  return `${(m / 1852).toFixed(2)} nmi`;
}

export function formatArea(sqm: number): {
  m2: string;
  ha: string;
  acres: string;
} {
  return {
    m2: `${sqm.toFixed(1)} m²`,
    ha: `${(sqm / 10000).toFixed(3)} ha`,
    acres: `${(sqm / 4046.8564224).toFixed(3)} ac`,
  };
}

/** Sample a polyline at fixed interval (meters). Returns LngLat array. */
export function samplePath(coords: LngLat[], intervalM = 50, maxSamples = 200): LngLat[] {
  if (coords.length < 2) return coords.slice();
  const total = pathLengthMeters(coords);
  if (total === 0) return [coords[0]];
  const step = Math.max(intervalM, total / maxSamples);
  const out: LngLat[] = [coords[0]];
  let acc = 0;
  let nextTarget = step;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const seg = distanceMeters(a, b);
    while (acc + seg >= nextTarget) {
      const t = (nextTarget - acc) / seg;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      nextTarget += step;
    }
    acc += seg;
  }
  out.push(coords[coords.length - 1]);
  return out;
}
