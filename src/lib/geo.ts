import length from "@turf/length";
import area from "@turf/area";
import bearing from "@turf/bearing";
import distance from "@turf/distance";
import { lineString, point, polygon } from "@turf/helpers";

export type LngLat = [number, number];

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

export function pathLengthMeters(coords: LngLat[]): number {
  if (coords.length < 2) return 0;
  return length(lineString(coords), { units: "meters" });
}

export function polygonAreaSqMeters(coords: LngLat[]): number {
  if (coords.length < 3) return 0;
  return area(polygon([[...coords, coords[0]]]));
}

export function bearingDeg(from: LngLat, to: LngLat): number {
  return (bearing(point(from), point(to)) + 360) % 360;
}

export function distanceMeters(from: LngLat, to: LngLat): number {
  return distance(point(from), point(to), { units: "meters" });
}

export function formatMeters(m: number): string {
  if (m < 1000) return `${nf(1, 1).format(m)} m`;
  return `${nf(2, 2).format(m / 1000)} km`;
}

export function formatNauticalMiles(m: number): string {
  return `${nf(2, 2).format(m / 1852)} NM`;
}

export function formatArea(sqm: number): { m2: string; ha: string; acres: string } {
  return {
    m2: `${nf(1, 1).format(sqm)} m²`,
    ha: `${nf(3, 3).format(sqm / 10000)} ha`,
    acres: `${nf(3, 3).format(sqm / 4046.8564224)} ac`,
  };
}

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
