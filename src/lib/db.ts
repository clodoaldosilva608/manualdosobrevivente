import { openDB, type IDBPDatabase, type DBSchema } from "idb";

export interface LocalWaypoint {
  id: string;
  user_id: string | null;
  title: string;
  description?: string | null;
  category: string;
  icon?: string | null;
  color: string;
  latitude: number;
  longitude: number;
  elevation?: number | null;
  created_at: string;
  updated_at: string;
  dirty?: boolean;
}

export interface LocalGearItem {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  quantity: number;
  weight_g: number;
  notes?: string | null;
  expires_at?: string | null;
  packed: boolean;
  created_at: string;
  updated_at: string;
  dirty?: boolean;
}

export interface LocalTileSource {
  id: string;
  user_id: string | null;
  name: string;
  kind: "xyz" | "wms" | "wmts";
  url: string;
  attribution?: string | null;
  min_zoom: number;
  max_zoom: number;
  created_at: string;
}

export interface CachedTile {
  key: string; // `${sourceId}/${z}/${x}/${y}`
  source_id: string;
  z: number;
  x: number;
  y: number;
  blob: Blob;
  cached_at: number;
}

export interface CachedArea {
  id: string;
  name: string;
  source_id: string;
  bbox: [number, number, number, number]; // west, south, east, north
  min_zoom: number;
  max_zoom: number;
  tile_count: number;
  bytes: number;
  created_at: number;
}

export interface ChecklistState {
  key: string; // `${slug}/${step}`
  done: boolean;
  updated_at: number;
}

interface TacticalDB extends DBSchema {
  waypoints: { key: string; value: LocalWaypoint; indexes: { by_user: string } };
  gear: { key: string; value: LocalGearItem; indexes: { by_user: string } };
  tile_sources: { key: string; value: LocalTileSource };
  tiles: { key: string; value: CachedTile; indexes: { by_source: string } };
  areas: { key: string; value: CachedArea };
  checklist: { key: string; value: ChecklistState };
  settings: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<TacticalDB>> | null = null;

export function getDB() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available on server"));
  }
  if (!dbPromise) {
    dbPromise = openDB<TacticalDB>("tactical-gis", 1, {
      upgrade(db) {
        const wp = db.createObjectStore("waypoints", { keyPath: "id" });
        wp.createIndex("by_user", "user_id");
        const gr = db.createObjectStore("gear", { keyPath: "id" });
        gr.createIndex("by_user", "user_id");
        db.createObjectStore("tile_sources", { keyPath: "id" });
        const tl = db.createObjectStore("tiles", { keyPath: "key" });
        tl.createIndex("by_source", "source_id");
        db.createObjectStore("areas", { keyPath: "id" });
        db.createObjectStore("checklist", { keyPath: "key" });
        db.createObjectStore("settings");
      },
    });
  }
  return dbPromise;
}

export async function listWaypoints(): Promise<LocalWaypoint[]> {
  const db = await getDB();
  return db.getAll("waypoints");
}
export async function saveWaypoint(w: LocalWaypoint) {
  const db = await getDB();
  await db.put("waypoints", w);
}
export async function deleteWaypoint(id: string) {
  const db = await getDB();
  await db.delete("waypoints", id);
}

export async function listGear(): Promise<LocalGearItem[]> {
  const db = await getDB();
  return db.getAll("gear");
}
export async function saveGear(g: LocalGearItem) {
  const db = await getDB();
  await db.put("gear", g);
}
export async function deleteGear(id: string) {
  const db = await getDB();
  await db.delete("gear", id);
}

export async function getChecklist(key: string) {
  const db = await getDB();
  return db.get("checklist", key);
}
export async function setChecklist(key: string, done: boolean) {
  const db = await getDB();
  await db.put("checklist", { key, done, updated_at: Date.now() });
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDB();
  await db.put("settings", value, key);
}
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get("settings", key)) as T | undefined;
}
