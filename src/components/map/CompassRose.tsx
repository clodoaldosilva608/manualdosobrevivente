import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sun, Moon, Star, Thermometer, Waves, Wind, Compass as CompassIcon } from "lucide-react";
import { getCelestial } from "@/lib/celestial";
import { nearestCoast, compassPoint } from "@/lib/coast";
import { fetchWeather } from "@/lib/weather.functions";
import {
  formatDegrees,
  formatSignedDegrees,
  formatDistance,
  formatNumber,
  formatTime,
  formatPercent,
  formatSpeed,
  formatDecimalDegrees,
} from "@/lib/format";

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

export interface CompassRoseProps {
  heading: number;
  declination: number;
  center: [number, number];
  altitude?: number | null;
  bearingToWaypoint?: number | null;
  waypointLabel?: string | null;
  onRotate?: (heading: number) => void;
  onReset?: () => void;
}

export default function CompassRose({
  heading,
  declination,
  center,
  altitude,
  bearingToWaypoint,
  waypointLabel,
  onRotate,
  onReset,
}: CompassRoseProps) {
  const ref = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startAngle: number; startHeading: number } | null>(null);
  const [magnetic, setMagnetic] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [tilt, setTilt] = useState<{ beta: number; gamma: number } | null>(null);
  const [sensorOn, setSensorOn] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const enableSensor = useCallback(async () => {
    type Ctor = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const ctor = (
      typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined
    ) as Ctor | undefined;
    if (!ctor) return;
    if (typeof ctor.requestPermission === "function") {
      try {
        if ((await ctor.requestPermission()) !== "granted") return;
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
      if (typeof wk === "number") setDeviceHeading(norm(wk));
      else if (typeof e.alpha === "number") setDeviceHeading(norm(360 - e.alpha));
      if (typeof e.beta === "number" && typeof e.gamma === "number") {
        setTilt({ beta: e.beta, gamma: e.gamma });
      }
    };
    window.addEventListener("deviceorientation", handler as EventListener, true);
    return () => window.removeEventListener("deviceorientation", handler as EventListener, true);
  }, [sensorOn]);

  const trueHeading = norm(deviceHeading ?? heading);
  const target = magnetic ? norm(trueHeading - declination) : trueHeading;

  // Ponteiro girando em tempo real: interpolação suave pelo caminho mais curto
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      shownRef.current = targetRef.current;
      setShown(targetRef.current);
      return;
    }
    let raf = 0;
    const step = () => {
      const cur = shownRef.current;
      let diff = ((targetRef.current - cur + 540) % 360) - 180;
      if (Math.abs(diff) < 0.05) diff = 0;
      const next = norm(cur + diff * 0.18);
      if (diff !== 0) {
        shownRef.current = next;
        setShown(next);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const [lng, lat] = center;
  const celestial = useMemo(() => getCelestial(lat, lng, now), [lat, lng, now]);
  const coast = useMemo(() => nearestCoast(lng, lat), [lng, lat]);

  const getWeather = useServerFn(fetchWeather);
  const { data: weather } = useQuery({
    queryKey: ["weather", lat.toFixed(2), lng.toFixed(2)],
    queryFn: () => getWeather({ data: { lng, lat } }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const angleFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    return norm((Math.atan2(dx, -dy) * 180) / Math.PI);
  };

  const ticks = useMemo(() => {
    const out: Array<{ deg: number; major: boolean; mid: boolean }> = [];
    for (let d = 0; d < 360; d += 2) {
      out.push({ deg: d, major: d % 30 === 0, mid: d % 10 === 0 });
    }
    return out;
  }, []);

  const markerAt = (azimuth: number, r: number) => {
    const a = ((azimuth - 90) * Math.PI) / 180;
    return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) };
  };

  const sunPt = markerAt(celestial.sunAzimuth ?? 0, 62);
  const moonPt = markerAt(celestial.moonAzimuth, 52);
  const starPt = markerAt(celestial.starAzimuth, 72);
  const coastPt = markerAt(coast.bearing, 82);
  const wpPt = bearingToWaypoint != null ? markerAt(bearingToWaypoint, 42) : null;
  const eastPt = markerAt(90, 88);
  const sunsetAz = celestial.sunsetAzimuth;
  const sunriseAz = celestial.sunriseAzimuth;
  const sunsetPt = sunsetAz != null ? markerAt(sunsetAz, 88) : null;
  const sunrisePt = sunriseAz != null ? markerAt(sunriseAz, 88) : null;
  const windFrom = weather?.windDirection ?? null;
  const windOuter = windFrom != null ? markerAt(windFrom, 86) : null;
  const windInner = windFrom != null ? markerAt(windFrom, 58) : null;
  const windSpeed = weather?.windSpeed ?? null;
  // Nível de bolha: desloca a bolha conforme a inclinação do aparelho (limitada a ±30°)
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const bubbleX = tilt ? clamp(tilt.gamma, 30) / 30 : 0;
  const bubbleY = tilt ? clamp(tilt.beta, 30) / 30 : 0;
  const tiltTotal = tilt ? Math.min(90, Math.hypot(tilt.beta, tilt.gamma)) : null;
  const leveled = tiltTotal != null && tiltTotal < 2.5;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div
        className="relative w-full max-w-[min(82vw,22rem)] aspect-square select-none touch-none"
        style={{ perspective: "900px" }}
      >
        <div
          aria-hidden
          className="absolute inset-[6%] rounded-full bg-black/70 blur-xl"
          style={{ transform: "translateY(6%) scale(0.94)" }}
        />
        <div
          className="absolute inset-0"
          style={{ transform: "rotateX(16deg)", transformStyle: "preserve-3d" }}
        >
          <svg
            ref={ref}
            viewBox="0 0 200 200"
            role="slider"
            tabIndex={0}
            aria-label="Bússola tática"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(shown)}
            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              if (!onRotate) return;
              (e.target as Element).setPointerCapture?.(e.pointerId);
              dragRef.current = {
                startAngle: angleFromEvent(e.clientX, e.clientY),
                startHeading: trueHeading,
              };
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d || !onRotate) return;
              const a = angleFromEvent(e.clientX, e.clientY);
              onRotate(norm(d.startHeading - (a - d.startAngle)));
            }}
            onPointerUp={() => (dragRef.current = null)}
            onPointerCancel={() => (dragRef.current = null)}
            onKeyDown={(e) => {
              if (!onRotate) return;
              if (e.key === "ArrowLeft") onRotate(norm(trueHeading - 5));
              if (e.key === "ArrowRight") onRotate(norm(trueHeading + 5));
              if (e.key === "Home") onReset?.();
            }}
          >
            <defs>
              <radialGradient id="dial" cx="50%" cy="38%">
                <stop offset="0%" stopColor="#22201d" />
                <stop offset="70%" stopColor="#141312" />
                <stop offset="100%" stopColor="#0b0a09" />
              </radialGradient>
              <linearGradient id="needleN" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#8c2f16" />
                <stop offset="100%" stopColor="#FF6B35" />
              </linearGradient>
              <linearGradient id="needleS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6e6e6" />
                <stop offset="100%" stopColor="#8a8a8a" />
              </linearGradient>
            </defs>

            {/* caixa */}
            <circle cx="100" cy="100" r="98" fill="#0d0d0c" stroke="#3E4A3D" strokeWidth="3" />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="url(#dial)"
              stroke="#FF6B35"
              strokeOpacity="0.35"
            />

            {/* limbo rotativo */}
            <g style={{ transform: `rotate(${-shown}deg)`, transformOrigin: "100px 100px" }}>
              {ticks.map((t) => {
                const len = t.major ? 12 : t.mid ? 8 : 4;
                const a = ((t.deg - 90) * Math.PI) / 180;
                const r1 = 88;
                const r2 = 88 - len;
                return (
                  <line
                    key={t.deg}
                    x1={100 + r1 * Math.cos(a)}
                    y1={100 + r1 * Math.sin(a)}
                    x2={100 + r2 * Math.cos(a)}
                    y2={100 + r2 * Math.sin(a)}
                    stroke={t.major ? "#FF6B35" : t.mid ? "#cfcfcf" : "#7d7d7d"}
                    strokeWidth={t.major ? 1.6 : 0.8}
                  />
                );
              })}
              {ticks
                .filter((t) => t.major)
                .map((t) => {
                  const p = markerAt(t.deg, 68);
                  return (
                    <text
                      key={`n${t.deg}`}
                      x={p.x}
                      y={p.y + 3}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#d7d3cc"
                      className="mono"
                      transform={`rotate(${t.deg} ${p.x} ${p.y})`}
                    >
                      {t.deg}
                    </text>
                  );
                })}
              {CARDINALS.map((c) => {
                const p = markerAt(c.deg, 78);
                return (
                  <text
                    key={c.label}
                    x={p.x}
                    y={p.y + 4}
                    textAnchor="middle"
                    fontSize={c.label.length === 1 ? "13" : "9"}
                    fontWeight="bold"
                    fill={c.label === "N" ? "#FF6B35" : "#e8e4dd"}
                    transform={`rotate(${c.deg} ${p.x} ${p.y})`}
                  >
                    {c.label}
                  </text>
                );
              })}

              {/* referências celestes e geográficas */}
              <g>
                <circle cx={sunPt.x} cy={sunPt.y} r="6" fill="#F4A261" opacity="0.9" />
                <text x={sunPt.x} y={sunPt.y + 3} textAnchor="middle" fontSize="7" fill="#1a1a1a">
                  ☀
                </text>
                <circle cx={moonPt.x} cy={moonPt.y} r="5.5" fill="#cbd5e1" opacity="0.9" />
                <text
                  x={moonPt.x}
                  y={moonPt.y + 2.5}
                  textAnchor="middle"
                  fontSize="6"
                  fill="#1a1a1a"
                >
                  ☾
                </text>
                <text x={starPt.x} y={starPt.y + 3} textAnchor="middle" fontSize="9" fill="#8ecae6">
                  ✦
                </text>
                <text
                  x={coastPt.x}
                  y={coastPt.y + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#3FA9F5"
                >
                  ≈
                </text>
                {wpPt && (
                  <circle
                    cx={wpPt.x}
                    cy={wpPt.y}
                    r="4"
                    fill="none"
                    stroke="#6BBF59"
                    strokeWidth="2"
                  />
                )}
              </g>

              {/* leste, nascente e poente */}
              <g>
                <circle cx={eastPt.x} cy={eastPt.y} r="3" fill="#FFD166" />
                <text
                  x={eastPt.x}
                  y={eastPt.y + 10}
                  textAnchor="middle"
                  fontSize="5.5"
                  fill="#FFD166"
                  transform={`rotate(90 ${eastPt.x} ${eastPt.y})`}
                >
                  LESTE
                </text>
                {sunrisePt && (
                  <text
                    x={sunrisePt.x}
                    y={sunrisePt.y + 3}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#F4A261"
                  >
                    ↑☀
                  </text>
                )}
                {sunsetPt && (
                  <text
                    x={sunsetPt.x}
                    y={sunsetPt.y + 3}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#E76F51"
                  >
                    ↓☀
                  </text>
                )}
              </g>

              {/* vento: seta partindo da origem do vento em direção ao centro */}
              {windOuter && windInner && (
                <g className="wind-flow">
                  <line
                    x1={windOuter.x}
                    y1={windOuter.y}
                    x2={windInner.x}
                    y2={windInner.y}
                    stroke="#7FD1E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx={windInner.x} cy={windInner.y} r="3" fill="#7FD1E8" />
                  <text
                    x={windOuter.x}
                    y={windOuter.y - 4}
                    textAnchor="middle"
                    fontSize="6"
                    fill="#7FD1E8"
                  >
                    {windSpeed != null ? formatSpeed(windSpeed) : "vento"}
                  </text>
                </g>
              )}

              {/* agulha */}
              <polygon points="100,28 106,100 94,100" fill="url(#needleN)" />
              <polygon points="100,172 106,100 94,100" fill="url(#needleS)" />
            </g>

            {/* linha de fé fixa */}
            <line x1="100" y1="6" x2="100" y2="26" stroke="#FF6B35" strokeWidth="2.5" />
            <polygon points="100,4 94,-4 106,-4" fill="#FF6B35" />
            <line
              x1="100"
              y1="34"
              x2="100"
              y2="166"
              stroke="#FF6B35"
              strokeOpacity="0.22"
              strokeWidth="0.8"
            />
            <line
              x1="34"
              y1="100"
              x2="166"
              y2="100"
              stroke="#FF6B35"
              strokeOpacity="0.22"
              strokeWidth="0.8"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => onReset?.()}
          onDoubleClick={() => setMagnetic((m) => !m)}
          title="Tocar: alinhar ao norte · Toque duplo: alternar norte magnético"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-background/90 border border-tactical-orange/60 mono text-[10px] font-bold text-tactical-orange flex flex-col items-center justify-center glove-tap"
        >
          <CompassIcon className="h-4 w-4" />
          {magnetic ? "MAG" : "VERD"}
        </button>
      </div>

      <div className="mono text-4xl font-bold text-tactical-orange leading-none">
        {formatDegrees(shown)} <span className="text-lg">{compassPoint(shown)}</span>
      </div>

      {/* nível de bolha + nível do mar */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="rounded-md border border-border bg-background/50 p-2.5 flex flex-col items-center gap-1">
          <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Nível de bolha
          </div>
          <div
            className={`relative h-24 w-24 rounded-full border-2 ${
              leveled ? "border-tactical-green" : "border-border"
            } bg-background/70`}
          >
            <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-border" />
            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-tactical-orange/50" />
            <div
              className="absolute left-1/2 top-1/2 h-5 w-5 rounded-full bg-tactical-orange/80 shadow-lg transition-transform duration-150 ease-out"
              style={{
                transform: `translate(calc(-50% + ${bubbleX * 38}px), calc(-50% + ${bubbleY * 38}px))`,
              }}
            />
          </div>
          <div className="mono text-[10px] text-muted-foreground">
            {tiltTotal != null
              ? `Inclinação ${formatDegrees(tiltTotal)}${leveled ? " · nivelado" : ""}`
              : "Ative o sensor do aparelho"}
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/50 p-2.5 flex flex-col gap-1">
          <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Nível do mar
          </div>
          <div className="relative flex-1 min-h-[6rem] overflow-hidden rounded bg-background/70 border border-border">
            <div
              className="absolute left-0 right-0 bottom-0 bg-tactical-blue/25"
              style={{
                height: `${Math.max(8, Math.min(92, 50 - (altitude ?? 0) / 40))}%`,
              }}
            >
              <div className="sea-wave absolute left-0 top-0 h-1.5 w-[200%] bg-tactical-blue/60" />
            </div>
            <div className="absolute left-1 right-1 top-1 mono text-[10px] text-tactical-orange font-bold">
              {altitude != null ? `${formatNumber(altitude, 0)} m` : "—"}
            </div>
            <div className="absolute left-1 bottom-1 mono text-[9px] text-muted-foreground">
              acima do mar
            </div>
          </div>
        </div>
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

      <div className="grid grid-cols-2 gap-2 w-full mono">
        <Cell label="Rumo verdadeiro" value={formatDegrees(trueHeading)} />
        <Cell label="Rumo magnético" value={formatDegrees(norm(trueHeading - declination))} />
        <Cell label="Declinação" value={formatSignedDegrees(declination)} />
        <Cell
          label="Azimute p/ waypoint"
          value={bearingToWaypoint != null ? formatDegrees(bearingToWaypoint) : "—"}
          hint={waypointLabel ?? undefined}
        />
        <Cell
          icon={<Thermometer className="h-3.5 w-3.5" />}
          label="Temperatura"
          value={weather?.temperature != null ? `${formatNumber(weather.temperature, 1)} °C` : "—"}
          hint={
            weather
              ? `${weather.condition}${
                  weather.apparent != null
                    ? ` · sensação ${formatNumber(weather.apparent, 1)} °C`
                    : ""
                }`
              : "Sem dados de tempo"
          }
        />
        <Cell
          icon={<Wind className="h-3.5 w-3.5" />}
          label="Vento"
          value={weather?.windSpeed != null ? formatSpeed(weather.windSpeed) : "—"}
          hint={
            weather?.windDirection != null
              ? `de ${compassPoint(weather.windDirection)} (${formatDegrees(weather.windDirection)})`
              : undefined
          }
        />
        <Cell
          icon={<Sun className="h-3.5 w-3.5" />}
          label={celestial.isDay ? "Dia" : "Noite"}
          value={celestial.phaseLabel}
          hint={`Nascer ${formatTime(celestial.sunrise ?? now)} · Pôr ${formatTime(
            celestial.sunset ?? now,
          )}`}
        />
        <Cell
          icon={<Sun className="h-3.5 w-3.5" />}
          label="Sol"
          value={
            celestial.sunAzimuth != null
              ? `${formatDegrees(celestial.sunAzimuth)} ${compassPoint(celestial.sunAzimuth)}`
              : "—"
          }
          hint={`Altura ${formatDegrees(celestial.sunAltitude)} · crepúsculo ${formatTime(
            celestial.dusk ?? now,
          )}`}
        />
        <Cell
          icon={<Moon className="h-3.5 w-3.5" />}
          label="Lua"
          value={`${formatDegrees(celestial.moonAzimuth)} ${compassPoint(celestial.moonAzimuth)}`}
          hint={`${celestial.moonPhaseLabel} · ${formatPercent(celestial.moonIllumination)} iluminada · ${
            celestial.moonUp ? "acima do horizonte" : "abaixo do horizonte"
          }`}
        />
        <Cell
          icon={<Star className="h-3.5 w-3.5" />}
          label="Referência estelar"
          value={celestial.starName}
          hint={celestial.starHint}
        />
        <Cell
          icon={<Waves className="h-3.5 w-3.5" />}
          label="Sentido do mar"
          value={`${coast.point} (${formatDegrees(coast.bearing)})`}
          hint={`Litoral a cerca de ${formatDistance(coast.distanceMeters)}`}
        />
        <Cell
          label="Hemisfério"
          value={celestial.hemisphereLabel}
          hint={`${formatDecimalDegrees(lat)}, ${formatDecimalDegrees(lng)}`}
        />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-tactical-orange break-words">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</div>}
    </div>
  );
}
