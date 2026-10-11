/**
 * Colaboradores do Manual do Sobrevivente — quem sustenta a plataforma.
 *
 * Os nomes aparecem na Redline do boletim (letreiro do mapa tático) em
 * rotação contínua, como créditos de produção. A ordem é INTENCIONALMENTE
 * embaralhada — nunca alfabética — para que ninguém tenha posição fixa de
 * destaque: cada exibição percorre a mesma lista, mas a leitura começa em
 * pontos diferentes a cada carregamento (rotação pelo índice do ciclo).
 */

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
 * Texto do segmento "COLABORADORES" para a Redline: cabeçalho, total e a
 * lista em sequência embaralhada. O ponto de início gira a cada chamada
 * (offset pelo dia da semana + hora) — a lista nunca fica fixa na mesma
 * posição do letreiro e ninguém aparece sempre em primeiro.
 */
export function segmentoColaboradores(agora: Date = new Date()): string {
  const rotacao = agora.getDay() * 7 + agora.getHours();
  const girada = [
    ...COLABORADORES.slice(rotacao % TOTAL_COLABORADORES),
    ...COLABORADORES.slice(0, rotacao % TOTAL_COLABORADORES),
  ];
  return `COLABORADORES (${TOTAL_COLABORADORES}) ${girada.join(" • ")}`;
}
