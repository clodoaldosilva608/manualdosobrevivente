import { kml, gpx } from "@tmcw/togeojson";
import type { LocalWaypoint } from "./db";

export interface ImportedFeature {
  title: string;
  description?: string;
  type: "point" | "line";
  coords: [number, number][];
}

export function parseGpxOrKml(text: string, filename = ""): ImportedFeature[] {
  const isKml = filename.toLowerCase().endsWith(".kml") || /<kml/i.test(text);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const geo = isKml ? kml(doc) : gpx(doc);
  const out: ImportedFeature[] = [];
  for (const f of geo.features || []) {
    const props = (f.properties || {}) as Record<string, unknown>;
    const title = String(props.name ?? "Imported");
    const description = props.description ? String(props.description) : undefined;
    const g = f.geometry as { type: string; coordinates: unknown } | null;
    if (!g) continue;
    if (g.type === "Point") {
      const c = g.coordinates as number[];
      out.push({ title, description, type: "point", coords: [[c[0], c[1]]] });
    } else if (g.type === "LineString") {
      const c = g.coordinates as number[][];
      out.push({
        title,
        description,
        type: "line",
        coords: c.map((p) => [p[0], p[1]]),
      });
    } else if (g.type === "MultiLineString") {
      const c = g.coordinates as number[][][];
      out.push({
        title,
        description,
        type: "line",
        coords: c.flat().map((p) => [p[0], p[1]]),
      });
    }
  }
  return out;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gpxDoc(name: string, body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="TacticalGIS" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `  <metadata><name>${esc(name)}</name><time>${new Date().toISOString()}</time></metadata>\n` +
    body +
    `</gpx>\n`
  );
}

export function waypointsToGPX(waypoints: LocalWaypoint[]): string {
  const body = waypoints
    .map((w) => {
      const ele = w.elevation != null ? `    <ele>${w.elevation}</ele>\n` : "";
      const desc = w.description ? `    <desc>${esc(w.description)}</desc>\n` : "";
      return (
        `  <wpt lat="${w.latitude}" lon="${w.longitude}">\n` +
        ele +
        `    <name>${esc(w.title)}</name>\n` +
        desc +
        `  </wpt>\n`
      );
    })
    .join("");
  return gpxDoc("TacticalGIS Waypoints", body);
}

export function pathToGPX(name: string, coords: [number, number][]): string {
  const pts = coords
    .map(([lng, lat]) => `      <trkpt lat="${lat}" lon="${lng}"></trkpt>\n`)
    .join("");
  const body = `  <trk><name>${esc(name)}</name><trkseg>\n${pts}    </trkseg></trk>\n`;
  return gpxDoc(name, body);
}

export function downloadText(filename: string, content: string, mime = "application/gpx+xml") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
