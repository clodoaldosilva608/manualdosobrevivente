/**
 * Verificação da incorporação do globo OSIRIS (Visão Osiris).
 *
 * Quando a CSP (frame-ancestors) da instância do globo não autoriza a origem
 * deste app, o navegador impede o iframe — mas o Chrome ainda dispara o
 * evento load, o que torna a detecção puramente client-side pouco confiável
 * (o aviso "Incorporação bloqueada" nunca apareceria). Esta função consulta,
 * do servidor, o header Content-Security-Policy do globo e verifica se a
 * origem do app consta na lista, tornando o aviso determinístico.
 *
 * O cliente nunca acessa a fonte diretamente (padrão do projeto), e o
 * resultado é cacheado por 60 s para não sobrecarregar a instância.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Instância self-hosted do globo OSIRIS (mesma do iframe da Visão Osiris). */
export const URL_GLOBO_OSIRIS = "https://osiris-fork.vercel.app/";

const TTL_CONSULTA = 60_000;

// Cache genérico em memória por processo (chave → { dados, em }).
const G = globalThis as typeof globalThis & {
  __msEmbedCache?: Map<string, { dados: unknown; em: number }>;
};
const cache: Map<string, { dados: unknown; em: number }> = (G.__msEmbedCache ??= new Map());

async function comCache<T>(chave: string, produtor: () => Promise<T>): Promise<T> {
  const hit = cache.get(chave);
  if (hit && Date.now() - hit.em < TTL_CONSULTA) return hit.dados as T;
  const dados = await produtor();
  cache.set(chave, { dados, em: Date.now() });
  return dados;
}

/** Extrai o valor da diretiva frame-ancestors de uma política CSP. */
export function valorFrameAncestors(csp: string): string | null {
  for (const diretiva of csp.split(";")) {
    const partes = diretiva.trim().split(/\s+/);
    if (partes[0]?.toLowerCase() === "frame-ancestors") {
      return partes.slice(1).join(" ") || null;
    }
  }
  return null;
}

/**
 * Verifica se a origem consta (como fonte exata) no frame-ancestors da CSP.
 * A diretiva não aceita regex nem curinga de host — apenas fontes literais
 * como "https://exemplo.vercel.app" ou "http://localhost:8080" — então a
 * comparação textual (sem maiúsculas) é suficiente e correta.
 */
export function origemPermitidaNaCsp(csp: string | null | undefined, origem: string): boolean {
  if (!csp) return false;
  const fontes = valorFrameAncestors(csp);
  if (!fontes) return false;
  return fontes.toLowerCase().split(/\s+/).filter(Boolean).includes(origem.toLowerCase());
}

export interface VerificacaoEmbed {
  /** true quando a origem pode incorporar o globo em iframe. */
  autorizado: boolean;
  /** Resumo do motivo — útil para diagnóstico rápido nos testes. */
  detalhe: string;
}

const EsquemaVerificacao = z.object({
  // Origem do app no navegador (window.location.origin), p.ex.
  // "https://manual-do-sobrevivente.vercel.app" ou "http://localhost:8080".
  origem: z.string().regex(/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i, "origem inválida"),
});

export const verificarEmbedOsiris = createServerFn({ method: "GET" })
  .inputValidator(EsquemaVerificacao.parse)
  .handler(async ({ data }): Promise<VerificacaoEmbed> => {
    return comCache(`embed:${data.origem.toLowerCase()}`, async () => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 12_000);
      try {
        const r = await fetch(URL_GLOBO_OSIRIS, {
          signal: ctl.signal,
          headers: { Accept: "text/html" },
        });
        const csp = r.headers.get("content-security-policy");
        const autorizado = origemPermitidaNaCsp(csp, data.origem);
        if (!csp) {
          return { autorizado: true, detalhe: "sem-csp" } as VerificacaoEmbed;
        }
        return {
          autorizado,
          detalhe: autorizado ? "csp-autoriza" : "csp-bloqueia",
        } as VerificacaoEmbed;
      } catch (e) {
        // Falha ao consultar (rede/timeout): não bloqueia a tentativa do
        // cliente — deixa o fluxo normal do iframe decidir.
        return {
          autorizado: true,
          detalhe: `sonda-falhou:${e instanceof Error ? e.message : "erro"}`,
        } as VerificacaoEmbed;
      } finally {
        clearTimeout(t);
      }
    });
  });
