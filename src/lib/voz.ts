/**
 * Voz do aplicativo — speechSynthesis do aparelho, num módulo só.
 *
 * A navegação de ruas fala as manobras ("Em 300 metros, vire à direita") e
 * o assistente IA usa o mesmo canal quando responde em áudio: o idioma é o
 * da interface (localeAtivo), pt-BR por padrão. Falar NAVIGAÇÃO interrompe
 * o que estiver tocando — aviso de manobra não pode ficar na fila.
 */

import { localeAtivo } from "@/lib/i18n";

const CHAVE_VOZ_NAVEGACAO = "manual:voz-navegacao";

export function vozDisponivel(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Fala um texto. Devolve false quando o aparelho não tem voz. */
export function falarTexto(texto: string, opts?: { interromper?: boolean }): boolean {
  if (!vozDisponivel() || !texto.trim()) return false;
  try {
    if (opts?.interromper !== false) window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto.slice(0, 600));
    fala.lang = localeAtivo();
    fala.rate = 1.05; // manobras pedem agilidade
    window.speechSynthesis.speak(fala);
    return true;
  } catch {
    return false;
  }
}

export function pararVoz(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* nada falando */
  }
}

/** Voz da navegação ligada? (persistida por aparelho; padrão: ligada) */
export function vozNavegacaoAtiva(): boolean {
  try {
    return localStorage.getItem(CHAVE_VOZ_NAVEGACAO) !== "0";
  } catch {
    return true;
  }
}

export function definirVozNavegacao(ativa: boolean): void {
  try {
    localStorage.setItem(CHAVE_VOZ_NAVEGACAO, ativa ? "1" : "0");
    if (!ativa) pararVoz();
  } catch {
    /* armazenamento indisponível */
  }
}
