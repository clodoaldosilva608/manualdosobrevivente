import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/reports-weekly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { isReportDue, sendWeeklyReport } = await import("@/lib/report.server");
        const { data, error } = await supabaseAdmin
          .from("weekly_report_settings")
          .select("*")
          .eq("enabled", true);
        if (error) return Response.json({ success: false }, { status: 500 });
        const due = (data ?? []).filter((item) => isReportDue(item));
        const results = await Promise.allSettled(
          due.map((item) => sendWeeklyReport(supabaseAdmin, item)),
        );
        return Response.json({
          success: true,
          processed: results.length,
          failed: results.filter((result) => result.status === "rejected").length,
        });
      },
    },
  },
});
