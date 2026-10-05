/**
 * Redline do boletim — letreiro fixo na barra inferior da tela do mapa
 * tático, com TODAS as informações do Boletim de Inteligência e da bússola
 * passando em rotação contínua (estilo ticker de agência):
 *
 * rumo verdadeiro · rumo magnético · declinação · correção do sensor ·
 * azimute p/ waypoint · temperatura e céu · vento · dia (nascer/pôr) ·
 * sol · lua · Cruzeiro do Sul/Polaris · sentido do mar e litoral ·
 * nível do mar (altitude) · nível do aparelho · hemisfério · coordenadas.
 *
 * Usa os MESMOS cálculos e a MESMA chave de cache do clima da Rosa dos
 * Ventos — nada é buscado duas vezes, e as leituras batem entre si.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCelestial } from "@/lib/celestial";
import { nearestCoast, compassPoint } from "@/lib/coast";
import { useSensorBussola } from "@/lib/bussola-sensor";
import { nivelUniversal } from "@/lib/nivel";
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

function norm(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export interface RedlineBoletimProps {
  heading: number;
  declination: number;
  center: [number, number];
  altitude?: number | null;
  bearingToWaypoint?: number | null;
  waypointLabel?: string | null;
}

/** Item do letreiro: rótulo + valor (com detalhe) — vira "RÓTULO valor · detalhe". */
function entrada(rotulo: string, valor: string, detalhe?: string): string {
  return [`${rotulo} ${valor}`, detalhe].filter(Boolean).join(" · ");
}

export default function RedlineBoletim({
  heading,
  declination,
  center,
  altitude,
  bearingToWaypoint,
  waypointLabel,
}: RedlineBoletimProps) {
  const { rumoAparelho, calibracao, nivel } = useSensorBussola();
  const [now, setNow] = useState(() => new Date());
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

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

  const rumoVerdadeiro = norm(rumoAparelho ?? heading);
  const rumoMagnetico = norm(rumoVerdadeiro - declination);

  // Nível do aparelho no letreiro (sem depender do painel da bússola).
  const inclinacao = nivel ?? null;

  const linhas: string[] = [
    entrada("RUMO VERDADEIRO", formatDegrees(rumoVerdadeiro)),
    entrada("RUMO MAGNÉTICO", formatDegrees(rumoMagnetico)),
    entrada("DECLINAÇÃO", formatSignedDegrees(declination)),
    entrada(
      "CORREÇÃO DO SENSOR",
      formatSignedDegrees(calibracao),
      calibracao !== 0 ? "calibração pelo astro" : "sem correção aplicada",
    ),
    entrada(
      "AZIMUTE P/ WAYPOINT",
      bearingToWaypoint != null ? formatDegrees(bearingToWaypoint) : "—",
      waypointLabel ?? undefined,
    ),
    entrada(
      "TEMPERATURA",
      weather?.temperature != null ? `${formatNumber(weather.temperature, 1)} °C` : "—",
      weather
        ? `${weather.condition}${
            weather.apparent != null ? ` · sensação ${formatNumber(weather.apparent, 1)} °C` : ""
          }`
        : undefined,
    ),
    entrada(
      "VENTO",
      weather?.windSpeed != null ? formatSpeed(weather.windSpeed) : "—",
      weather?.windDirection != null
        ? `de ${compassPoint(weather.windDirection)} (${formatDegrees(weather.windDirection)})`
        : undefined,
    ),
    entrada(
      celestial.isDay ? "DIA" : "NOITE",
      celestial.phaseLabel,
      `Nascer ${formatTime(celestial.sunrise ?? now)} · Pôr ${formatTime(celestial.sunset ?? now)}`,
    ),
    entrada(
      "SOL",
      celestial.sunAzimuth != null
        ? `${formatDegrees(celestial.sunAzimuth)} ${compassPoint(celestial.sunAzimuth)}`
        : "—",
      `Altura ${formatDegrees(celestial.sunAltitude)} · crepúsculo ${formatTime(
        celestial.dusk ?? now,
      )}`,
    ),
    entrada(
      "LUA",
      `${formatDegrees(celestial.moonAzimuth)} ${compassPoint(celestial.moonAzimuth)}`,
      `${celestial.moonPhaseLabel} · ${formatPercent(celestial.moonIllumination)} iluminada · ${
        celestial.moonUp ? "acima do horizonte" : "abaixo do horizonte"
      }`,
    ),
    entrada(
      celestial.starName.toUpperCase(),
      `${formatDegrees(celestial.starAzimuth)} ${compassPoint(celestial.starAzimuth)}`,
      `Altura ${formatDegrees(celestial.starAltitude, 1)} · ${
        celestial.starUp ? "acima do horizonte" : "abaixo do horizonte"
      } · ${celestial.starHint}`,
    ),
    entrada(
      "SENTIDO DO MAR",
      `${coast.point} (${formatDegrees(coast.bearing)})`,
      `Litoral a cerca de ${formatDistance(coast.distanceMeters)}`,
    ),
    entrada(
      "NÍVEL DO MAR",
      altitude != null ? `${formatNumber(altitude, 0)} m` : "—",
      "acima do nível do mar · GPS",
    ),
    entrada(
      "NÍVEL DO APARELHO",
      inclinacao ? formatDegrees(inclinacao.total, 1) : "—",
      inclinacao ? (inclinacao.nivelado ? "nivelado" : inclinacao.postura) : undefined,
    ),
    entrada("HEMISFÉRIO", celestial.hemisphereLabel.toUpperCase()),
    `${formatDecimalDegrees(lat)}, ${formatDecimalDegrees(lng)}`,
  ];

  const texto = linhas.join("  •••  ");

  return (
    <div
      data-test="redline"
      role="marquee"
      aria-label="Redline do boletim de inteligência e da bússola"
      title="Toque para pausar/continuar o letreiro"
      onClick={() => setPausado((p) => !p)}
      className={`absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 select-none overflow-hidden border-y border-red-900/60 bg-black/85 backdrop-blur-sm md:bottom-0 ${
        pausado ? "redline-pausado cursor-pointer" : "cursor-pointer"
      }`}
    >
      <div className="redline-edge" />
      <div className="flex w-max items-center py-1">
        <span className="redline-track mono whitespace-pre text-[11px] font-bold uppercase tracking-wider text-red-400">
          {texto}
        </span>
        <span
          aria-hidden
          className="redline-track mono whitespace-pre text-[11px] font-bold uppercase tracking-wider text-red-400"
        >
          {texto}
        </span>
      </div>
      <div className="redline-edge" />
      {pausado && (
        <span className="redline-pausa-indicador mono absolute right-2 top-1/2 -translate-y-1/2 rounded border border-red-900/60 bg-black/90 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-red-400">
          pausado
        </span>
      )}
    </div>
  );
}
