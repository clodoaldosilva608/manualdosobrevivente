/**
 * Faixa de status do modo Osiris: contadores por camada ativa, índice Kp
 * (clima espacial) e situação da atualização. Renderiza apenas chips das
 * camadas ligadas, para refletir exatamente o que está no mapa.
 */
import { formatInteger, formatNumber, formatTime } from "@/lib/format";
import { CONFLITOS } from "@/lib/intel-conflicts";
import type { IntelSnapshot, IntelVisibilidade } from "@/lib/intel.types";

export type StatusIntel = "idle" | "carregando" | "ok" | "erro";

export function IntelStatusStrip({
  snapshot,
  status,
  vis,
}: {
  snapshot: IntelSnapshot | null;
  status: StatusIntel;
  vis: IntelVisibilidade;
}) {
  const kp = snapshot?.climaEspacial ?? null;
  const corKp =
    kp?.nivel === "tempestade"
      ? "text-red-400"
      : kp?.nivel === "instavel"
        ? "text-amber-400"
        : "text-emerald-400";

  const situacao =
    status === "carregando"
      ? "atualizando…"
      : status === "erro"
        ? "sem conexão — últimos dados"
        : snapshot
          ? `atualizado ${formatTime(snapshot.atualizadoEm)}`
          : "aguardando…";

  return (
    <div
      data-test="faixa-intel"
      className="hud-panel rounded-md px-2 py-1.5 mono text-[10px] flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      <span className="font-bold tracking-widest text-tactical-orange">OSIRIS</span>
      {vis.sismos && (
        <span className="text-foreground">
          SISMOS{" "}
          <span className="text-yellow-300">{formatInteger(snapshot?.sismos.length ?? 0)}</span>
        </span>
      )}
      {vis.eventos && (
        <span className="text-foreground">
          EVENTOS{" "}
          <span className="text-amber-400">{formatInteger(snapshot?.eventos.length ?? 0)}</span>
        </span>
      )}
      {vis.conflitos && (
        <span className="text-foreground">
          CONFLITOS <span className="text-red-400">{formatInteger(CONFLITOS.length)}</span>
        </span>
      )}
      {vis.incendios && snapshot?.incendiosDisponivel && (
        <span className="text-foreground">
          FOCOS{" "}
          <span className="text-orange-400">{formatInteger(snapshot?.incendios.length ?? 0)}</span>
        </span>
      )}
      {kp && (
        <span className={corKp} title={kp.classificacao}>
          KP {formatNumber(kp.kp, 1)} ·{" "}
          {kp.nivel === "tempestade"
            ? "TEMPESTADE"
            : kp.nivel === "instavel"
              ? "INSTÁVEL"
              : "CALMO"}
        </span>
      )}
      <span className="ml-auto text-muted-foreground uppercase tracking-wider">{situacao}</span>
    </div>
  );
}
