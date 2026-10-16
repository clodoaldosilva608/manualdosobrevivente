/**
 * Infraestrutura PWA: registro do service worker e instalação do aplicativo.
 *
 * O service worker (public/sw.js) só é registrado em build de produção para
 * não interferir no HMR do desenvolvimento.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

let atualizacaoPedida = false;
let recarregou = false;
let swEsperando: ServiceWorker | null = null;
const assinantesVersao = new Set<() => void>();

/**
 * Recuperação de chunks órfãos: quando um Service Worker novo assume e apaga
 * os caches da versão anterior, a página que ainda roda o código antigo pode
 * pedir um chunk lazy (rota, diálogo) que saiu do cache e do servidor — o
 * import dinâmico falha e a tela fica vazia ("não está renderizando"). A
 * recarga única e guardada traz a página para a versão nova de forma limpa.
 * A guarda em sessionStorage impede laço de recarga se o servidor continuar
 * 404; a permissão volta 15 s depois de um boot saudável.
 */
const CHAVE_RECUPERACAO_CHUNK = "tg-recuperacao-chunk";
let recuperouChunk = false;

function recuperarDeChunkOrfao() {
  if (recuperouChunk) return;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(CHAVE_RECUPERACAO_CHUNK)) {
    return;
  }
  recuperouChunk = true;
  try {
    sessionStorage.setItem(CHAVE_RECUPERACAO_CHUNK, "1");
  } catch {
    /* sessionStorage indisponível (modo privado estrito): recarrega do mesmo jeito */
  }
  window.location.reload();
}

function instalarRedeDeRecuperacao() {
  // Vite emite este evento quando o preload de um chunk dinâmico falha.
  window.addEventListener("vite:preloadError", recuperarDeChunkOrfao);
  // Import dinâmico sem preload também rejeita como Promise não tratada.
  window.addEventListener("unhandledrejection", (e) => {
    const motivo = (e as PromiseRejectionEvent).reason as { message?: string } | undefined;
    const mensagem = String(motivo?.message ?? "");
    if (/dynamically imported module|error loading dynamically imported/i.test(mensagem)) {
      recuperarDeChunkOrfao();
    }
  });
  // Boot saudável por 15 s devolve o direito de recuperação (uma por período
  // de estabilidade — sem laço se o app sobe e falha sempre no mesmo ponto).
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CHAVE_RECUPERACAO_CHUNK);
    } catch {
      /* ignora */
    }
    recuperouChunk = false;
  }, 15_000);
}

function notificarVersao() {
  for (const fn of assinantesVersao) fn();
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  // Marco capturado ANTES de qualquer tomada de controle (preenchido em
  // registrar()): se esta página já era controlada por um worker e depois um
  // NOVO assumir (o sw.js faz skipWaiting no install), a página velha está
  // rodando com os caches da versão anterior recém-apagados — recarrega para
  // entrar na versão nova em vez de vagar com chunks órfãos.
  let paginaJaControlada = false;
  // Se a hidratação terminar depois do evento "load" (rede lenta, PWA já
  // instalado, abertura em vídeo), um listener de load jamais dispararia e o
  // worker nunca seria registrado — por isso registra imediatamente quando a
  // página já carregou.
  const registrar = () => {
    paginaJaControlada = !!navigator.serviceWorker.controller;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registro) => {
        // Trabalhador já em espera: existe uma versão nova pronta para assumir.
        if (registro.waiting && navigator.serviceWorker.controller) {
          swEsperando = registro.waiting;
          notificarVersao();
        }
        registro.addEventListener("updatefound", () => {
          const novo = registro.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            if (novo.state === "installed" && navigator.serviceWorker.controller) {
              swEsperando = novo;
              notificarVersao();
            }
          });
        });
      })
      .catch(() => {
        /* instalação offline degradada — o app continua funcionando */
      });
  };

  if (document.readyState === "complete") {
    registrar();
  } else {
    window.addEventListener("load", registrar, { once: true });
  }
  // Depois que um novo trabalhador assumir o controle desta página:
  //  • tomada pedida pelo botão Atualizar → recarrega;
  //  • tomada AUTOMÁTICA (skipWaiting do install) → também recarrega, pois a
  //    página velha fica com caches apagados e chunks órfãos. Só páginas que
  // já tinham controlador recarregam — a primeira instalação não precisa.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recarregou) return;
    if (!paginaJaControlada && !atualizacaoPedida) return;
    recarregou = true;
    window.location.reload();
  });
  // Rede de segurança extra: chunk lazy que sumiu do cache/servidor depois de
  // uma atualização silenciosa — recupera sem depender do controllerchange.
  instalarRedeDeRecuperacao();
}

/** Estado da atualização do app: versão nova esperando + botão de aplicar. */
export function useNovaVersao(): { disponivel: boolean; atualizar: () => void } {
  const inscricao = useCallback((onChange: () => void) => {
    assinantesVersao.add(onChange);
    return () => assinantesVersao.delete(onChange);
  }, []);
  const disponivel = useSyncExternalStore(
    inscricao,
    () => swEsperando !== null,
    () => false,
  );
  const atualizar = useCallback(() => {
    if (!swEsperando) return;
    atualizacaoPedida = true;
    swEsperando.postMessage("skip-waiting");
  }, []);
  return { disponivel, atualizar };
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
