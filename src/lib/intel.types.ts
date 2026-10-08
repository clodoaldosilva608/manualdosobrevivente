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
  /** Radar de chuva ao vivo (RainViewer) — precipitação + nowcast. */
  radar: boolean;
  /** Vento a 10 m em tiles ao vivo (OpenWeatherMap — requer chave do operador). */
  vento: boolean;
  /** Temperatura a 2 m em tiles ao vivo (OpenWeatherMap — requer chave do operador). */
  temperatura: boolean;
  /** Voos ao vivo (ADS-B) — militares globais + civis perto do centro. */
  voos: boolean;
  /** ISS + satélites de observação (TLE/Celestrak propagado no aparelho). */
  satelites: boolean;
  /** Alertas oficiais de desastre (GDACS). */
  alertas: boolean;
  /** Centrais nucleares (referência curada). */
  nuclear: boolean;
  /** Pontos marítimos estratégicos (chokepoints e portos, referência curada). */
  maritimo: boolean;
  /** Navios ao vivo via AIS (requer chave gratuita do usuário). */
  navios: boolean;
  /** Câmeras públicas ao vivo (webcams 24/7 — referência curada). */
  cameras: boolean;
  /** Cabos submarinos (rotas aproximadas — referência curada). */
  cabos: boolean;
  /** Manchetes GDELT geolocalizadas pelo país de origem do veículo. */
  noticias: boolean;
}

export const INTEL_VIS_PADRAO: IntelVisibilidade = {
  sismos: true,
  eventos: true,
  conflitos: true,
  noite: false,
  incendios: true,
  radar: false,
  vento: false,
  temperatura: false,
  voos: true,
  satelites: true,
  alertas: true,
  nuclear: false,
  maritimo: true,
  navios: false,
  cameras: false,
  cabos: false,
  noticias: false,
};

/** Chaves de serviço do usuário — ficam somente no aparelho (IndexedDB). */
export interface IntelChaves {
  /** NASA FIRMS (gratuita em firms.modaps.eosdis.nasa.gov). */
  firms: string;
  /** AISStream.io (gratuita em aisstream.io). */
  ais: string;
  /** OpenWeatherMap (gratuita em home.openweathermap.org) — vento e temperatura. */
  owm: string;
}

export const INTEL_CHAVES_PADRAO: IntelChaves = { firms: "", ais: "", owm: "" };

// ---------------------------------------------------------------------------
// Fase 2 — fontes adicionais (avião, espaço, alertas, notícias, ar, marítimo)
// ---------------------------------------------------------------------------

/** Aeronave ao vivo captada pela rede ADS-B (adsb.lol). */
export interface IntelVoo {
  /** Endereço ICAO 24 bits (hex) — identificador único da aeronave. */
  id: string;
  /** Indicativo de chamada (callsign), ex.: "TAM3565". */
  indicativo: string;
  /** Código do modelo (ex.: "A321", "B738"), pode ser vazio. */
  tipo: string;
  /** Matrícula (ex.: "PT-XPJ"), pode ser vazia. */
  matricula: string;
  lng: number;
  lat: number;
  /** Altitude barométrica em pés; null quando a aeronave está no solo. */
  altitude: number | null;
  /** Velocidade sobre o solo em nós. */
  velocidade: number | null;
  /** Rumo em graus verdadeiros. */
  rumo: number | null;
  militar: boolean;
  /** Emergência informada pelo transponder ("none" quando normal). */
  emergencia: string;
}

/** Posição atual da ISS com trajetória prevista e pegada de visibilidade. */
export interface IntelIss {
  lng: number;
  lat: number;
  /** Altitude orbital em km. */
  altitudeKm: number;
  /** Velocidade orbital em km/h. */
  velocidadeKmh: number;
  /** "daylight" (iluminada) ou "eclipsed" (sombra da Terra). */
  visibilidade: string;
  /** Raio da pegada de visibilidade a partir do ponto em km. */
  pegadaKm: number;
  /** Unix em milissegundos da posição. */
  hora: number;
  /** Trajetória prevista (lng, lat) para as próximas ~3 órbitas. */
  trajetoria: Array<[number, number]>;
}

/** Alerta oficial de desastre do GDACS (sistema da UE/ONU). */
export interface IntelAlerta {
  id: string;
  tipoId: string;
  /** Tipo em pt-BR ("Terremoto", "Ciclone tropical"…). */
  tipo: string;
  nome: string;
  /** País (nome ou código ISO3). */
  pais: string;
  nivel: "Green" | "Orange" | "Red";
  lng: number;
  lat: number;
  /** Data de início em ISO 8601. */
  inicio: string;
  url: string;
}

/** Manchete global do GDELT (notícias de emergência, 24 h). */
export interface IntelNoticia {
  titulo: string;
  url: string;
  /** Domínio do veículo (ex.: "reuters.com"). */
  fonte: string;
  /** Código do país de origem da veículo. */
  pais: string;
  /** Unix em milissegundos da publicação. */
  hora: number;
}

/** Qualidade do ar no ponto central do mapa (Open-Meteo). */
export interface IntelAr {
  /** Índice europeu de qualidade do ar (0–100+; menor é melhor). */
  aqiEuropeu: number;
  usAqi: number;
  pm25: number;
  pm10: number;
  /** Ozônio em µg/m³. */
  ozonio: number;
  classificacao: string;
  nivel: "boa" | "razoavel" | "moderada" | "pobre" | "muito-pobre" | "extrema";
  medidoEm: string;
}

/** Clima pontual no centro do mapa (Open-Meteo Forecast). */
export interface IntelClima {
  /** Temperatura do ar a 2 m em °C. */
  temperatura: number;
  /** Sensação térmica em °C. */
  aparente: number;
  /** Umidade relativa em %. */
  umidade: number;
  /** Precipitação acumulada na última hora em mm. */
  precipitacao: number;
  /** Código WMO bruto (para quem quiser reclassificar). */
  codigoWmo: number;
  /** Rótulo do tempo em pt-BR — chave de tradução dos dicionários. */
  rotulo: string;
  /** Vento a 10 m em km/h. */
  ventoKmh: number;
  /** Rajada máxima em km/h. */
  rajadaKmh: number;
  /** Direção do vento em graus verdadeiros. */
  direcaoGraus: number;
  /** Direção cardeal (N, NE, L…). */
  direcao: string;
  /** Nuvens totais em %. */
  nuvens: number;
  /** ISO 8601 UTC da leitura. */
  medidoEm: string;
}

/** Navio ao vivo recebido via AIS (aisstream.io, WebSocket do navegador). */
export interface IntelNavio {
  mmsi: string;
  nome: string;
  lng: number;
  lat: number;
  /** Velocidade sobre o solo em nós. */
  velocidade: number | null;
  /** Rumo sobre o solo em graus. */
  rumo: number | null;
  /** Unix em milissegundos do último relato. */
  hora: number;
}

/** Satélite em órbita propagado localmente a partir de TLEs (Celestrak). */
export interface IntelSatelite {
  /** Número NORAD do objeto. */
  norad: number;
  nome: string;
  lng: number;
  lat: number;
  /** Altitude orbital em km. */
  altitudeKm: number;
  /** Velocidade orbital em km/h. */
  velocidadeKmh: number;
  /** Unix em milissegundos da época da propagação. */
  hora: number;
}
