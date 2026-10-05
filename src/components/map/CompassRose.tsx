import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sun,
  Moon,
  Star,
  Thermometer,
  Waves,
  Wind,
  Compass as CompassIcon,
  Smartphone,
} from "lucide-react";
import { getCelestial } from "@/lib/celestial";
import { nearestCoast, compassPoint } from "@/lib/coast";
import {
  ativarSensorBussola,
  calibrarComAstro,
  useSensorBussola,
  zerarCalibracaoBussola,
} from "@/lib/bussola-sensor";
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

export type CompassVariant = "mini" | "panel" | "full";

export interface CompassRoseProps {
  heading: number;
  declination: number;
  center: [number, number];
  altitude?: number | null;
  bearingToWaypoint?: number | null;
  waypointLabel?: string | null;
  variant?: CompassVariant;
  /** Norte de referência configurado (compartilhado com Ajustes e a miniatura). */
  magnetic: boolean;
  onToggleMagnetic: () => void;
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
  variant = "full",
  magnetic,
  onToggleMagnetic,
  onRotate,
  onReset,
}: CompassRoseProps) {
  const ref = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startAngle: number; startHeading: number } | null>(null);
  // Sensor do aparelho compartilhado: miniatura e bússola completa leem o
  // mesmo estado — configurado uma vez, funciona em todas.
  const {
    sensorOn,
    rumoAparelho: deviceHeading,
    inclinacao: tilt,
    nivel,
    ultimaLeitura,
    calibracao,
  } = useSensorBussola();
  const [avisoCalibracao, setAvisoCalibracao] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const trueHeading = norm(deviceHeading ?? heading);
  const target = magnetic ? norm(trueHeading - declination) : trueHeading;

  // Acessibilidade: com "reduzir movimento" ativo no aparelho o ponteiro
  // acompanha o alvo instantaneamente — nunca congela.
  const [reduzirMovimento, setReduzirMovimento] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sincronizar = () => setReduzirMovimento(mq.matches);
    sincronizar();
    mq.addEventListener?.("change", sincronizar);
    return () => mq.removeEventListener?.("change", sincronizar);
  }, []);

  // Ponteiro girando em tempo real: interpolação suave pelo caminho mais curto
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    if (reduzirMovimento) return;
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
  }, [reduzirMovimento]);
  useEffect(() => {
    if (!reduzirMovimento) return;
    shownRef.current = target;
    setShown(target);
  }, [target, reduzirMovimento]);

  const [lng, lat] = center;
  const celestial = useMemo(() => getCelestial(lat, lng, now), [lat, lng, now]);
  const coast = useMemo(() => nearestCoast(lng, lat), [lng, lat]);

  const getWeather = useServerFn(fetchWeather);
  const { data: weather } = useQuery({
    queryKey: ["weather", Math.round(lat * 100) / 100, Math.round(lng * 100) / 100],
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
  const cruzDoSul = celestial.hemisphere === "S";
  // Resumo dos astros para o título da miniatura (ponto atual de cada um).
  const resumoCeleste = `Sol ${formatDegrees(celestial.sunAzimuth ?? 0)} · Lua ${formatDegrees(
    celestial.moonAzimuth,
  )} · ${celestial.starName} ${formatDegrees(celestial.starAzimuth)}`;
  // Nível de bolha UNIVERSAL: com o vetor gravidade do motion funciona em
  // qualquer posição (deitado, em pé, de lado, tela para baixo); sem motion,
  // cai para beta/gamma do orientation (só deitado) para não ficar cego.
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const bubbleX = nivel ? nivel.bolhaX : tilt ? clamp(tilt.gamma, 30) / 30 : 0;
  const bubbleY = nivel ? nivel.bolhaY : tilt ? clamp(tilt.beta, 30) / 30 : 0;
  const tiltTotal = nivel
    ? nivel.total
    : tilt
      ? Math.min(90, Math.hypot(tilt.beta, tilt.gamma))
      : null;
  const leveled = tiltTotal != null && tiltTotal < 2.5;
  const rotuloPostura = nivel
    ? nivel.nivelado
      ? "deitado · nivelado"
      : `${nivel.postura}${nivel.telaParaCima ? "" : " · tela p/ baixo"}`
    : null;

  const isMini = variant === "mini";
  const isFull = variant === "full";
  // Nitidez: na miniatura o mostrador é pequeno — menos tiques, traços mais
  // grossos e sem os números de grau (viram poeira em 88px).
  const traco = isMini ? 1.6 : 1;
  const visiveis = isMini ? ticks.filter((t) => t.deg % 10 === 0) : ticks;

  return (
    <div
      className={`flex flex-col items-center w-full ${isMini ? "gap-1" : "gap-4"}`}
      title={isMini ? resumoCeleste : undefined}
    >
      <div
        className={`relative w-full aspect-square select-none touch-none ${
          isMini ? "max-w-[5.5rem]" : isFull ? "max-w-[min(82vw,22rem)]" : "max-w-[min(52vw,12rem)]"
        }`}
      >
        <div
          aria-hidden
          className="absolute inset-[6%] rounded-full bg-black/70 blur-xl"
          style={{ transform: "translateY(6%) scale(0.94)" }}
        />
        {/* Sem transform 3D: perspectiva rasteriza o SVG e borrava o mostrador.
            Plano e com geometricPrecision a leitura fica nítida em qualquer DPI. */}
        <svg
          ref={ref}
          viewBox="0 0 200 200"
          role="slider"
          tabIndex={0}
          aria-label="Bússola tática"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(shown)}
          shapeRendering="geometricPrecision"
          textRendering="geometricPrecision"
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
          {/* sensor ativo: anel pulsante indica que o mostrador segue o aparelho */}
          {sensorOn && (
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="#FF6B35"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              className="sensor-glow"
            />
          )}

          {/* limbo rotativo */}
          <g transform={`rotate(${-shown} 100 100)`}>
            {visiveis.map((t) => {
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
                  stroke={t.major ? "#FF6B35" : t.mid ? "#d4d4d0" : "#8a8a86"}
                  strokeWidth={(t.major ? 1.6 : 0.9) * traco}
                />
              );
            })}
            {!isMini &&
              ticks
                .filter((t) => t.major)
                .map((t) => {
                  const p = markerAt(t.deg, 68);
                  return (
                    <text
                      key={`n${t.deg}`}
                      x={p.x}
                      y={p.y + 3}
                      textAnchor="middle"
                      fontSize="8.5"
                      fill="#e3dfd7"
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
                  fontSize={c.label.length === 1 ? (isMini ? "15" : "13") : isMini ? "10.5" : "9"}
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
              {/* Sol: posição real, apagado quando abaixo do horizonte */}
              <g opacity={celestial.sunAltitude > 0 ? 1 : 0.25}>
                <title>{`Sol — azimute ${formatDegrees(celestial.sunAzimuth ?? 0)} ${compassPoint(
                  celestial.sunAzimuth ?? 0,
                )}${celestial.sunAltitude > 0 ? "" : " (abaixo do horizonte)"}`}</title>
                <circle cx={sunPt.x} cy={sunPt.y} r="6" fill="#F4A261" opacity="0.9" />
                <text x={sunPt.x} y={sunPt.y + 3} textAnchor="middle" fontSize="7" fill="#1a1a1a">
                  ☀
                </text>
              </g>
              {/* Lua: posição real, apagada quando abaixo do horizonte */}
              <g opacity={celestial.moonUp ? 1 : 0.25}>
                <title>{`Lua — azimute ${formatDegrees(celestial.moonAzimuth)} ${compassPoint(
                  celestial.moonAzimuth,
                )}${celestial.moonUp ? "" : " (abaixo do horizonte)"}`}</title>
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
              </g>
              {/* Cruzeiro do Sul (sul) ou Polaris (norte) na posição real */}
              <g opacity={celestial.starUp ? 1 : 0.25}>
                <title>{`${celestial.starName} — azimute ${formatDegrees(
                  celestial.starAzimuth,
                )} ${compassPoint(celestial.starAzimuth)}${
                  celestial.starUp ? "" : " (abaixo do horizonte)"
                }`}</title>
                {cruzDoSul ? (
                  <>
                    <line
                      x1={starPt.x}
                      y1={starPt.y - 5.5}
                      x2={starPt.x}
                      y2={starPt.y + 5.5}
                      stroke="#8ecae6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1={starPt.x - 3.8}
                      y1={starPt.y}
                      x2={starPt.x + 3.8}
                      y2={starPt.y}
                      stroke="#8ecae6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={starPt.x}
                      cy={starPt.y}
                      r="7.5"
                      fill="none"
                      stroke="#8ecae6"
                      strokeOpacity="0.45"
                      strokeWidth="0.8"
                    />
                  </>
                ) : (
                  <text
                    x={starPt.x}
                    y={starPt.y + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#8ecae6"
                  >
                    ✦
                  </text>
                )}
              </g>
              <text x={coastPt.x} y={coastPt.y + 3} textAnchor="middle" fontSize="8" fill="#3FA9F5">
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
            <polygon
              points="100,28 106,100 94,100"
              fill="url(#needleN)"
              stroke="#241f1b"
              strokeWidth="0.6"
            />
            <polygon
              points="100,172 106,100 94,100"
              fill="url(#needleS)"
              stroke="#241f1b"
              strokeWidth="0.6"
            />
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

        {!isMini && (
          <button
            type="button"
            onClick={() => onReset?.()}
            onDoubleClick={() => onToggleMagnetic()}
            title="Tocar: alinhar ao norte · Toque duplo: alternar norte magnético"
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/90 border border-tactical-orange/60 mono text-[10px] font-bold text-tactical-orange flex flex-col items-center justify-center glove-tap ${
              isFull ? "h-16 w-16" : "h-12 w-12"
            }`}
          >
            <CompassIcon className="h-4 w-4" />
            {magnetic ? "MAG" : "VERD"}
          </button>
        )}
      </div>

      <div
        data-test="bussola-leitura"
        className={`mono font-bold text-tactical-orange leading-none ${
          isMini ? "text-sm" : isFull ? "text-4xl" : "text-2xl"
        }`}
      >
        {formatDegrees(shown)}{" "}
        <span className={isMini ? "text-[10px]" : isFull ? "text-lg" : "text-sm"}>
          {compassPoint(shown)}
        </span>
      </div>

      {/* Configuração da bússola direto na miniatura (vale para as duas) */}
      {isMini && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-test="bussola-mag"
            title="Alternar norte verdadeiro/magnético"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMagnetic();
            }}
            className={`mono text-[8px] font-bold rounded border px-1 py-px leading-none ${
              magnetic
                ? "border-tactical-orange text-tactical-orange"
                : "border-border text-muted-foreground"
            }`}
          >
            {magnetic ? "MAG" : "VERD"}
          </button>
          {sensorOn ? (
            <span
              data-test="bussola-sensor-on"
              title={
                ultimaLeitura != null
                  ? "Sensor do aparelho ativo — recebendo leituras"
                  : "Sensor do aparelho ativo — aguardando leituras"
              }
              className={`mono text-[8px] font-bold leading-none text-tactical-green ${
                ultimaLeitura != null ? "animate-pulse" : "opacity-70"
              }`}
            >
              SEN
            </span>
          ) : (
            <button
              type="button"
              data-test="bussola-sensor"
              title="Usar o sensor do aparelho"
              aria-label="Usar sensor do aparelho"
              onClick={(e) => {
                e.stopPropagation();
                void ativarSensorBussola();
              }}
              className="rounded border border-tactical-orange/60 text-tactical-orange p-px leading-none"
            >
              <Smartphone className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}

      {!isMini && (
        <>
          {/* nível de bolha universal (qualquer posição) + nível do mar */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="rounded-md border border-border bg-background/50 p-2.5 flex flex-col items-center gap-1">
              <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Nível de bolha · qualquer posição
              </div>
              <div
                data-test="nivel-bolha"
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
              <div className="mono text-[10px] text-muted-foreground text-center leading-snug">
                {tiltTotal != null ? (
                  <>
                    Inclinação {formatDegrees(tiltTotal)}
                    {leveled ? " · nivelado" : ""}
                    {nivel && (
                      <span data-test="nivel-eixos" className="block">
                        X {formatDegrees(nivel.angX, 1)} · Y {formatDegrees(nivel.angY, 1)}
                        {rotuloPostura ? ` · ${rotuloPostura}` : ""}
                      </span>
                    )}
                  </>
                ) : (
                  "Ative o sensor do aparelho"
                )}
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
                <div
                  data-test="nivel-mar-altitude"
                  className="absolute left-1 right-1 top-1 mono text-[10px] text-tactical-orange font-bold"
                >
                  {altitude != null ? `${formatNumber(altitude, 0)} m` : "—"}
                </div>
                <div className="absolute left-1 bottom-1 mono text-[9px] text-muted-foreground">
                  acima do nível do mar · GPS
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onToggleMagnetic()}
              className="glove-tap rounded-md border border-border px-3 py-1 mono text-[11px] uppercase tracking-widest"
            >
              {magnetic ? "Norte magnético" : "Norte verdadeiro"}
            </button>
            {!sensorOn && (
              <button
                type="button"
                onClick={() => void ativarSensorBussola()}
                className="glove-tap rounded-md border border-tactical-orange/60 text-tactical-orange px-3 py-1 mono text-[11px] uppercase tracking-widest"
              >
                Usar sensor do aparelho
              </button>
            )}
          </div>

          {/* Calibração pelo astro: mede o erro do sensor contra o azimute
              astronômico real do Sol (ou da Lua à noite) e aplica a correção */}
          {!isMini && (
            <div className="rounded-md border border-border bg-background/50 p-2.5 w-full">
              <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Calibração de precisão
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {sensorOn && celestial.sunAltitude > 0 && (
                  <button
                    type="button"
                    data-test="bussola-calibrar-sol"
                    onClick={() => {
                      const r = calibrarComAstro(celestial.sunAzimuth ?? 0);
                      setAvisoCalibracao(
                        r == null
                          ? "Sem leitura do sensor ainda — espere o SEN ficar verde."
                          : `Correção de ${formatSignedDegrees(r)} aplicada. Aponte de novo para conferir.`,
                      );
                    }}
                    className="glove-tap rounded-md border border-tactical-orange/60 text-tactical-orange px-3 py-1 mono text-[11px] uppercase tracking-widest"
                  >
                    Calibrar pelo Sol ({formatDegrees(celestial.sunAzimuth ?? 0)})
                  </button>
                )}
                {sensorOn && celestial.sunAltitude <= 0 && celestial.moonUp && (
                  <button
                    type="button"
                    data-test="bussola-calibrar-lua"
                    onClick={() => {
                      const r = calibrarComAstro(celestial.moonAzimuth);
                      setAvisoCalibracao(
                        r == null
                          ? "Sem leitura do sensor ainda — espere o SEN ficar verde."
                          : `Correção de ${formatSignedDegrees(r)} aplicada. Aponte de novo para conferir.`,
                      );
                    }}
                    className="glove-tap rounded-md border border-tactical-orange/60 text-tactical-orange px-3 py-1 mono text-[11px] uppercase tracking-widest"
                  >
                    Calibrar pela Lua ({formatDegrees(celestial.moonAzimuth)})
                  </button>
                )}
                {sensorOn && calibracao !== 0 && (
                  <button
                    type="button"
                    data-test="bussola-zerar-calibracao"
                    onClick={() => {
                      zerarCalibracaoBussola();
                      setAvisoCalibracao("Correção zerada — sensor no modelo puro.");
                    }}
                    className="glove-tap rounded-md border border-border text-muted-foreground px-3 py-1 mono text-[11px] uppercase tracking-widest"
                  >
                    Zerar correção
                  </button>
                )}
              </div>
              {sensorOn && (
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                  Aponte a borda superior do aparelho diretamente para o Sol (ou a Lua) e toque em
                  calibrar: o erro do sensor é medido contra o azimute astronômico real e corrigido
                  em todas as leituras.
                </p>
              )}
              {avisoCalibracao && (
                <p
                  data-test="bussola-aviso-calibracao"
                  className="text-[11px] text-tactical-orange mt-1.5 mono"
                >
                  {avisoCalibracao}
                </p>
              )}
            </div>
          )}

          <div
            className={`grid grid-cols-2 gap-2 w-full mono ${isFull ? "" : "max-h-40 overflow-y-auto"}`}
          >
            <Cell label="Rumo verdadeiro" value={formatDegrees(trueHeading)} />
            <Cell label="Rumo magnético" value={formatDegrees(norm(trueHeading - declination))} />
            <Cell label="Declinação" value={formatSignedDegrees(declination)} />
            <Cell
              label="Correção do sensor"
              value={formatSignedDegrees(calibracao)}
              hint={calibracao !== 0 ? "calibração pelo astro" : "sem correção aplicada"}
            />
            <Cell
              label="Azimute p/ waypoint"
              value={bearingToWaypoint != null ? formatDegrees(bearingToWaypoint) : "—"}
              hint={waypointLabel ?? undefined}
            />
            <Cell
              icon={<Thermometer className="h-3.5 w-3.5" />}
              label="Temperatura"
              value={
                weather?.temperature != null ? `${formatNumber(weather.temperature, 1)} °C` : "—"
              }
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
              label={celestial.starName}
              value={`${formatDegrees(celestial.starAzimuth)} ${compassPoint(celestial.starAzimuth)}`}
              hint={`Altura ${formatDegrees(celestial.starAltitude, 1)} · ${
                celestial.starUp ? "acima do horizonte" : "abaixo do horizonte"
              } · ${celestial.starHint}`}
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
        </>
      )}
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
