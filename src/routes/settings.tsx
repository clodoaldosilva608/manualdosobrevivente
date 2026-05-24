import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { listWaypoints } from "@/lib/db";
import { waypointsToGPX, downloadText } from "@/lib/gpx-kml";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TacticalGIS" },
      { name: "description", content: "Account, data export, and offline settings." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const exportGPX = async () => {
    const wps = await listWaypoints();
    if (!wps.length) return toast.error("No waypoints to export");
    downloadText(`waypoints-${Date.now()}.gpx`, waypointsToGPX(wps));
    toast.success(`Exported ${wps.length} waypoints`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    toast.success("Signed out");
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider">
          SETTINGS
        </h1>
      </header>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Account
        </h2>
        {email ? (
          <div className="flex items-center justify-between gap-3">
            <span className="mono text-sm truncate">{email}</span>
            <Button variant="destructive" onClick={signOut} className="glove-tap">
              Sign out
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Not signed in. <a href="/login" className="text-tactical-orange underline">Sign in</a>{" "}
            to sync waypoints and gear across devices.
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-card p-4 space-y-3">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground">
          Data
        </h2>
        <Button onClick={exportGPX} className="w-full glove-tap">
          Export waypoints as GPX
        </Button>
      </section>
    </div>
  );
}
