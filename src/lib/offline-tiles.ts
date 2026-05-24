import { getDB, type CachedArea } from "./db";

function lngLatToTile(lng: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return [x, y];
}

export function tileCountForBbox(
  bbox: [number, number, number, number],
  minZ: number,
  maxZ: number,
): number {
  const [w, s, e, n] = bbox;
  let total = 0;
  for (let z = minZ; z <= maxZ; z++) {
    const [x1, y2] = lngLatToTile(w, s, z);
    const [x2, y1] = lngLatToTile(e, n, z);
    total += (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1);
  }
  return total;
}

export interface DownloadProgress {
  done: number;
  total: number;
  bytes: number;
}

export async function downloadAreaTiles(
  area: Omit<CachedArea, "tile_count" | "bytes" | "created_at">,
  urlTemplate: string,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<CachedArea> {
  const db = await getDB();
  const [w, s, e, n] = area.bbox;
  const total = tileCountForBbox(area.bbox, area.min_zoom, area.max_zoom);
  let done = 0;
  let bytes = 0;
  for (let z = area.min_zoom; z <= area.max_zoom; z++) {
    const [x1, y2] = lngLatToTile(w, s, z);
    const [x2, y1] = lngLatToTile(e, n, z);
    const xs = [Math.min(x1, x2), Math.max(x1, x2)];
    const ys = [Math.min(y1, y2), Math.max(y1, y2)];
    for (let x = xs[0]; x <= xs[1]; x++) {
      for (let y = ys[0]; y <= ys[1]; y++) {
        if (signal?.aborted) throw new Error("Aborted");
        const url = urlTemplate
          .replace("{z}", String(z))
          .replace("{x}", String(x))
          .replace("{y}", String(y));
        try {
          const res = await fetch(url, { signal });
          if (res.ok) {
            const blob = await res.blob();
            bytes += blob.size;
            await db.put("tiles", {
              key: `${area.source_id}/${z}/${x}/${y}`,
              source_id: area.source_id,
              z,
              x,
              y,
              blob,
              cached_at: Date.now(),
            });
          }
        } catch {}
        done++;
        if (done % 8 === 0 || done === total) onProgress({ done, total, bytes });
      }
    }
  }
  const stored: CachedArea = {
    ...area,
    tile_count: done,
    bytes,
    created_at: Date.now(),
  };
  await db.put("areas", stored);
  return stored;
}

export async function listAreas(): Promise<CachedArea[]> {
  const db = await getDB();
  return db.getAll("areas");
}

export async function deleteArea(id: string) {
  const db = await getDB();
  const area = await db.get("areas", id);
  await db.delete("areas", id);
  if (area) {
    const tx = db.transaction("tiles", "readwrite");
    const idx = tx.store.index("by_source");
    let cursor = await idx.openCursor(area.source_id);
    while (cursor) {
      const t = cursor.value;
      if (t.z >= area.min_zoom && t.z <= area.max_zoom) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

export async function getCachedTile(
  sourceId: string,
  z: number,
  x: number,
  y: number,
): Promise<Blob | undefined> {
  const db = await getDB();
  const t = await db.get("tiles", `${sourceId}/${z}/${x}/${y}`);
  return t?.blob;
}
