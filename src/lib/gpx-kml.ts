import { kml, gpx } from "@tmcw/togeojson";
import { buildGPX, BaseBuilder } from "gpx-builder";
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

export function waypointsToGPX(waypoints: LocalWaypoint[]): string {
  const { Point, Metadata } = BaseBuilder.MODELS;
  const builder = new BaseBuilder();
  builder.setMetadata(new Metadata({ name: "TacticalGIS Waypoints", time: new Date() }));
  builder.setWayPoints(
    waypoints.map(
      (w) =>
        new Point(w.latitude, w.longitude, {
          name: w.title,
          desc: w.description ?? "",
          ele: w.elevation ?? undefined,
        })
    )
  );
  return buildGPX(builder.toObject());
}

export function pathToGPX(name: string, coords: [number, number][]): string {
  const { Point, Track, Segment, Metadata } = BaseBuilder.MODELS;
  const builder = new BaseBuilder();
  builder.setMetadata(new Metadata({ name, time: new Date() }));
  const seg = new Segment(coords.map(([lng, lat]) => new Point(lat, lng)));
  builder.setTracks([new Track([seg], { name })]);
  return buildGPX(builder.toObject());
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
