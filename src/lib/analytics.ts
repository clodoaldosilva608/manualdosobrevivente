/**
 * Análise de uso — Fase 0 do plano do Hub (relatório "Hub de Sobrevivência").
 *
 * Nada é enviado sem configuração: o carregador só entra em ação quando o
 * deploy define VITE_GA4_ID (Google Analytics 4) ou VITE_PLAUSIBLE_DOMAIN
 * (Plausible). Sem nenhuma das duas, o app não emite UMA requisição de
 * telemetria — privacidade primeiro, no espírito do modo offline.
 *
 * Regras de projeto:
 * - Inicia uma única vez por sessão, só no navegador e só em produção.
 * - Nunca envia com o aparelho offline (evento descartado, sem fila).
 * - Sem identificadores próprios: as plataformas fazem a agregação.
 * - O banner de consentimento (LGPD) entra na Fase 2, junto com a loja.
 */

const ID_GA4 = import.meta.env["VITE_GA4_ID"] as string | undefined;
const DOMINIO_PLAUSIBLE = import.meta.env["VITE_PLAUSIBLE_DOMAIN"] as string | undefined;

/** Configuração já aplicada (evita script duplicado em remontagens). */
let iniciado = false;

function emProducao(): boolean {
  return import.meta.env.PROD;
}

function online(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

/** Injeta o gtag do GA4 uma única vez e marca a página inicial. */
function iniciarGA4(): void {
  if (!ID_GA4 || typeof document === "undefined") return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID_GA4}`;
  document.head.appendChild(script);

  const janela = window as typeof window & {
    dataLayer?: unknown[];
    gtag?: (...a: unknown[]) => void;
  };
  janela.dataLayer = janela.dataLayer ?? [];
  janela.gtag = function gtag(...args: unknown[]) {
    janela.dataLayer?.push(args);
  };
  janela.gtag("js", new Date());
  // anonymize_ip reduz o dado coletado ao mínimo exigido pelo relatório.
  janela.gtag("config", ID_GA4, { anonymize_ip: true });
}

/** Injeta o script do Plausible (alternativa leve, sem cookies). */
function iniciarPlausible(): void {
  if (!DOMINIO_PLAUSIBLE || typeof document === "undefined") return;
  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.dataset.domain = DOMINIO_PLAUSIBLE;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}

/**
 * Ativa a telemetria configurada. Chamado uma vez pela raiz do app;
 * sem env definida é um no-op absoluto (nem script é criado).
 */
export function iniciarAnalytics(): void {
  if (iniciado || !emProducao() || typeof window === "undefined") return;
  if (!ID_GA4 && !DOMINIO_PLAUSIBLE) return;
  iniciado = true;
  try {
    iniciarGA4();
    iniciarPlausible();
  } catch {
    /* telemetria jamais pode quebrar o app */
  }
}

/**
 * Registra uma visualização de página na troca de rota. Plausible mede
 * pageviews automaticamente (SPA mode precisa do hash manual, mas as rotas
 * do Manual são paths reais, cobertos pelo script padrão); o GA4 precisa
 * do evento page_view explícito.
 */
export function registrarPageview(caminho: string): void {
  if (!iniciado || !online()) return;
  try {
    const janela = window as typeof window & { gtag?: (...a: unknown[]) => void };
    janela.gtag?.("event", "page_view", { page_path: caminho });
  } catch {
    /* silencioso por definição */
  }
}

/**
 * Evento genérico de conversão/funil (ex.: deep link para o Centro).
 * Só o GA4 recebe eventos nomeados; Plausible fica nos pageviews.
 */
export function registrarEvento(nome: string, parametros?: Record<string, unknown>): void {
  if (!iniciado || !online()) return;
  try {
    const janela = window as typeof window & { gtag?: (...a: unknown[]) => void };
    janela.gtag?.("event", nome, parametros);
  } catch {
    /* silencioso por definição */
  }
}
