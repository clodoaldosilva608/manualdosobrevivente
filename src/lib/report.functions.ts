import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SettingsInput = z.object({
  enabled: z.boolean(),
  weekday: z.number().int().min(0).max(6),
  local_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(1).max(100),
  recipient_email: z.string().email(),
});

export const getReportSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [settings, history] = await Promise.all([
      context.supabase
        .from("weekly_report_settings")
        .select("*")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("report_delivery_history")
        .select("*")
        .eq("user_id", context.userId)
        .order("sent_at", { ascending: false })
        .limit(10),
    ]);
    if (settings.error) throw new Error(settings.error.message);
    if (history.error) throw new Error(history.error.message);
    return { settings: settings.data, history: history.data ?? [] };
  });

export const saveReportSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SettingsInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("weekly_report_settings")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendReportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weekly_report_settings")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Salve as preferências do relatório primeiro");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWeeklyReport } = await import("@/lib/report.server");
    await sendWeeklyReport(supabaseAdmin, data);
    return { ok: true };
  });
