/**
 * Pontos marítimos estratégicos — dataset curado manualmente (referência
 * estática, mesmo modelo do modo Osiris). Estreitos e canais de importância
 * global (chokepoints) e os maiores portos de contêineres/energia. Uso
 * sobrevivencialista: interrupções nesses pontos afetam cadeias de abastecimento,
 * preços de alimentos/combustíveis e movimentação militar.
 */

export type NivelEstreito = "critico" | "atencao" | "monitorado";

export interface EstreitoEstrategico {
  id: string;
  nome: string;
  lng: number;
  lat: number;
  /** Raio de interesse aproximado em km (para o anel no mapa). */
  raioKm: number;
  nivel: NivelEstreito;
  resumo: string;
}

export const ROTULO_ESTREITO: Record<NivelEstreito, string> = {
  critico: "RISCO CRÍTICO",
  atencao: "ATENÇÃO",
  monitorado: "MONITORADO",
};

export const ESTREITOS: EstreitoEstrategico[] = [
  {
    id: "ormuz",
    nome: "Estreito de Ormuz",
    lng: 56.25,
    lat: 26.57,
    raioKm: 150,
    nivel: "critico",
    resumo:
      "Passagem de ~20% do petróleo e gás liquefeito do mundo. Tensão permanente Irã–EUA/Israel; episódios de apreensão de embarcações.",
  },
  {
    id: "malaca",
    nome: "Estreito de Malaca",
    lng: 101.3,
    lat: 2.5,
    raioKm: 200,
    nivel: "atencao",
    resumo:
      "Artéria entre Índico e Pacífico — um quarto do comércio marítimo global. Pirataria residual e disputa de influência China–EUA.",
  },
  {
    id: "suez",
    nome: "Canal de Suez",
    lng: 32.35,
    lat: 30.5,
    raioKm: 100,
    nivel: "critico",
    resumo:
      "~12% do comércio global. Bloqueios (encalhe de 2021), guerra no Sudão e ataques no Mar Vermelho forçaram rotas pelo Cabo.",
  },
  {
    id: "bab-el-mandeb",
    nome: "Bab el-Mandeb",
    lng: 43.33,
    lat: 12.58,
    raioKm: 120,
    nivel: "critico",
    resumo:
      "Garganta do Mar Vermelho. Ataques de drones/mísseis Houthis a navios desde 2023; presença naval multinacional.",
  },
  {
    id: "panama",
    nome: "Canal do Panamá",
    lng: -79.68,
    lat: 9.08,
    raioKm: 80,
    nivel: "atencao",
    resumo:
      "Conecta Atlântico e Pacífico. Secas históricas reduziram calado e fila de espera; disputa geopolítica sobre sua operação.",
  },
  {
    id: "bosforo",
    nome: "Bósforo e Dardanelos",
    lng: 29.07,
    lat: 41.12,
    raioKm: 120,
    nivel: "critico",
    resumo:
      "Saída do Mar Negro (grãos ucranianos, petróleo russo). Regime de Montreux limita navios de guerra; guerra na Ucrânia tensiona o tráfego.",
  },
  {
    id: "gibraltar",
    nome: "Estreito de Gibraltar",
    lng: -5.6,
    lat: 35.95,
    raioKm: 80,
    nivel: "monitorado",
    resumo:
      "Porta do Mediterrâneo. Tráfego militar da OTAN e submarino intenso; aproximação de rotas do Atlântico.",
  },
  {
    id: "taiwan",
    nome: "Estreito de Taiwan",
    lng: 119.5,
    lat: 24.5,
    raioKm: 180,
    nivel: "critico",
    resumo:
      "Exercícios militares chineses rotineiros; cenário de escalada mais monitorado do mundo. Crucial para semicondutores e comércio asiático.",
  },
  {
    id: "dinamarqueses",
    nome: "Estreitos Dinamarqueses",
    lng: 11.3,
    lat: 55.7,
    raioKm: 100,
    nivel: "atencao",
    resumo:
      "Saída do Báltico. Sabotagens de cabos e gasodutos (Nord Stream, cabos bálticos) elevaram vigilância naval da OTAN.",
  },
  {
    id: "bering",
    nome: "Estreito de Bering",
    lng: -168.9,
    lat: 65.8,
    raioKm: 150,
    nivel: "monitorado",
    resumo:
      "Fronteira EUA–Rússia e rota do Ártico em expansão com o degelo. Patrulhas e exercícios crescentes dos dois lados.",
  },
  {
    id: "boa-esperanca",
    nome: "Cabo da Boa Esperança",
    lng: 19.5,
    lat: -34.8,
    raioKm: 200,
    nivel: "monitorado",
    resumo:
      "Rota alternativa ao Canal de Suez. Aumento de tráfego desde 2024; logística mais longa e cara entre Ásia e Europa.",
  },
  {
    id: "dover",
    nome: "Estreito de Dover",
    lng: 1.5,
    lat: 51.0,
    raioKm: 80,
    nivel: "monitorado",
    resumo:
      "Tráfego marítimo mais denso do mundo entre Reino Unido e França; cruzamentos de cabotagem, ferries e trânsito Báltico–Mediterrâneo.",
  },
];

export interface PortoEstrategico {
  id: string;
  nome: string;
  pais: string;
  lng: number;
  lat: number;
  nota: string;
}

/** ~20 maiores portos do mundo + hubs relevantes para o Brasil (TEU aprox.). */
export const PORTOS: PortoEstrategico[] = [
  {
    id: "xangai",
    nome: "Xangai",
    pais: "China",
    lng: 121.5,
    lat: 31.34,
    nota: "Maior porto do mundo (~49 mi TEU/ano).",
  },
  {
    id: "singapura",
    nome: "Singapura",
    pais: "Singapura",
    lng: 103.85,
    lat: 1.29,
    nota: "Maior hub de transbordo (~39 mi TEU); gargalo asiático.",
  },
  {
    id: "shenzhen",
    nome: "Shenzhen",
    pais: "China",
    lng: 113.9,
    lat: 22.48,
    nota: "~30 mi TEU; polo fabril do Delta do Pérola.",
  },
  {
    id: "ningbo",
    nome: "Ningbo-Zhoushan",
    pais: "China",
    lng: 121.85,
    lat: 29.87,
    nota: "Maior em tonelagem total do mundo.",
  },
  {
    id: "busan",
    nome: "Busan",
    pais: "Coreia do Sul",
    lng: 129.04,
    lat: 35.1,
    nota: "~23 mi TEU; hub do nordeste asiático.",
  },
  {
    id: "guangzhou",
    nome: "Guangzhou (Nansha)",
    pais: "China",
    lng: 113.6,
    lat: 23.1,
    nota: "~25 mi TEU.",
  },
  {
    id: "hong-kong",
    nome: "Hong Kong",
    pais: "China",
    lng: 114.13,
    lat: 22.29,
    nota: "Hub histórico em declínio relativo (~14 mi TEU).",
  },
  {
    id: "qingdao",
    nome: "Qingdao",
    pais: "China",
    lng: 120.3,
    lat: 36.08,
    nota: "~26 mi TEU; ferro e contêineres.",
  },
  {
    id: "tianjin",
    nome: "Tianjin",
    pais: "China",
    lng: 117.8,
    lat: 38.98,
    nota: "Porto do norte; ~22 mi TEU.",
  },
  {
    id: "port-klang",
    nome: "Port Klang",
    pais: "Malásia",
    lng: 101.39,
    lat: 3.0,
    nota: "~14 mi TEU; hub do Estreito de Malaca.",
  },
  {
    id: "jebel-ali",
    nome: "Jebel Ali (Dubai)",
    pais: "Emirados Árabes",
    lng: 55.06,
    lat: 25.01,
    nota: "Maior porto do Oriente Médio; base naval dos EUA.",
  },
  {
    id: "roterda",
    nome: "Roterdã",
    pais: "Países Baixos",
    lng: 4.14,
    lat: 51.95,
    nota: "Maior da Europa (~13,5 mi TEU); petróleo e químicos.",
  },
  {
    id: "antuerpia",
    nome: "Antuérpia-Bruges",
    pais: "Bélgica",
    lng: 4.32,
    lat: 51.28,
    nota: "~13 mi TEU; maior cluster petroquímico da UE.",
  },
  {
    id: "hamburgo",
    nome: "Hamburgo",
    pais: "Alemanha",
    lng: 9.93,
    lat: 53.53,
    nota: "~8 mi TEU; porta da indústria alemã.",
  },
  {
    id: "santos",
    nome: "Santos",
    pais: "Brasil",
    lng: -46.31,
    lat: -23.96,
    nota: "Maior porto da América Latina; açúcar, soja, contêineres.",
  },
  {
    id: "ny-nj",
    nome: "Nova York / New Jersey",
    pais: "EUA",
    lng: -74.05,
    lat: 40.67,
    nota: "Maior porto da costa leste americana (~9 mi TEU).",
  },
  {
    id: "los-angeles",
    nome: "Los Angeles / Long Beach",
    pais: "EUA",
    lng: -118.26,
    lat: 33.73,
    nota: "Complexo mais movimentado das Américas; gargalos históricos.",
  },
  {
    id: "houston",
    nome: "Houston",
    pais: "EUA",
    lng: -95.29,
    lat: 29.75,
    nota: "Maior exportador de petróleo/GNL dos EUA; zona de furacões.",
  },
  {
    id: "dalian",
    nome: "Dalian",
    pais: "China",
    lng: 121.63,
    lat: 38.95,
    nota: "Petróleo e grãos do Mar Amarelo.",
  },
  {
    id: "xiamen",
    nome: "Xiamen",
    pais: "China",
    lng: 118.08,
    lat: 24.48,
    nota: "~12 mi TEU; frente do Estreito de Taiwan.",
  },
  {
    id: "piraeus",
    nome: "Pireu",
    pais: "Grécia",
    lng: 23.63,
    lat: 37.94,
    nota: "Maior porto do Mediterrâneo Oriental; operado pela COSCO.",
  },
  {
    id: "colombo",
    nome: "Colombo",
    pais: "Sri Lanka",
    lng: 79.84,
    lat: 6.95,
    nota: "Hub de transbordo do Índico.",
  },
];
