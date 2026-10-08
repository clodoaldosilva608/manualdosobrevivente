import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WaypointInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(40),
  icon: z.string().max(40).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#FF6B35"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number().nullable().optional(),
});

export const listWaypointsRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("manual_waypoints")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { waypoints: data ?? [] };
  });

export const upsertWaypoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => WaypointInput.parse(input))
  .handler(async ({ context, data }) => {
    const row = { ...data, user_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("manual_waypoints")
      .upsert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { waypoint: out };
  });

export const deleteWaypointRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("manual_waypoints").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const GearInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(9999),
  weight_g: z.number().int().min(0).max(1000000),
  notes: z.string().max(2000).nullable().optional(),
  expires_at: z.string().nullable().optional(),
  packed: z.boolean().default(false),
});

export const listGearRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("manual_gear_items")
      .select("*")
      .order("category");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const upsertGearRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GearInput.parse(input))
  .handler(async ({ context, data }) => {
    const row = { ...data, user_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("manual_gear_items")
      .upsert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { item: out };
  });

export const deleteGearRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("manual_gear_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ChecklistInput = z.object({
  items: z
    .array(
      z.object({
        key: z.string().min(1).max(120),
        done: z.boolean(),
        updated_at: z.string(),
      }),
    )
    .max(2000),
});

export const listChecklistRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("manual_checklist_state").select("*");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const pushChecklistRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ChecklistInput.parse(input))
  .handler(async ({ context, data }) => {
    if (!data.items.length) return { count: 0 };
    const rows = data.items.map((i) => ({ ...i, user_id: context.userId }));
    const { error } = await context.supabase
      .from("manual_checklist_state")
      .upsert(rows, { onConflict: "user_id,key" });
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });

const BulkInput = z.object({
  waypoints: z.array(WaypointInput).max(2000),
  gear: z.array(GearInput).max(2000),
  checklist: z
    .array(z.object({ key: z.string().min(1).max(120), done: z.boolean(), updated_at: z.string() }))
    .max(2000),
  preferences: z
    .object({
      units: z.enum(["metric", "nautical"]),
      coord_format: z.enum(["DD", "DMS", "MGRS"]),
      north_ref: z.enum(["true", "magnetic"]),
    })
    .optional(),
});

/** Envia tudo o que está no aparelho para a nuvem (o mais recente vence). */
export const pushAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BulkInput.parse(input))
  .handler(async ({ context, data }) => {
    const uid = context.userId;
    if (data.waypoints.length) {
      const { error } = await context.supabase
        .from("manual_waypoints")
        .upsert(data.waypoints.map((w) => ({ ...w, user_id: uid })));
      if (error) throw new Error(error.message);
    }
    if (data.gear.length) {
      const { error } = await context.supabase
        .from("manual_gear_items")
        .upsert(data.gear.map((g) => ({ ...g, user_id: uid })));
      if (error) throw new Error(error.message);
    }
    if (data.checklist.length) {
      const { error } = await context.supabase.from("manual_checklist_state").upsert(
        data.checklist.map((c) => ({ ...c, user_id: uid })),
        { onConflict: "user_id,key" },
      );
      if (error) throw new Error(error.message);
    }
    if (data.preferences) {
      const { error } = await context.supabase
        .from("manual_app_preferences")
        .upsert({ ...data.preferences, user_id: uid }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    }
    return {
      waypoints: data.waypoints.length,
      gear: data.gear.length,
      checklist: data.checklist.length,
    };
  });

/** Traz tudo da nuvem para o aparelho. */
export const pullAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [wp, gi, cs, preferences] = await Promise.all([
      context.supabase.from("manual_waypoints").select("*"),
      context.supabase.from("manual_gear_items").select("*"),
      context.supabase.from("manual_checklist_state").select("*"),
      context.supabase.from("manual_app_preferences").select("*").maybeSingle(),
    ]);
    if (wp.error) throw new Error(wp.error.message);
    if (gi.error) throw new Error(gi.error.message);
    if (cs.error) throw new Error(cs.error.message);
    if (preferences.error) throw new Error(preferences.error.message);
    return {
      waypoints: wp.data ?? [],
      gear: gi.data ?? [],
      checklist: cs.data ?? [],
      preferences: preferences.data,
    };
  });
