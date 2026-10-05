/**
 * Internacionalização do Manual do Sobrevivente.
 *
 * O idioma padrão da aplicação é o português do Brasil: as chaves dos
 * dicionários são as próprias strings pt-BR usadas na interface. Quando o
 * operador escolhe outro idioma, o `t()` devolve a tradução correspondente;
 * strings sem tradução (conteúdo de dados, manuais detalhados) continuam em
 * pt-BR — a tradução é progressiva e nunca quebra a tela.
 *
 * A escolha fica guardada por aparelho (localStorage) e é aplicada após a
 * hidratação: o HTML servido pelo SSR é sempre pt-BR, garantindo carga rápida
 * e testes estáveis.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { definirLocale } from "@/lib/format";
import { DICIONARIOS, type Idioma } from "./dicionarios";

export type { Idioma };

export interface OpcaoIdioma {
  id: Idioma;
  /** Nome do idioma escrito no próprio idioma (como aparece no seletor). */
  nativo: string;
  /** Nome do idioma em português, para dicas de tela. */
  pt: string;
  /** Locale BCP 47 usado para datas e números. */
  locale: string;
}

export const IDIOMAS: OpcaoIdioma[] = [
  { id: "pt", nativo: "Português (Brasil)", pt: "Português (Brasil)", locale: "pt-BR" },
  { id: "es", nativo: "Español", pt: "Espanhol", locale: "es" },
  { id: "en", nativo: "English", pt: "Inglês", locale: "en" },
  { id: "ru", nativo: "Русский", pt: "Russo", locale: "ru" },
  { id: "zh", nativo: "中文", pt: "Chinês", locale: "zh" },
  { id: "ja", nativo: "日本語", pt: "Japonês", locale: "ja" },
];

const CHAVE_ARMAZENAMENTO = "tgis:idioma";
const PADRAO_LOCALE = "pt-BR";

/** Idioma ativo fora do React (helpers, formato). Atualizado pelo provedor. */
let idiomaGlobal: Idioma = "pt";

export function idiomaAtivo(): Idioma {
  return idiomaGlobal;
}

export function localeAtivo(): string {
  return IDIOMAS.find((i) => i.id === idiomaGlobal)?.locale ?? PADRAO_LOCALE;
}

/** Traduz uma string pt-BR para o idioma informado, com variáveis {nome}. */
export function traduzir(
  idioma: Idioma,
  texto: string,
  vars?: Record<string, string | number>,
): string {
  const dic = DICIONARIOS[idioma];
  let saida = (dic && dic[texto]) || texto;
  if (vars) {
    for (const [chave, valor] of Object.entries(vars)) {
      saida = saida.split(`{${chave}}`).join(String(valor));
    }
  }
  return saida;
}

/** `t()` fora de componentes (toasts em helpers): usa o idioma global. */
export function tGlobal(texto: string, vars?: Record<string, string | number>): string {
  return traduzir(idiomaGlobal, texto, vars);
}

interface ContextoIdioma {
  idioma: Idioma;
  definir: (i: Idioma) => void;
  t: (texto: string, vars?: Record<string, string | number>) => string;
}

const Contexto = createContext<ContextoIdioma>({
  idioma: "pt",
  definir: () => {},
  t: (texto) => texto,
});

function lerIdiomaSalvo(): Idioma | null {
  try {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (salvo && IDIOMAS.some((i) => i.id === salvo)) return salvo as Idioma;
  } catch {
    /* armazenamento indisponível — mantém pt-BR */
  }
  return null;
}

export function ProvedorIdioma({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>("pt");

  // Restaura a escolha do operador depois da hidratação (SSR é sempre pt-BR).
  useEffect(() => {
    const salvo = lerIdiomaSalvo();
    if (salvo && salvo !== "pt") setIdioma(salvo);
  }, []);

  useEffect(() => {
    idiomaGlobal = idioma;
    const opcao = IDIOMAS.find((i) => i.id === idioma);
    const locale = opcao?.locale ?? PADRAO_LOCALE;
    definirLocale(locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [idioma]);

  const valor = useMemo<ContextoIdioma>(
    () => ({
      idioma,
      definir: (novo) => {
        setIdioma(novo);
        try {
          localStorage.setItem(CHAVE_ARMAZENAMENTO, novo);
        } catch {
          /* armazenamento indisponível — só não persiste */
        }
      },
      t: (texto, vars) => traduzir(idioma, texto, vars),
    }),
    [idioma],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useI18n() {
  return useContext(Contexto);
}
