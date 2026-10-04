import {
  listWaypoints,
  listGear,
  listChecklist,
  saveWaypoint,
  saveGear,
  putChecklistState,
  getSetting,
  setSetting,
  type LocalWaypoint,
  type LocalGearItem,
} from "@/lib/db";
import { pushAll, pullAll } from "@/lib/sync.functions";

export const LAST_SYNC_KEY = "last-sync-at";

export interface SyncCounts {
  waypoints: number;
  gear: number;
  checklist: number;
}

/** Envia waypoints, mochila e checklist do aparelho para a nuvem. */
export async function pushLocalToCloud(
  call: (args: { data: unknown }) => Promise<unknown>,
): Promise<SyncCounts> {
  const [waypoints, gear, checklist] = await Promise.all([
    listWaypoints(),
    listGear(),
    listChecklist(),
  ]);
  const preferences = await getSetting<{
    units: "metric" | "nautical";
    coordFormat: "DD" | "DMS" | "MGRS";
    northRef: "true" | "magnetic";
  }>("preferences");
  const payload = {
    waypoints: waypoints.map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description ?? null,
      category: w.category,
      icon: w.icon ?? null,
      color: w.color,
      latitude: w.latitude,
      longitude: w.longitude,
      elevation: w.elevation ?? null,
    })),
    gear: gear.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      quantity: g.quantity,
      weight_g: g.weight_g,
      notes: g.notes ?? null,
      expires_at: g.expires_at ?? null,
      packed: g.packed,
    })),
    checklist: checklist.map((c) => ({
      key: c.key,
      done: c.done,
      updated_at: new Date(c.updated_at).toISOString(),
    })),
    preferences: preferences
      ? {
          units: preferences.units,
          coord_format: preferences.coordFormat,
          north_ref: preferences.northRef,
        }
      : undefined,
  };
  await call({ data: payload });
  await setSetting(LAST_SYNC_KEY, Date.now());
  return {
    waypoints: payload.waypoints.length,
    gear: payload.gear.length,
    checklist: payload.checklist.length,
  };
}

interface RemoteBundle {
  waypoints: Array<Record<string, unknown>>;
  gear: Array<Record<string, unknown>>;
  checklist: Array<{ key: string; done: boolean; updated_at: string }>;
  preferences: {
    units: "metric" | "nautical";
    coord_format: "DD" | "DMS" | "MGRS";
    north_ref: "true" | "magnetic";
  } | null;
}

/** Traz da nuvem e mescla no aparelho — o registro mais recente vence. */
export async function pullCloudToLocal(
  call: (args: { data?: unknown }) => Promise<unknown>,
): Promise<SyncCounts> {
  const remote = (await call({})) as RemoteBundle;
  const [localWp, localGear, localCheck] = await Promise.all([
    listWaypoints(),
    listGear(),
    listChecklist(),
  ]);
  const wpMap = new Map(localWp.map((w) => [w.id, w]));
  const gearMap = new Map(localGear.map((g) => [g.id, g]));
  const checkMap = new Map(localCheck.map((c) => [c.key, c]));

  let wpCount = 0;
  for (const r of remote.waypoints) {
    const row = r as unknown as LocalWaypoint;
    const local = wpMap.get(row.id);
    if (local && new Date(local.updated_at) >= new Date(row.updated_at)) continue;
    await saveWaypoint({ ...row, dirty: false });
    wpCount++;
  }

  let gearCount = 0;
  for (const r of remote.gear) {
    const row = r as unknown as LocalGearItem;
    const local = gearMap.get(row.id);
    if (local && new Date(local.updated_at) >= new Date(row.updated_at)) continue;
    // mochila_id é somente local (não existe na nuvem): preserva o agrupamento.
    await saveGear({ ...row, mochila_id: local?.mochila_id ?? null, dirty: false });
    gearCount++;
  }

  let checkCount = 0;
  for (const c of remote.checklist) {
    const at = new Date(c.updated_at).getTime();
    const local = checkMap.get(c.key);
    if (local && local.updated_at >= at) continue;
    await putChecklistState({ key: c.key, done: c.done, updated_at: at });
    checkCount++;
  }

  if (remote.preferences) {
    await setSetting("preferences", {
      units: remote.preferences.units,
      coordFormat: remote.preferences.coord_format,
      northRef: remote.preferences.north_ref,
    });
  }

  await setSetting(LAST_SYNC_KEY, Date.now());
  return { waypoints: wpCount, gear: gearCount, checklist: checkCount };
}

export async function getLastSyncAt(): Promise<number | null> {
  try {
    return (await getSetting<number>(LAST_SYNC_KEY)) ?? null;
  } catch {
    return null;
  }
}

export { pushAll, pullAll };
