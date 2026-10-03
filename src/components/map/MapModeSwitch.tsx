/**
 * Alternador de modo do mapa: "Tático" (navegação e sobrevivência) e
 * "Osiris" (inteligência global com camadas ao vivo). Compacto, pensado para
 * encaixar no fluxo vertical do HUD no celular e no topo central no desktop.
 */
import { Crosshair, Radar } from "lucide-react";

export type ModoMapa = "tatico" | "osiris";

export function MapModeSwitch({
  modo,
  onTrocar,
}: {
  modo: ModoMapa;
  onTrocar: (m: ModoMapa) => void;
}) {
  const botoes: Array<{ id: ModoMapa; rotulo: string; icone: typeof Crosshair }> = [
    { id: "tatico", rotulo: "Tático", icone: Crosshair },
    { id: "osiris", rotulo: "Osiris", icone: Radar },
  ];
  return (
    <div
      className="hud-panel inline-flex rounded-md gap-0.5 p-0.5"
      role="group"
      aria-label="Modo do mapa"
    >
      {botoes.map(({ id, rotulo, icone: Icone }) => (
        <button
          key={id}
          type="button"
          aria-pressed={modo === id}
          title={`Alternar para o modo ${rotulo}`}
          onClick={() => onTrocar(id)}
          className={`glove-tap flex items-center gap-1 rounded px-2 py-1 mono text-[10px] uppercase tracking-wider ${
            modo === id
              ? "bg-tactical-orange/15 text-tactical-orange border border-tactical-orange/60"
              : "text-foreground border border-transparent"
          }`}
        >
          <Icone className="h-3.5 w-3.5" />
          <span>{rotulo}</span>
        </button>
      ))}
    </div>
  );
}
