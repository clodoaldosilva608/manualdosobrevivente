/**
 * Abertura cinematográfica do aplicativo.
 *
 * O vídeo toca uma vez por inicialização do app (cada arranjo a frio ou
 * nova sessão de navegação), sempre com botão de pulo. Regras de educação:
 * quem pediu menos movimento (prefers-reduced-motion) ou está com economia
 * de dados (Save-Data) entra direto no app sem vídeo. A marcação "já viu
 * nesta sessão" vive no sessionStorage — cada lançamento do PWA recomeça
 * a sessão e mostra a abertura de novo.
 */

/** Chave do sessionStorage que marca a abertura como já exibida na sessão. */
export const CHAVE_ABERTURA = "tgis:abertura";

/** Endereço do vídeo de abertura (public/, pré-cacheado no service worker). */
export const CHAVE_ABERTURA_URL = "/abertura.mp4";
/** Alternativa WebM para navegadores sem H.264 (Chromium puro, Linux). */
export const ABERTURA_WEBM_URL = "/abertura.webm";
/** Poster estático do primeiro frame — pinta antes do vídeo carregar. */
export const ABERTURA_POSTER_URL = "/abertura-poster.jpg";

/** Subconjunto do ambiente de que a decisão precisa (mockável nos testes). */
export interface AmbienteAbertura {
  sessionStorage?: { getItem(k: string): string | null };
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: { connection?: { saveData?: boolean } | undefined; webdriver?: boolean };
  /** Escotilha para testes E2E: força a abertura mesmo sob automação. */
  __ABERTURA_SEMPRE__?: boolean;
}

/**
 * Decide se a abertura deve tocar agora. Pura o suficiente para testes:
 * recebe o objeto global (window) ou um ambiente simulado.
 */
export function decidirAbertura(g: AmbienteAbertura | Window): boolean {
  // E2E forçando a abertura — valida a tela inteira mesmo sob automação.
  if ((g as AmbienteAbertura).__ABERTURA_SEMPRE__ === true) return true;
  // Automação (Playwright/webdriver) não assiste ao briefing: sem isso,
  // cada contexto novo de teste ficaria preso atrás do splash.
  if ((g as AmbienteAbertura).navigator?.webdriver === true) return false;
  // Já vista nesta sessão — não repete.
  try {
    if (g.sessionStorage?.getItem(CHAVE_ABERTURA)) return false;
  } catch {
    /* armazenamento indisponível — mostra normalmente */
  }
  // Respeita quem pediu menos movimento no sistema.
  try {
    if (g.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return false;
  } catch {
    /* sem matchMedia — segue */
  }
  // Respeita economia de dados ativa (NetworkInformation não está no DOM lib).
  const conexao = (g.navigator as AmbienteAbertura["navigator"] | undefined)?.connection;
  if (conexao?.saveData) return false;
  return true;
}

/** Marca a abertura como vista (fim do vídeo ou pulo do operador). */
export function registrarAberturaVista(): void {
  try {
    sessionStorage.setItem(CHAVE_ABERTURA, "1");
  } catch {
    /* sem armazenamento — a abertura volta no próximo arranque */
  }
}
