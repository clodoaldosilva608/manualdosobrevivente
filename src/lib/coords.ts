// Import the ESM build directly so it works in both SSR (Node ESM) and browser.
// The default `mgrs` main is a UMD bundle whose named exports aren't visible to Node ESM.
import { forward, toPoint } from "mgrs/dist/mgrs.esm.js";

export type LngLat = [number, number]; // [lng, lat]

export function ddToDms(dd: number, isLat: boolean): string {
  const dir = isLat ? (dd >= 0 ? "N" : "S") : dd >= 0 ? "E" : "W";
  const abs = Math.abs(dd);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${d}°${String(m).padStart(2, "0")}'${s.toFixed(2)}"${dir}`;
}

export function formatDD(lng: number, lat: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function formatDMS(lng: number, lat: number): string {
  return `${ddToDms(lat, true)} ${ddToDms(lng, false)}`;
}

export function formatMGRS(lng: number, lat: number, precision = 5): string {
  try {
    return forward([lng, lat], precision);
  } catch {
    return "—";
  }
}

/** Parse user input into [lng, lat]. Accepts DD ("lat, lng"), DMS, or MGRS. */
export function parseCoordinate(input: string): LngLat | null {
  const t = input.trim();
  if (!t) return null;
  // Try MGRS (letters present)
  if (/[A-Za-z]/.test(t) && !/[NSEW]/i.test(t.replace(/[NESW]/gi, ""))) {
    try {
      const [lng, lat] = toPoint(t.replace(/\s+/g, ""));
      if (isFinite(lng) && isFinite(lat)) return [lng, lat];
    } catch {
      /* ignora falha não crítica */
    }
  }
  // DMS: try to capture both lat and lng
  const dmsRe =
    /(-?\d+(?:\.\d+)?)[°d ]\s*(\d+(?:\.\d+)?)?['m ]?\s*(\d+(?:\.\d+)?)?["s]?\s*([NSEWnsew])?/g;
  const matches = [...t.matchAll(dmsRe)].filter((m) => m[1]);
  if (matches.length >= 2) {
    const toDd = (m: RegExpMatchArray) => {
      const d = parseFloat(m[1]);
      const mi = parseFloat(m[2] || "0");
      const s = parseFloat(m[3] || "0");
      const dir = (m[4] || "").toUpperCase();
      let v = Math.abs(d) + mi / 60 + s / 3600;
      if (d < 0 || dir === "S" || dir === "W") v = -v;
      return v;
    };
    let lat: number, lng: number;
    const first = matches[0];
    const second = matches[1];
    const firstDir = (first[4] || "").toUpperCase();
    if (firstDir === "N" || firstDir === "S") {
      lat = toDd(first);
      lng = toDd(second);
    } else if (firstDir === "E" || firstDir === "W") {
      lng = toDd(first);
      lat = toDd(second);
    } else {
      // assume "lat, lng" order
      lat = toDd(first);
      lng = toDd(second);
    }
    if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lng, lat];
    }
  }
  // Plain decimal "lat, lng"
  const parts = t
    .split(/[, ]+/)
    .map((p) => parseFloat(p))
    .filter((n) => !isNaN(n));
  if (parts.length === 2) {
    const [lat, lng] = parts;
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lng, lat];
  }
  return null;
}
