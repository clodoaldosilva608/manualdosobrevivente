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
          "Mapa tático com MGRS, medições e waypoints + Visão Osiris: globo 3D de inteligência global ao vivo — sismos, voos, satélites, câmeras, alertas e mais.",
      },
      { property: "og:title", content: "Mapa Tático — TacticalGIS" },
      {
        property: "og:description",
        content:
          "Mapa tático com MGRS, medições e waypoints + Visão Osiris: globo 3D de inteligência global ao vivo — sismos, voos, satélites, câmeras, alertas e mais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
