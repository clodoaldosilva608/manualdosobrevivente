import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const MapShell = lazy(() => import("@/components/map/MapShell"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tactical Map — TacticalGIS" },
      {
        name: "description",
        content:
          "Full-screen tactical map with MGRS, multi-layer base maps, measurement tools, waypoints, and offline tiles.",
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
            INITIALIZING MAP…
          </div>
        </div>
      }
    >
      <MapShell />
    </Suspense>
  );
}
