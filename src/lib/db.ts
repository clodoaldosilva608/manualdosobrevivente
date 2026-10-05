import { openDB, type IDBPDatabase, type DBSchema } from "idb";

const CLOUD_SYNC_EVENT = "tactical-gis:local-data-changed";

function notifyLocalChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CLOUD_SYNC_EVENT));
}

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
  /** Mochila à qual o item pertence (somente local — não vai para a nuvem). */
  mochila_id?: string | null;
  /**
   * Foto do item feita pelo usuário (galeria ou câmera), como data URL JPEG
   * comprimido. Sem foto, a lista mostra o desenho padrão do item
   * (imagemPadraoDoItem). Somente local — não vai para a nuvem.
   */
  img?: string | null;
  created_at: string;
  updated_at: string;
  dirty?: boolean;
}

export interface LocalMochila {
  id: string;
  nome: string;
  descricao: string;
  /** Limite de peso empacotado, em gramas. */
  limite_g: number;
  /** Identificador do modelo de origem ("8h"|"12h"|"48h"|"72h"|"300h") ou null para personalizada. */
  modelo: string | null;
  criada_em: string;
  atualizada_em: string;
}

/**
 * Conta de operador criada e guardada localmente (offline-first).
 *
 * O esquema espelha o perfil que um dia será sincronizado com a nuvem:
 * quando houver banco de dados, cada conta local mapeia 1:1 para o usuário
 * remoto (mesmo e-mail) e os dados do aparelho passam a subir sob esse id.
 * A senha NUNCA é guardada — apenas o hash PBKDF2 (ver src/lib/conta.ts).
 */
export interface LocalConta {
  id: string;
  /** E-mail do operador — chave natural para a futura sincronização. */
  email: string;
  nome: string;
  /** Hash da senha no formato "pbkdf2$iterações$sal$digest" (nunca a senha). */
  senha_hash: string;
  criada_em: string;
  atualizada_em: string;
  ultimo_acesso: string;
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

export interface ManualAsset {
  slug: string;
  title: string;
  html_body: string;
  image_blob?: Blob;
  saved_at: number;
}

interface TacticalDB extends DBSchema {
  waypoints: { key: string; value: LocalWaypoint; indexes: { by_user: string } };
  gear: { key: string; value: LocalGearItem; indexes: { by_user: string } };
  mochilas: { key: string; value: LocalMochila };
  contas: { key: string; value: LocalConta };
  tile_sources: { key: string; value: LocalTileSource };
  tiles: { key: string; value: CachedTile; indexes: { by_source: string } };
  areas: { key: string; value: CachedArea };
  checklist: { key: string; value: ChecklistState };
  manual_assets: { key: string; value: ManualAsset };
  settings: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<TacticalDB>> | null = null;

export function getDB() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available on server"));
  }
  if (!dbPromise) {
    dbPromise = openDB<TacticalDB>("tactical-gis", 4, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
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
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains("manual_assets")) {
          db.createObjectStore("manual_assets", { keyPath: "slug" });
        }
        if (oldVersion < 3 && !db.objectStoreNames.contains("mochilas")) {
          db.createObjectStore("mochilas", { keyPath: "id" });
        }
        if (oldVersion < 4 && !db.objectStoreNames.contains("contas")) {
          db.createObjectStore("contas", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function listChecklist(): Promise<ChecklistState[]> {
  const db = await getDB();
  return db.getAll("checklist");
}

export async function putChecklistState(s: ChecklistState) {
  const db = await getDB();
  await db.put("checklist", s);
  notifyLocalChange();
}

export async function listManualAssets(): Promise<ManualAsset[]> {
  const db = await getDB();
  return db.getAll("manual_assets");
}

export async function saveManualAsset(a: ManualAsset) {
  const db = await getDB();
  await db.put("manual_assets", a);
}

export async function deleteManualAssets() {
  const db = await getDB();
  await db.clear("manual_assets");
}

export async function clearLocalData() {
  const db = await getDB();
  await Promise.all([
    db.clear("waypoints"),
    db.clear("gear"),
    db.clear("mochilas"),
    db.clear("checklist"),
  ]);
}

export async function listWaypoints(): Promise<LocalWaypoint[]> {
  const db = await getDB();
  return db.getAll("waypoints");
}
export async function saveWaypoint(w: LocalWaypoint) {
  const db = await getDB();
  await db.put("waypoints", w);
  notifyLocalChange();
}
export async function deleteWaypoint(id: string) {
  const db = await getDB();
  await db.delete("waypoints", id);
  notifyLocalChange();
}

export async function listGear(): Promise<LocalGearItem[]> {
  const db = await getDB();
  return db.getAll("gear");
}
export async function saveGear(g: LocalGearItem) {
  const db = await getDB();
  await db.put("gear", g);
  notifyLocalChange();
}
export async function deleteGear(id: string) {
  const db = await getDB();
  await db.delete("gear", id);
  notifyLocalChange();
}

export async function listMochilas(): Promise<LocalMochila[]> {
  const db = await getDB();
  return db.getAll("mochilas");
}
export async function saveMochila(m: LocalMochila) {
  const db = await getDB();
  await db.put("mochilas", m);
  notifyLocalChange();
}
export async function deleteMochila(id: string) {
  const db = await getDB();
  await db.delete("mochilas", id);
  notifyLocalChange();
}

export async function listContas(): Promise<LocalConta[]> {
  const db = await getDB();
  return db.getAll("contas");
}
export async function saveConta(c: LocalConta) {
  const db = await getDB();
  await db.put("contas", c);
  notifyLocalChange();
}
export async function deleteConta(id: string) {
  const db = await getDB();
  await db.delete("contas", id);
  notifyLocalChange();
}

export async function getChecklist(key: string) {
  const db = await getDB();
  return db.get("checklist", key);
}
export async function setChecklist(key: string, done: boolean) {
  const db = await getDB();
  await db.put("checklist", { key, done, updated_at: Date.now() });
  notifyLocalChange();
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDB();
  await db.put("settings", value, key);
}
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get("settings", key)) as T | undefined;
}
