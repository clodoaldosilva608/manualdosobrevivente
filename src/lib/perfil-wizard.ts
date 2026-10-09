/**
 * Wizard de perfil de prontidão — o "Setup Wizard" do Nomad aplicado à
 * prontidão brasileira (Fase 2 do relatório do Hub).
 *
 * Pergunta o contexto de vida do operador (urbano, trilha, litoral, rural)
 * e curadoria a partir daí: mochila-modelo adequada, tópicos do manual que
 * salvam vidas naquele cenário e foco do Depósito de Suprimentos.
 *
 * A escolha fica guardada nas preferências do aparelho (prefs.perfil) e
 * alimenta o Painel e o Depósito — nenhuma informação sai do dispositivo.
 */

import { criarMochilaDoModelo } from "@/lib/mochilas-modelo";
import { type ContextoDeposito } from "@/lib/deposito";

export type Perfil = "urbano" | "trilha" | "litoral" | "rural";

export interface DefinicaoPerfil {
  id: Perfil;
  nome: string;
  descricao: string;
  /** Modelo de mochila (src/lib/mochilas-modelo.ts) que o perfil semeia. */
  modeloMochila: "modelo-8h" | "modelo-12h" | "modelo-48h" | "modelo-72h" | "modelo-300h";
  /** Justificativa do modelo, exibida no passo de confirmação. */
  motivoMochila: string;
  /** Tópicos do manual priorizados para o perfil (slugs reais). */
  topicos: Array<{ slug: string; titulo: string; porQue: string }>;
  /** Contextos do Depósito em ordem de prioridade para o perfil. */
  prioridadeDeposito: ContextoDeposito[];
  /** Cena de risco principal — rótulo curto para o painel. */
  risco: string;
}

export const PERFIS: Record<Perfil, DefinicaoPerfil> = {
  urbano: {
    id: "urbano",
    nome: "Urbano",
    descricao:
      "Apagões, enchentes na cidade, alagamento e fechamento de vias — você mora em área construída e precisa se virar com a infraestrutura caída.",
    modeloMochila: "modelo-72h",
    motivoMochila:
      "O kit 72 h é o padrão da Defesa Civil: três dias autônomo até a ajuda organizada chegar — o cenário real de uma enchente urbana.",
    topicos: [
      {
        slug: "agua-e-vida",
        titulo: "Água e vida",
        porQue: "Na enchente, a rede de água é a primeira coisa que fica imprestável.",
      },
      {
        slug: "wound-care",
        titulo: "Cuidado com ferimentos",
        porQue: "Vidro e ferragem submersa são a maior fonte de ferimento em alagamento.",
      },
      {
        slug: "cinco-pilares",
        titulo: "Os cinco pilares",
        porQue: "Estrutura mental para decidir entre abrigar, evacuar ou esperar.",
      },
      {
        slug: "mente-forte-sobrevive",
        titulo: "Mente forte sobrevive",
        porQue: "Pânico em multidão é mais perigoso que a água em si.",
      },
    ],
    prioridadeDeposito: ["agua", "comunicacao", "energia", "primeiros-socorros"],
    risco: "Enchente e apagão",
  },
  trilha: {
    id: "trilha",
    nome: "Trilha",
    descricao:
      "Caminhadas, cicloturismo e travessias — dias fora de célula, com mochila nas costas e dependência total do que você carrega.",
    modeloMochila: "modelo-12h",
    motivoMochila:
      "Leve e completa para o deslocamento: água, proteção, sinalização e primeiros socorros sem pesar o passo.",
    topicos: [
      {
        slug: "land-navigation",
        titulo: "Navegação terrestre",
        porQue: "Perder a trilha é a emergência número 1 — bússola resolve onde sinal não chega.",
      },
      {
        slug: "water-purification",
        titulo: "Purificação de água",
        porQue: "Riacho bonito é fonte de protozoário — tratar antes de beber.",
      },
      {
        slug: "hypothermia",
        titulo: "Hipotermia",
        porQue: "Mata em trilha de verão: chuva + vento + fim de tarde é a combinação clássica.",
      },
      {
        slug: "fire-starting",
        titulo: "Fogueira",
        porQue: "Calor, sinal e moral — a habilidade que muda a noite toda.",
      },
    ],
    prioridadeDeposito: ["agua", "abrigos", "primeiros-socorros", "ferramentas"],
    risco: "Perda de rota e clima",
  },
  litoral: {
    id: "litoral",
    nome: "Litoral",
    descricao:
      "Ciclones, maré de tempestade, temporais e isolamento de praias e ilhas — a casa fica onde a previsão do tempo manda.",
    modeloMochila: "modelo-48h",
    motivoMochila:
      "Dois dias autônomo cobre o pico do ciclone e o alagamento de maré — janela típica de reabertura de estradas.",
    topicos: [
      {
        slug: "tarp-shelter",
        titulo: "Abrigo com lona",
        porQue: "Cobertura rápida de telhado e área seca durante o temporal.",
      },
      {
        slug: "wound-care",
        titulo: "Cuidado com ferimentos",
        porQue: "Água de inundação mistura esgoto e ferida é porta de infecção.",
      },
      {
        slug: "core-knots",
        titulo: "Nós essenciais",
        porQue: "Fixar lona, amarrar barco e improvisar resgate com o que houver.",
      },
      {
        slug: "disciplina-gera-resultados",
        titulo: "Disciplina gera resultados",
        porQue: "Checklist de ciclone é rotina — quem treina antes atravessa sem pânico.",
      },
    ],
    prioridadeDeposito: ["comunicacao", "abrigos", "agua", "energia"],
    risco: "Ciclone e maré",
  },
  rural: {
    id: "rural",
    nome: "Rural",
    descricao:
      "Sítio, fazenda ou roça distante do centro — socorro demora, recursos são próprios e o planejamento é de autonomia longa.",
    modeloMochila: "modelo-300h",
    motivoMochila:
      "Autonomia estendida: no campo o kit não é para chegar em casa, é para operar de onde você está.",
    topicos: [
      {
        slug: "agua-e-vida",
        titulo: "Água e vida",
        porQue: "Pozo e cisterna exigem protocolo próprio de tratamento e estoque.",
      },
      {
        slug: "fire-starting",
        titulo: "Fogueira",
        porQue: "Energia de cozimento e calor independente da rede elétrica.",
      },
      {
        slug: "land-navigation",
        titulo: "Navegação terrestre",
        porQue: "Mata, pasto e estrada de chão confundem sem referência — bússola resolve.",
      },
      {
        slug: "conhecimento-salva-vidas",
        titulo: "Conhecimento salva vidas",
        porQue: "Distância do socorro transforma primeiro socorro em habilidade vital.",
      },
    ],
    prioridadeDeposito: ["ferramentas", "energia", "agua", "comunicacao"],
    risco: "Isolamento e demora de socorro",
  },
};

export const LISTA_PERFIS: Perfil[] = ["urbano", "trilha", "litoral", "rural"];

/** Verifica se um valor lido das preferências é um perfil válido. */
export function perfilValido(valor: unknown): valor is Perfil {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(PERFIS, valor);
}

/**
 * Semeadura da mochila recomendada pelo perfil — idempotente: se o modelo
 * já existe entre as mochilas, não duplica. Devolve o nome da mochila
 * garantida (para o toast do wizard) ou nulo em erro de armazenamento.
 */
export async function garantirMochilaDoPerfil(perfil: Perfil): Promise<string | null> {
  const definicao = PERFIS[perfil];
  try {
    return await criarMochilaDoModelo(definicao.modeloMochila);
  } catch {
    return null;
  }
}
