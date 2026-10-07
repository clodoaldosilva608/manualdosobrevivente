/**
 * Guia de Rota — HUD de navegação e painel de gestão de rota/trilha.
 *
 * BannerNavegacao: faixa superior com o próximo ponto, distância, rumo e
 * correção (seta esquerda/direita) + estado FORA DA ROTA. Presentacional —
 * todo o cálculo vive em src/lib/rota.ts e o estado no MapShell.
 */
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Crosshair,
  Download,
  Flag,
  Footprints,
  ListPlus,
  MapPin,
  Navigation2,
  Play,
  Plus,
  Route as RouteIcon,
  Square,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LocalWaypoint } from "@/lib/db";
import {
  DESVIO_TOLERADO_M,
  RAIO_CHEGADA_M,
  comprimentoTrilhaM,
  etaTexto,
  type RotaSalva,
  type StatusNavegacao,
  type TrilhaSalva,
} from "@/lib/rota";
import { formatMeters } from "@/lib/geo";
import { formatDecimalDegrees, formatInteger } from "@/lib/format";

// ---------------------------------------------------------------------------
// Banner de navegação (HUD superior)
// ---------------------------------------------------------------------------

export interface BannerNavegacaoProps {
  alvoNome: string;
  progressoAtual: number;
  progressoTotal: number;
  status: StatusNavegacao | null;
  velocidadeMS: number | null;
  onCentralizar: () => void;
  onParar: () => void;
}

/** Setas de correção: ‹ esquerda · ˆ ok · › direita. */
function SetaCorrecao({ correcao }: { correcao: StatusNavegacao["correcao"] }) {
  if (correcao === "esquerda")
    return <ArrowLeft className="h-5 w-5 shrink-0 text-tactical-amber" aria-hidden />;
  if (correcao === "direita")
    return <ArrowRight className="h-5 w-5 shrink-0 text-tactical-amber" aria-hidden />;
  return <ArrowUp className="h-5 w-5 shrink-0 text-tactical-green" aria-hidden />;
}

export function BannerNavegacao({
  alvoNome,
  progressoAtual,
  progressoTotal,
  status,
  velocidadeMS,
  onCentralizar,
  onParar,
}: BannerNavegacaoProps) {
  const eta = status ? etaTexto(status.distanciaM, velocidadeMS) : null;
  return (
    <div
      data-test="banner-navegacao"
      className={`hud-panel rounded-md p-3 shadow-lg ${status?.foraDaRota ? "border-tactical-red" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="mono truncate text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
          NAVEGAÇÃO · {progressoAtual + 1}/{progressoTotal}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Centralizar no mapa"
            title="Centralizar no mapa"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-white/10"
            onClick={onCentralizar}
          >
            <Crosshair className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Parar navegação"
            title="Parar navegação"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-white/10"
            onClick={onParar}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {status ? (
        <>
          <div className="mt-1 flex items-center gap-3">
            <SetaCorrecao correcao={status.correcao} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{alvoNome}</div>
              <div className="mono flex flex-wrap items-baseline gap-x-3 text-[11px] text-muted-foreground">
                <span className="text-base font-bold text-foreground">
                  {formatMeters(status.distanciaM)}
                </span>
                <span>RUMO {Math.round(status.rumoAlvo)}°</span>
                {eta && <span>ETA {eta}</span>}
              </div>
            </div>
          </div>
          {status.foraDaRota ? (
            <div className="mono mt-2 flex items-center gap-1.5 rounded border border-tactical-red/60 bg-tactical-red/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-tactical-red">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Fora da rota · desvio {formatMeters(status.desvioM)} — siga o rumo{" "}
              {Math.round(status.rumoDeVolta ?? status.rumoAlvo)}°
            </div>
          ) : (
            <div className="mono mt-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
              {status.chegou
                ? "Dentro do raio de chegada — avançando ao próximo ponto"
                : `No eixo da rota · tolerância ${formatMeters(DESVIO_TOLERADO_M)}`}
            </div>
          )}
        </>
      ) : (
        <div className="mt-1 text-xs text-muted-foreground">
          Aguardando o sinal de GPS para calcular a navegação…
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de gestão (folha "ROTAS")
// ---------------------------------------------------------------------------

export interface PainelRotaProps {
  rota: RotaSalva | null;
  navegando: boolean;
  gravando: boolean;
  trilha: TrilhaSalva | null;
  waypoints: LocalWaypoint[];
  temPosicao: boolean;
  onAdicionarPosicao: () => void;
  onAdicionarWaypoint: (id: string) => void;
  onRemoverPonto: (indice: number) => void;
  onMoverPonto: (indice: number, direcao: -1 | 1) => void;
  onRenomearRota: (nome: string) => void;
  onIniciar: () => void;
  onParar: () => void;
  onAlternarGravacao: () => void;
  onVoltarInicio: () => void;
  onExportarRota: () => void;
  onExportarTrilha: () => void;
  onApagarTrilha: () => void;
}

/** Linha de um ponto da rota com ações de ordem/remoção. */
function LinhaPonto({
  ponto,
  indice,
  total,
  onRemover,
  onMover,
}: {
  ponto: RotaSalva["pontos"][number];
  indice: number;
  total: number;
  onRemover: (i: number) => void;
  onMover: (i: number, d: -1 | 1) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded border border-border bg-background/40 px-2 py-1.5">
      <span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-tactical-orange/60 text-[10px] font-bold text-tactical-orange">
        {indice + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{ponto.nome}</div>
        <div className="mono text-[9px] text-muted-foreground">
          {formatDecimalDegrees(ponto.lat)}, {formatDecimalDegrees(ponto.lng)}
        </div>
      </div>
      <button
        type="button"
        aria-label="Mover ponto para cima"
        disabled={indice === 0}
        className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-white/10 disabled:opacity-30"
        onClick={() => onMover(indice, -1)}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Mover ponto para baixo"
        disabled={indice === total - 1}
        className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-white/10 disabled:opacity-30"
        onClick={() => onMover(indice, 1)}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Remover ponto ${ponto.nome}`}
        className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-tactical-red/20 hover:text-tactical-red"
        onClick={() => onRemover(indice)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export function PainelRota({
  rota,
  navegando,
  gravando,
  trilha,
  waypoints,
  temPosicao,
  onAdicionarPosicao,
  onAdicionarWaypoint,
  onRemoverPonto,
  onMoverPonto,
  onRenomearRota,
  onIniciar,
  onParar,
  onAlternarGravacao,
  onVoltarInicio,
  onExportarRota,
  onExportarTrilha,
  onApagarTrilha,
}: PainelRotaProps) {
  const percorrido = trilha ? comprimentoTrilhaM(trilha.pontos) : 0;
  return (
    <div className="space-y-5">
      {/* ── Rota ── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <RouteIcon className="h-4 w-4 text-tactical-orange" />
          <span className="mono text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
            Rota por waypoints
          </span>
        </div>

        {!rota ? (
          <p className="text-xs text-muted-foreground">
            Crie uma sequência de pontos para seguir em campo: o guia mostra distância, rumo e avisa
            se você sair do eixo. Comece adicionando sua posição atual ou um waypoint salvo.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="rota-nome">
                Nome da rota
              </Label>
              <Input
                id="rota-nome"
                value={rota.nome}
                onChange={(e) => onRenomearRota(e.target.value)}
                placeholder="Ex: Trilha da cachoeira"
              />
            </div>
            <ol className="space-y-1.5" data-test="rota-pontos">
              {rota.pontos.map((p, i) => (
                <LinhaPonto
                  key={`${p.lat},${p.lng},${i}`}
                  ponto={p}
                  indice={i}
                  total={rota.pontos.length}
                  onRemover={onRemoverPonto}
                  onMover={onMoverPonto}
                />
              ))}
            </ol>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            data-test="rota-add-posicao"
            disabled={!temPosicao}
            onClick={onAdicionarPosicao}
          >
            <Plus className="h-3.5 w-3.5" /> Posição atual
          </Button>
          {rota && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExportarRota}
              disabled={!rota.pontos.length}
            >
              <Download className="h-3.5 w-3.5" /> Exportar GPX
            </Button>
          )}
        </div>

        {waypoints.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="text-xs" htmlFor="rota-waypoint">
                Waypoints salvos
              </Label>
              <select
                id="rota-waypoint"
                data-test="rota-select-waypoint"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                defaultValue=""
              >
                <option value="" disabled>
                  Escolher para adicionar…
                </option>
                {waypoints.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const sel = document.getElementById("rota-waypoint") as HTMLSelectElement | null;
                if (sel?.value) onAdicionarWaypoint(sel.value);
              }}
            >
              <ListPlus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        )}
      </section>

      {/* ── Navegação ── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Navigation2 className="h-4 w-4 text-tactical-orange" />
          <span className="mono text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
            Navegação guiada
          </span>
        </div>
        {!navegando ? (
          <Button
            className="w-full glove-tap"
            data-test="rota-iniciar"
            disabled={!rota || rota.pontos.length === 0}
            onClick={onIniciar}
          >
            <Play className="h-4 w-4" /> Iniciar navegação
          </Button>
        ) : (
          <>
            <Button className="w-full glove-tap" variant="destructive" onClick={onParar}>
              <Square className="h-4 w-4" /> Parar navegação
            </Button>
            <p className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Raio de chegada {formatMeters(RAIO_CHEGADA_M)} — avança sozinho ao próximo ponto
            </p>
          </>
        )}
      </section>

      {/* ── Trilha gravada ── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Footprints className="h-4 w-4 text-tactical-orange" />
          <span className="mono text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
            Trilha gravada
          </span>
        </div>
        <Button
          size="sm"
          variant={gravando ? "destructive" : "outline"}
          className="w-full glove-tap"
          data-test="trilha-gravar"
          onClick={onAlternarGravacao}
        >
          {gravando ? (
            <>
              <Square className="h-3.5 w-3.5" /> Parar gravação
            </>
          ) : (
            <>
              <Footprints className="h-3.5 w-3.5" /> Gravar trilha (breadcrumbs)
            </>
          )}
        </Button>
        {gravando && (
          <p className="mono text-[9px] uppercase tracking-widest text-tactical-amber">
            Gravando — um ponto a cada 10 m; o app avisa se você andar em círculos
          </p>
        )}
        {trilha && trilha.pontos.length > 1 && (
          <>
            <div className="mono flex flex-wrap gap-x-4 gap-y-1 rounded border border-border bg-background/40 px-3 py-2 text-[10px] text-muted-foreground">
              <span>{formatInteger(trilha.pontos.length)} pontos</span>
              <span>Percorrido {formatMeters(percorrido)}</span>
              <span>
                Início {formatDecimalDegrees(trilha.pontos[0][1])},{" "}
                {formatDecimalDegrees(trilha.pontos[0][0])}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onVoltarInicio}
                data-test="trilha-voltar-inicio"
              >
                <Undo2 className="h-3.5 w-3.5" /> Voltar ao início
              </Button>
              <Button size="sm" variant="outline" onClick={onExportarTrilha}>
                <Download className="h-3.5 w-3.5" /> GPX da trilha
              </Button>
              <Button size="sm" variant="outline" onClick={onApagarTrilha}>
                <Trash2 className="h-3.5 w-3.5" /> Apagar
              </Button>
            </div>
          </>
        )}
      </section>

      <p className="mono flex items-start gap-1.5 text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        <Flag className="mt-0.5 h-3 w-3 shrink-0" />
        Tudo funciona offline. A rota e a trilha ficam guardadas no aparelho e voltam com você.
      </p>
    </div>
  );
}

/** Ícone de conclusão reutilizável em toasts do guia. */
export const IConcluido = CheckCircle2;
export const IMarcador = MapPin;
