import type { Database } from "@/integrations/supabase/types";

type AdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
type ReportSettings = Database["public"]["Tables"]["manual_weekly_report_settings"]["Row"];

// Gateway de envio de e-mail compatível com a API do Gmail (envio via /users/me/messages/send).
// Configure as variáveis abaixo no ambiente do servidor (veja .env.example).
const GATEWAY_URL = process.env["MAIL_GATEWAY_URL"] ?? "";

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodedHeader(value: string): string {
  return Array.from(value).every((char) => char.charCodeAt(0) <= 127)
    ? value
    : `=?UTF-8?B?${base64Url(value)}?=`;
}

function reportBody(counts: { waypoints: number; gear: number; checklist: number }): string {
  return [
    "RELATÓRIO SEMANAL — MANUAL DO SOBREVIVENTE",
    "",
    `Waypoints salvos: ${counts.waypoints}`,
    `Itens na mochila: ${counts.gear}`,
    `Itens concluídos no checklist: ${counts.checklist}`,
    "",
    "Seus dados continuam sincronizados entre os aparelhos conectados à sua conta.",
  ].join("\r\n");
}

async function getCounts(admin: AdminClient, userId: string) {
  const [waypoints, gear, checklist] = await Promise.all([
    admin
      .from("manual_waypoints")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("manual_gear_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("manual_checklist_state")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("done", true),
  ]);
  const error = waypoints.error ?? gear.error ?? checklist.error;
  if (error) throw new Error(error.message);
  return {
    waypoints: waypoints.count ?? 0,
    gear: gear.count ?? 0,
    checklist: checklist.count ?? 0,
  };
}

export async function sendWeeklyReport(
  admin: AdminClient,
  settings: ReportSettings,
): Promise<void> {
  const counts = await getCounts(admin, settings.user_id);
  let status = "sent";
  let errorMessage: string | null = null;
  try {
    const gatewayKey = process.env["MAIL_GATEWAY_KEY"];
    const connectionKey = process.env["MAIL_CONNECTION_KEY"];
    if (!GATEWAY_URL || !gatewayKey || !connectionKey)
      throw new Error(
        "O serviço de e-mail não está configurado: defina MAIL_GATEWAY_URL, MAIL_GATEWAY_KEY e MAIL_CONNECTION_KEY no ambiente.",
      );
    const raw = base64Url(
      [
        `To: ${settings.recipient_email}`,
        `Subject: ${encodedHeader("Relatório semanal — Manual do Sobrevivente")}`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset="UTF-8"',
        "",
        reportBody(counts),
      ].join("\r\n"),
    );
    const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    if (!response.ok)
      throw new Error(`Falha no envio (${response.status}): ${await response.text()}`);
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message.slice(0, 1000) : "Falha desconhecida";
  }

  const { error: historyError } = await admin.from("manual_report_delivery_history").insert({
    user_id: settings.user_id,
    recipient_email: settings.recipient_email,
    waypoint_count: counts.waypoints,
    gear_count: counts.gear,
    checklist_count: counts.checklist,
    status,
    error_message: errorMessage,
  });
  if (historyError) throw new Error(historyError.message);
  const { error: updateError } = await admin
    .from("manual_weekly_report_settings")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("user_id", settings.user_id);
  if (updateError) throw new Error(updateError.message);
  if (status === "failed") throw new Error(errorMessage ?? "Falha no envio");
}

export function isReportDue(settings: ReportSettings, now = new Date()): boolean {
  const local = new Date(now.toLocaleString("en-US", { timeZone: settings.timezone }));
  const [hour = 0] = settings.local_time.split(":").map(Number);
  const sent = settings.last_sent_at ? new Date(settings.last_sent_at) : null;
  return (
    settings.enabled &&
    local.getDay() === settings.weekday &&
    local.getHours() === hour &&
    (!sent || now.getTime() - sent.getTime() > 20 * 60 * 60 * 1000)
  );
}
