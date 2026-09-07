import length from "@turf/length";
import area from "@turf/area";
import bearing from "@turf/bearing";
import distance from "@turf/distance";
import { lineString, point, polygon } from "@turf/helpers";
import { formatDistance, formatNautical, formatAreaAll } from "@/lib/format";

export type LngLat = [number, number];

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
  return formatDistance(m);
}

export function formatNauticalMiles(m: number): string {
  return formatNautical(m);
}

export function formatArea(sqm: number): { m2: string; ha: string; acres: string } {
  return formatAreaAll(sqm);
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
