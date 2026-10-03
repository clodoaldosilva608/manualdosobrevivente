/**
 * Tipos compartilhados das camadas de inteligência (modo Osiris).
 *
 * Os dados brutos vêm de fontes públicas oficiais (USGS, NASA EONET/FIRMS,
 * NOAA SWPC) via server functions com cache — o cliente nunca chama as fontes
 * diretamente, evitando problemas de CORS e chaves expostas.
 */

/** Evento sísmico da rede USGS (magnitude 2,5+ nas últimas 24 h). */
export interface IntelSismo {
  id: string;
  lng: number;
  lat: number;
  /** Magnitude na escala momentânea (Mw aprox.). */
  mag: number;
  /** Profundidade em km. */
  profundidade: number;
  /** Descrição original da fonte (em inglês). */
  lugar: string;
  /** Unix em milissegundos. */
  hora: number;
  url: string;
  tsunami: boolean;
}

/** Evento natural ativo da NASA EONET (ciclones, vulcões, gelo, tempestades). */
export interface IntelEvento {
  id: string;
  titulo: string;
  categoriaId: string;
  categoria: string;
  lng: number;
  lat: number;
  hora: number;
  url: string;
}

/** Foco de calor ativo detectado pelo satélite VIIRS (NASA FIRMS). */
export interface IntelIncendio {
  id: string;
  lng: number;
  lat: number;
  /** Data/hora de aquisição em ISO 8601 (UTC). */
  hora: string;
  confianca: string;
}

/** Leitura do índice planetário Kp (NOAA SWPC — clima espacial). */
export interface IntelClimaEspacial {
  kp: number;
  /** "Calmo" | "Instável" | "Tempestade G1"… — já em pt-BR. */
  classificacao: string;
  nivel: "calmo" | "instavel" | "tempestade";
  medidoEm: string;
}

/** Instantâneo consolidado de todas as fontes de inteligência. */
export interface IntelSnapshot {
  sismos: IntelSismo[];
  eventos: IntelEvento[];
  incendios: IntelIncendio[];
  /** false quando o servidor não tem FIRMS_MAP_KEY configurada. */
  incendiosDisponivel: boolean;
  climaEspacial: IntelClimaEspacial | null;
  /** Unix em milissegundos do momento da coleta. */
  atualizadoEm: number;
  /** Fontes que falharam nesta coleta (os dados vêm do último snapshot bom). */
  falhas: string[];
}

/** Visibilidade persistida das camadas de inteligência. */
export interface IntelVisibilidade {
  sismos: boolean;
  eventos: boolean;
  conflitos: boolean;
  noite: boolean;
  incendios: boolean;
}

export const INTEL_VIS_PADRAO: IntelVisibilidade = {
  sismos: true,
  eventos: true,
  conflitos: true,
  noite: false,
  incendios: true,
};
