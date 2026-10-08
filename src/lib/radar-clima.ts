/**
 * Radar de chuva ao vivo (RainViewer) + link externo para o Zoom Earth.
 *
 * As funções puras (URL do Zoom Earth, interpretação do índice do RainViewer,
 * rótulos de quadro, direção cardeal e códigos WMO de tempo) são testáveis em
 * Node. O ControladorRadar liga o overlay raster no MapLibre: busca o índice
 * de quadros, anima os últimos minutos de precipitação + previsão e sobrevive
 * às trocas de camada base (o styledata do MapShell reapresenta a camada).
 *
 * RainViewer e Open-Meteo são fontes públicas keyless — o aparelho consulta
 * diretamente, no mesmo padrão do AIS e dos TLEs de satélites.
 */
import type maplibregl from "maplibre-gl";

type ML = maplibregl.Map;

// ---------------------------------------------------------------------------
// Zoom Earth — deep link com a visão atual do mapa
// ---------------------------------------------------------------------------

export const URL_ZOOM_EARTH = "https://zoom.earth/maps/satellite/#view=";

/**
 * Deep link do Zoom Earth posicionado no ponto atual do mapa, com radar de
 * chuva, focos de calor e mira já ativados (mesma paleta de overlays que o
 * Manual usa). Zoom limitado à faixa que o Zoom Earth aceita (1–20).
 */
export function urlZoomEarth(lng: number, lat: number, zoom: number): string {
  const la = lat.toFixed(4);
  const lo = lng.toFixed(4);
  const z = Math.min(20, Math.max(1, zoom)).toFixed(2);
  return `${URL_ZOOM_EARTH}${la},${lo},${z}z/overlays=radar,fires,crosshair`;
}

// ---------------------------------------------------------------------------
// Índice de quadros do RainViewer
// ---------------------------------------------------------------------------

/** Um quadro do radar: instante Unix (segundos) e caminho dos tiles. */
export interface QuadroRadar {
  tempo: number;
  caminho: string;
}

/** Índice interpretado do RainViewer: host dos tiles + quadros passados e previstos. */
export interface IndiceRadar {
  host: string;
  passados: QuadroRadar[];
  previsoes: QuadroRadar[];
}

interface RespostaRainViewer {
  host?: string;
  radar?: {
    past?: Array<{ time?: number; path?: string }>;
    nowcast?: Array<{ time?: number; path?: string }>;
  };
}

/** Máximo de quadros passados mantidos na animação (~1 hora, passo de 10 min). */
export const MAX_PASSADOS = 6;

/**
 * Interpreta a resposta do índice público do RainViewer, mantendo os últimos
 * MAX_PASSADOS quadros passados e toda a nowcast (previsão de ~30 min).
 * Devolve null quando a resposta não tem host ou quadros utilizáveis.
 */
export function interpretarIndice(dados: RespostaRainViewer): IndiceRadar | null {
  const host = typeof dados?.host === "string" ? dados.host : "";
  const past = dados?.radar?.past;
  if (!host || !Array.isArray(past)) return null;
  const mapear = (f: { time?: number; path?: string }): QuadroRadar | null =>
    typeof f?.time === "number" && typeof f?.path === "string"
      ? { tempo: f.time, caminho: f.path }
      : null;
  const passados = past
    .map(mapear)
    .filter((f): f is QuadroRadar => f !== null)
    .slice(-MAX_PASSADOS);
  if (passados.length === 0) return null;
  const previsoes = (dados?.radar?.nowcast ?? [])
    .map(mapear)
    .filter((f): f is QuadroRadar => f !== null);
  return { host, passados, previsoes };
}

/**
 * Template de tile de um quadro: 256 px, esquema de cores 2 (universal
 * BluePurple→Rainbow), suavizado, com neve. A opacidade da camada fica no
 * MapShell (raster-opacity), o RainViewer já entrega fundo transparente.
 */
export function urlQuadro(host: string, caminho: string): string {
  return `${host}${caminho}/256/{z}/{x}/{y}/2/1_1.png`;
}

/**
 * Rótulo do quadro relativo a agora: "-30 min" (passado), "AGORA" (±2 min)
 * ou "+10 min" (previsão da nowcast). Agradável de ler no HUD.
 */
export function rotuloQuadro(tempo: number, agoraMs: number = Date.now()): string {
  const delta = Math.round((tempo * 1000 - agoraMs) / 60_000);
  if (delta > -2 && delta < 2) return "AGORA";
  return delta < 0 ? `${delta} min` : `+${delta} min`;
}

// ---------------------------------------------------------------------------
// Clima pontual (Open-Meteo) — rótulos e direção cardeal
// ---------------------------------------------------------------------------

/**
 * Converte graus verdadeiros em ponto cardeal de 8 setores (pt-BR:
 * Leste = L, Oeste = O, Noroeste = NO). Entradas fora de [0,360) são
 * normalizadas. Sem direção válida devolve "".
 */
export function cardeal(graus: number): string {
  if (!Number.isFinite(graus)) return "";
  const setores = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  const g = ((graus % 360) + 360) % 360;
  return setores[Math.round(g / 45) % 8];
}

/**
 * Código WMO de tempo atual (Open-Meteo) → rótulo em pt-BR. O rótulo é a
 * chave de tradução: os dicionários dos 6 idiomas carregam as versões
 * traduzidas, igual ao resto do Manual.
 */
export function rotuloWMO(codigo: number): string {
  if (!Number.isFinite(codigo)) return "Tempo indisponível";
  if (codigo === 0) return "Céu limpo";
  if (codigo === 1) return "Predominantemente limpo";
  if (codigo === 2) return "Parcialmente nublado";
  if (codigo === 3) return "Encoberto";
  if (codigo === 45 || codigo === 48) return "Neblina";
  if (codigo >= 51 && codigo <= 57) return "Garoa";
  if (codigo === 61 || codigo === 80) return "Chuva fraca";
  if (codigo === 63 || codigo === 81) return "Chuva moderada";
  if (codigo === 65 || codigo === 82) return "Chuva forte";
  if (codigo === 66 || codigo === 67) return "Chuva congelante";
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return "Neve";
  if (codigo === 95) return "Trovoada";
  if (codigo === 96 || codigo === 99) return "Trovoada com granizo";
  return "Tempo indisponível";
}

// ---------------------------------------------------------------------------
// Tiles de vento e temperatura (OpenWeatherMap) — mesmas camadas do Zoom Earth
// ---------------------------------------------------------------------------

/** Camadas de clima do Zoom Earth que o Manual replica com chave própria. */
export type CamadaClimaOwm = "vento" | "temperatura";

/** Nome da camada de tiles no serviço "Weather Maps 1.0" da OpenWeatherMap. */
export const TILES_OWM: Record<CamadaClimaOwm, string> = {
  vento: "wind_new",
  temperatura: "temp_new",
};

/**
 * Template de tile do OpenWeatherMap para a camada pedida. A chave viaja na
 * URL (exigência do serviço) — fica salva só no aparelho e é usada apenas
 * para consultar a fonte oficial, igual às chaves FIRMS/AIS.
 */
export function urlTileOwm(camada: CamadaClimaOwm, chave: string): string {
  const k = chave.trim();
  if (!k) return "";
  return `https://tile.openweathermap.org/map/${TILES_OWM[camada]}/{z}/{x}/{y}.png?appid=${encodeURIComponent(k)}`;
}

// ---------------------------------------------------------------------------
// Controlador do overlay raster no MapLibre
// ---------------------------------------------------------------------------

/** Estados de coleta do radar — espelham os rótulos da folha de camadas. */
export type EstadoRadar = "off" | "carregando" | "ativo" | "erro";

export interface InfoQuadro {
  rotulo: string;
  /** Índice do quadro atual dentro da fila (0 = mais antigo). */
  atual: number;
  total: number;
}

const ID_FONTE = "intel-radar";
const ID_CAMADA = "intel-radar";
const INTERVALO_FRAME_MS = 900;
const INTERVALO_REFRESCO_MS = 10 * 60_000;

/**
 * Liga/desliga e anima a camada de radar no mapa. A fonte raster única troca
 * de URL por quadro via setTiles (nativo do MapLibre ≥ 4.1) — sem recriar a
 * camada a cada frame. Sobrevive a trocas de camada base: o styledata do
 * MapShell chama sincronizar(), que reapresenta a camada quando ativa.
 */
export class ControladorRadar {
  private map: ML;
  private quadros: QuadroRadar[] = [];
  private host = "";
  private indice = 0;
  private ativo = false;
  private animando = true;
  private timerFrame: number | null = null;
  private timerRefresco: number | null = null;
  /** Camada intel existente abaixo da qual o radar entra (definido pelo MapShell). */
  abaixoDe?: string;
  aoEstado?: (estado: EstadoRadar) => void;
  aoQuadro?: (info: InfoQuadro) => void;

  constructor(map: ML) {
    this.map = map;
  }

  /** Estado atual da fila — o MapShell usa para reconstruir o HUD. */
  infoAtual(): InfoQuadro | null {
    if (this.quadros.length === 0) return null;
    return {
      rotulo: rotuloQuadro(this.quadros[this.indice]?.tempo ?? 0),
      atual: this.indice,
      total: this.quadros.length,
    };
  }

  async ativar(): Promise<void> {
    this.ativo = true;
    this.aoEstado?.("carregando");
    try {
      const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const idx = interpretarIndice((await res.json()) as RespostaRainViewer);
      if (!idx) throw new Error("índice sem quadros");
      this.host = idx.host;
      this.quadros = [...idx.passados, ...idx.previsoes];
    } catch {
      if (this.ativo) this.aoEstado?.("erro");
      return;
    }
    if (!this.ativo) return;
    // Apresenta o quadro mais recente do passado (o "agora" do radar).
    this.indice = Math.max(0, this.quadros.length - 1 - this.contarPrevisoes());
    this.apresentar();
    this.iniciarTimers();
    this.aoEstado?.("ativo");
    this.aoQuadro?.(this.infoAtual() as InfoQuadro);
  }

  /** Desliga: para os timers e remove camada/fonte do estilo. */
  desativar(): void {
    this.ativo = false;
    this.pararTimers();
    this.removerCamada();
    this.aoEstado?.("off");
  }

  /** Liga/pausa a animação (botão do HUD). Devolve o estado final. */
  alternarAnimacao(): boolean {
    this.animando = !this.animando;
    return this.animando;
  }

  /**
   * Reapresenta a camada após troca de estilo/camada base (styledata) — ou
   * garante que ela sumiu quando desligada. Sem refetch: os quadros ficam.
   */
  sincronizar(): void {
    if (this.ativo && this.quadros.length > 0) {
      this.apresentar();
    } else {
      this.removerCamada();
    }
  }

  private contarPrevisoes(): number {
    const ultimoPassado = this.quadros.reduce(
      (acc, f, i) => (f.caminho.includes("/past/") ? i : acc),
      -1,
    );
    return ultimoPassado < 0 ? 0 : this.quadros.length - 1 - ultimoPassado;
  }

  private iniciarTimers(): void {
    this.pararTimers();
    this.timerFrame = window.setInterval(() => this.avancar(), INTERVALO_FRAME_MS);
    this.timerRefresco = window.setInterval(() => void this.ativar(), INTERVALO_REFRESCO_MS);
  }

  private pararTimers(): void {
    if (this.timerFrame !== null) window.clearInterval(this.timerFrame);
    if (this.timerRefresco !== null) window.clearInterval(this.timerRefresco);
    this.timerFrame = null;
    this.timerRefresco = null;
  }

  private avancar(): void {
    if (!this.ativo || !this.animando || document.hidden) return;
    const proximo = (this.indice + 1) % this.quadros.length;
    this.mostrarQuadro(proximo);
  }

  private urlAtual(): string {
    return urlQuadro(this.host, this.quadros[this.indice].caminho);
  }

  /** Cria (ou atualiza) fonte + camada raster ancorada abaixo das intel. */
  private apresentar(): void {
    const map = this.map;
    const url = this.urlAtual();
    const fonte = map.getSource(ID_FONTE) as maplibregl.RasterTileSource | undefined;
    if (fonte && map.getLayer(ID_CAMADA)) {
      try {
        fonte.setTiles([url]);
      } catch {
        this.recriarCamada(url);
      }
      this.aoQuadro?.(this.infoAtual() as InfoQuadro);
      return;
    }
    this.removerCamada();
    map.addSource(ID_FONTE, {
      type: "raster",
      tiles: [url],
      tileSize: 256,
      attribution: "Radar © RainViewer",
    });
    map.addLayer(
      {
        id: ID_CAMADA,
        type: "raster",
        source: ID_FONTE,
        paint: { "raster-opacity": 0.7, "raster-fade-duration": 300 },
      },
      this.abaixoDe && map.getLayer(this.abaixoDe) ? this.abaixoDe : undefined,
    );
    this.aoQuadro?.(this.infoAtual() as InfoQuadro);
  }

  /** Fallback quando setTiles não está disponível: recria fonte e camada. */
  private recriarCamada(url: string): void {
    this.removerCamada();
    const map = this.map;
    map.addSource(ID_FONTE, {
      type: "raster",
      tiles: [url],
      tileSize: 256,
      attribution: "Radar © RainViewer",
    });
    map.addLayer(
      { id: ID_CAMADA, type: "raster", source: ID_FONTE, paint: { "raster-opacity": 0.7 } },
      this.abaixoDe && map.getLayer(this.abaixoDe) ? this.abaixoDe : undefined,
    );
  }

  private removerCamada(): void {
    const map = this.map;
    if (map.getLayer(ID_CAMADA)) map.removeLayer(ID_CAMADA);
    if (map.getSource(ID_FONTE)) map.removeSource(ID_FONTE);
  }

  private mostrarQuadro(i: number): void {
    this.indice = i;
    this.apresentar();
  }
}

// ---------------------------------------------------------------------------
// Camada raster estática (vento/temperatura da OpenWeatherMap)
// ---------------------------------------------------------------------------

/**
 * Controlador de uma camada raster simples — sem animação, sem fila de
 * quadros: uma fonte com template de tiles fixo. Usado pelo vento e pela
 * temperatura (OpenWeatherMap). Segue o mesmo contrato do ControladorRadar:
 * `abaixoDe` ancora sob as inteligências e `sincronizar()` reapresenta a
 * camada depois de trocas de camada base (evento styledata do MapShell).
 */
export class ControladorRasterSimples {
  private map: ML;
  private id: string;
  private url = "";
  private atribuicao = "";
  private opacidade = 0.7;
  private ativo = false;
  /** Camada intel existente abaixo da qual esta entra (definido pelo MapShell). */
  abaixoDe?: string;

  constructor(map: ML, id: string) {
    this.map = map;
    this.id = id;
  }

  /** Apresenta (ou atualiza) a camada com o template de tiles informado. */
  ativar(url: string, atribuicao: string, opacidade = 0.7): void {
    this.ativo = true;
    this.url = url;
    this.atribuicao = atribuicao;
    this.opacidade = opacidade;
    this.apresentar();
  }

  /** Desliga e remove fonte + camada do estilo. */
  desativar(): void {
    this.ativo = false;
    this.remover();
  }

  /**
   * Reapresenta após troca de estilo/camada base (styledata) — ou garante
   * que sumiu quando desligada. Sem refetch: o template de tiles fica.
   */
  sincronizar(): void {
    if (this.ativo && this.url) this.apresentar();
    else this.remover();
  }

  private apresentar(): void {
    const map = this.map;
    const fonte = map.getSource(this.id) as maplibregl.RasterTileSource | undefined;
    if (fonte && map.getLayer(this.id)) {
      try {
        fonte.setTiles([this.url]);
        return;
      } catch {
        this.remover();
      }
    }
    this.remover();
    map.addSource(this.id, {
      type: "raster",
      tiles: [this.url],
      tileSize: 256,
      attribution: this.atribuicao,
    });
    map.addLayer(
      {
        id: this.id,
        type: "raster",
        source: this.id,
        paint: { "raster-opacity": this.opacidade, "raster-fade-duration": 300 },
      },
      this.abaixoDe && map.getLayer(this.abaixoDe) ? this.abaixoDe : undefined,
    );
  }

  private remover(): void {
    const map = this.map;
    if (map.getLayer(this.id)) map.removeLayer(this.id);
    if (map.getSource(this.id)) map.removeSource(this.id);
  }
}
