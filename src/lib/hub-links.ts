/**
 * Deep links versionados Manual → Centro de Sobrevivência (fase 1 do Hub).
 *
 * RED LINE do relatório: o Manual nunca vira loja — comércio acontece no
 * Centro; o Manual apenas sugere e deep-linka. Este módulo é a única porta
 * de saída para o Centro, com URLs versionadas (contrato público) e UTM
 * para atribuição de origem (canal P1 da Tabela 3 do relatório).
 *
 * Contrato v2 (mudanças de caminho no Centro exigem versão nova aqui):
 *   /                       onboarding do visitante novo (home)
 *   /equipamentos           vitrine da loja (afiliados hoje, kits na fase 4)
 *   /equipamentos?q=<busca> busca dentro da vitrine
 *   /cursos                 catálogo de cursos
 *   /cursos/<slug>          página de um curso
 *   /comunidade             Discord/Telegram + roadmap público
 *
 * O Manual não tem plano pago: o suporte é por contribuição voluntária
 * (/colaboradores), sem passar pelo Centro.
 *
 * O domínio base pode ser trocado por deploy sem código novo:
 * VITE_CENTRO_URL=https://centrodesobrevivencia.lovable.app
 */

const CENTRO_PADRAO = "https://centrodesobrevivencia.lovable.app";

export const CENTRO_URL: string =
  (import.meta.env["VITE_CENTRO_URL"] as string | undefined)?.replace(/\/+$/, "") || CENTRO_PADRAO;

/** Versão do contrato de deep links — qualquer mudança de caminho bumpa. */
export const VERSAO_DEEP_LINK = "v2";

interface OpcoesLink {
  /** Campanha da semana/janela (ex.: "deposito", "pro", "menu"). */
  campanha: string;
  /** Refina a origem dentro da campanha (ex.: id do item do depósito). */
  conteudo?: string;
}

function montarUrl(caminho: string, opcoes: OpcoesLink): string {
  const url = new URL(caminho, `${CENTRO_URL}/`);
  url.searchParams.set("utm_source", "manual");
  url.searchParams.set("utm_medium", "app");
  url.searchParams.set("utm_campaign", opcoes.campanha);
  url.searchParams.set("utm_term", VERSAO_DEEP_LINK);
  if (opcoes.conteudo) url.searchParams.set("utm_content", opcoes.conteudo);
  return url.toString();
}

/** Página única de onboarding do Centro ("Comece aqui"). */
export function urlComeceAqui(conteudo = "app"): string {
  return montarUrl("/", { campanha: "onboarding", conteudo });
}

/** Vitrine do Centro; busca opcional acoplada ao item sugerido. */
export function urlLoja(busca?: string, conteudo?: string): string {
  const url = new URL("/equipamentos", `${CENTRO_URL}/`);
  url.searchParams.set("utm_source", "manual");
  url.searchParams.set("utm_medium", "app");
  url.searchParams.set("utm_campaign", "deposito");
  url.searchParams.set("utm_term", VERSAO_DEEP_LINK);
  if (conteudo) url.searchParams.set("utm_content", conteudo);
  if (busca) url.searchParams.set("q", busca);
  return url.toString();
}

/** Catálogo de cursos do Centro. */
export function urlCursos(conteudo = "app"): string {
  return montarUrl("/cursos", { campanha: "cursos", conteudo });
}

/** Página de um curso específico (contrato reserva o caminho). */
export function urlCurso(slug: string): string {
  return montarUrl(`/cursos/${slug}`, { campanha: "cursos", conteudo: slug });
}

/** Comunidade formal (Discord/Telegram) + roadmap público. */
export function urlComunidade(conteudo = "app"): string {
  return montarUrl("/comunidade", { campanha: "comunidade", conteudo });
}

/** Captura do boletim semanal (newsletter). */
export function urlNewsletter(conteudo = "app"): string {
  return montarUrl("/", { campanha: "newsletter", conteudo });
}
