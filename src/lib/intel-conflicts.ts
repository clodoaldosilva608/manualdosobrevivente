/**
 * Zonas de conflito e tensão — dataset curado manualmente (referência estática,
 * mesmo modelo do Osiris: não é feed ao vivo). Atualizar conforme o cenário
 * geopolítico global. Níveis: "guerra" (conflito armado ativo), "alto"
 * (tensão/insurgência severa) e "elevado" (disputa estratégica).
 */

export type NivelConflito = "guerra" | "alto" | "elevado";

export interface IntelConflito {
  id: string;
  nome: string;
  lng: number;
  lat: number;
  nivel: NivelConflito;
  resumo: string;
}

export const ROTULO_NIVEL: Record<NivelConflito, string> = {
  guerra: "GUERRA ATIVA",
  alto: "TENSÃO ALTA",
  elevado: "TENSÃO ELEVADA",
};

export const CONFLITOS: IntelConflito[] = [
  {
    id: "ucrania",
    nome: "Ucrânia",
    lng: 37.8,
    lat: 48.4,
    nivel: "guerra",
    resumo:
      "Guerra em curso entre Rússia e Ucrânia; combates na linha de frente leste e sul, ataques com drones e mísseis sobre cidades.",
  },
  {
    id: "gaza",
    nome: "Faixa de Gaza e Israel",
    lng: 34.4,
    lat: 31.4,
    nivel: "guerra",
    resumo:
      "Conflito Israel-Hamas com operações militares na Faixa de Gaza e risco regional de escalada (Líbano, Irã, Mar Vermelho).",
  },
  {
    id: "sudao",
    nome: "Sudão",
    lng: 32.5,
    lat: 15.5,
    nivel: "guerra",
    resumo:
      "Guerra civil entre as Forças Armadas sudanesas e o RSF; crise humanitária severa em Cartum e Darfur.",
  },
  {
    id: "mianmar",
    nome: "Mianmar",
    lng: 96.1,
    lat: 21.0,
    nivel: "guerra",
    resumo:
      "Guerra civil pós-golpe de 2021; junta contra alianças de resistência étnica no norte, oeste e leste do país.",
  },
  {
    id: "congo",
    nome: "RD do Congo (Leste)",
    lng: 29.2,
    lat: -1.7,
    nivel: "guerra",
    resumo:
      "Grupos armados ativos no Kivu do Norte (M23 e outros); deslocamento massivo de população na região dos Grandes Lagos.",
  },
  {
    id: "iemen",
    nome: "Iêmen",
    lng: 44.2,
    lat: 15.4,
    nivel: "guerra",
    resumo:
      "Conflito prolongado com control Houthi no norte; ataques a navegação no Mar Vermelho e Golfo de Áden.",
  },
  {
    id: "siria",
    nome: "Síria",
    lng: 38.3,
    lat: 35.1,
    nivel: "alto",
    resumo:
      "Território fragmentado após queda do governo Assad; presença de múltiplas forças e risco de retomada de hostilidades.",
  },
  {
    id: "libano",
    nome: "Líbano",
    lng: 35.5,
    lat: 33.9,
    nivel: "alto",
    resumo:
      "Tensão na fronteira sul e risco de novo conflito Israel-Hezbollah; instabilidade política e econômica crônica.",
  },
  {
    id: "sahel",
    nome: "Sahel Central",
    lng: -1.5,
    lat: 14.5,
    nivel: "alto",
    resumo:
      "Insurgência jihadista no Mali, Burkina Faso e Níger; golpes militares e zonas inteiras fora do controle estatal.",
  },
  {
    id: "somalia",
    nome: "Somália",
    lng: 45.3,
    lat: 2.0,
    nivel: "alto",
    resumo:
      "Insurgência do Al-Shabaab com ataques regulares; frágil governo federal apoiado pela comunidade internacional.",
  },
  {
    id: "marvermelho",
    nome: "Mar Vermelho / Bab el-Mandeb",
    lng: 39.5,
    lat: 15.0,
    nivel: "alto",
    resumo:
      "Corredor marítimo estratégico sob ameaça de ataques a navios; desvio de rotas pelo Cabo da Boa Esperança.",
  },
  {
    id: "taiwan",
    nome: "Estreito de Taiwan",
    lng: 120.9,
    lat: 24.5,
    nivel: "elevado",
    resumo:
      "Disputa estratégica entre China e Taiwan; incursões aéreas e navais frequentes perto da linha mediana.",
  },
  {
    id: "coreia",
    nome: "DMZ Coreia",
    lng: 127.0,
    lat: 38.0,
    nivel: "elevado",
    resumo:
      "Fronteira fortemente militarizada entre as Coreias; testes de mísseis norte-coreanos mantêm a região em alerta.",
  },
];
