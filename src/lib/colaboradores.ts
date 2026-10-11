/**
 * Colaboradores do Manual do Sobrevivente — quem sustenta a plataforma.
 *
 * Os nomes aparecem na Redline do boletim (letreiro do mapa tático) em
 * rotação contínua, como créditos de produção. Esta lista é a SEMENTE
 * estática (fallback offline); em operação normal o letreiro usa os
 * apoiadores do banco (tabela manual_apoiadores, gerenciados no /admin)
 * através do hook useApoiadoresRedline — veja RedlineBoletim.tsx.
 *
 * A ordem é INTENCIONALMENTE embaralhada — nunca alfabética — para que
 * ninguém tenha posição fixa de destaque: cada exibição percorre a mesma
 * lista, mas a leitura começa em pontos diferentes a cada carregamento
 * (rotação pelo índice do ciclo).
 */
import { formatMoeda } from "@/lib/format";

/** Lista dos 78 colaboradores em ordem embaralhada (não alfabética). */
export const COLABORADORES: string[] = [
  "Renata Farias",
  "Otávio Menezes",
  "Juliana Prado",
  "Caio Barreto",
  "Mariana Lopes",
  "Fernando Duarte",
  "Beatriz Camargo",
  "Ricardo Nogueira",
  "Patrícia Rezende",
  "Gustavo Peixoto",
  "Larissa Fontes",
  "André Vasconcelos",
  "Camila Tavares",
  "Eduardo Sampaio",
  "Regina Amaral",
  "Thiago Cordeiro",
  "Vanessa Rocha",
  "Marcelo Queiroz",
  "Helena Brito",
  "Rodrigo Aguiar",
  "Sônia Guimarães",
  "Lucas Ramalho",
  "Débora Pinto",
  "Felipe Moraes",
  "Cristina Salles",
  "Bruno Teixeira",
  "Adriana Ferraz",
  "Paulo Magalhães",
  "Natália Bispo",
  "Sérgio Andrade",
  "Elaine Carvalho",
  "Vitor Huguenin",
  "Tereza Coelho",
  "Danilo Siqueira",
  "Márcia Werneck",
  "Leandro Godoy",
  "Fernanda Elias",
  "Rafael Bastos",
  "Cláudia Parente",
  "Igor Antunes",
  "Simone Delgado",
  "Marcelo Vianna",
  "Priscila Rosário",
  "Henrique Paiva",
  "Aline Corrêa",
  "Jorge Batista",
  "Michele Franco",
  "Fabrício Luz",
  "Vivian Sacramento",
  "Denis Cardoso",
  "Rosana Matos",
  "Wesley Chaves",
  "Gabriela Esteves",
  "Alexandre Rios",
  "Luciana Beltrão",
  "Sandro Furtado",
  "Renata Maldonado",
  "Emerson Vieira",
  "Tatiane Guedes",
  "Murilo Sabino",
  "Cristiane Dantas",
  "Hélio Marinho",
  "Juliana Estrada",
  "Osvaldo Freitas",
  "Bianca Barros",
  "Kleber Mancini",
  "Lívia Penha",
  "Alan Kruger",
  "Marta Januário",
  "Everardo Nolasco",
  "Yasmin Corvelo",
  "Ubirajara Salgado",
  "Nara Esteves",
  "Zeca Pagliarini",
  "Isabela Fontoura",
  "Wagner Bragança",
  "Olívia Cerqueira",
  "Pedro Assunção",
];

export const TOTAL_COLABORADORES = COLABORADORES.length;

/**
 * Monta o segmento de nomes para a Redline a partir de QUALQUER lista:
 * cabeçalho com rótulo + total e a sequência girada — o ponto de início
 * roda pelo dia da semana + hora, então a lista nunca fica fixa na mesma
 * posição do letreiro e ninguém aparece sempre em primeiro.
 * Lista vazia devolve "" — o chamador decide o que exibir.
 */
export function segmentoDeNomes(
  nomes: string[],
  agora: Date = new Date(),
  rotulo = "COLABORADORES",
): string {
  const total = nomes.length;
  if (total === 0) return "";
  const rotacao = agora.getDay() * 7 + agora.getHours();
  const girada = [...nomes.slice(rotacao % total), ...nomes.slice(0, rotacao % total)];
  return `${rotulo} (${total}) ${girada.join(" • ")}`;
}

/**
 * Rótulo do apoiador no letreiro: "Nome · R$ 25,00" quando existe valor já
 * arrecadado registrado; só o nome quando o valor não foi informado.
 */
export function rotuloApoiador(nome: string, valor: number | null | undefined): string {
  const v = Number(valor);
  return valor != null && Number.isFinite(v) && v > 0 ? `${nome} · ${formatMoeda(v)}` : nome;
}

/** Segmento da lista semente — fallback offline da Redline do mapa. */
export function segmentoColaboradores(agora: Date = new Date()): string {
  return segmentoDeNomes(COLABORADORES, agora);
}
