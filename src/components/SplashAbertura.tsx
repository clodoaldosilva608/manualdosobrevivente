/**
 * Splash de abertura em vídeo — a primeira coisa que o operador vê ao
 * lançar o aplicativo, como num briefing de missão.
 *
 * Regras profissionais embutidas:
 *  - Autoplay mudo + playsinline (exigência de iOS/Android/Chrome) —
 *    TODOS os navegadores bloqueiam vídeo com som sem gesto do usuário;
 *  - Botão de som dedicado: dá para ligar a trilha num toque (o gesto
 *    autoriza o áudio); quando o navegador permite, o som é religado
 *    sozinho logo após o play;
 *  - Botão "Pular" sempre visível e toque em qualquer lugar dispensa;
 *  - Fim do vídeo dispensa sozinho, com fade curto;
 *  - Se o vídeo falhar ou travar, a abertura se auto-dissolve (nunca
 *    prende o operador fora do app);
 *  - prefers-reduced-motion e Save-Data pulam direto (ver lib/abertura.ts);
 *  - Toca uma vez por sessão de arranque (sessionStorage).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  ABERTURA_POSTER_URL,
  ABERTURA_WEBM_URL,
  CHAVE_ABERTURA_URL,
  decidirAbertura,
  registrarAberturaVista,
  VELOCIDADE_ABERTURA,
} from "@/lib/abertura";

// Vídeo de 10 s a 0,6× ≈ 17 s reais; folga para redes lentas e arranque frio.
const DURACAO_SAUDE_MS = 26_000;

export function SplashAbertura() {
  const { t } = useI18n();
  const [fase, setFase] = useState<"fechado" | "tocando" | "saindo">("fechado");
  const [comSom, setComSom] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Decisão só no cliente: SSR nunca marca a sessão, e quem já viu nesta
    // sessão (ou pediu menos movimento/economia de dados) entra direto.
    if (decidirAbertura(window)) setFase("tocando");
  }, []);

  const fechar = useCallback(() => {
    registrarAberturaVista();
    try {
      videoRef.current?.pause();
    } catch {
      /* vídeo já encerrado */
    }
    setFase("saindo");
    // Tempo do fade — remove depois da transição.
    window.setTimeout(() => setFase("fechado"), 450);
  }, []);

  // Failsafe: vídeo ausente/travado nunca prende o operador.
  useEffect(() => {
    if (fase !== "tocando") return;
    const id = window.setTimeout(fechar, DURACAO_SAUDE_MS);
    return () => window.clearTimeout(id);
  }, [fase, fechar]);

  /** Play resolveu — tenta religar o som (nem todo navegador permite). */
  const aoComecar = () => {
    const v = videoRef.current;
    if (!v || v.muted === false) return;
    v.muted = false;
    v.volume = 0.8;
    v.play()
      .then(() => setComSom(true))
      .catch(() => {
        // Sem gesto, sem som: volta a mudo e mantém o botão de áudio.
        v.muted = true;
        setComSom(false);
      });
  };

  /** Botão de som: o toque do usuário autoriza o áudio no navegador. */
  const alternarSom = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) {
      v.muted = false;
      v.volume = 0.8;
      v.play().catch(() => setComSom(false));
      setComSom(true);
    } else {
      v.muted = true;
      setComSom(false);
    }
  };

  if (fase === "fechado") return null;

  return (
    <div
      data-test="splash-abertura"
      onClick={fechar}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-[400ms] ease-out ${
        fase === "saindo" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="button"
      aria-label={t("Pular abertura")}
    >
      <video
        ref={(v) => {
          // React não garante o atributo muted no HTML — a propriedade
          // precisa estar em `true` antes do autoplay (iOS exige).
          if (v) v.muted = true;
          // Briefing em câmera lenta: 0,6× dá tempo de ler os textos e
          // analisar as imagens (o botão Pular continua a um toque).
          if (v) v.playbackRate = VELOCIDADE_ABERTURA;
          videoRef.current = v;
        }}
        poster={ABERTURA_POSTER_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={fechar}
        onError={fechar}
        onPlaying={aoComecar}
        className="h-full w-full object-cover"
      >
        {/* Duas fontes: H.264 (celulares/Safari) e WebM (Chromium/Linux).
            Cada navegador baixa apenas a que sabe tocar. Agora COM trilha
            sonora (drone + vento + pings) embutida em ambos os arquivos. */}
        <source src={CHAVE_ABERTURA_URL} type="video/mp4" />
        <source src={ABERTURA_WEBM_URL} type="video/webm" />
      </video>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          fechar();
        }}
        data-test="splash-pular"
        className="glove-tap absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] mono rounded-md border border-white/25 bg-black/40 px-3 py-1.5 text-[11px] uppercase tracking-widest text-white/90 backdrop-blur-sm hover:border-tactical-orange/70 hover:text-tactical-orange"
      >
        {t("Pular")}
      </button>
      <button
        type="button"
        onClick={alternarSom}
        data-test="splash-som"
        aria-pressed={comSom}
        title={comSom ? t("Desativar som") : t("Ativar som da abertura")}
        className={`glove-tap absolute left-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 mono text-[11px] uppercase tracking-widest backdrop-blur-sm transition-colors ${
          comSom
            ? "border-tactical-orange/80 bg-tactical-orange/20 text-tactical-orange"
            : "border-white/25 bg-black/40 text-white/90 hover:border-tactical-orange/70 hover:text-tactical-orange"
        }`}
      >
        {comSom ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {comSom ? t("Som ligado") : t("Ativar som")}
      </button>
    </div>
  );
}
