/**
 * Catálogo das camadas da Visão Osiris — as mesmas 12 camadas do globo
 * OSIRIS self-hosted (osiris-fork.vercel.app). O painel "Camadas" monta a
 * query ?layers=<ids ativos> e o iframe recarrega automaticamente ao mudar.
 *
 * Ordem, emojis e nomes seguem a apresentação padrão da plataforma.
 */
export type CamadaOsirisId =
  | "maritime"
  | "satellites"
  | "cctv"
  | "cctv_previews"
  | "live_news"
  | "earthquakes"
  | "global_incidents"
  | "day_night"
  | "cables"
  | "sdk_maritime"
  | "sdk_air"
  | "sdk_naval";

export interface CamadaOsiris {
  id: CamadaOsirisId;
  emoji: string;
  nome: string;
}

export const CAMADAS_OSIRIS: CamadaOsiris[] = [
  { id: "maritime", emoji: "⚓", nome: "Marítimo" },
  { id: "satellites", emoji: "🛰️", nome: "Satélites" },
  { id: "cctv", emoji: "📹", nome: "Câmeras" },
  { id: "cctv_previews", emoji: "🖼️", nome: "Preview câmeras" },
  { id: "live_news", emoji: "📺", nome: "Notícias ao vivo" },
  { id: "earthquakes", emoji: "🌋", nome: "Terremotos" },
  { id: "global_incidents", emoji: "🌍", nome: "Incidentes globais" },
  { id: "day_night", emoji: "🌗", nome: "Ciclo dia/noite" },
  { id: "cables", emoji: "🔌", nome: "Cabos submarinos" },
  { id: "sdk_maritime", emoji: "🚢", nome: "SDK marítimo" },
  { id: "sdk_air", emoji: "✈️", nome: "SDK aéreo" },
  { id: "sdk_naval", emoji: "🛳️", nome: "SDK naval" },
];

/** Visibilidade por camada (persistida no IndexedDB junto das preferências). */
export type VisOsiris = Record<CamadaOsirisId, boolean>;

/** Padrão de abertura — as 7 camadas que vêm ligadas na referência. */
export const VIS_OSIRIS_PADRAO: VisOsiris = {
  maritime: true,
  satellites: true,
  cctv: false,
  cctv_previews: true,
  live_news: true,
  earthquakes: true,
  global_incidents: true,
  day_night: true,
  cables: false,
  sdk_maritime: false,
  sdk_air: false,
  sdk_naval: false,
};

/** Instância própria do OSIRIS (globo 3D de inteligência global). */
export const ORIGEM_OSIRIS = "https://osiris-fork.vercel.app";

/** Monta a URL do globo com as camadas ativas (?layers=a,b,c). */
export function urlGloboOsiris(vis: VisOsiris): string {
  const ativas = CAMADAS_OSIRIS.filter((c) => vis[c.id]).map((c) => c.id);
  return `${ORIGEM_OSIRIS}/?layers=${ativas.join(",")}`;
}
