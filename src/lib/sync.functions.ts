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
      .from("waypoints")
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
      .from("waypoints")
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
    const { error } = await context.supabase.from("waypoints").delete().eq("id", data.id);
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
    const { data, error } = await context.supabase.from("gear_items").select("*").order("category");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const upsertGearRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GearInput.parse(input))
  .handler(async ({ context, data }) => {
    const row = { ...data, user_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("gear_items")
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
    const { error } = await context.supabase.from("gear_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
