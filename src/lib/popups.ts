/**
 * Pop-ups de crescimento no dashboard do mapa — três cartões com uma
 * missão cada: seguir nas redes sociais, apoiar o projeto e compartilhar
 * com os amigos.
 *
 * Regras de convivência (a pop-up é convidado, não praga):
 *  · UM cartão por vez, no canto inferior esquerdo, com dispensa fácil;
 *  · o primeiro entra após PRIMEIRO_MIN no mapa, os demais a cada
 *    INTERVALO_MIN (configurados pelo admin em /admin › Configurações);
 *  · "não mostrar novamente" de cada cartão persiste por aparelho;
 *  · em tela limpa (modo mapa puro) nada aparece.
 *
 * As funções puras de agendamento são testáveis sem navegador.
 */
import { supabase } from "@/integrations/supabase/client";

export type TipoPopup = "social" | "apoiar" | "compartilhar";

export interface ConfigPopups {
  ativo: boolean;
  instagram_url: string;
  youtube_url: string;
  telegram_url: string;
  /** Minutos entre um cartão e o próximo (padrão 8). */
  intervalo_minutos: number;
  /** Minutos no mapa até o primeiro cartão (padrão 2). */
  primeiro_minutos: number;
}

export const CONFIG_PADRAO: ConfigPopups = {
  ativo: true,
  instagram_url: "",
  youtube_url: "",
  telegram_url: "",
  intervalo_minutos: 8,
  primeiro_minutos: 2,
};

/** Lê a configuração do admin; cai no padrão sem banco/rede (offline). */
export async function lerConfigPopups(): Promise<ConfigPopups> {
  try {
    const { data } = await supabase
      .from("manual_configuracoes")
      .select("valor")
      .eq("chave", "popups")
      .maybeSingle();
    if (!data?.valor) return CONFIG_PADRAO;
    return { ...CONFIG_PADRAO, ...(data.valor as Partial<ConfigPopups>) };
  } catch {
    return CONFIG_PADRAO;
  }
}

/* ------------------------------------------------------------------ */
/* Agendamento puro (testável)                                        */
/* ------------------------------------------------------------------ */

export const CHAVE_SILENCIADOS = "manual:popups-silenciados";

/** Cartões que o operador pediu para não ver mais, por aparelho. */
export function lerSilenciados(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SILENCIADOS) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function silenciarParaSempre(tipo: TipoPopup): void {
  try {
    const atual = lerSilenciados();
    atual[tipo] = true;
    localStorage.setItem(CHAVE_SILENCIADOS, JSON.stringify(atual));
  } catch {
    /* armazenamento indisponível */
  }
}

/**
 * Próximo cartão a exibir: cicla social → apoiar → compartilhar, pulando
 * os silenciados e os indisponíveis (ex.: redes sem URL). Devolve null
 * quando nada deve aparecer. O ciclo devolvido já aponta PARA O PRÓXIMO
 * cartão depois do exibido — assim um cartão indisponível (social sem
 * link) nunca faz o seguinte aparecer duas vezes.
 */
export function proximoPopup(
  ciclo: number,
  silenciados: Record<string, boolean>,
  disponiveis: Record<TipoPopup, boolean>,
): { tipo: TipoPopup; ciclo: number } | null {
  const ordem: TipoPopup[] = ["social", "apoiar", "compartilhar"];
  for (let i = 0; i < ordem.length; i++) {
    const pos = (ciclo + i) % ordem.length;
    const tipo = ordem[pos];
    if (disponiveis[tipo] && !silenciados[tipo]) {
      // avança para a posição seguinte na roda (não apenas +1 de tentativa)
      return { tipo, ciclo: (pos + 1) % ordem.length };
    }
  }
  return null;
}

/** Texto dos cartões (pt-BR como chave; traduzido via i18n na UI). */
export const TEXTOS_POPUP: Record<TipoPopup, { titulo: string; descricao: string; cta: string }> = {
  social: {
    titulo: "Siga o Manual",
    descricao:
      "Avisos de emergência, dicas de sobrevivência e novidades — direto nas redes, antes de todo mundo.",
    cta: "Seguir agora",
  },
  apoiar: {
    titulo: "O Manual é gratuito",
    descricao:
      "Você pode manter o projeto no ar com qualquer valor via PIX — em troca, o seu nome entra no mural dos apoiadores.",
    cta: "Quero apoiar",
  },
  compartilhar: {
    titulo: "Salve quem você ama",
    descricao:
      "Compartilhe o Manual com amigos e família: em emergência, é o app que não depende de nada para funcionar.",
    cta: "Compartilhar",
  },
};
