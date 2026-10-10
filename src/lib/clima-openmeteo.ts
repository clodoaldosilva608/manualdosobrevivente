/**
 * Vento e temperatura ao vivo SEM CHAVE — Open-Meteo (fonte pública aberta,
 * CORS habilitado), a mesma origem das leituras pontuais do boletim.
 *
 * Vento: partículas animadas sobre o mapa (mesma leitura visual do Zoom
 * Earth/Windy). O aparelho amostra uma grade do retângulo visível em uma
 * única chamada (Open-Meteo aceita várias coordenadas por requisição),
 * interpola bilinearmente e move partículas em canvas por cima do mapa.
 *
 * Temperatura: pontos coloridos com rótulo em °C na mesma grade; pontos com
 * tempo severo (código WMO ≥ 95, trovoada) ganham anel de alerta vermelho.
 *
 * As funções puras (grade, URL, cor, interpretação, interpolação) são
 * testáveis em Node. Os controladores seguem o contrato dos overlays:
 * congelam após map.remove() e operam em try/catch para sobreviver a trocas
 * de camada base (regressão do crash "getLayer").
 */
import type maplibregl from "maplibre-gl";

type ML = maplibregl.Map;

const URL_BASE = "https://api.open-meteo.com/v1/forecast";
const INTERVALO_REFRESCO_MS = 15 * 60_000;
const FONTE = "intel-temperatura";
const CAMADA_CIRCULO = "intel-temperatura-circle";
const CAMADA_ROTULO = "intel-temperatura-rotulo";
const FONTS_TEXTO = ["Open Sans Regular", "Arial Unicode MS Regular"];

// ---------------------------------------------------------------------------
// Grade de amostragem (pura)
// ---------------------------------------------------------------------------

/** Retângulo geográfico — oeste/sul/leste/norte em graus. */
export interface Retangulo {
  o: number;
  s: number;
  l: number;
  n: number;
}

/**
 * Pontos [lng, lat] da grade, linha a linha do canto NOROESTE (lat desce,
 * lng cresce) — convenção usada pelo interpolador bilinear.
 */
export function amostrarGrade(r: Retangulo, nx: number, ny: number): Array<[number, number]> {
  const pontos: Array<[number, number]> = [];
  const limita = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
  for (let linha = 0; linha < ny; linha++) {
    const lat = limita(r.n - ((r.n - r.s) * linha) / (ny - 1), -85, 85);
    for (let col = 0; col < nx; col++) {
      const lng = limita(r.o + ((r.l - r.o) * col) / (nx - 1), -179.9, 179.9);
      pontos.push([lng, lat]);
    }
  }
  return pontos;
}

/** URL da consulta única de toda a grade (leituras atuais). */
export function urlGradeOpenMeteo(pontos: Array<[number, number]>): string {
  const lats = pontos.map((p) => p[1].toFixed(3)).join(",");
  const lngs = pontos.map((p) => p[0].toFixed(3)).join(",");
  return (
    `${URL_BASE}?latitude=${lats}&longitude=${lngs}` +
    "&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
    "&wind_speed_unit=ms"
  );
}

// ---------------------------------------------------------------------------
// Interpretação da resposta (pura)
// ---------------------------------------------------------------------------

export interface LeituraGrade {
  lng: number;
  lat: number;
  /** Temperatura a 2 m em °C. */
  temperatura: number;
  /** Código WMO do tempo atual. */
  codigo: number;
  /** Vento a 10 m em m/s. */
  ventoMs: number;
  /** Direção meteorológica (de onde sopra) em graus. */
  direcao: number;
  /** Rajada em m/s (quando existir). */
  rajadaMs: number;
}

interface RespostaOmeteo {
  latitude?: number;
  longitude?: number;
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
}

/**
 * Interpreta a resposta da API — array quando há várias coordenadas, objeto
 * único quando há uma — casando cada leitura com o ponto pedido (a API
 * devolve na ordem da consulta, mas confia nas coordenadas de resposta).
 */
export function interpretarGrade(dados: unknown, pontos: Array<[number, number]>): LeituraGrade[] {
  const lista: RespostaOmeteo[] = Array.isArray(dados)
    ? (dados as RespostaOmeteo[])
    : dados && typeof dados === "object"
      ? [dados as RespostaOmeteo]
      : [];
  const leituras: LeituraGrade[] = [];
  for (let i = 0; i < lista.length; i++) {
    const r = lista[i];
    const c = r?.current;
    if (!c) continue;
    const lng = typeof r.longitude === "number" ? r.longitude : pontos[i]?.[0];
    const lat = typeof r.latitude === "number" ? r.latitude : pontos[i]?.[1];
    if (lng == null || lat == null) continue;
    const temp = typeof c.temperature_2m === "number" ? c.temperature_2m : NaN;
    if (!Number.isFinite(temp)) continue;
    leituras.push({
      lng,
      lat,
      temperatura: temp,
      codigo: typeof c.weather_code === "number" ? c.weather_code : 0,
      ventoMs: typeof c.wind_speed_10m === "number" ? c.wind_speed_10m : NaN,
      direcao: typeof c.wind_direction_10m === "number" ? c.wind_direction_10m : NaN,
      rajadaMs: typeof c.wind_gusts_10m === "number" ? c.wind_gusts_10m : NaN,
    });
  }
  return leituras;
}

/** Cor da identidade visual para a temperatura (escala −20 °C → 40 °C+). */
export function corTemperatura(t: number): string {
  if (!Number.isFinite(t)) return "#94A3B8";
  if (t <= -20) return "#4338CA";
  if (t <= -10) return "#3B82F6";
  if (t <= 0) return "#22D3EE";
  if (t <= 8) return "#34D399";
  if (t <= 16) return "#A3E635";
  if (t <= 22) return "#FDE047";
  if (t <= 28) return "#FB923C";
  if (t <= 34) return "#F97316";
  if (t <= 40) return "#EF4444";
  return "#DC2626";
}

/** Rótulo curto do ponto: "27°". */
export function rotuloTemperatura(t: number): string {
  if (!Number.isFinite(t)) return "—";
  return `${Math.round(t)}°`;
}

// ---------------------------------------------------------------------------
// Interpolação do vento (pura)
// ---------------------------------------------------------------------------

/** Decomposição da direção meteorológica em componentes (leste/norte). */
export function componentesVento(
  velocidadeMs: number,
  direcaoGraus: number,
): { u: number; v: number } {
  if (!Number.isFinite(velocidadeMs) || !Number.isFinite(direcaoGraus)) return { u: 0, v: 0 };
  const rad = ((direcaoGraus % 360) + 360) * (Math.PI / 180);
  // O vento sopra DE onde a direção aponta — daí o sinal negativo.
  return { u: -velocidadeMs * Math.sin(rad), v: -velocidadeMs * Math.cos(rad) };
}

export interface GradeVento {
  buscar: (lng: number, lat: number) => { u: number; v: number };
}

/**
 * Interpolador bilinear sobre a grade amostrada (mesma convenção da
 * `amostrarGrade`): linha 0 = norte, coluna 0 = oeste. Fora da grade devolve
 * o valor da borda mais próxima — as partículas nunca "caem".
 */
export function gradeVento(
  r: Retangulo,
  nx: number,
  ny: number,
  leituras: LeituraGrade[],
): GradeVento {
  const porIndice = new Map<number, { u: number; v: number }>();
  for (let i = 0; i < leituras.length; i++) {
    const l = leituras[i];
    // Acha o índice da grade mais próximo do ponto respondido.
    const col = Math.round(((l.lng - r.o) / (r.l - r.o)) * (nx - 1));
    const linha = Math.round(((r.n - l.lat) / (r.n - r.s)) * (ny - 1));
    const idx = Math.min(ny - 1, Math.max(0, linha)) * nx + Math.min(nx - 1, Math.max(0, col));
    porIndice.set(idx, componentesVento(l.ventoMs, l.direcao));
  }
  const pegar = (linha: number, col: number): { u: number; v: number } => {
    const l = Math.min(ny - 1, Math.max(0, linha));
    const c = Math.min(nx - 1, Math.max(0, col));
    return porIndice.get(l * nx + c) ?? { u: 0, v: 0 };
  };
  return {
    buscar(lng: number, lat: number): { u: number; v: number } {
      const colF = ((lng - r.o) / (r.l - r.o)) * (nx - 1);
      const linhaF = ((r.n - lat) / (r.n - r.s)) * (ny - 1);
      const l0 = Math.floor(linhaF);
      const c0 = Math.floor(colF);
      const tl = Math.min(1, Math.max(0, linhaF - l0));
      const tc = Math.min(1, Math.max(0, colF - c0));
      const a = pegar(l0, c0);
      const b = pegar(l0, c0 + 1);
      const c2 = pegar(l0 + 1, c0);
      const d = pegar(l0 + 1, c0 + 1);
      return {
        u: a.u * (1 - tl) * (1 - tc) + b.u * (1 - tl) * tc + c2.u * tl * (1 - tc) + d.u * tl * tc,
        v: a.v * (1 - tl) * (1 - tc) + b.v * (1 - tl) * tc + c2.v * tl * (1 - tc) + d.v * tl * tc,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Controlador do vento (partículas em canvas)
// ---------------------------------------------------------------------------

export type EstadoClima = "off" | "carregando" | "ativo" | "erro";

interface Particula {
  lng: number;
  lat: number;
  /** Última posição projetada (px) — para desenhar o rastro. */
  px: number | null;
  py: number | null;
  idade: number;
  maxIdade: number;
}

const NX_VENTO = 14;
const NY_VENTO = 9;
const FATOR_VELOCIDADE = 22; // estética: partícula ~22× mais rápida que a real
const MAX_PARTICULAS = 420;

export class ControladorVento {
  private map: ML;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private raf: number | null = null;
  private timerRefresco: number | null = null;
  private timerDebounce: number | null = null;
  private ultimoFrame: number | null = null;
  private particulas: Particula[] = [];
  private grade: GradeVento | null = null;
  private ret: Retangulo | null = null;
  private ativo = false;
  private destruido = false;
  private aoMove = () => {
    if (!this.ativo || this.destruido) return;
    if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
    this.timerDebounce = window.setTimeout(() => void this.coletar(), 1400);
  };
  abaixoDe?: string;
  aoEstado?: (estado: EstadoClima) => void;

  constructor(map: ML, container: HTMLElement) {
    this.map = map;
    this.container = container;
    map.once("remove", () => {
      this.destruido = true;
      this.ativo = false;
      this.pararTudo();
    });
  }

  ativar(): void {
    if (this.destruido || this.ativo) return;
    this.ativo = true;
    this.criarCanvas();
    this.aoEstado?.("carregando");
    void this.coletar();
    this.timerRefresco = window.setInterval(() => void this.coletar(), INTERVALO_REFRESCO_MS);
    this.map.on("moveend", this.aoMove);
  }

  desativar(): void {
    this.ativo = false;
    this.pararTudo();
    this.aoEstado?.("off");
  }

  /** O canvas sobrevive às trocas de estilo — nada a reapresentar. */
  sincronizar(): void {
    /* intencionalmente vazio */
  }

  private pararTudo(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.timerRefresco !== null) window.clearInterval(this.timerRefresco);
    this.timerRefresco = null;
    if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
    this.timerDebounce = null;
    this.map.off("moveend", this.aoMove);
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    this.particulas = [];
    this.grade = null;
  }

  private criarCanvas(): void {
    if (this.canvas) return;
    const canvas = document.createElement("canvas");
    canvas.className = "pointer-events-none absolute inset-0";
    canvas.style.zIndex = "1";
    canvas.setAttribute("data-test", "intel-vento-canvas");
    this.container.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  private async coletar(): Promise<void> {
    if (!this.ativo || this.destruido) return;
    try {
      const b = this.map.getBounds();
      const margemLng = (b.getEast() - b.getWest()) * 0.25;
      const margemLat = (b.getNorth() - b.getSouth()) * 0.25;
      const r: Retangulo = {
        o: b.getWest() - margemLng,
        l: b.getEast() + margemLng,
        s: Math.max(-85, b.getSouth() - margemLat),
        n: Math.min(85, b.getNorth() + margemLat),
      };
      const pontos = amostrarGrade(r, NX_VENTO, NY_VENTO);
      const res = await fetch(urlGradeOpenMeteo(pontos));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const leituras = interpretarGrade(await res.json(), pontos);
      if (!this.ativo || this.destruido) return;
      if (leituras.length === 0) throw new Error("grade vazia");
      this.ret = r;
      this.grade = gradeVento(r, NX_VENTO, NY_VENTO, leituras);
      this.semeiaParticulas();
      this.aoEstado?.("ativo");
      if (this.raf === null) {
        this.ultimoFrame = null;
        this.raf = requestAnimationFrame(this.quadro);
      }
    } catch {
      if (this.ativo && !this.destruido) this.aoEstado?.("erro");
    }
  }

  /** Distribui partículas uniformemente pela grade atual. */
  private semeiaParticulas(): void {
    const r = this.ret;
    if (!r) return;
    const alvo = Math.min(
      MAX_PARTICULAS,
      Math.round(Math.min(1, Math.abs(r.l - r.o) / 40) * MAX_PARTICULAS) || MAX_PARTICULAS / 3,
    );
    this.particulas = Array.from({ length: alvo }, () => this.novaParticula());
  }

  private novaParticula(): Particula {
    const r = this.ret as Retangulo;
    return {
      lng: r.o + Math.random() * (r.l - r.o),
      lat: r.s + Math.random() * (r.n - r.s),
      px: null,
      py: null,
      idade: 0,
      maxIdade: 60 + Math.floor(Math.random() * 120),
    };
  }

  private quadro = (t: number): void => {
    if (this.destruido || !this.ativo) {
      this.raf = null;
      return;
    }
    this.raf = requestAnimationFrame(this.quadro);
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx || !this.grade || !this.ret) return;
    if (document.hidden) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const largura = this.container.clientWidth;
    const altura = this.container.clientHeight;
    if (canvas.width !== Math.round(largura * dpr) || canvas.height !== Math.round(altura * dpr)) {
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dt = this.ultimoFrame == null ? 16 : Math.min(64, t - this.ultimoFrame);
    this.ultimoFrame = t;
    const dtSeg = dt / 1000;

    // Rastro: apaga 12% do quadro anterior em vez de limpar tudo.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, largura, altura);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(248,250,252,0.75)";

    const r = this.ret;
    const mapa = this.map;
    ctx.beginPath();
    for (const p of this.particulas) {
      const vento = this.grade.buscar(p.lng, p.lat);
      const cosLat = Math.max(0.15, Math.cos((p.lat * Math.PI) / 180));
      const dLat = (vento.v * dtSeg * FATOR_VELOCIDADE) / 111_320;
      const dLng = (vento.u * dtSeg * FATOR_VELOCIDADE) / (111_320 * cosLat);
      const nLng = p.lng + dLng;
      const nLat = p.lat + dLat;
      const ponto = mapa.project([nLng, nLat]);
      if (p.px != null && p.py != null) {
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(ponto.x, ponto.y);
      }
      p.px = ponto.x;
      p.py = ponto.y;
      p.lng = nLng;
      p.lat = nLat;
      p.idade += 1;
      const dentro =
        ponto.x > -60 &&
        ponto.x < largura + 60 &&
        ponto.y > -60 &&
        ponto.y < altura + 60 &&
        nLat >= r.s - 4 &&
        nLat <= r.n + 4 &&
        nLng >= r.o - 4 &&
        nLng <= r.l + 4;
      if (!dentro || p.idade > p.maxIdade) {
        const nova = this.novaParticula();
        p.lng = nova.lng;
        p.lat = nova.lat;
        p.px = null;
        p.py = null;
        p.idade = 0;
        p.maxIdade = nova.maxIdade;
      }
    }
    ctx.stroke();
  };
}

// ---------------------------------------------------------------------------
// Controlador da temperatura (pontos GeoJSON no estilo)
// ---------------------------------------------------------------------------

const NX_TEMP = 9;
const NY_TEMP = 7;

/** FeatureCollection a partir das leituras (puro). */
function fcDeLeituras(leituras: LeituraGrade[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: leituras.map((l) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
      properties: {
        temperatura: Math.round(l.temperatura),
        rotulo: rotuloTemperatura(l.temperatura),
        cor: corTemperatura(l.temperatura),
        codigo: l.codigo,
        severo: l.codigo >= 95,
        ventoMs: Math.round(l.ventoMs),
      },
    })),
  };
}

export class ControladorTemperatura {
  private map: ML;
  private ativo = false;
  private destruido = false;
  private timerRefresco: number | null = null;
  private timerDebounce: number | null = null;
  /** Últimas leituras — o sincronizar reapresenta sem refetch (o styledata dispara a cada mudança de estilo). */
  private ultimo: LeituraGrade[] | null = null;
  private coletando = false;
  private aoMove = () => {
    if (!this.ativo || this.destruido) return;
    if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
    this.timerDebounce = window.setTimeout(() => void this.coletar(), 2000);
  };
  abaixoDe?: string;
  aoEstado?: (estado: EstadoClima) => void;

  constructor(map: ML) {
    this.map = map;
    map.once("remove", () => {
      this.destruido = true;
      this.ativo = false;
      if (this.timerRefresco !== null) window.clearInterval(this.timerRefresco);
      this.timerRefresco = null;
      if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
      this.timerDebounce = null;
    });
  }

  ativar(): void {
    if (this.destruido) return;
    this.ativo = true;
    if (this.ultimo) {
      this.aplicar(this.ultimo);
      return;
    }
    void this.coletar();
    this.timerRefresco = window.setInterval(() => void this.coletar(), INTERVALO_REFRESCO_MS);
    this.map.on("moveend", this.aoMove);
  }

  desativar(): void {
    this.ativo = false;
    this.ultimo = null;
    if (this.timerRefresco !== null) window.clearInterval(this.timerRefresco);
    this.timerRefresco = null;
    if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
    this.timerDebounce = null;
    this.map.off("moveend", this.aoMove);
    this.remover();
    this.aoEstado?.("off");
  }

  /** Reapresenta após troca de estilo/camada base (styledata) — sem refetch. */
  sincronizar(): void {
    if (this.destruido) return;
    if (this.ativo && this.ultimo) {
      this.aplicar(this.ultimo);
    } else if (!this.ativo) {
      this.remover();
    }
  }

  private async coletar(): Promise<void> {
    if (!this.ativo || this.destruido || this.coletando) return;
    this.coletando = true;
    this.aoEstado?.("carregando");
    try {
      const b = this.map.getBounds();
      const r: Retangulo = {
        o: b.getWest(),
        l: b.getEast(),
        s: Math.max(-85, b.getSouth()),
        n: Math.min(85, b.getNorth()),
      };
      const pontos = amostrarGrade(r, NX_TEMP, NY_TEMP);
      const res = await fetch(urlGradeOpenMeteo(pontos));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const leituras = interpretarGrade(await res.json(), pontos);
      if (!this.ativo || this.destruido) return;
      this.ultimo = leituras;
      this.aplicar(leituras);
      this.aoEstado?.("ativo");
    } catch {
      if (this.ativo && !this.destruido) this.aoEstado?.("erro");
    } finally {
      this.coletando = false;
    }
  }

  private aplicar(leituras: LeituraGrade[]): void {
    if (this.destruido) return;
    try {
      const map = this.map;
      // Idempotente: fonte existente só atualiza os dados (recriar tudo a
      // cada apresentação alimenta o styledata com novas emissões).
      if (map.getSource(FONTE)) {
        (map.getSource(FONTE) as maplibregl.GeoJSONSource).setData(fcDeLeituras(leituras) as never);
        return;
      }
      map.addSource(FONTE, { type: "geojson", data: fcDeLeituras(leituras) as never });
      map.addLayer(
        {
          id: CAMADA_CIRCULO,
          type: "circle",
          source: FONTE,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 8, 8],
            "circle-color": ["get", "cor"],
            "circle-opacity": 0.85,
            "circle-stroke-color": ["case", ["get", "severo"], "#EF4444", "#0B0B0B"],
            "circle-stroke-width": ["case", ["get", "severo"], 2.5, 1],
          },
        },
        this.abaixoDe && map.getLayer(this.abaixoDe) ? this.abaixoDe : undefined,
      );
      map.addLayer(
        {
          id: CAMADA_ROTULO,
          type: "symbol",
          source: FONTE,
          layout: {
            "text-field": ["get", "rotulo"],
            "text-size": 10,
            "text-font": FONTS_TEXTO,
          },
          paint: {
            "text-color": "#0B0B0B",
          },
        },
        this.abaixoDe && map.getLayer(this.abaixoDe) ? this.abaixoDe : undefined,
      );
    } catch {
      /* estilo em troca — o styledata reapresenta */
    }
  }

  private remover(): void {
    if (this.destruido) return;
    try {
      const map = this.map;
      if (map.getLayer(CAMADA_ROTULO)) map.removeLayer(CAMADA_ROTULO);
      if (map.getLayer(CAMADA_CIRCULO)) map.removeLayer(CAMADA_CIRCULO);
      if (map.getSource(FONTE)) map.removeSource(FONTE);
    } catch {
      /* estilo em troca */
    }
  }
}

// ---------------------------------------------------------------------------
// Tempestades — energia convectiva (CAPE) da mesma grade Open-Meteo
// ---------------------------------------------------------------------------

const FONTE_TEMPESTADE = "intel-tempestade";
const CAMADA_TEMPESTADE_CIRCULO = "intel-tempestade-circle";
const CAMADA_TEMPESTADE_ROTULO = "intel-tempestade-rotulo";
const NX_TOR = 8;
const NY_TOR = 5;

export interface LeituraTempestade {
  lng: number;
  lat: number;
  /** CAPE em J/kg — energia disponível para convecção (tempestades). */
  cape: number;
  /** Código WMO atual (95–99 = trovoada). */
  codigo: number;
  /** Precipitação na última hora em mm. */
  precipitacao: number;
}

/** URL da grade de tempestades (uma consulta para todos os pontos). */
export function urlGradeTempestades(pontos: Array<[number, number]>): string {
  const lats = pontos.map((p) => p[1].toFixed(3)).join(",");
  const lngs = pontos.map((p) => p[0].toFixed(3)).join(",");
  return `${URL_BASE}?latitude=${lats}&longitude=${lngs}&current=cape,weather_code,precipitation`;
}

interface RespostaTempestade {
  latitude?: number;
  longitude?: number;
  current?: {
    cape?: number;
    weather_code?: number;
    precipitation?: number;
  };
}

/**
 * Interpreta a resposta da grade de tempestades — mesma convenção da
 * `interpretarGrade` (casa pelas coordenadas de resposta).
 */
export function interpretarTempestades(
  dados: unknown,
  pontos: Array<[number, number]>,
): LeituraTempestade[] {
  const lista: RespostaTempestade[] = Array.isArray(dados)
    ? (dados as RespostaTempestade[])
    : dados && typeof dados === "object"
      ? [dados as RespostaTempestade]
      : [];
  const leituras: LeituraTempestade[] = [];
  for (let i = 0; i < lista.length; i++) {
    const r = lista[i];
    const c = r?.current;
    if (!c) continue;
    const cape = typeof c.cape === "number" ? c.cape : NaN;
    if (!Number.isFinite(cape)) continue;
    leituras.push({
      lng: typeof r.longitude === "number" ? r.longitude : (pontos[i]?.[0] ?? 0),
      lat: typeof r.latitude === "number" ? r.latitude : (pontos[i]?.[1] ?? 0),
      cape,
      codigo: typeof c.weather_code === "number" ? c.weather_code : 0,
      precipitacao: typeof c.precipitation === "number" ? c.precipitation : 0,
    });
  }
  return leituras;
}

/** Classificação visual do CAPE (J/kg) — escala padrão de tempo severo. */
export function classificarCape(cape: number): { cor: string; nivel: string } {
  if (!Number.isFinite(cape)) return { cor: "#64748B", nivel: "baixa" };
  if (cape >= 4000) return { cor: "#DC2626", nivel: "extrema" };
  if (cape >= 2500) return { cor: "#EF4444", nivel: "forte" };
  if (cape >= 1000) return { cor: "#A78BFA", nivel: "moderada" };
  return { cor: "#64748B", nivel: "baixa" };
}

/** Rótulo curto do ponto: "2300 J/kg". */
export function rotuloCape(cape: number): string {
  if (!Number.isFinite(cape)) return "—";
  return `${Math.round(cape)} J/kg`;
}

/** FeatureCollection só com pontos convectivos (CAPE ≥ 600 J/kg). */
export function fcTempestades(leituras: LeituraTempestade[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: leituras
      .filter((l) => l.cape >= 600)
      .map((l) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
        properties: {
          cape: Math.round(l.cape),
          rotulo: rotuloCape(l.cape),
          cor: classificarCape(l.cape).cor,
          trovoada: l.codigo >= 95,
          precipitacao: Math.round(l.precipitacao * 10) / 10,
        },
      })),
  };
}

export class ControladorTempestades {
  private map: ML;
  private ativo = false;
  private destruido = false;
  private timerRefresco: number | null = null;
  private timerDebounce: number | null = null;
  private ultimo: LeituraTempestade[] | null = null;
  private coletando = false;
  private aoMove = () => {
    if (!this.ativo || this.destruido) return;
    if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
    this.timerDebounce = window.setTimeout(() => void this.coletar(), 2000);
  };
  abaixoDe?: string;
  aoEstado?: (estado: EstadoClima) => void;

  constructor(map: ML) {
    this.map = map;
    map.once("remove", () => {
      this.destruido = true;
      this.ativo = false;
      if (this.timerRefresco !== null) window.clearInterval(this.timerRefresco);
      this.timerRefresco = null;
      if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
      this.timerDebounce = null;
    });
  }

  ativar(): void {
    if (this.destruido) return;
    this.ativo = true;
    if (this.ultimo) {
      this.aplicar(this.ultimo);
      return;
    }
    void this.coletar();
    this.timerRefresco = window.setInterval(() => void this.coletar(), INTERVALO_REFRESCO_MS);
    this.map.on("moveend", this.aoMove);
  }

  desativar(): void {
    this.ativo = false;
    this.ultimo = null;
    if (this.timerRefresco !== null) window.clearInterval(this.timerRefresco);
    this.timerRefresco = null;
    if (this.timerDebounce !== null) window.clearTimeout(this.timerDebounce);
    this.timerDebounce = null;
    this.map.off("moveend", this.aoMove);
    this.remover();
    this.aoEstado?.("off");
  }

  /** Reapresenta após troca de estilo/camada base (styledata) — sem refetch. */
  sincronizar(): void {
    if (this.destruido) return;
    if (this.ativo && this.ultimo) {
      this.aplicar(this.ultimo);
    } else if (!this.ativo) {
      this.remover();
    }
  }

  private async coletar(): Promise<void> {
    if (!this.ativo || this.destruido || this.coletando) return;
    this.coletando = true;
    this.aoEstado?.("carregando");
    try {
      const b = this.map.getBounds();
      const margemLng = (b.getEast() - b.getWest()) * 0.25;
      const margemLat = (b.getNorth() - b.getSouth()) * 0.25;
      const r: Retangulo = {
        o: b.getWest() - margemLng,
        l: b.getEast() + margemLng,
        s: Math.max(-85, b.getSouth() - margemLat),
        n: Math.min(85, b.getNorth() + margemLat),
      };
      const pontos = amostrarGrade(r, NX_TOR, NY_TOR);
      const res = await fetch(urlGradeTempestades(pontos));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const leituras = interpretarTempestades(await res.json(), pontos);
      if (!this.ativo || this.destruido) return;
      this.ultimo = leituras;
      this.aplicar(leituras);
      this.aoEstado?.("ativo");
    } catch {
      if (this.ativo && !this.destruido) this.aoEstado?.("erro");
    } finally {
      this.coletando = false;
    }
  }

  private aplicar(leituras: LeituraTempestade[]): void {
    if (this.destruido) return;
    try {
      const map = this.map;
      if (map.getSource(FONTE_TEMPESTADE)) {
        (map.getSource(FONTE_TEMPESTADE) as maplibregl.GeoJSONSource).setData(
          fcTempestades(leituras) as never,
        );
        return;
      }
      map.addSource(FONTE_TEMPESTADE, { type: "geojson", data: fcTempestades(leituras) as never });
      map.addLayer(
        {
          id: CAMADA_TEMPESTADE_CIRCULO,
          type: "circle",
          source: FONTE_TEMPESTADE,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2,
              ["interpolate", ["linear"], ["get", "cape"], 600, 5, 2500, 9, 4000, 13],
              8,
              ["interpolate", ["linear"], ["get", "cape"], 600, 10, 2500, 18, 4000, 26],
            ],
            "circle-color": ["get", "cor"],
            "circle-opacity": 0.45,
            "circle-stroke-color": ["case", ["get", "trovoada"], "#FDE047", ["get", "cor"]],
            "circle-stroke-width": ["case", ["get", "trovoada"], 2, 1],
            "circle-stroke-opacity": 0.9,
          },
        },
        this.abaixoDe && map.getLayer(this.abaixoDe) ? this.abaixoDe : undefined,
      );
      map.addLayer(
        {
          id: CAMADA_TEMPESTADE_ROTULO,
          type: "symbol",
          source: FONTE_TEMPESTADE,
          minzoom: 4,
          layout: {
            "text-field": ["get", "rotulo"],
            "text-size": 10,
            "text-font": FONTS_TEXTO,
            "text-offset": [0, 1.1],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#C4B5FD",
            "text-halo-color": "#0B0B0B",
            "text-halo-width": 1,
          },
        },
        this.abaixoDe && map.getLayer(this.abaixoDe) ? this.abaixoDe : undefined,
      );
    } catch {
      /* estilo em troca — o styledata reapresenta */
    }
  }

  private remover(): void {
    if (this.destruido) return;
    try {
      const map = this.map;
      if (map.getLayer(CAMADA_TEMPESTADE_ROTULO)) map.removeLayer(CAMADA_TEMPESTADE_ROTULO);
      if (map.getLayer(CAMADA_TEMPESTADE_CIRCULO)) map.removeLayer(CAMADA_TEMPESTADE_CIRCULO);
      if (map.getSource(FONTE_TEMPESTADE)) map.removeSource(FONTE_TEMPESTADE);
    } catch {
      /* estilo em troca */
    }
  }
}
