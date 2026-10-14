/**
 * Splash de abertura em vídeo — a primeira coisa que o operador vê ao
 * lançar o aplicativo, como num briefing de missão.
 *
 * Sequência em duas fases:
 *  1. "tocando" — o briefing tático atual (/abertura.mp4, a 0,6×);
 *  2. "marca"   — o vídeo de marca do Manual do Sobrevivente
 *                 (/abertura-marca.mp4), que fecha com "CARREGAMENTO
 *                 CONCLUÍDO 100%" — só entra quando a abertura termina
 *                 naturalmente; "Pular" dispensa as duas.
 *
 * Regras profissionais embutidas:
 *  - Autoplay mudo + playsinline (exigência de iOS/Android/Chrome);
 *  - Botão "Pular" sempre visível e toque em qualquer lugar dispensa;
 *  - Fim da sequência dispensa sozinho, com fade curto;
 *  - Se qualquer vídeo falhar ou travar, a abertura se auto-dissolve
 *    (nunca prende o operador fora do app);
 *  - prefers-reduced-motion e Save-Data pulam direto (ver lib/abertura.ts);
 *  - Toca uma vez por sessão de arranque (sessionStorage).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  ABERTURA_MARCA_MP4_URL,
  ABERTURA_MARCA_POSTER_URL,
  ABERTURA_MARCA_WEBM_URL,
  ABERTURA_POSTER_URL,
  ABERTURA_WEBM_URL,
  CHAVE_ABERTURA_URL,
  decidirAbertura,
  registrarAberturaVista,
  VELOCIDADE_ABERTURA,
} from "@/lib/abertura";

// Vídeo de 10 s a 0,6× ≈ 17 s reais; folga para redes lentas e arranque frio.
const DURACAO_SAUDE_MS = 26_000;
// Vídeo de marca: 10 s a 1× + folga para a carga sob rede fraca.
const DURACAO_MARCA_MS = 15_000;

export function SplashAbertura() {
  const { t } = useI18n();
  const [fase, setFase] = useState<"fechado" | "tocando" | "marca" | "saindo">("fechado");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Decisão só no cliente: SSR nunca marca a sessão, e quem já viu nesta
    // sessão (ou pediu menos movimento/economia de dados) entra direto.
    if (decidirAbertura(window)) setFase("tocando");
  }, []);

  const fechar = useCallback(() => {
    registrarAberturaVista();
    setFase("saindo");
    // Tempo do fade — remove depois da transição.
    window.setTimeout(() => setFase("fechado"), 450);
  }, []);

  // Failsafe por fase: vídeo ausente/travado nunca prende o operador.
  useEffect(() => {
    if (fase !== "tocando" && fase !== "marca") return;
    const limite = fase === "tocando" ? DURACAO_SAUDE_MS : DURACAO_MARCA_MS;
    const id = window.setTimeout(fechar, limite);
    return () => window.clearTimeout(id);
  }, [fase, fechar]);

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
      {fase === "tocando" && (
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
          // Fim natural do briefing encadeia o vídeo de marca. "Pular" e o
          // toque em qualquer lugar dispensam a sequência inteira.
          onEnded={() => setFase("marca")}
          onError={fechar}
          className="h-full w-full object-cover"
        >
          {/* Duas fontes: H.264 (celulares/Safari) e WebM (Chromium/Linux).
              Cada navegador baixa apenas a que sabe tocar. */}
          <source src={CHAVE_ABERTURA_URL} type="video/mp4" />
          <source src={ABERTURA_WEBM_URL} type="video/webm" />
        </video>
      )}

      {fase === "marca" && (
        <video
          ref={(v) => {
            if (v) v.muted = true;
            videoRef.current = v;
          }}
          data-test="splash-marca"
          poster={ABERTURA_MARCA_POSTER_URL}
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          // Fim da marca = "CARREGAMENTO CONCLUÍDO" → entra no app.
          onEnded={fechar}
          onError={fechar}
          className="h-full w-full object-cover"
        >
          <source src={ABERTURA_MARCA_MP4_URL} type="video/mp4" />
          <source src={ABERTURA_MARCA_WEBM_URL} type="video/webm" />
        </video>
      )}

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
    </div>
  );
}
