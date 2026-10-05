/**
 * Dicionários do aplicativo — chave = string pt-BR original da interface.
 *
 * As traduções es/en/ru/zh/ja vivem em arquivos próprios para manter este
 * módulo legível. Chaves ausentes fazem o `t()` devolver o texto pt-BR
 * original — a tradução é progressiva e nunca quebra a tela.
 */
import { DIC_ES } from "./dic-es";
import { DIC_EN } from "./dic-en";
import { DIC_RU } from "./dic-ru";
import { DIC_ZH } from "./dic-zh";
import { DIC_JA } from "./dic-ja";

export type Idioma = "pt" | "es" | "en" | "ru" | "zh" | "ja";

export const DICIONARIOS: Record<Idioma, Record<string, string>> = {
  pt: {},
  es: DIC_ES,
  en: DIC_EN,
  ru: DIC_RU,
  zh: DIC_ZH,
  ja: DIC_JA,
};
