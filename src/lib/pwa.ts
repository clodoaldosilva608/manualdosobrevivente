/**
 * Infraestrutura PWA: registro do service worker e instalação do aplicativo.
 *
 * O service worker (public/sw.js) só é registrado em build de produção para
 * não interferir no HMR do desenvolvimento.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* instalação offline degradada — o app continua funcionando */
    });
  });
}

/* ------------------------------------------------------------------ */
/* Instalação (beforeinstallprompt)                                    */
/* ------------------------------------------------------------------ */

interface PromptInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let eventoInstalacao: PromptInstalacao | null = null;
const assinantes = new Set<() => void>();
let standalone = false;
let verificado = false;

function notificar() {
  for (const fn of assinantes) fn();
}

function classificarPlataforma(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document)) {
    return "ios";
  }
  return /Android/.test(ua) ? "android" : "desktop";
}

function iniciarEscutaInstalacao() {
  if (typeof window === "undefined" || verificado) return;
  verificado = true;

  const media = window.matchMedia("(display-mode: standalone)");
  const iOSStandalone = () =>
    classificarPlataforma() === "ios" &&
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  standalone = media.matches || iOSStandalone();

  media.addEventListener?.("change", () => {
    standalone = media.matches || iOSStandalone();
    notificar();
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoInstalacao = e as PromptInstalacao;
    notificar();
  });

  window.addEventListener("appinstalled", () => {
    eventoInstalacao = null;
    standalone = true;
    notificar();
  });
}

export interface EstadoInstalacao {
  /** O navegador oferece o prompt nativo de instalação (Chromium/Android/desktop). */
  podeInstalar: boolean;
  /** O app já está rodando instalado (standalone). */
  instalado: boolean;
  plataforma: "ios" | "android" | "desktop";
  /** Dispara o prompt nativo. Retorna "accepted" | "dismissed" | null. */
  instalar: () => Promise<"accepted" | "dismissed" | null>;
}

export function usePwaInstall(): EstadoInstalacao {
  const inscricao = useCallback((onChange: () => void) => {
    assinantes.add(onChange);
    return () => assinantes.delete(onChange);
  }, []);
  const podeInstalar = useSyncExternalStore(
    inscricao,
    () => eventoInstalacao !== null,
    () => false,
  );
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    iniciarEscutaInstalacao();
    setInstalado(standalone);
    const onChange = () => setInstalado(standalone);
    assinantes.add(onChange);
    return () => {
      assinantes.delete(onChange);
    };
  }, []);

  const instalar = useCallback(async (): Promise<"accepted" | "dismissed" | null> => {
    if (!eventoInstalacao) return null;
    const evento = eventoInstalacao;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") {
      eventoInstalacao = null;
      notificar();
    }
    return outcome;
  }, []);

  return { podeInstalar, instalado, plataforma: classificarPlataforma(), instalar };
}
