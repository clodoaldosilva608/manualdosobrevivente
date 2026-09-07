import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { listWaypoints, listGear } from "@/lib/db";
import { waypointsToGPX, downloadText } from "@/lib/gpx-kml";
import { formatInteger } from "@/lib/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ajustes — TacticalGIS" },
      {
        name: "description",
        content: "Conta, exportação de dados e informações do armazenamento offline.",
      },
      { property: "og:title", content: "Ajustes — TacticalGIS" },
      {
        property: "og:description",
        content: "Conta, exportação de dados e informações do armazenamento offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{ waypoints: number; gear: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setEmail(session?.user?.email ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([listWaypoints(), listGear()])
      .then(([w, g]) => {
        if (alive) setCounts({ waypoints: w.length, gear: g.length });
      })
      .catch(() => {
        if (alive) setCounts({ waypoints: 0, gear: 0 });
      });
    return () => {
      alive = false;
    };
  }, []);

  const exportGPX = async () => {
    try {
      const wps = await listWaypoints();
      if (!wps.length) return toast.error("Nenhum waypoint para exportar");
      downloadText(`waypoints-${Date.now()}.gpx`, waypointsToGPX(wps));
      toast.success(`${formatInteger(wps.length)} waypoints exportados`);
    } catch {
      toast.error("Não foi possível exportar os waypoints");
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error("Não foi possível encerrar a sessão");
    toast.success("Sessão encerrada");
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider">
          AJUSTES
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conta, dados salvos no aparelho e exportação.
        </p>
      </header>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Conta</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Verificando sessão…</div>
        ) : email ? (
          <div className="flex items-center justify-between gap-3">
            <span className="mono text-sm truncate">{email}</span>
            <Button variant="destructive" onClick={signOut} className="glove-tap shrink-0">
              Sair
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Não autenticado.{" "}
            <Link to="/login" className="text-tactical-orange underline">
              Entre
            </Link>{" "}
            para sincronizar waypoints e equipamentos entre dispositivos.
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-card p-4 space-y-3">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground">
          Dados no aparelho
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Waypoints" value={counts ? formatInteger(counts.waypoints) : "—"} />
          <Stat label="Itens de equipamento" value={counts ? formatInteger(counts.gear) : "—"} />
        </div>
        <Button onClick={exportGPX} className="w-full glove-tap">
          Exportar waypoints em GPX
        </Button>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mono text-xl font-bold text-tactical-orange">{value}</div>
    </div>
  );
}
