/**
 * Cabos submarinos (camada "Cabos submarinos" do mapa tático — paridade com
 * a camada "cables" do globo OSIRIS). Referência curada: os principais cabos
 * de fibra que ligam o Brasil ao mundo e as grandes rotas intercontinentais.
 *
 * As rotas são APROXIMADAS (polilinhas com poucos vértices entre os pontos
 * de desembarque) — servem para situar a infraestrutura, não para navegação.
 * Dados de referência: mapas públicos de operadores (TeleGeography, lyngsat,
 * páginas dos consórcios). Cursos d'água reais variam alguns dezenas de km.
 */
export interface IntelCabo {
  id: string;
  nome: string;
  /** Ano de entrada em serviço (aprox.). */
  ano: number;
  /** Comprimento aproximado em km. */
  comprimentoKm: number;
  /** Pontos de desembarque (cidade, país). */
  desembarques: string[];
  /** Rota aproximada como pares [lng, lat] (de um desembarque ao outro). */
  pontos: Array<[number, number]>;
}

export const CABOS: IntelCabo[] = [
  {
    id: "cabo-brusa",
    nome: "BRUSA",
    ano: 2018,
    comprimentoKm: 11000,
    desembarques: [
      "Rio de Janeiro (BR)",
      "Fortaleza (BR)",
      "San Juan (PR)",
      "Virginia Beach (EUA)",
    ],
    pontos: [
      [-43.18, -22.9],
      [-38.53, -3.73],
      [-45.0, 5.0],
      [-66.06, 18.42],
      [-75.98, 36.85],
    ],
  },
  {
    id: "cabo-monet",
    nome: "Monet",
    ano: 2017,
    comprimentoKm: 10600,
    desembarques: ["Santos (BR)", "Fortaleza (BR)", "Boca Raton (EUA)"],
    pontos: [
      [-46.31, -23.96],
      [-40.0, -13.0],
      [-38.53, -3.73],
      [-50.0, 12.0],
      [-80.09, 26.37],
    ],
  },
  {
    id: "cabo-sams",
    nome: "South Atlantic 1 (SAMS)",
    ano: 2001,
    comprimentoKm: 30700,
    desembarques: ["Fortaleza (BR)", "Sangano (Angola)", "Penhaligon (Portugal)"],
    pontos: [
      [-38.53, -3.73],
      [-25.0, -6.0],
      [13.23, -9.53],
      [2.0, -2.0],
      [-9.4, 38.7],
    ],
  },
  {
    id: "cabo-sacs",
    nome: "SACS (South Atlantic Cable System)",
    ano: 2018,
    comprimentoKm: 6165,
    desembarques: ["Sangano (Angola)", "Kabelfontein (África do Sul)"],
    pontos: [
      [13.23, -9.53],
      [14.0, -20.0],
      [18.1, -33.15],
    ],
  },
  {
    id: "cabo-tannat",
    nome: "Tannat",
    ano: 2018,
    comprimentoKm: 2000,
    desembarques: ["Maldonado (Uruguai)", "Santos (BR)"],
    pontos: [
      [-54.95, -34.9],
      [-53.5, -34.8],
      [-51.0, -33.0],
      [-48.6, -29.0],
      [-46.31, -23.96],
    ],
  },
  {
    id: "cabo-ellalink",
    nome: "EllaLink",
    ano: 2021,
    comprimentoKm: 6000,
    desembarques: ["Fortaleza (BR)", "Machico/Madeira (PT)", "Sines (PT)"],
    pontos: [
      [-38.53, -3.73],
      [-25.0, 6.0],
      [-16.77, 32.72],
      [-8.87, 37.96],
    ],
  },
  {
    id: "cabo-sail",
    nome: "SAIL (South Atlantic Inter Link)",
    ano: 2019,
    comprimentoKm: 6000,
    desembarques: ["Kribi (Camarões)", "Fortaleza (BR)"],
    pontos: [
      [9.91, 2.94],
      [-15.0, -2.0],
      [-38.53, -3.73],
    ],
  },
  {
    id: "cabo-amx1",
    nome: "AMX-1 (Américas)",
    ano: 2014,
    comprimentoKm: 17800,
    desembarques: [
      "Jacksonville (EUA)",
      "Cancún (MX)",
      "Panamá (PA)",
      "Fortaleza (BR)",
      "Salvador (BR)",
      "Rio de Janeiro (BR)",
    ],
    pontos: [
      [-81.66, 30.33],
      [-86.85, 21.16],
      [-79.9, 9.36],
      [-52.0, -1.0],
      [-38.53, -3.73],
      [-38.8, -16.0],
      [-38.9, -19.0],
      [-43.18, -22.9],
    ],
  },
  {
    id: "cabo-atlantis2",
    nome: "Atlantis-2",
    ano: 2000,
    comprimentoKm: 11900,
    desembarques: ["Lisboa (PT)", "Dakar (Senegal)", "Fortaleza (BR)", "Recife (BR)"],
    pontos: [
      [-9.14, 38.7],
      [-17.44, 14.68],
      [-28.0, 4.0],
      [-38.53, -3.73],
      [-34.9, -8.05],
    ],
  },
  {
    id: "cabo-wacs",
    nome: "WACS (West Africa Cable System)",
    ano: 2012,
    comprimentoKm: 14240,
    desembarques: [
      "Yzerfontein (África do Sul)",
      "Luanda (Angola)",
      "Lagos (Nigéria)",
      "Dakar (Senegal)",
      "Mindelo (Cabo Verde)",
      "Peniche (PT)",
      "Land's End (Reino Unido)",
    ],
    pontos: [
      [18.15, -33.32],
      [13.23, -8.84],
      [3.42, 6.42],
      [-17.44, 14.68],
      [-24.99, 16.88],
      [-9.38, 39.36],
      [-5.72, 50.07],
    ],
  },
  {
    id: "cabo-marea",
    nome: "MAREA",
    ano: 2017,
    comprimentoKm: 6400,
    desembarques: ["Virginia Beach (EUA)", "Bilbau (Espanha)"],
    pontos: [
      [-75.98, 36.85],
      [-50.0, 44.0],
      [-25.0, 47.0],
      [-3.01, 43.35],
    ],
  },
  {
    id: "cabo-dunant",
    nome: "Dunant",
    ano: 2020,
    comprimentoKm: 6400,
    desembarques: ["Virginia Beach (EUA)", "Saint-Hilaire-de-Riez (França)"],
    pontos: [
      [-75.98, 36.85],
      [-55.0, 42.0],
      [-25.0, 46.0],
      [-1.94, 46.72],
    ],
  },
  {
    id: "cabo-amitie",
    nome: "Amitié",
    ano: 2022,
    comprimentoKm: 6600,
    desembarques: ["Harwich (EUA)", "Bude (Reino Unido)", "Avon (França)"],
    pontos: [
      [-70.5, 41.9],
      [-45.0, 46.0],
      [-4.55, 50.83],
      [-1.0, 47.4],
    ],
  },
  {
    id: "cabo-grace-hopper",
    nome: "Grace Hopper",
    ano: 2021,
    comprimentoKm: 6400,
    desembarques: ["Nova York (EUA)", "Bude (Reino Unido)"],
    pontos: [
      [-73.0, 40.4],
      [-45.0, 46.5],
      [-4.55, 50.83],
    ],
  },
  {
    id: "cabo-clion1",
    nome: "C-Lion1",
    ano: 2016,
    comprimentoKm: 1173,
    desembarques: ["Helsinki (Finlândia)", "Rostock (Alemanha)"],
    pontos: [
      [24.94, 60.15],
      [20.0, 58.0],
      [12.14, 54.09],
    ],
  },
  {
    id: "cabo-seamewe5",
    nome: "SEA-ME-WE 5",
    ano: 2016,
    comprimentoKm: 20000,
    desembarques: [
      "Singapura (SG)",
      "Colombo (Sri Lanka)",
      "Djibuti",
      "Suez (Egito)",
      "Marselha (França)",
    ],
    pontos: [
      [103.85, 1.29],
      [79.85, 6.93],
      [43.15, 11.59],
      [32.55, 29.97],
      [5.35, 43.27],
    ],
  },
  {
    id: "cabo-aag",
    nome: "AAG (Asia-America Gateway)",
    ano: 2009,
    comprimentoKm: 20000,
    desembarques: [
      "Singapura (SG)",
      "Hong Kong",
      "Manila (Filipinas)",
      "Guam",
      "Piti (Havaí)",
      "Los Angeles (EUA)",
    ],
    pontos: [
      [103.85, 1.29],
      [114.17, 22.3],
      [120.97, 14.6],
      [144.75, 13.44],
      [-158.0, 21.3],
      [-118.2, 33.9],
    ],
  },
];
