import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const MapShell = lazy(() => import("@/components/map/MapShell"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa Tático — TacticalGIS" },
      {
        name: "description",
        content:
          "Mapa tático em tela cheia com MGRS, múltiplas camadas base, ferramentas de medição, waypoints e tiles offline.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="mono text-tactical-orange text-sm tracking-widest animate-pulse">
            INICIALIZANDO MAPA…
          </div>
        </div>
      }
    >
      <MapShell />
    </Suspense>
  );
}
