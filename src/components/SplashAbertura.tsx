/**
 * Splash de abertura em vídeo — a primeira coisa que o operador vê ao
 * lançar o aplicativo, como num briefing de missão.
 *
 * Regras profissionais embutidas:
 *  - Autoplay mudo + playsinline (exigência de iOS/Android/Chrome);
 *  - Botão "Pular" sempre visível e toque em qualquer lugar dispensa;
 *  - Fim do vídeo dispensa sozinho, com fade curto;
 *  - Se o vídeo falhar ou travar, a abertura se auto-dissolve (nunca
 *    prende o operador fora do app);
 *  - prefers-reduced-motion e Save-Data pulam direto (ver lib/abertura.ts);
 *  - Toca uma vez por sessão de arranque (sessionStorage).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  ABERTURA_POSTER_URL,
  ABERTURA_WEBM_URL,
  CHAVE_ABERTURA_URL,
  decidirAbertura,
  registrarAberturaVista,
} from "@/lib/abertura";

const DURACAO_SAUDE_MS = 14_000; // vídeo tem 10s; folga para redes lentas

export function SplashAbertura() {
  const { t } = useI18n();
  const [fase, setFase] = useState<"fechado" | "tocando" | "saindo">("fechado");
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

  // Failsafe: vídeo ausente/travado nunca prende o operador.
  useEffect(() => {
    if (fase !== "tocando") return;
    const id = window.setTimeout(fechar, DURACAO_SAUDE_MS);
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
      <video
        ref={(v) => {
          // React não garante o atributo muted no HTML — a propriedade
          // precisa estar em `true` antes do autoplay (iOS exige).
          if (v) v.muted = true;
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
        className="h-full w-full object-cover"
      >
        {/* Duas fontes: H.264 (celulares/Safari) e WebM (Chromium/Linux).
            Cada navegador baixa apenas a que sabe tocar. */}
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
    </div>
  );
}
