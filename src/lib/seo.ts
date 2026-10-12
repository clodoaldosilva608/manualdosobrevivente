/**
 * SEO da vitrine — endereço canônico do projeto e ajudantes de head.
 *
 * O projeto responde em DOIS domínios (manualdosobrevivente.vercel.app e o
 * alias manual-do-sobrevivente.vercel.app) servindo o mesmo conteúdo. Sem
 * canonical, os buscadores tratam como duplicata e dividem a autoridade.
 * Toda página vitrine declara sua versão no domínio SEM hífens — o mesmo
 * padrão usado no robots.txt e no sitemap (/api/sitemap).
 */
export const URL_CANONICA = "https://manualdosobrevivente.vercel.app";

/** Link canonical do caminho dado (para o array links do head). */
export function canonicalDo(caminho: string) {
  return { rel: "canonical", href: `${URL_CANONICA}${caminho}` };
}

/** Meta og:url do caminho dado (para o array meta do head). */
export function ogUrlDo(caminho: string) {
  return { property: "og:url", content: `${URL_CANONICA}${caminho}` };
}
