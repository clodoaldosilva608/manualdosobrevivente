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
      { title: "Ajustes — TacticalGIS" },
      { name: "description", content: "Conta, exportação de dados e opções offline." },
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
    if (!wps.length) return toast.error("Nenhum waypoint para exportar");
    downloadText(`waypoints-${Date.now()}.gpx`, waypointsToGPX(wps));
    toast.success(`${wps.length} waypoints exportados`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    toast.success("Sessão encerrada");
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider">
          AJUSTES
        </h1>
      </header>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Conta
        </h2>
        {email ? (
          <div className="flex items-center justify-between gap-3">
            <span className="mono text-sm truncate">{email}</span>
            <Button variant="destructive" onClick={signOut} className="glove-tap">
              Sair
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Não autenticado.{" "}
            <a href="/login" className="text-tactical-orange underline">
              Entre
            </a>{" "}
            para sincronizar waypoints e equipamentos entre dispositivos.
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-card p-4 space-y-3">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground">
          Dados
        </h2>
        <Button onClick={exportGPX} className="w-full glove-tap">
          Exportar waypoints em GPX
        </Button>
      </section>
    </div>
  );
}
