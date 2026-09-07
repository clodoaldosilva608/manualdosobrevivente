import { useCallback, useEffect, useRef, useState } from "react";
import { formatDegrees } from "@/lib/format";

const CARDINALS = [
  { deg: 0, label: "N" },
  { deg: 45, label: "NE" },
  { deg: 90, label: "L" },
  { deg: 135, label: "SE" },
  { deg: 180, label: "S" },
  { deg: 225, label: "SO" },
  { deg: 270, label: "O" },
  { deg: 315, label: "NO" },
];

function norm(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export interface Compass3DProps {
  /** Rumo verdadeiro atual (graus). */
  heading: number;
  /** Declinação magnética local (graus). */
  declination: number;
  /** Chamado ao arrastar a bússola. */
  onRotate?: (heading: number) => void;
  /** Chamado ao tocar no centro (voltar ao norte). */
  onReset?: () => void;
}

export default function Compass3D({ heading, declination, onRotate, onReset }: Compass3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startAngle: number; startHeading: number } | null>(null);
  const [magnetic, setMagnetic] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [sensorOn, setSensorOn] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const enableSensor = useCallback(async () => {
    type OrientationCtor = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const ctor = (
      typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined
    ) as OrientationCtor | undefined;
    if (!ctor) return;
    if (typeof ctor.requestPermission === "function") {
      try {
        const res = await ctor.requestPermission();
        if (res !== "granted") return;
      } catch {
        return;
      }
    }
    setSensorOn(true);
  }, []);

  useEffect(() => {
    if (!sensorOn) return;
    const handler = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const wk = e.webkitCompassHeading;
      if (typeof wk === "number") {
        setDeviceHeading(norm(wk));
      } else if (typeof e.alpha === "number") {
        setDeviceHeading(norm(360 - e.alpha));
      }
    };
    window.addEventListener("deviceorientation", handler as EventListener, true);
    return () => window.removeEventListener("deviceorientation", handler as EventListener, true);
  }, [sensorOn]);

  const trueHeading = norm(deviceHeading ?? heading);
  const magneticHeading = norm(trueHeading - declination);
  const shown = magnetic ? magneticHeading : trueHeading;

  const angleFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    return norm((Math.atan2(dx, -dy) * 180) / Math.PI);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onRotate) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startAngle: angleFromEvent(e.clientX, e.clientY),
      startHeading: trueHeading,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !onRotate) return;
    const a = angleFromEvent(e.clientX, e.clientY);
    onRotate(norm(d.startHeading - (a - d.startAngle)));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div
        className="relative w-full max-w-[min(70vw,18rem)] aspect-square select-none touch-none"
        style={{ perspective: "900px" }}
      >
        <div
          ref={ref}
          role="slider"
          tabIndex={0}
          aria-label="Bússola tática"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(shown)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(e) => {
            if (!onRotate) return;
            if (e.key === "ArrowLeft") onRotate(norm(trueHeading - 5));
            if (e.key === "ArrowRight") onRotate(norm(trueHeading + 5));
            if (e.key === "Home") onReset?.();
          }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            transform: `rotateX(52deg) rotateZ(${-shown}deg)`,
            transformStyle: "preserve-3d",
            transition: reduced || dragRef.current ? "none" : "transform 220ms ease-out",
          }}
        >
          {/* base / sombra */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 50% 35%, hsl(20 8% 18%), hsl(20 10% 8%) 70%)",
              boxShadow:
                "0 26px 40px rgba(0,0,0,.65), inset 0 0 0 2px rgba(255,107,53,.35), inset 0 -14px 28px rgba(0,0,0,.7)",
              transform: "translateZ(-18px)",
            }}
          />
          {/* anel graduado */}
          <div
            className="absolute inset-[6%] rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,107,53,.20) 0 1deg, transparent 1deg 15deg)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
            }}
          />
          {/* cardeais */}
          {CARDINALS.map((c) => (
            <div
              key={c.label}
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `translate(-50%,-50%) rotate(${c.deg}deg) translateY(-40%) rotate(${-c.deg}deg) translateZ(12px)`,
              }}
            >
              <span
                className={`mono text-xs font-bold tracking-widest ${
                  c.label === "N" ? "text-tactical-orange" : "text-foreground/70"
                }`}
              >
                {c.label}
              </span>
            </div>
          ))}
          {/* agulha */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{ transform: "translate(-50%,-50%) translateZ(26px)" }}
          >
            <div className="relative h-[1px] w-[1px]">
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0 h-0"
                style={{
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderBottom: "72px solid #FF6B35",
                  filter: "drop-shadow(0 6px 10px rgba(0,0,0,.6))",
                }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0 w-0 h-0"
                style={{
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: "72px solid rgba(220,220,220,.55)",
                }}
              />
            </div>
          </div>
        </div>

        {/* centro clicável — volta ao norte */}
        <button
          type="button"
          onClick={() => onReset?.()}
          onDoubleClick={() => setMagnetic((m) => !m)}
          title="Tocar: alinhar ao norte · Toque duplo: alternar norte magnético"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-background/85 border border-tactical-orange/60 mono text-[10px] font-bold text-tactical-orange flex items-center justify-center glove-tap"
        >
          {magnetic ? "MAG" : "VERD"}
        </button>

        {/* marcador fixo do topo */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 text-tactical-orange">▼</div>
      </div>

      <div className="mono text-4xl font-bold text-tactical-orange leading-none">
        {formatDegrees(shown)}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setMagnetic((m) => !m)}
          className="glove-tap rounded-md border border-border px-3 py-1 mono text-[11px] uppercase tracking-widest"
        >
          {magnetic ? "Norte magnético" : "Norte verdadeiro"}
        </button>
        {!sensorOn && (
          <button
            type="button"
            onClick={enableSensor}
            className="glove-tap rounded-md border border-tactical-orange/60 text-tactical-orange px-3 py-1 mono text-[11px] uppercase tracking-widest"
          >
            Usar sensor do aparelho
          </button>
        )}
      </div>
    </div>
  );
}
