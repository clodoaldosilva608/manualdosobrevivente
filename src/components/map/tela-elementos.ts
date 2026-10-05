/**
 * Catálogo dos elementos da tela do mapa tático que o usuário pode mostrar ou
 * ocultar — alimenta a seção "Elementos da tela" da folha de camadas e a ação
 * "Limpar tela". A visibilidade é persistida em `telaVis` (usePreferences) e
 * sobrevive a recarregamentos, igual às camadas de inteligência.
 */

/** Elementos da interface do mapa tático controláveis pelo usuário. */
export interface TelaVisibilidade {
  /** Painel de coordenadas do centro (DD/DMS/MGRS + declinação). */
  coordenadas: boolean;
  /** Painel "Minha posição" (GPS: latitude, longitude e altitude). */
  posicao: boolean;
  /** Marcação azul da posição do usuário sobre o mapa. */
  pontoPosicao: boolean;
  /** Rosa dos ventos flutuante (mini, painel ou tela cheia). */
  bussola: boolean;
  /** Barra lateral de ferramentas (Osiris, Boletim, Camadas, Medir…). */
  ferramentas: boolean;
  /** Waypoints salvos desenhados sobre o mapa (ficam guardados no banco). */
  waypoints: boolean;
  /** Controles nativos do mapa: zoom, navegação, GPS e escala. */
  controlesMapa: boolean;
  /** Redline: letreiro inferior com o resumo do boletim e da bússola. */
  redline: boolean;
}

export const TELA_VIS_PADRAO: TelaVisibilidade = {
  coordenadas: true,
  posicao: true,
  pontoPosicao: true,
  bussola: true,
  ferramentas: true,
  waypoints: true,
  controlesMapa: true,
  redline: true,
};

export interface LinhaTela {
  id: keyof TelaVisibilidade;
  nome: string;
  dica: string;
}

/** Linhas da seção "Elementos da tela" (ordem de exibição). */
export const LINHAS_TELA: LinhaTela[] = [
  {
    id: "coordenadas",
    nome: "Coordenadas do centro",
    dica: "Painel DD · DMS · MGRS com declinação magnética",
  },
  {
    id: "posicao",
    nome: "Minha posição",
    dica: "Painel do GPS com latitude, longitude e altitude",
  },
  {
    id: "pontoPosicao",
    nome: "Ponto de posição no mapa",
    dica: "Marcação azul da sua localização em tempo real",
  },
  { id: "bussola", nome: "Bússola", dica: "Rosa dos ventos flutuante com declinação" },
  {
    id: "ferramentas",
    nome: "Barra de ferramentas",
    dica: "Botões Osiris, Boletim, Camadas, Ir para, Medir…",
  },
  {
    id: "waypoints",
    nome: "Waypoints no mapa",
    dica: "Pontos salvos por você — continuam guardados no banco local",
  },
  {
    id: "controlesMapa",
    nome: "Controles do mapa",
    dica: "Zoom, escala e botão de centralizar no GPS",
  },
  {
    id: "redline",
    nome: "Redline do boletim",
    dica: "Letreiro inferior com bússola, tempo, astros, mar e coordenadas",
  },
];
