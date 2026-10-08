/**
 * Convite para divulgar o aplicativo — "recrute o esquadrão".
 *
 * O texto do convite sai no idioma ativo do operador, de modo que quem
 * recebe entenda o convite no próprio idioma. O envio prefere a folha
 * nativa de compartilhamento (Web Share API, comum em celulares) e cai
 * para a área de transferência quando o aparelho não oferece a folha
 * (desktop). Cada convite enviado é contado localmente (localStorage) —
 * nada sai do aparelho além do que o operador escolhe compartilhar.
 */
import { idiomaAtivo, traduzir, type Idioma } from "@/lib/i18n";

/** Endereço canônico do aplicativo — é sempre este link que viaja no convite. */
export const URL_APP = "https://manual-do-sobrevivente.vercel.app";

/**
 * Banner oficial do convite (public/banner-convite.png, 1200×630).
 * Vai como anexo na folha nativa de compartilhamento e é a imagem que
 * WhatsApp/Telegram/Facebook mostram na prévia do link (og:image).
 */
export const URL_BANNER_CONVITE = "/banner-convite.png";

/** Título usado na folha nativa e no assunto do e-mail. */
export const TITULO_CONVITE = "Manual do Sobrevivente";

const CHAVE_ARMAZENAMENTO = "tgis:convites";

/** Chave i18n da mensagem — o próprio texto pt-BR é a chave do dicionário. */
export const CHAVE_TEXTO_CONVITE =
  "Descobri o MANUAL DO SOBREVIVENTE: curso de bússola guiado, guia de rota que evita andar em círculos, mapas offline, SOS Morse e mochila inteligente. Funciona no navegador, até sem internet. Confira:";

/** Mensagem de convite no idioma informado, sem o link (o link viaja à parte). */
export function textoConviteEm(idioma: Idioma): string {
  return traduzir(idioma, CHAVE_TEXTO_CONVITE);
}

/** Mensagem de convite no idioma ativo do operador. */
export function textoConvite(): string {
  return textoConviteEm(idiomaAtivo());
}

/** Mensagem completa pronta para colar: texto + link em linha própria. */
export function conviteCompleto(): string {
  return `${textoConvite()}\n${URL_APP}`;
}

/**
 * Baixa o banner do convite como File para anexar na folha nativa
 * (Web Share API nível 2). Devolve null sem rede — o convite segue em texto.
 */
export async function carregarBannerConvite(): Promise<File | null> {
  try {
    const res = await fetch(URL_BANNER_CONVITE, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], "manual-do-sobrevivente.png", { type: "image/png" });
  } catch {
    return null;
  }
}

/**
 * O aparelho aceita compartilhar este arquivo? (Web Share API com arquivos —
 * comum em celulares; desktops costumam recusar.)
 */
export function podeCompartilharArquivos(banner: File | null): boolean {
  if (!banner || typeof navigator === "undefined" || !navigator.share) return false;
  try {
    return !!navigator.canShare?.({ files: [banner] });
  } catch {
    return false;
  }
}

/** Quantos convites este aparelho já enviou (contador local, gamificação leve). */
export function contagemConvites(): number {
  try {
    return Number(localStorage.getItem(CHAVE_ARMAZENAMENTO) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function registrarConvite(): void {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, String(contagemConvites() + 1));
  } catch {
    /* sem armazenamento — o convite ainda assim foi feito */
  }
}

/**
 * Conta convites iniciados por canal direto (WhatsApp, Telegram, SMS…),
 * que abrem o aplicativo externo sem passar pela Web Share API.
 */
export function registrarConviteLocal(): void {
  registrarConvite();
}

export type ResultadoConvite =
  | "nativo" // folha nativa usada com sucesso
  | "copiado" // link + texto copiados para a área de transferência
  | "manual" // nem folha nem cópia: operador seleciona o texto na tela
  | "cancelado"; // operador fechou a folha nativa sem enviar

/**
 * Compartilha o convite pelo melhor canal disponível.
 *
 * 1. Web Share API (`navigator.share`) — folha nativa do aparelho; com o
 *    banner anexado quando o aparelho aceita arquivos (WhatsApp e cia
 *    entregam imagem + texto juntos);
 * 2. Área de transferência — cópia imediata para colar na conversa;
 * 3. "manual" — o ConviteSheet deixa o texto selecionável na tela.
 */
export async function compartilharConvite(
  opcoes: { banner?: File | null } = {},
): Promise<ResultadoConvite> {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav?.share) {
    // 1a. Folha nativa com o banner do aplicativo anexado.
    if (podeCompartilharArquivos(opcoes.banner ?? null)) {
      try {
        await nav.share({
          files: [opcoes.banner as File],
          title: TITULO_CONVITE,
          text: textoConvite(),
          url: URL_APP,
        });
        registrarConvite();
        return "nativo";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return "cancelado";
        // Alguns alvos recusam arquivos — cai para o convite em texto.
      }
    }
    // 1b. Folha nativa em texto (comportamento original).
    try {
      await nav.share({ title: TITULO_CONVITE, text: textoConvite(), url: URL_APP });
      registrarConvite();
      return "nativo";
    } catch (err) {
      // Operador fechou a folha sem enviar — não conta convite nem cai na cópia.
      if (err instanceof DOMException && err.name === "AbortError") return "cancelado";
      // Navegadores de desktop podem lançar NotAllowedError — segue para a cópia.
    }
  }
  if (nav?.clipboard) {
    try {
      await nav.clipboard.writeText(conviteCompleto());
      registrarConvite();
      return "copiado";
    } catch {
      /* permissão negada ou clipboard indisponível — segue para o manual */
    }
  }
  return "manual";
}
