/**
 * Ciclones tropicais ao vivo — NOAA NHC + JTWC via espelho Esri Live Feeds
 * (serviço "Active Hurricanes v1"), a mesma alimentação usada pelo Zoom
 * Earth para a camada de tempestades: posição observada, trilha percorrida,
 * trilha prevista com pontos por hora de projeção (TAU) e cone de erro.
 *
 * O serviço é público, aceita CORS (access-control-allow-origin: *) e cobre
 * todos os bastiões — Atlântico, Pacífico Leste/Oeste e Índico. O cliente
 * consulta direto, no mesmo padrão keyless do RainViewer e do Open-Meteo.
 *
 * As funções puras (classificação Saffir-Simpson e montagem das coleções
 * GeoJSON) são testáveis em Node; o ControladorCiclones segue o contrato dos
 * outros overlays: `abaixoDe` opcional, `sincronizar()` para o styledata e
 * congelamento após map.remove() (regressão do crash "getLayer").
 */
import type maplibregl from "maplibre-gl";

type ML = maplibregl.Map;

const BASE_ESRI =
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Active_Hurricanes_v1/FeatureServer";

const INTERVALO_REFRESCO_MS = 10 * 60_000;

// ---------------------------------------------------------------------------
// Identidades das camadas no estilo
// ---------------------------------------------------------------------------

const FONTE_CONE = "intel-ciclone-cone";
const FONTE_HIST = "intel-ciclone-hist";
const FONTE_PREV_LINHA = "intel-ciclone-prev-linha";
const FONTE_PREV_PONTO = "intel-ciclone-prev-ponto";
const FONTE_OBS = "intel-ciclone-obs";

const CAMADA_CONE_FILL = "intel-ciclone-cone-fill";
const CAMADA_CONE_LINHA = "intel-ciclone-cone-linha";
const CAMADA_HIST_LINHA = "intel-ciclone-hist-linha";
const CAMADA_PREV_LINHA = "intel-ciclone-prev-linha";
const CAMADA_PREV_PONTO = "intel-ciclone-prev-ponto";
const CAMADA_OBS_PONTO = "intel-ciclone-obs-ponto";
const CAMADA_OBS_ROTULO = "intel-ciclone-obs-rotulo";

export const CAMADAS_CICLONES = [
  CAMADA_CONE_FILL,
  CAMADA_CONE_LINHA,
  CAMADA_HIST_LINHA,
  CAMADA_PREV_LINHA,
  CAMADA_PREV_PONTO,
  CAMADA_OBS_PONTO,
  CAMADA_OBS_ROTULO,
];

const FONTS_TEXTO = ["Open Sans Regular", "Arial Unicode MS Regular"];

// ---------------------------------------------------------------------------
// Classificação Saffir-Simpson (pura)
// ---------------------------------------------------------------------------

export interface CategoriaCiclone {
  id: string;
  rotulo: string;
  cor: string;
}

/**
 * Classifica pelo vento máximo sustentado (nós) — mesmas faixas do NHC.
 * Depressão < 34 kt · Tempestade < 64 · Furacão 1/2 < 96 · Major (3/4/5) ≥ 96.
 */
export function categoriaCiclone(kt: number): CategoriaCiclone {
  if (!Number.isFinite(kt)) return { id: "nd", rotulo: "Intensidade n/d", cor: "#94A3B8" };
  if (kt < 34) return { id: "depressao", rotulo: "Depressão tropical", cor: "#38BDF8" };
  if (kt < 64) return { id: "tempestade", rotulo: "Tempestade tropical", cor: "#FACC15" };
  if (kt < 83) return { id: "cat1", rotulo: "Furacão cat. 1", cor: "#FB923C" };
  if (kt < 96) return { id: "cat2", rotulo: "Furacão cat. 2", cor: "#F97316" };
  if (kt < 113) return { id: "cat3", rotulo: "Furacão cat. 3 (major)", cor: "#EF4444" };
  if (kt < 137) return { id: "cat4", rotulo: "Furacão cat. 4 (major)", cor: "#DC2626" };
  return { id: "cat5", rotulo: "Furacão cat. 5 (major)", cor: "#B91C1C" };
}

/** Nós → km/h (arredondado). */
export function ktEmKmh(kt: number): number {
  return Math.round(kt * 1.852);
}

// ---------------------------------------------------------------------------
// Coleta e montagem das coleções GeoJSON (pura)
// ---------------------------------------------------------------------------

interface EsriFC {
  features?: Array<{
    properties?: Record<string, unknown>;
    geometry?: { type?: string; coordinates?: unknown } | null;
  }>;
}

export type { EsriFC };

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : NaN;
}

function texto(v: unknown): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

function fcVazio(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

/** Conjunto completo pronto para o mapa. */
export interface ConjuntoCiclones {
  /** Posição mais recente de cada ciclone (ponto com rótulo). */
  observados: GeoJSON.FeatureCollection;
  /** Trilha já percorrida (linhas observadas do boletim anterior ao atual). */
  historico: GeoJSON.FeatureCollection;
  /** Pontos da projeção (TAU = horas à frente). */
  previsaoPontos: GeoJSON.FeatureCollection;
  /** Linhas da projeção oficial. */
  previsaoLinhas: GeoJSON.FeatureCollection;
  /** Cone de erro e área de perigo. */
  cones: GeoJSON.FeatureCollection;
  /** Nomes distintos ativos — alimenta o HUD/folha. */
  nomes: string[];
}

/**
 * Monta as coleções a partir das 5 consultas do serviço (posições observadas,
 * trilhas observadas, pontos e linhas de projeção, cones). A posição
 * "observada" de cada ciclone é o ponto com maior DTG (data do boletim).
 */
export function montarConjunto(
  obs: EsriFC,
  obsLinhas: EsriFC,
  prev: EsriFC,
  prevLinhas: EsriFC,
  cones: EsriFC,
): ConjuntoCiclones {
  // --- posição observada mais recente por tempestade ---
  const ultimas = new Map<string, GeoJSON.Feature>();
  for (const f of obs.features ?? []) {
    const p = f.properties ?? {};
    const id = texto(p["STORMID"]);
    const geom = f.geometry as { type?: string; coordinates?: [number, number] } | null;
    if (!id || geom?.type !== "Point" || !Array.isArray(geom.coordinates)) continue;
    const dtg = num(p["DTG"]);
    const kt = num(p["INTENSITY"]);
    const cat = categoriaCiclone(kt);
    const existente = ultimas.get(id);
    if (existente && num((existente.properties as Record<string, unknown>)["DTG"]) >= dtg) continue;
    ultimas.set(id, {
      type: "Feature",
      geometry: { type: "Point", coordinates: geom.coordinates },
      properties: {
        stormid: id,
        nome: texto(p["STORMNAME"]).toUpperCase(),
        tipo: texto(p["STORMTYPE"]),
        basin: texto(p["BASIN"]),
        kt,
        kmh: Number.isFinite(kt) ? ktEmKmh(kt) : NaN,
        categoria: cat.rotulo,
        cor: cat.cor,
        mslp: num(p["MSLP"]),
        hora: dtg,
        DTG: dtg,
      },
    });
  }

  // --- movimento: pega TAU 0 da projeção (TCDIR/TCSPD por tempestade) ---
  const movimento = new Map<string, { dir: number; spd: number }>();
  for (const f of prev.features ?? []) {
    const p = f.properties ?? {};
    const id = texto(p["STORMID"]);
    const tau = num(p["TAU"]);
    if (!id || tau !== 0 || movimento.has(id)) continue;
    movimento.set(id, { dir: num(p["TCDIR"]), spd: num(p["TCSPD"]) });
  }

  const observados = fcVazio();
  observados.features = [...ultimas.values()].map((f) => {
    const p = f.properties as Record<string, unknown>;
    const m = movimento.get(texto(p["stormid"]));
    if (m && Number.isFinite(m.dir))
      p["movimento"] = `${Math.round(m.dir)}° · ${ktEmKmh(m.spd)} km/h`;
    return f;
  });

  // --- trilhas observadas ---
  const historico = fcVazio();
  historico.features = (obsLinhas.features ?? [])
    .filter((f) => (f.geometry as { type?: string } | null)?.type === "LineString")
    .map((f) => {
      const p = f.properties ?? {};
      const id = texto(p["STORMID"]);
      const u = ultimas.get(id);
      return {
        type: "Feature" as const,
        geometry: f.geometry as GeoJSON.LineString,
        properties: {
          stormid: id,
          nome: texto(p["STORMNAME"]).toUpperCase(),
          cor: u?.properties?.cor ?? "#94A3B8",
        },
      };
    });

  // --- projeção: pontos (TAU ≥ 0) e linhas ---
  const previsaoPontos = fcVazio();
  previsaoPontos.features = (prev.features ?? [])
    .filter((f) => (f.geometry as { type?: string } | null)?.type === "Point")
    .map((f) => {
      const p = f.properties ?? {};
      const kt = num(p["MAXWIND"]);
      const cat = categoriaCiclone(kt);
      const tau = num(p["TAU"]);
      const id = texto(p["STORMID"]);
      // A cor de cada ponto acompanha a intensidade prevista daquele instante
      // (mesma leitura do Zoom Earth: a trilha esfria/aquenta ao longo da
      // projeção).
      const cor = cat.cor;
      return {
        type: "Feature" as const,
        geometry: f.geometry as GeoJSON.Point,
        properties: {
          stormid: id,
          nome: texto(p["STORMNAME"]).toUpperCase(),
          tau,
          rotuloTau: tau <= 0 ? "AGORA" : `+${Math.round(tau)}h`,
          kt,
          kmh: Number.isFinite(kt) ? ktEmKmh(kt) : NaN,
          categoria: cat.rotulo,
          cor,
          mslp: num(p["MSLP"]),
          quando: texto(p["FLDATELBL"]),
        },
      };
    });

  const previsaoLinhas = fcVazio();
  previsaoLinhas.features = (prevLinhas.features ?? [])
    .filter((f) => (f.geometry as { type?: string } | null)?.type === "LineString")
    .map((f) => {
      const p = f.properties ?? {};
      const id = texto(p["STORMID"]);
      const u = ultimas.get(id);
      return {
        type: "Feature" as const,
        geometry: f.geometry as GeoJSON.LineString,
        properties: {
          stormid: id,
          nome: texto(p["STORMNAME"]).toUpperCase(),
          cor: u?.properties?.cor ?? "#F97316",
        },
      };
    });

  // --- cone de erro ---
  const conesFC = fcVazio();
  conesFC.features = (cones.features ?? [])
    .filter((f) => (f.geometry as { type?: string } | null)?.type === "Polygon")
    .map((f) => {
      const p = f.properties ?? {};
      const id = texto(p["STORMID"]);
      const u = ultimas.get(id);
      return {
        type: "Feature" as const,
        geometry: f.geometry as GeoJSON.Polygon,
        properties: {
          stormid: id,
          nome: texto(p["STORMNAME"]).toUpperCase(),
          maxLabel: texto(p["MAX_LABEL"]),
          cor: u?.properties?.cor ?? "#F97316",
        },
      };
    });

  const nomes = [...ultimas.values()]
    .map((f) => (f.properties as Record<string, unknown>)["nome"] as string)
    .filter(Boolean)
    .sort();

  return { observados, historico, previsaoPontos, previsaoLinhas, cones: conesFC, nomes };
}

/** Consulta GeoJSON a uma camada do serviço (CORS aberto, keyless). */
async function consultarCamada(cId: number, outFields: string): Promise<EsriFC> {
  const url =
    `${BASE_ESRI}/${cId}/query?where=1%3D1` +
    `&outFields=${encodeURIComponent(outFields)}` +
    `&outSR=4326&f=geojson&resultRecordCount=2000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as EsriFC;
}

/** Coleta o retrato completo dos ciclones ativos (5 consultas em paralelo). */
export async function coletarCiclones(): Promise<ConjuntoCiclones> {
  const [obs, obsLinhas, prev, prevLinhas, cones] = await Promise.all([
    consultarCamada(1, "STORMID,STORMNAME,STORMTYPE,BASIN,DTG,INTENSITY,MSLP"),
    consultarCamada(3, "STORMID,STORMNAME,BASIN"),
    consultarCamada(
      0,
      "STORMID,STORMNAME,STORMTYPE,BASIN,TAU,MAXWIND,GUST,MSLP,TCDIR,TCSPD,FLDATELBL",
    ),
    consultarCamada(2, "STORMID,STORMNAME,BASIN"),
    consultarCamada(4, "STORMID,STORMNAME,MAX_SS,MAX_WIND,MAX_LABEL,BASIN"),
  ]);
  return montarConjunto(obs, obsLinhas, prev, prevLinhas, cones);
}

// ---------------------------------------------------------------------------
// HTML do popup (mesmo estilo dos popups de inteligência)
// ---------------------------------------------------------------------------

function popupCiclone(p: Record<string, unknown>): string {
  const cor = texto(p["cor"]) || "#F97316";
  return (
    `<div class="font-bold" style="color:${cor}">${texto(p["categoria"]).toUpperCase()}</div>` +
    `<div class="font-bold">${texto(p["nome"])}</div>` +
    (Number.isFinite(num(p["kt"]))
      ? `<div>Vento ${Math.round(num(p["kt"]))} kt (${texto(p["kmh"])} km/h)</div>`
      : "") +
    (Number.isFinite(num(p["mslp"]))
      ? `<div class="text-muted-foreground">Pressão ${Math.round(num(p["mslp"]))} hPa</div>`
      : "") +
    (p["movimento"]
      ? `<div class="text-muted-foreground">Movimento ${texto(p["movimento"])}</div>`
      : "") +
    (p["quando"] ? `<div class="text-muted-foreground">${texto(p["quando"])}</div>` : "") +
    (p["maxLabel"] ? `<div class="text-muted-foreground">${texto(p["maxLabel"])}</div>` : "") +
    `<div class="text-muted-foreground">Fonte: NOAA NHC/JTWC · projeção oficial — o cone cobre ~2/3 dos erros históricos.</div>`
  );
}

// ---------------------------------------------------------------------------
// Controlador do overlay no MapLibre
// ---------------------------------------------------------------------------

export type EstadoCiclones = "off" | "carregando" | "ativo" | "erro";

/**
 * Liga/desliga e atualiza as camadas de ciclones. As fontes GeoJSON são
 * recriadas no estilo atual a cada apresentação (dados pequenos, poucas
 * vezes por minuto) — o `sincronizar()` cobre trocas de camada base.
 */
export class ControladorCiclones {
  private map: ML;
  private ativo = false;
  private destruido = false;
  private timer: number | null = null;
  private removerClique: (() => void) | null = null;
  abaixoDe?: string;
  aoEstado?: (estado: EstadoCiclones, total: number) => void;

  constructor(map: ML) {
    this.map = map;
    map.once("remove", () => {
      this.destruido = true;
      this.ativo = false;
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
    });
  }

  async ativar(): Promise<void> {
    if (this.destruido) return;
    this.ativo = true;
    this.aoEstado?.("carregando", 0);
    try {
      const conjunto = await coletarCiclones();
      if (!this.ativo || this.destruido) return;
      this.aplicar(conjunto);
      this.aoEstado?.("ativo", conjunto.nomes.length);
    } catch {
      if (this.ativo && !this.destruido) this.aoEstado?.("erro", 0);
      return;
    }
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => void this.ativar(), INTERVALO_REFRESCO_MS);
  }

  desativar(): void {
    this.ativo = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.remover();
    this.aoEstado?.("off", 0);
  }

  /** Reapresenta após troca de estilo/camada base (styledata). */
  sincronizar(): void {
    if (this.destruido || !this.ativo) {
      if (!this.destruido && !this.ativo) this.remover();
      return;
    }
    void this.ativar();
  }

  private remover(): void {
    if (this.destruido) return;
    try {
      const map = this.map;
      for (const id of CAMADAS_CICLONES) if (map.getLayer(id)) map.removeLayer(id);
      for (const f of [FONTE_CONE, FONTE_HIST, FONTE_PREV_LINHA, FONTE_PREV_PONTO, FONTE_OBS])
        if (map.getSource(f)) map.removeSource(f);
      if (this.removerClique) {
        this.removerClique();
        this.removerClique = null;
      }
    } catch {
      /* estilo em troca — nada a fazer */
    }
  }

  private aplicar(c: ConjuntoCiclones): void {
    if (this.destruido) return;
    try {
      const map = this.map;
      this.remover();
      const fonte = (id: string, fc: GeoJSON.FeatureCollection): void => {
        map.addSource(id, { type: "geojson", data: fc as never });
      };
      fonte(FONTE_CONE, c.cones);
      fonte(FONTE_HIST, c.historico);
      fonte(FONTE_PREV_LINHA, c.previsaoLinhas);
      fonte(FONTE_PREV_PONTO, c.previsaoPontos);
      fonte(FONTE_OBS, c.observados);

      map.addLayer({
        id: CAMADA_CONE_FILL,
        type: "fill",
        source: FONTE_CONE,
        paint: { "fill-color": "#FFFFFF", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: CAMADA_CONE_LINHA,
        type: "line",
        source: FONTE_CONE,
        paint: { "line-color": ["get", "cor"], "line-width": 1, "line-opacity": 0.5 },
      });
      map.addLayer({
        id: CAMADA_HIST_LINHA,
        type: "line",
        source: FONTE_HIST,
        paint: {
          "line-color": ["get", "cor"],
          "line-width": 2,
          "line-opacity": 0.55,
          "line-dasharray": [2, 2],
        },
      });
      map.addLayer({
        id: CAMADA_PREV_LINHA,
        type: "line",
        source: FONTE_PREV_LINHA,
        paint: { "line-color": ["get", "cor"], "line-width": 2.5, "line-opacity": 0.9 },
      });
      map.addLayer({
        id: CAMADA_PREV_PONTO,
        type: "circle",
        source: FONTE_PREV_PONTO,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 3, 8, 6],
          "circle-color": ["get", "cor"],
          "circle-stroke-color": "#0B0B0B",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: CAMADA_OBS_PONTO,
        type: "circle",
        source: FONTE_OBS,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 8, 9],
          "circle-color": ["get", "cor"],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: CAMADA_OBS_ROTULO,
        type: "symbol",
        source: FONTE_OBS,
        layout: {
          "text-field": ["concat", ["get", "nome"], " · ", ["get", "categoria"]],
          "text-size": 10,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-font": FONTS_TEXTO,
        },
        paint: {
          "text-color": "#FFFFFF",
          "text-halo-color": "#0A0A0A",
          "text-halo-width": 1.5,
        },
      });

      this.registrarClique();
    } catch {
      /* estilo em troca — o styledata reapresenta */
    }
  }

  /** Popup com detalhes da tempestade (pontos observados e de projeção). */
  private registrarClique(): void {
    if (this.removerClique) this.removerClique();
    const map = this.map;
    const aoClicar = async (e: maplibregl.MapMouseEvent) => {
      if (!this.ativo || this.destruido) return;
      try {
        const feicoes = map.queryRenderedFeatures(e.point, {
          layers: [CAMADA_OBS_PONTO, CAMADA_PREV_PONTO].filter((id) => map.getLayer(id)),
        });
        const f = feicoes[0];
        if (!f) return;
        const ml = await import("maplibre-gl");
        new ml.Popup({ closeButton: true, maxWidth: "300px" })
          .setLngLat(e.lngLat)
          .setHTML(popupCiclone((f.properties ?? {}) as Record<string, unknown>))
          .addTo(map);
      } catch {
        /* mapa em transição */
      }
    };
    map.on("click", aoClicar);
    this.removerClique = () => {
      map.off("click", aoClicar);
    };
  }
}
