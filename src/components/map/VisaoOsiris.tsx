/**
 * Visão Osiris — globo 3D de inteligência global em tela cheia.
 *
 * Mesma apresentação da "visao-osiris" do Centro de Sobrevivência: o globo do
 * OSIRIS self-hosted (osiris-fork.vercel.app) roda em um iframe em tela cheia
 * e o painel lateral "Camadas" monta a query ?layers=... — o iframe recarrega
 * automaticamente a cada mudança de camada. No celular o painel vira uma
 * folha acionada pelo botão da barra superior.
 *
 * Se a instância do globo bloquear a incorporação (CSP frame-ancestors), um
 * aviso explica o ajuste necessário e o mapa tático nativo segue visível
 * atrás do aviso com as camadas de inteligência do app.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Globe, Info, Layers, MonitorX, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CAMADAS_OSIRIS,
  urlGloboOsiris,
  type VisOsiris,
} from "@/components/map/visao-osiris-camadas";

export interface VisaoOsirisProps {
  vis: VisOsiris;
  onToggle: (id: keyof VisOsiris, v: boolean) => void;
  onSetTodas: (v: boolean) => void;
  onVoltar: () => void;
}

type EstadoGlobo = "carregando" | "ok" | "bloqueado";

/** Domínio deste app — precisa estar autorizado no frame-ancestors do globo. */
const ORIGEM_APP =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://manual-do-sobrevivente.vercel.app";

export function VisaoOsiris({ vis, onToggle, onSetTodas, onVoltar }: VisaoOsirisProps) {
  const [camadasAbertas, setCamadasAbertas] = useState(false);
  const [estadoGlobo, setEstadoGlobo] = useState<EstadoGlobo>("carregando");
  const [tentativa, setTentativa] = useState(0);

  const url = useMemo(() => urlGloboOsiris(vis), [vis]);
  const ativas = CAMADAS_OSIRIS.filter((c) => vis[c.id]).length;

  // Esc fecha a gaveta de camadas do celular.
  useEffect(() => {
    if (!camadasAbertas) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCamadasAbertas(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [camadasAbertas]);

  // Detecção de bloqueio por CSP (frame-ancestors): quando o navegador impede
  // a incorporação, o iframe nunca dispara o evento load. Um tempo generoso
  // cobre o arranque a frio da instância na Vercel.
  useEffect(() => {
    setEstadoGlobo("carregando");
    const t = window.setTimeout(
      () => setEstadoGlobo((s) => (s === "carregando" ? "bloqueado" : s)),
      9_000,
    );
    return () => window.clearTimeout(t);
  }, [url, tentativa]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Barra superior */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/95 backdrop-blur z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar para o mapa tático"
            title="Voltar para o mapa tático"
            className="h-9 w-9 shrink-0"
            onClick={onVoltar}
            data-test="osiris-voltar"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-[18px] w-[18px] text-tactical-orange shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-wider text-foreground truncate">
                VISÃO OSIRIS
              </h1>
              <p className="text-[10px] text-muted-foreground truncate" data-test="osiris-contagem">
                {ativas} camadas ativas
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            className="px-3 sm:hidden gap-2 h-9"
            aria-label="Abrir camadas"
            onClick={() => setCamadasAbertas(true)}
            data-test="osiris-btn-camadas"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="text-xs">{ativas}</span>
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="hidden sm:block">
            <Button variant="outline" className="px-3 gap-2 h-9">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir original
            </Button>
          </a>
        </div>
      </header>

      {/* Globo + painel de camadas */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative bg-background min-w-0" data-test="osiris-globo">
          <iframe
            key={`${url}-${tentativa}`}
            src={url}
            title="Globo OSIRIS — Manual do Sobrevivente"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setEstadoGlobo("ok")}
            data-test="osiris-iframe"
          />

          {estadoGlobo === "carregando" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="hud-panel rounded-md px-4 py-2 mono text-xs text-muted-foreground flex items-center gap-2 shadow-lg">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Carregando globo de inteligência…
              </div>
            </div>
          )}

          {estadoGlobo === "bloqueado" && (
            <div className="absolute inset-0 z-10 flex items-start sm:items-center justify-center overflow-y-auto p-3 pt-8 pointer-events-none">
              <div
                className="pointer-events-auto hud-panel w-full max-w-md rounded-lg p-5 space-y-3 shadow-xl"
                data-test="osiris-bloqueado"
              >
                <div className="flex items-center gap-2 mono text-tactical-orange text-sm font-bold uppercase tracking-wider">
                  <MonitorX className="h-4 w-4" /> Incorporação bloqueada
                </div>
                <p className="text-sm leading-relaxed">
                  A instância <span className="mono">osiris-fork.vercel.app</span> ainda não permite
                  ser exibida dentro deste app (proteção CSP frame-ancestors).
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No fork do OSIRIS, adicione o domínio abaixo à lista{" "}
                  <span className="mono">frame-ancestors</span> da CSP e recarregue. Enquanto isso,
                  o mapa tático nativo segue disponível com as camadas de inteligência do app.
                </p>
                <code className="block rounded bg-background border border-border px-3 py-2 mono text-xs text-tactical-orange break-all">
                  {ORIGEM_APP}
                </code>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2 h-9">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir original
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="gap-2 h-9"
                    onClick={() => setTentativa((n) => n + 1)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Painel de camadas (desktop) */}
        <aside className="hidden sm:block w-72 shrink-0 border-l border-border bg-card/80 backdrop-blur overflow-y-auto">
          <PainelCamadas vis={vis} onToggle={onToggle} onSetTodas={onSetTodas} />
        </aside>
      </div>

      {/* Gaveta de camadas (celular) — dentro da própria visão para ficar
          acima do globo (um Sheet em portal ficaria por baixo do z-[60]). */}
      {camadasAbertas && (
        <div
          className="absolute inset-0 z-[70] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Camadas da Visão Osiris"
          data-test="osiris-gaveta-camadas"
        >
          <button
            type="button"
            aria-label="Fechar camadas"
            className="absolute inset-0 cursor-default bg-black/60"
            onClick={() => setCamadasAbertas(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[82%] flex-col rounded-t-xl border-t border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="mono text-sm font-bold text-tactical-orange">
                CAMADAS DA VISÃO OSIRIS
              </span>
              <button
                type="button"
                aria-label="Fechar"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setCamadasAbertas(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto">
              <PainelCamadas vis={vis} onToggle={onToggle} onSetTodas={onSetTodas} compacto />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Painel "Camadas" — igual no aside do desktop e na folha do celular. */
function PainelCamadas({
  vis,
  onToggle,
  onSetTodas,
  compacto = false,
}: {
  vis: VisOsiris;
  onToggle: (id: keyof VisOsiris, v: boolean) => void;
  onSetTodas: (v: boolean) => void;
  compacto?: boolean;
}) {
  return (
    <div className={compacto ? "px-4 pb-4" : "p-4"} data-test="osiris-camadas">
      <h2 className="mono text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Info className="h-3 w-3" /> Camadas
      </h2>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Selecione as camadas para exibir no globo 3D. O iframe recarrega automaticamente ao mudar.
      </p>
      <div className="space-y-1.5">
        {CAMADAS_OSIRIS.map((c) => {
          const ativa = vis[c.id];
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                // Clicou no interruptor? Ele já trata a própria mudança.
                if ((e.target as HTMLElement).closest('[role="switch"]')) return;
                onToggle(c.id, !ativa);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(c.id, !ativa);
                }
              }}
              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                ativa
                  ? "border-tactical-orange/70 bg-tactical-orange/10"
                  : "border-border hover:bg-muted"
              }`}
              data-test={`osiris-camada-${c.id}`}
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-base">{c.emoji}</span>
                {c.nome}
              </span>
              <Switch
                checked={ativa}
                aria-label={`Ativar camada ${c.nome}`}
                onCheckedChange={(v) => onToggle(c.id, v)}
                className="h-6 w-11 data-[state=checked]:bg-tactical-orange [&>span]:h-5 [&>span]:w-5 data-[state=checked]:[&>span]:translate-x-5"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <Button variant="outline" className="w-full h-9" onClick={() => onSetTodas(true)}>
          Ativar todas
        </Button>
        <Button variant="outline" className="w-full h-9" onClick={() => onSetTodas(false)}>
          Desativar todas
        </Button>
      </div>
      <p className="mt-4 text-[10px] text-muted-foreground/70 leading-relaxed">
        Os dados são fornecidos em tempo real pelo OSIRIS self-hosted, integrado ao Manual do
        Sobrevivente. Fontes: USGS, NASA FIRMS, N2YO, OpenSky, NOAA, LiveUAMap, emissoras públicas
        24/7 e mais.
      </p>
    </div>
  );
}
