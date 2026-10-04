/**
 * Controles do mapa dentro do cartão da bússola:
 * - "Rotação do mapa": o mapa gira junto com a bússola usando o sensor do
 *   aparelho (mesmo rumo compartilhado entre miniatura e bússola completa);
 * - "Posição": trava o centro do mapa nas coordenadas digitadas — enquanto
 *   travado, arrastar fica desativado e o mapa sempre volta ao ponto fixado.
 */
import { useState } from "react";
import { Crosshair, Lock, LockOpen, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useSensorBussola } from "@/lib/bussola-sensor";
import { formatDecimalDegrees, formatNumber } from "@/lib/format";

interface MapaControlesProps {
  className?: string;
  /** Rotação do mapa ativada. */
  rotaciona: boolean;
  /** Sensor do aparelho ativo (a rotação precisa dele). */
  sensorAtivo: boolean;
  /** Posição travada atual (nulo = livre). */
  travado: { lat: number; lng: number } | null;
  /** Centro atual do mapa [lng, lat] — serve de sugestão nos campos. */
  centroAtual: [number, number];
  onRotaciona: (v: boolean) => void;
  onTravar: (lat: number, lng: number) => void;
  onDestravar: () => void;
}

/** Aceita "−23.5505", "-23,5505" e "-23.5505" (vírgula e minus unicode). */
function parseGrau(texto: string): number | null {
  const t = texto
    .trim()
    .replace(",", ".")
    .replace(/\u2212/g, "-");
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

/**
 * Assina o sensor no componente folha (não no MapShell): o badge "ative o
 * sensor" atualiza sem fazer a tela toda re-renderizar a cada leitura.
 */
export function MapaControlesComSensor(props: Omit<MapaControlesProps, "sensorAtivo">) {
  const { sensorOn } = useSensorBussola();
  return <MapaControles {...props} sensorAtivo={sensorOn} />;
}

export default function MapaControles({
  className,
  rotaciona,
  sensorAtivo,
  travado,
  centroAtual,
  onRotaciona,
  onTravar,
  onDestravar,
}: MapaControlesProps) {
  const [latTexto, setLatTexto] = useState("");
  const [lngTexto, setLngTexto] = useState("");

  const travar = () => {
    const lat = parseGrau(latTexto) ?? centroAtual[1];
    const lng = parseGrau(lngTexto) ?? centroAtual[0];
    if (Math.abs(lat) > 90) {
      toast.error("Latitude inválida", {
        description: "Use um valor entre -90 e 90 (ex.: -23.5505).",
      });
      return;
    }
    if (Math.abs(lng) > 180) {
      toast.error("Longitude inválida", {
        description: "Use um valor entre -180 e 180 (ex.: -46.6333).",
      });
      return;
    }
    onTravar(lat, lng);
    setLatTexto("");
    setLngTexto("");
  };

  return (
    <div className={className} data-test="mapa-controles">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/90">
            <RotateCw className="h-3 w-3 text-tactical-orange" />
            Rotação do mapa
          </div>
          <div className="text-[10px] leading-snug text-muted-foreground">
            {sensorAtivo
              ? "o mapa gira junto com a bússola"
              : "ative o sensor do aparelho para girar o mapa"}
          </div>
        </div>
        <Switch
          checked={rotaciona}
          onCheckedChange={onRotaciona}
          aria-label="Rotação do mapa junto com a bússola"
          data-test="mapa-rotacao"
          className="shrink-0"
        />
      </div>

      <div className="my-2 h-px bg-white/5" />

      <div className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/90">
        <Crosshair className="h-3 w-3 text-tactical-orange" />
        Posição
        <span className="normal-case tracking-normal text-muted-foreground">
          — latitude e longitude digitadas
        </span>
      </div>

      {travado ? (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span
            data-test="mapa-travado-valores"
            className="mono flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-tactical-green"
          >
            <Lock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {formatDecimalDegrees(travado.lat)}, {formatDecimalDegrees(travado.lng)}
            </span>
          </span>
          <button
            type="button"
            data-test="mapa-destravar"
            onClick={onDestravar}
            className="glove-tap mono flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/10"
          >
            <LockOpen className="h-3.5 w-3.5" />
            Destravar
          </button>
        </div>
      ) : (
        <>
          <div className="mt-1.5 grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
            <input
              data-test="mapa-lat"
              inputMode="decimal"
              autoComplete="off"
              value={latTexto}
              onChange={(e) => setLatTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && travar()}
              placeholder={formatNumber(centroAtual[1], 5)}
              title="Latitude (enter para travar)"
              aria-label="Latitude para travar o mapa"
              className="h-10 w-full rounded-md border border-border bg-background/60 px-2 text-center font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-tactical-orange/60"
            />
            <input
              data-test="mapa-lng"
              inputMode="decimal"
              autoComplete="off"
              value={lngTexto}
              onChange={(e) => setLngTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && travar()}
              placeholder={formatNumber(centroAtual[0], 5)}
              title="Longitude (enter para travar)"
              aria-label="Longitude para travar o mapa"
              className="h-10 w-full rounded-md border border-border bg-background/60 px-2 text-center font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-tactical-orange/60"
            />
            <button
              type="button"
              data-test="mapa-centro"
              onClick={() => {
                setLatTexto(formatNumber(centroAtual[1], 5));
                setLngTexto(formatNumber(centroAtual[0], 5));
              }}
              title="Usar as coordenadas do centro atual"
              aria-label="Usar coordenadas do centro atual"
              className="flex h-10 items-center justify-center rounded-md border border-border px-2 text-muted-foreground transition-colors hover:bg-white/10"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            data-test="mapa-travar"
            onClick={travar}
            className="mono mt-1.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-tactical-orange/50 bg-tactical-orange/10 text-[10px] font-bold uppercase tracking-widest text-tactical-orange transition-colors hover:bg-tactical-orange/20"
          >
            <Lock className="h-3.5 w-3.5" />
            Travar posição
          </button>
        </>
      )}
    </div>
  );
}
