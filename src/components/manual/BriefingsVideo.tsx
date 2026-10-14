/**
 * Briefings em vídeo — vitrine dos três perfis da equipe.
 *
 * Regras profissionais embutidas:
 *  - Nada carrega sem toque (preload="none" + poster): quem só passa olhos
 *    pelo Manual não gasta um byte de vídeo;
 *  - ÁUDIO ORIGINAL: o toque do operador é o gesto que autoriza o som —
 *    nenhuma dublagem, nenhuma faixa artificial;
 *  - Legenda pt-BR desenhada por código (legendaAtual) — sincronizada com
 *    o relógio do próprio vídeo, com estilo tático consistente;
 *  - Fim do vídeo volta ao poster (replay a um toque);
 *  - Vídeo ausente/sem codec nunca quebra a página: volta ao poster.
 */
import { useCallback, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { BRIEFINGS, legendaAtual, type Briefing } from "@/lib/briefings";

type EstadoReproducao = "parado" | "tocando" | "pausado";

export function BriefingsVideo() {
  const { t } = useI18n();
  return (
    <section className="mb-8" data-test="briefings-video">
      <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
        {t("BRIEFINGS EM VÍDEO")}
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        {t("Áudio original com legenda em português — toque para assistir.")}
      </p>
      <ul className="flex gap-3 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-3 md:overflow-visible">
        {BRIEFINGS.map((b) => (
          <CartaoBriefing key={b.id} briefing={b} />
        ))}
      </ul>
    </section>
  );
}

function CartaoBriefing({ briefing }: { briefing: Briefing }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<EstadoReproducao>("parado");
  const [legenda, setLegenda] = useState<string | null>(null);

  const alternar = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // Gesto do operador: autoriza o áudio original do vídeo.
      v.play().catch(() => setEstado("parado"));
    } else {
      v.pause();
    }
  }, []);

  const aoTempo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setLegenda(legendaAtual(briefing.falas, v.currentTime));
  }, [briefing.falas]);

  const aoFim = useCallback(() => {
    const v = videoRef.current;
    if (v) v.currentTime = 0;
    setLegenda(null);
    setEstado("parado");
  }, []);

  return (
    <li className="snap-start shrink-0 w-[62vw] max-w-[240px] md:w-auto md:max-w-none">
      <div className="relative overflow-hidden rounded-md border border-border bg-black aspect-[9/16]">
        <video
          ref={videoRef}
          data-test={`briefing-${briefing.id}`}
          poster={briefing.poster}
          preload="none"
          playsInline
          disablePictureInPicture
          onClick={alternar}
          onPlay={() => setEstado("tocando")}
          onPause={() => setEstado((atual) => (atual === "tocando" ? "pausado" : atual))}
          onEnded={aoFim}
          onTimeUpdate={aoTempo}
          onError={() => {
            setLegenda(null);
            setEstado("parado");
          }}
          className="h-full w-full object-cover"
        >
          <source src={briefing.url} type="video/mp4" />
        </video>

        {estado !== "tocando" && (
          <button
            type="button"
            onClick={alternar}
            data-test={`briefing-${briefing.id}-tocar`}
            aria-label={t("Reproduzir briefing")}
            className="glove-tap absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/10"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/50 bg-black/55 backdrop-blur-sm">
              <Play className="h-6 w-6 translate-x-[1px] text-white" aria-hidden />
            </span>
          </button>
        )}

        {estado === "tocando" && legenda && (
          <div
            data-test="briefing-legenda"
            className="pointer-events-none absolute inset-x-2 bottom-2 rounded bg-black/75 px-2 py-1.5 text-center text-[13px] leading-snug text-white"
          >
            {t(legenda)}
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="break-words font-semibold text-sm">{t(briefing.titulo)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{t(briefing.descricao)}</div>
      </div>
    </li>
  );
}
