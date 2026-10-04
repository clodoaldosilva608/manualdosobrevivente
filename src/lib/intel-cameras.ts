/**
 * Câmeras públicas ao vivo (camada "Câmeras" do mapa tático — paridade com a
 * camada CCTV do globo OSIRIS). Referência curada: cada câmera é um stream
 * 24/7 público no YouTube; o popup embute o player e oferece o link original.
 *
 * Os videoIds foram verificados via oEmbed do YouTube no momento da curadoria;
 * streams ao vivo podem ser descontinuados pelos canais — o popup sempre
 * mantém o link para a página original como fallback.
 */
export interface IntelCamera {
  id: string;
  nome: string;
  /** Canal/ofício responsável pelo stream. */
  canal: string;
  cidade: string;
  pais: string;
  lng: number;
  lat: number;
  categoria: "cidade" | "praia" | "rodovia" | "porto" | "aeroporto" | "natureza";
  /** ID do vídeo/stream ao vivo no YouTube. */
  videoId: string;
}

export const ROTULO_CATEGORIA_CAMERA: Record<IntelCamera["categoria"], string> = {
  cidade: "Cidade",
  praia: "Praia",
  rodovia: "Rodovia",
  porto: "Porto",
  aeroporto: "Aeroporto",
  natureza: "Natureza",
};

export const CAMERAS: IntelCamera[] = [
  // ── Brasil ──
  {
    id: "cam-bc-atlantica",
    nome: "Balneário Camboriú — Av. Atlântica",
    canal: "CLIMA BC Brazil",
    cidade: "Balneário Camboriú, SC",
    pais: "Brasil",
    lng: -48.6346,
    lat: -26.9987,
    categoria: "praia",
    videoId: "5Xl6pSgiy3A",
  },
  {
    id: "cam-copacabana",
    nome: "Rio de Janeiro — Copacabana Posto 3",
    canal: "Homes in Rio",
    cidade: "Rio de Janeiro, RJ",
    pais: "Brasil",
    lng: -43.19,
    lat: -22.9753,
    categoria: "praia",
    videoId: "1161FQ2rIyw",
  },
  {
    id: "cam-br101-210",
    nome: "BR-101 KM 210 — sentido Sul",
    canal: "AEMFLO e CDL São José",
    cidade: "São José, SC",
    pais: "Brasil",
    lng: -48.6282,
    lat: -27.6095,
    categoria: "rodovia",
    videoId: "5T4VVezfafo",
  },
  {
    id: "cam-itajai-viaduto",
    nome: "Itajaí — Viaduto Reinaldo Schmithausen",
    canal: "ConexãoDCTV",
    cidade: "Itajaí, SC",
    pais: "Brasil",
    lng: -48.6619,
    lat: -26.9089,
    categoria: "rodovia",
    videoId: "NwbOe1Mb__M",
  },
  // ── Américas ──
  {
    id: "cam-times-square",
    nome: "Nova York — Times Square",
    canal: "FOX 5 New York",
    cidade: "Nova York, NY",
    pais: "Estados Unidos",
    lng: -73.9855,
    lat: 40.758,
    categoria: "cidade",
    videoId: "VGnFLdQW39A",
  },
  {
    id: "cam-east-river",
    nome: "Nova York — East River Ferry (E 34th St)",
    canal: "NYC Ferry",
    cidade: "Nova York, NY",
    pais: "Estados Unidos",
    lng: -73.972,
    lat: 40.742,
    categoria: "porto",
    videoId: "HLRrSxAbfi0",
  },
  {
    id: "cam-jfk",
    nome: "Aeroporto JFK — planespotting",
    canal: "Airplane Live",
    cidade: "Nova York, NY",
    pais: "Estados Unidos",
    lng: -73.7781,
    lat: 40.6413,
    categoria: "aeroporto",
    videoId: "11INCtK6uiA",
  },
  {
    id: "cam-venice-beach",
    nome: "Los Angeles — Venice Beach",
    canal: "Teleport.camera",
    cidade: "Los Angeles, CA",
    pais: "Estados Unidos",
    lng: -118.4695,
    lat: 33.985,
    categoria: "praia",
    videoId: "EO_1LWqsCNE",
  },
  {
    id: "cam-venice-surf",
    nome: "Los Angeles — Venice Beach surf cam",
    canal: "Venice Vive",
    cidade: "Los Angeles, CA",
    pais: "Estados Unidos",
    lng: -118.4717,
    lat: 33.9809,
    categoria: "praia",
    videoId: "GBcHDAT_8H4",
  },
  {
    id: "cam-vancouver",
    nome: "Vancouver — Canada Place",
    canal: "Vancouver City Views",
    cidade: "Vancouver, BC",
    pais: "Canadá",
    lng: -123.1111,
    lat: 49.2888,
    categoria: "porto",
    videoId: "rxyNjFKwzJA",
  },
  // ── Europa ──
  {
    id: "cam-veneza",
    nome: "Veneza — Grand Canal",
    canal: "I Love You Venice",
    cidade: "Veneza",
    pais: "Itália",
    lng: 12.3388,
    lat: 45.434,
    categoria: "cidade",
    videoId: "a1mcaV3Sf9U",
  },
  {
    id: "cam-chioggia",
    nome: "Chioggia Sottomarina (Veneza)",
    canal: "I Love You Venice",
    cidade: "Chioggia",
    pais: "Itália",
    lng: 12.2772,
    lat: 45.2139,
    categoria: "praia",
    videoId: "3LGl860wEaY",
  },
  {
    id: "cam-london-bridge",
    nome: "Londres — London Bridge / Tâmisa",
    canal: "Beach Life Cams",
    cidade: "Londres",
    pais: "Reino Unido",
    lng: -0.0887,
    lat: 51.5065,
    categoria: "cidade",
    videoId: "AoWlXqIXNZ8",
  },
  {
    id: "cam-manchester",
    nome: "Manchester — centro ao vivo",
    canal: "Manchester UK Webcams",
    cidade: "Manchester",
    pais: "Reino Unido",
    lng: -2.2426,
    lat: 53.4808,
    categoria: "cidade",
    videoId: "ILZ3nZ_7cu8",
  },
  {
    id: "cam-paris-eiffel",
    nome: "Paris — Torre Eiffel e Sena",
    canal: "SGK Walks",
    cidade: "Paris",
    pais: "França",
    lng: 2.2945,
    lat: 48.8584,
    categoria: "cidade",
    videoId: "5dsrqrzTPEo",
  },
  {
    id: "cam-lyon-periph",
    nome: "Lyon — Périphérique Nord",
    canal: "Périphérique Nord",
    cidade: "Lyon",
    pais: "França",
    lng: 4.857,
    lat: 45.773,
    categoria: "rodovia",
    videoId: "EBhCrTPpdBI",
  },
  {
    id: "cam-brest",
    nome: "Brest — marina Moulin Blanc",
    canal: "Vision-Environnement",
    cidade: "Brest",
    pais: "França",
    lng: -4.47,
    lat: 48.383,
    categoria: "porto",
    videoId: "4UySgdAAEJA",
  },
  {
    id: "cam-helsinki",
    nome: "Porto de Helsinki — West Harbour",
    canal: "Port of Helsinki",
    cidade: "Helsinki",
    pais: "Finlândia",
    lng: 24.921,
    lat: 60.1524,
    categoria: "porto",
    videoId: "6hPWq2IG08M",
  },
  // ── Ásia, África e Oceania ──
  {
    id: "cam-shinjuku",
    nome: "Tóquio — cruzamento de Shinjuku",
    canal: "LIVE Shinjuku O-Guard",
    cidade: "Tóquio",
    pais: "Japão",
    lng: 139.6998,
    lat: 35.6926,
    categoria: "cidade",
    videoId: "6dp-bvQ7RWo",
  },
  {
    id: "cam-tokyo-dome",
    nome: "Tóquio — Tokyo Dome City",
    canal: "Tokyo Dome City",
    cidade: "Tóquio",
    pais: "Japão",
    lng: 139.7519,
    lat: 35.7056,
    categoria: "cidade",
    videoId: "7XzfKy8CzdY",
  },
  {
    id: "cam-lanzarote",
    nome: "Aeroporto de Lanzarote",
    canal: "LanzaroteWebcam",
    cidade: "Lanzarote",
    pais: "Espanha",
    lng: -13.6052,
    lat: 28.9445,
    categoria: "aeroporto",
    videoId: "AAlo3eCPVbk",
  },
  {
    id: "cam-sea-point",
    nome: "Cidade do Cabo — Sea Point",
    canal: "Vanilla",
    cidade: "Cidade do Cabo",
    pais: "África do Sul",
    lng: 18.384,
    lat: -33.917,
    categoria: "praia",
    videoId: "4Zu64CmAjMo",
  },
];

/** URL do player embutido do YouTube para uma câmera. */
export function urlEmbedCamera(cam: IntelCamera): string {
  return `https://www.youtube.com/embed/${cam.videoId}?rel=0`;
}

/** URL da página original do stream (fallback fora do popup). */
export function urlPaginaCamera(cam: IntelCamera): string {
  return `https://www.youtube.com/watch?v=${cam.videoId}`;
}
