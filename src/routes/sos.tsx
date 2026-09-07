import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Siren, Flashlight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDD, formatDMS, formatMGRS } from "@/lib/coords";
import { toast } from "sonner";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { title: "S.O.S — TacticalGIS" },
      {
        name: "description",
        content:
          "Sinalização de emergência: estrobo SOS em código Morse, lanterna e coordenadas em texto grande para ditado por rádio.",
      },
    ],
  }),
  component: SOS,
});

// SOS em Morse: ... --- ... (ponto=200ms, traço=600ms, intervalo=200ms, letra=600ms, palavra=1400ms)
const SOS_PATTERN: Array<["on" | "off", number]> = [
  ["on", 200],
  ["off", 200],
  ["on", 200],
  ["off", 200],
  ["on", 200],
  ["off", 600],
  ["on", 600],
  ["off", 200],
  ["on", 600],
  ["off", 200],
  ["on", 600],
  ["off", 600],
  ["on", 200],
  ["off", 200],
  ["on", 200],
  ["off", 200],
  ["on", 200],
  ["off", 1400],
];

function SOS() {
  const [pos, setPos] = useState<{ lng: number; lat: number } | null>(null);
  const [strobeOn, setStrobeOn] = useState(false);
  const [active, setActive] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lng: p.coords.longitude, lat: p.coords.latitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const startStrobe = async () => {
    setActive(true);
    let torch = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
      if (caps.torch) {
        torchTrackRef.current = track;
        torch = true;
      } else {
        track.stop();
      }
    } catch {
      /* ignora falha não crítica */
    }
    let i = 0;
    const tick = () => {
      const [state, ms] = SOS_PATTERN[i % SOS_PATTERN.length];
      const on = state === "on";
      setStrobeOn(on);
      if (torch && torchTrackRef.current) {
        try {
          // @ts-expect-error torch constraint not in lib.dom.d.ts
          torchTrackRef.current.applyConstraints({ advanced: [{ torch: on }] });
        } catch {
          /* ignora falha não crítica */
        }
      }
      i++;
      timerRef.current = window.setTimeout(tick, ms);
    };
    tick();
  };

  const stopStrobe = () => {
    setActive(false);
    setStrobeOn(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (torchTrackRef.current) {
      try {
        // @ts-expect-error torch constraint
        torchTrackRef.current.applyConstraints({ advanced: [{ torch: false }] });
      } catch {
        /* ignora falha não crítica */
      }
      torchTrackRef.current.stop();
      torchTrackRef.current = null;
    }
  };

  useEffect(() => () => stopStrobe(), []);

  const shareText = pos
    ? `LOCALIZAÇÃO DE EMERGÊNCIA\nDD ${formatDD(pos.lng, pos.lat)}\nDMS ${formatDMS(pos.lng, pos.lat)}\nMGRS ${formatMGRS(pos.lng, pos.lat)}`
    : "LOCALIZAÇÃO DE EMERGÊNCIA\nPosição GPS ainda não obtida.";
  const mapUrl = pos
    ? `https://www.google.com/maps/search/?api=1&query=${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`
    : null;

  const shareLocation = () => {
    if (!pos) toast.message("Sem posição GPS ainda — o aviso será enviado sem coordenadas");
    setShareOpen(true);
  };

  return (
    <div className={`min-h-screen transition-colors ${strobeOn ? "bg-white" : "bg-background"}`}>
      <div className="container max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="mono text-destructive text-3xl md:text-4xl font-bold tracking-widest flex items-center gap-3">
          <Siren className="h-8 w-8" /> S.O.S
        </h1>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          Sinalização de emergência e coordenadas prontas para ditado.
        </p>

        <div className="rounded-md border-2 border-destructive bg-card p-6 mb-4">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            POSIÇÃO ATUAL
          </div>
          {pos ? (
            <div className="space-y-3 mono">
              <Big label="DD" value={formatDD(pos.lng, pos.lat)} />
              <Big label="DMS" value={formatDMS(pos.lng, pos.lat)} />
              <Big label="MGRS" value={formatMGRS(pos.lng, pos.lat)} />
            </div>
          ) : (
            <div className="text-muted-foreground">Obtendo GPS…</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={active ? stopStrobe : startStrobe}
            className={`glove-tap h-20 text-lg font-bold mono ${
              active
                ? "bg-destructive text-destructive-foreground"
                : "bg-tactical-orange text-background"
            }`}
          >
            <Flashlight className="h-6 w-6 mr-2" />
            {active ? "PARAR SOS" : "INICIAR SOS"}
          </Button>
          <Button
            onClick={shareLocation}
            className="glove-tap h-20 text-lg font-bold mono bg-secondary text-foreground"
          >
            <Share2 className="h-6 w-6 mr-2" />
            COMPARTILHAR
          </Button>
        </div>
        {manualShare && (
          <div className="mt-4 rounded-md border border-tactical-amber bg-card p-3">
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Copie manualmente
            </div>
            <textarea
              readOnly
              value={manualShare}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full h-24 bg-background border border-border rounded-md p-2 mono text-sm"
            />
            <button
              onClick={() => setManualShare(null)}
              className="mt-2 text-xs text-muted-foreground underline"
            >
              Fechar
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4 mono">
          O estrobo transmite S-O-S em código Morse. A lanterna do celular é usada quando
          disponível.
        </p>
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl md:text-3xl font-bold text-tactical-orange break-all">{value}</div>
    </div>
  );
}
