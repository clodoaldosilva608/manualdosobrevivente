/**
 * Modo visitante — o aplicativo abre por completo sem conta: o mapa, os
 * waypoints, a mochila e o checklist ficam no IndexedDB do aparelho (o app é
 * local-first; a conta existe para sincronizar na nuvem e levar os dados
 * entre aparelhos).
 *
 * A escolha persiste no localStorage e dispara um evento para o Portão de
 * Autenticação abrir/fechar em tempo real (também entre abas, via "storage").
 * Núcleo puro e injetável — testes cobrem ativar/desativar/consultar.
 */

export const CHAVE_VISITANTE = "ms-modo-visitante";
export const EVENTO_VISITANTE = "ms-modo-visitante-mudou";

/** storage acessível (navegador) ou null (SSR/teste sem dom). */
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // storage bloqueado (modo privado restrito) — visitante não persiste
  }
}

/** Visitante ativo? Padrão falso (SSR, storage indisponível ou nunca escolhido). */
export function visitanteAtivo(): boolean {
  try {
    return storage()?.getItem(CHAVE_VISITANTE) === "1";
  } catch {
    return false; // getItem lançou (modo privado restrito) — trata como não-visitante
  }
}

/** Liga/desliga o modo visitante e avisa a interface (mesma aba e outras). */
export function definirModoVisitante(ativo: boolean): void {
  const s = storage();
  if (!s) return;
  try {
    if (ativo) s.setItem(CHAVE_VISITANTE, "1");
    else s.removeItem(CHAVE_VISITANTE);
  } catch {
    return; // gravação bloqueada — o modo não persiste nesta sessão
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_VISITANTE, { detail: ativo }));
  } catch {
    /* ambiente sem Event constructor — nada a fazer */
  }
}
