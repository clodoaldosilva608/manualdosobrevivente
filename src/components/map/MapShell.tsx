import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Layers,
  Crosshair,
  Ruler,
  MapPin,
  Compass,
  Download,
  Eraser,
  Globe,
  Navigation2,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  Minus,
  Newspaper,
  Radar,
  RefreshCw,
  GraduationCap,
  Lock,
  Menu as MenuIcon,
  NotebookPen,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDD, formatDMS, formatMGRS, parseCoordinate } from "@/lib/coords";
import {
  pathLengthMeters,
  polygonAreaSqMeters,
  formatMeters,
  formatNauticalMiles,
  formatArea,
  samplePath,
  bearingDeg,
  distanceMeters,
} from "@/lib/geo";
import { magneticDeclination } from "@/lib/declination";
import {
  reativarSensorSeConfigurado,
  observarSensor,
  useSensorBussola,
  definirPosicaoSensor,
} from "@/lib/bussola-sensor";
import {
  listWaypoints,
  saveWaypoint,
  deleteWaypoint,
  getSetting,
  setSetting,
  type LocalWaypoint,
} from "@/lib/db";
import { fetchElevations } from "@/lib/elevation.functions";
import {
  conectarPastaObsidian,
  estadoPastaObsidian,
  notaBoletimMarkdown,
  nomeArquivoSeguro,
  obsidianSuportado,
  salvarNotaObsidian,
  SUBPASTA_BOLETINS,
} from "@/lib/obsidian";
import { downloadText, pathToGPX } from "@/lib/gpx-kml";
import {
  andandoEmCirculos,
  carregarNavegacao,
  carregarTrilha,
  PASSO_TRILHA_M,
  salvarNavegacao,
  salvarTrilha,
  statusNavegacao,
  type RotaSalva,
  type StatusNavegacao,
} from "@/lib/rota";
import { BannerNavegacao, PainelRota } from "@/components/map/GuiaRota";
import CompassRose from "@/components/map/CompassRose";
import RedlineBoletim from "@/components/map/RedlineBoletim";
import MapaControles, { MapaControlesComSensor } from "@/components/map/mapa-controles";
import {
  formatDegrees,
  formatSignedDegrees,
  formatElevation,
  formatDecimalDegrees,
  formatDateTime,
  formatInteger,
  formatNumber,
  formatTime,
} from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { usePreferences } from "@/hooks/usePreferences";
import { chavesServidor, fetchIntelSnapshot } from "@/lib/intel.functions";
import { avaliarProximidade, contarAmeacas, horaRelativa } from "@/lib/alerta-radar";
import {
  fetchVoos,
  fetchIss,
  fetchAlertas,
  fetchNoticias,
  fetchAr,
} from "@/lib/intel-v2.functions";
import { conectarAis, type StatusAis } from "@/lib/ais";
import { buscarNoticiasNavegador } from "@/lib/noticias-gdelt";
import { CONFLITOS } from "@/lib/intel-conflicts";
import { poligonoNoturno } from "@/lib/intel-night";
import type {
  IntelAlerta,
  IntelAr,
  IntelIss,
  IntelNavio,
  IntelNoticia,
  IntelSatelite,
  IntelSnapshot,
  IntelVisibilidade,
  IntelVoo,
} from "@/lib/intel.types";
import { sincronizarCamadasIntel, registrarPopupsIntel } from "@/components/map/intel-layers";
import { CAMERAS } from "@/lib/intel-cameras";
import { CABOS } from "@/lib/intel-cables";
import { tleServidor } from "@/lib/satelite.functions";
import { propagarSatelites, type TleSatelite } from "@/lib/satelite-propagacao";
import { MapModeSwitch, type ModoMapa } from "@/components/map/MapModeSwitch";
import { VisaoOsiris } from "@/components/map/VisaoOsiris";
import type { VisOsiris } from "@/components/map/visao-osiris-camadas";
import { OsirisHub } from "@/components/map/OsirisHub";
import { MenuApp, type AcaoMenuMapa, type AcaoMenuOsiris } from "@/components/map/MenuApp";
import { LINHAS_INTEL } from "@/components/map/intel-camadas-lista";
import {
  LINHAS_TELA,
  TELA_VIS_PADRAO,
  type TelaVisibilidade,
} from "@/components/map/tela-elementos";
import { Switch } from "@/components/ui/switch";
import { useI18n, tGlobal } from "@/lib/i18n";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

type BaseLayerId = "satellite" | "topo" | "streets" | "dark";
const BASE_LAYERS: Record<
  BaseLayerId,
  { label: string; tiles: string; attribution: string; maxzoom?: number }
> = {
  satellite: {
    label: "Satélite",
    tiles:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, Maxar, Earthstar Geographics",
    maxzoom: 19,
  },
  topo: {
    label: "Topográfico",
    tiles: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap",
    maxzoom: 17,
  },
  streets: {
    label: "Ruas",
    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© colaboradores do OpenStreetMap",
    maxzoom: 19,
  },
  dark: {
    label: "Tático Escuro",
    // Esri Dark Gray Canvas — sem chave de API (a CARTO passou a exigir apikey
    // e devolve tiles com marca d'água "API KEY REQUIRED").
    tiles:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, HERE, Garmin, FAO, NOAA, USGS",
    maxzoom: 16,
  },
};

type Tool = "none" | "measure-line" | "measure-area" | "marker";

/** Estado da coleta de inteligência (camadas nativas do mapa). */
type StatusIntel = "idle" | "carregando" | "ok" | "erro";

const styleFor = (layer: BaseLayerId): maplibregl.StyleSpecification => {
  const l = BASE_LAYERS[layer];
  // O Tático Escuro soma uma camada de referência (rótulos de cidades/ruas).
  const referencia =
    layer === "dark"
      ? {
          source: "ref",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
          ],
        }
      : null;
  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: [l.tiles],
        tileSize: 256,
        maxzoom: l.maxzoom ?? 19,
        attribution: l.attribution,
      },
      ...(referencia
        ? {
            ref: {
              type: "raster" as const,
              tiles: referencia.tiles,
              tileSize: 256,
              maxzoom: 16,
              attribution: "",
            },
          }
        : {}),
    },
    layers: [
      { id: "base", type: "raster", source: "base" },
      ...(referencia ? [{ id: "ref", type: "raster" as const, source: "ref" }] : []),
    ],
  };
};

/** Vista "mundo inteiro" aplicada ao mapa ao entrar no modo Osiris. */
const VISAO_GLOBAL = {
  bounds: [
    [-168, -58],
    [168, 68],
  ] as [[number, number], [number, number]],
  padding: 24,
};

/**
 * Fontes e camadas de desenho/waypoints — idempotente (pode ser chamada mais
 * de uma vez: load, timer de segurança e trocas de estilo via styledata).
 */
function adicionarFontesDesenho(map: maplibregl.Map) {
  if (map.getSource("draw")) return;
  map.addSource("draw", { type: "geojson", data: emptyFC() });
  map.addLayer({
    id: "draw-line",
    type: "line",
    source: "draw",
    filter: ["==", "$type", "LineString"],
    paint: {
      "line-color": "#FF6B35",
      "line-width": 3,
      "line-dasharray": [2, 1],
    },
  });
  map.addLayer({
    id: "draw-fill",
    type: "fill",
    source: "draw",
    filter: ["==", "$type", "Polygon"],
    paint: { "fill-color": "#FF6B35", "fill-opacity": 0.2 },
  });
  map.addLayer({
    id: "draw-points",
    type: "circle",
    source: "draw",
    filter: ["==", "$type", "Point"],
    paint: {
      "circle-radius": 5,
      "circle-color": "#FF6B35",
      "circle-stroke-color": "#121212",
      "circle-stroke-width": 2,
    },
  });
  map.addSource("waypoints", { type: "geojson", data: emptyFC() });
  map.addLayer({
    id: "wp-circles",
    type: "circle",
    source: "waypoints",
    paint: {
      "circle-radius": 8,
      "circle-color": ["coalesce", ["get", "color"], "#FF6B35"],
      "circle-stroke-color": "#121212",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "wp-labels",
    type: "symbol",
    source: "waypoints",
    layout: {
      "text-field": ["get", "title"],
      "text-size": 11,
      "text-offset": [0, 1.2],
      "text-anchor": "top",
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#FFF",
      "text-halo-color": "#121212",
      "text-halo-width": 2,
    },
  });
  // Guia de Rota: linha e pontos da rota + anel do alvo atual + trilha.
  map.addSource("rota", { type: "geojson", data: emptyFC() });
  map.addLayer({
    id: "rota-line",
    type: "line",
    source: "rota",
    filter: ["==", "$type", "LineString"],
    paint: { "line-color": "#FF6B35", "line-width": 3.5, "line-opacity": 0.95 },
  });
  map.addLayer({
    id: "rota-pontos",
    type: "circle",
    source: "rota",
    filter: ["all", ["==", "$type", "Point"], ["!=", ["get", "alvo"], true]],
    paint: {
      "circle-radius": 6,
      "circle-color": "#FF6B35",
      "circle-stroke-color": "#121212",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "rota-alvo",
    type: "circle",
    source: "rota",
    filter: ["all", ["==", "$type", "Point"], ["==", ["get", "alvo"], true]],
    paint: {
      "circle-radius": 13,
      "circle-color": "#FF6728",
      "circle-opacity": 0.25,
      "circle-stroke-color": "#FFB380",
      "circle-stroke-width": 2.5,
    },
  });
  map.addSource("trilha", { type: "geojson", data: emptyFC() });
  map.addLayer({
    id: "trilha-line",
    type: "line",
    source: "trilha",
    paint: { "line-color": "#38BDF8", "line-width": 3, "line-opacity": 0.85 },
  });
}

export default function MapShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMovedRef = useRef(false);
  // Espelho de prefs.posicaoTravada para os handlers imperativos do mapa.
  const travaRef = useRef<{ lat: number; lng: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>("topo");
  const [center, setCenter] = useState<[number, number]>([-47.8822, -15.7942]);

  const [heading, setHeading] = useState(0);
  // Sensor do aparelho: se o usuário já habilitou antes, religa sozinho ao
  // abrir o app — a bússola configurada uma vez continua viva.
  useEffect(() => {
    void reativarSensorSeConfigurado();
  }, []);
  const [tool, setTool] = useState<Tool>("none");
  const { t } = useI18n();
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]);
  const [waypoints, setWaypoints] = useState<LocalWaypoint[]>([]);

  // ---- Guia de Rota: rota por waypoints + trilha gravada (offline) ----
  const [rota, setRota] = useState<RotaSalva | null>(null);
  const [indiceRota, setIndiceRota] = useState(0);
  const [navegando, setNavegando] = useState(false);
  const [navStatus, setNavStatus] = useState<StatusNavegacao | null>(null);
  const [trilha, setTrilha] = useState<Array<[number, number]>>([]);
  const [gravando, setGravando] = useState(false);
  const [velMS, setVelMS] = useState<number | null>(null);
  // Espelhos para o handler do watchPosition (nasce uma vez, sem recriar o
  // watch a cada mudança de estado) e para a leitura direta do sensor.
  const navRef = useRef({
    navegando: false,
    gravando: false,
    rota: null as RotaSalva | null,
    indice: 0,
  });
  const trilhaRef = useRef<Array<[number, number]>>([]);
  const trilhaIniciadaEm = useRef<string | null>(null);
  const persistiuTrilhaEm = useRef(0);
  const avisoCirculosEm = useRef(0);
  const sensorRef = useRef<number | null>(null);
  const [openSheet, setOpenSheet] = useState<
    null
    | "menu"
    | "layers"
    | "goto"
    | "measure"
    | "markers"
    | "boletim"
    | "alertas"
    | "hub"
    | "rota"
  >(null);
  const [compassMode, setCompassModeState] = useState<"mini" | "panel" | "full">("mini");
  useEffect(() => {
    const saved = localStorage.getItem("tgis:compass-mode");
    if (saved === "mini" || saved === "panel" || saved === "full") setCompassModeState(saved);
  }, []);
  const setCompassMode = useCallback((m: "mini" | "panel" | "full") => {
    setCompassModeState(m);
    try {
      localStorage.setItem("tgis:compass-mode", m);
    } catch {
      /* armazenamento indisponível */
    }
  }, []);
  // Esc na tela cheia devolve ao painel (comportamento padrão de modais).
  useEffect(() => {
    if (compassMode !== "full") return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompassMode("panel");
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [compassMode, setCompassMode]);
  const [gotoInput, setGotoInput] = useState("");
  const [newMarker, setNewMarker] = useState<{
    lng: number;
    lat: number;
    title: string;
    category: string;
    color: string;
  } | null>(null);
  const [elevationData, setElevationData] = useState<Array<{ d: number; e: number }>>([]);
  const [userPos, setUserPos] = useState<{
    lng: number;
    lat: number;
    alt: number | null;
    acc: number;
  } | null>(null);
  const callFetchElev = useServerFn(fetchElevations);

  // ---- Modo Osiris (inteligência global) ----
  const { prefs, update: updatePrefs } = usePreferences();
  const navegar = useNavigate();
  const modoMapa = prefs.mapMode;
  const intelVis = prefs.intelVis;
  const telaVis = prefs.telaVis;
  // Norte de referência da bússola (verdadeiro/magnético) — a mesma
  // configuração de Ajustes, compartilhada entre miniatura e bússola completa.
  const bussolaMagnetica = prefs.northRef === "magnetic";
  const alternarNorteBussola = () =>
    updatePrefs({ northRef: bussolaMagnetica ? "true" : "magnetic" });
  // Rotação do mapa junto com a bússola e posição travada (coordenadas digitadas).
  const mapaRotaciona = prefs.mapaRotaciona;
  const posicaoTravada = prefs.posicaoTravada;
  useEffect(() => {
    travaRef.current = posicaoTravada;
  }, [posicaoTravada]);
  // Projeção do mapa tático: plana (mercator) ou globo 3D. A projeção vive no
  // estilo — reaplicada no load e após qualquer troca de camada base.
  const projecao = prefs.projecao;
  const projecaoRef = useRef(projecao);
  projecaoRef.current = projecao;
  const alternarProjecao = () =>
    updatePrefs({ projecao: projecao === "globe" ? "mercator" : "globe" });
  const [intel, setIntel] = useState<IntelSnapshot | null>(null);
  const [intelStatus, setIntelStatus] = useState<StatusIntel>("idle");
  const [noite, setNoite] = useState<GeoJSON.Feature | null>(null);
  const [voos, setVoos] = useState<IntelVoo[] | null>(null);
  const [iss, setIss] = useState<IntelIss | null>(null);
  const [alertas, setAlertas] = useState<IntelAlerta[] | null>(null);
  const [noticias, setNoticias] = useState<IntelNoticia[] | null>(null);
  const [ar, setAr] = useState<IntelAr | null>(null);
  const [navios, setNavios] = useState<IntelNavio[]>([]);
  const [statusAis, setStatusAis] = useState<StatusAis | "off">("off");
  // Satélites de observação (TLE do servidor + propagação SGP4 no aparelho).
  const [tles, setTles] = useState<TleSatelite[]>([]);
  const [satelites, setSatelites] = useState<IntelSatelite[]>([]);
  // Chave AIS do servidor (usada quando o usuário não cadastrou a própria).
  const [chaveAisServidor, setChaveAisServidor] = useState("");
  const [boletimEm, setBoletimEm] = useState(0);
  // MODO ALERTA — radar de proximidade: ameaças perto do operador (minha
  // posição quando há GPS; senão o centro do mapa, igual ao boletim).
  const radarAlertas = useMemo(
    () =>
      avaliarProximidade(
        intel,
        alertas,
        userPos ? { lng: userPos.lng, lat: userPos.lat } : { lng: center[0], lat: center[1] },
      ),
    [intel, alertas, userPos, center],
  );
  const radarEm = useMemo(() => contarAmeacas(radarAlertas), [radarAlertas]);
  // Seção do Hub Osiris aberta diretamente pelas ferramentas da plataforma.
  const [hubSecao, setHubSecao] = useState<string | undefined>(undefined);
  const callIntel = useServerFn(fetchIntelSnapshot);
  const callVoos = useServerFn(fetchVoos);
  const callIss = useServerFn(fetchIss);
  const callAlertas = useServerFn(fetchAlertas);
  const callNoticias = useServerFn(fetchNoticias);
  const callAr = useServerFn(fetchAr);
  const callChaves = useServerFn(chavesServidor);

  // No modo Osiris o mapa usa o estilo Tático Escuro como base.
  const baseEfetiva: BaseLayerId = modoMapa === "osiris" ? "dark" : baseLayer;

  // Estado mais recente das camadas de inteligência, acessível pelos handlers
  // do mapa (listener "styledata" re-sincroniza após trocas de estilo).
  const intelRef = useRef({
    modo: "tatico" as ModoMapa,
    snapshot: null as IntelSnapshot | null,
    noite: null as GeoJSON.Feature | null,
    vis: prefs.intelVis,
    voos: null as IntelVoo[] | null,
    iss: null as IntelIss | null,
    alertas: null as IntelAlerta[] | null,
    navios: [] as IntelNavio[],
    noticias: null as IntelNoticia[] | null,
    satelites: [] as IntelSatelite[],
  });
  useEffect(() => {
    intelRef.current = {
      modo: modoMapa,
      snapshot: intel,
      noite,
      vis: intelVis,
      voos,
      iss,
      alertas,
      navios,
      noticias,
      satelites,
    };
  }, [modoMapa, intel, noite, intelVis, voos, iss, alertas, navios, noticias, satelites]);

  // Estado do desenho/waypoints para ressincronizar após trocas de estilo — o
  // styledata recria as fontes vazias e, sem isso, medições e waypoints
  // sumiam ao trocar a camada base.
  const desenhoRef = useRef({
    coords: drawCoords,
    tool,
    waypoints,
    rota: null as RotaSalva | null,
    indiceRota: 0,
    trilha: [] as Array<[number, number]>,
  });
  useEffect(() => {
    desenhoRef.current = { coords: drawCoords, tool, waypoints, rota, indiceRota, trilha };
  }, [drawCoords, tool, waypoints, rota, indiceRota, trilha]);

  // Espelho do estado de navegação para o handler do GPS (closure imutável).
  useEffect(() => {
    navRef.current = { navegando, gravando, rota, indice: indiceRota };
  }, [navegando, gravando, rota, indiceRota]);

  // Rumo do operador pelo sensor do aparelho — lido fora do React pelo
  // handler do GPS para a correção de rumo do guia.
  useEffect(
    () =>
      observarSensor((s) => {
        sensorRef.current = s.rumoAparelho;
      }),
    [],
  );

  // Retoma a navegação ao reabrir o app (a rota ativa sobrevive ao reload);
  // a trilha gravada é recarregada para consulta/volta ao início.
  useEffect(() => {
    void (async () => {
      try {
        const nav = await carregarNavegacao();
        if (nav?.rota?.pontos?.length) {
          setRota(nav.rota);
          setIndiceRota(Math.min(nav.indice, nav.rota.pontos.length - 1));
          setNavegando(true);
        }
        const t = await carregarTrilha();
        if (t?.pontos?.length) {
          trilhaRef.current = t.pontos;
          trilhaIniciadaEm.current = t.iniciada_em;
          setTrilha(t.pontos);
        }
      } catch {
        /* armazenamento indisponível */
      }
    })();
  }, []);

  // Visibilidade dos elementos da tela (espelho para os handlers do mapa).
  const telaVisRef = useRef<TelaVisibilidade>(telaVis);
  useEffect(() => {
    telaVisRef.current = telaVis;
  }, [telaVis]);

  // Instâncias dos controles nativos — adicionados/removidos conforme o
  // toggle "Controles do mapa" (Elementos da tela).
  const controlesRef = useRef<{
    nav: maplibregl.NavigationControl | null;
    geo: maplibregl.GeolocateControl | null;
    escala: maplibregl.ScaleControl | null;
  }>({ nav: null, geo: null, escala: null });

  /** Dados + visibilidade das camadas de desenho/waypoints/posição (idempotente). */
  const sincronizarDesenho = useCallback((map: maplibregl.Map) => {
    const d = desenhoRef.current;
    const wp = map.getSource("waypoints") as maplibregl.GeoJSONSource | undefined;
    wp?.setData(waypointsFC(d.waypoints));
    const dr = map.getSource("draw") as maplibregl.GeoJSONSource | undefined;
    dr?.setData(drawFC(d.coords, d.tool));
    const rt = map.getSource("rota") as maplibregl.GeoJSONSource | undefined;
    rt?.setData(rotaFC(d.rota, d.indiceRota));
    const tr = map.getSource("trilha") as maplibregl.GeoJSONSource | undefined;
    tr?.setData(trilhaFC(d.trilha));
    const vis = telaVisRef.current;
    const aplicar = (id: string, ativo: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", ativo ? "visible" : "none");
      }
    };
    aplicar("wp-circles", vis.waypoints);
    aplicar("wp-labels", vis.waypoints);
    aplicar("user-position-accuracy", vis.pontoPosicao);
    aplicar("user-position-dot", vis.pontoPosicao);
  }, []);

  // Reapresenta rota/trilha no mapa quando mudam (o styledata cobre a troca
  // de camada base reexecutando sincronizarDesenho).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    sincronizarDesenho(map);
  }, [rota, trilha, indiceRota, ready, sincronizarDesenho]);

  // Init map (client only)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let liberarSemTiles: number | undefined;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      const map = new ml.Map({
        container: containerRef.current,
        style: styleFor(baseEfetiva),
        center,
        zoom: 11,
        attributionControl: { compact: true },
      });
      const nav = new ml.NavigationControl({ visualizePitch: true });
      const escala = new ml.ScaleControl({ unit: "metric", maxWidth: 120 });
      const geo = new ml.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      });
      map.addControl(nav, "top-right");
      map.addControl(escala, "bottom-left");
      map.addControl(geo, "top-right");
      controlesRef.current = { nav, geo, escala };
      map.on("dragstart", () => {
        userMovedRef.current = true;
      });
      map.on("move", () => {
        const c = map.getCenter();
        setCenter([c.lng, c.lat]);
        setHeading(map.getBearing());
      });
      // Posição travada: qualquer movimento residual devolve ao ponto fixado.
      map.on("moveend", () => {
        const t = travaRef.current;
        if (!t) return;
        const c = map.getCenter();
        if (Math.abs(c.lat - t.lat) > 1e-5 || Math.abs(c.lng - t.lng) > 1e-5) {
          map.jumpTo({ center: [t.lng, t.lat] });
        }
      });

      map.on("load", () => {
        // sources for drawing + markers (idempotente: o timer de segurança
        // pode liberar o app antes do load e o styledata já ter criado tudo)
        adicionarFontesDesenho(map);
        sincronizarDesenho(map);
        try {
          map.setProjection({ type: projecaoRef.current });
        } catch {
          /* estilo ainda assentando — o styledata reaplica */
        }
        setReady(true);
      });
      mapRef.current = map;

      // Instância exposta para os testes automatizados (Playwright).
      (window as unknown as { __tacticalMap?: maplibregl.Map }).__tacticalMap = map;

      // O evento "load" só dispara quando TODOS os tiles iniciais do estilo
      // terminam de carregar — um tile travado (rede lenta, provedor
      // engargalado) atrasava o app indefinidamente: sem camadas de
      // inteligência, sem troca de estilo e sem visão global. O timer abaixo
      // libera a interface usando apenas a definição do estilo (os tiles
      // aparecem quando terminarem de carregar).
      liberarSemTiles = window.setTimeout(() => setReady(true), 3000);

      // Após qualquer troca de estilo, reconstrói as camadas de inteligência
      // e reapresenta desenho/waypoints/posição.
      map.on("styledata", () => {
        sincronizarDesenho(map);
        // A projeção vive no estilo: reapresenta após troca de camada base.
        try {
          map.setProjection({ type: projecaoRef.current });
        } catch {
          /* estilo interim — a próxima emissão de styledata reaplica */
        }
        const s = intelRef.current;
        sincronizarCamadasIntel(map, {
          snapshot: s.snapshot,
          conflitos: CONFLITOS,
          noite: s.noite,
          vis: s.vis,
          voos: s.voos,
          iss: s.iss,
          alertas: s.alertas,
          navios: s.navios,
          cameras: CAMERAS,
          cabos: CABOS,
          noticias: s.noticias,
          satelites: s.satelites,
        });
      });

      map.on("load", () => {
        registrarPopupsIntel(map);
      });

      // Abrir na última posição conhecida (imediato) e depois no GPS atual.
      try {
        const raw = localStorage.getItem("tgis:last-position");
        if (raw) {
          const p = JSON.parse(raw) as { lng: number; lat: number };
          if (Number.isFinite(p.lng) && Number.isFinite(p.lat)) {
            map.jumpTo({ center: [p.lng, p.lat], zoom: 14 });
          }
        }
      } catch {
        /* posição salva inválida — segue com o padrão */
      }

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled || userMovedRef.current) return;
            const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
            map.jumpTo({ center: c, zoom: 14 });
            try {
              localStorage.setItem("tgis:last-position", JSON.stringify({ lng: c[0], lat: c[1] }));
            } catch {
              /* armazenamento indisponível */
            }
          },
          () => {
            /* permissão negada — mantém a posição padrão */
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
        );
      }
    })();
    return () => {
      cancelled = true;
      if (liberarSemTiles !== undefined) window.clearTimeout(liberarSemTiles);
      delete (window as unknown as { __tacticalMap?: unknown }).__tacticalMap;
      controlesRef.current = { nav: null, geo: null, escala: null };
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reage à troca da projeção nas preferências enquanto o mapa está vivo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    try {
      map.setProjection({ type: projecao });
    } catch {
      /* estilo ainda não assentado — o styledata reaplica */
    }
  }, [projecao, ready]);

  // Redimensionamento: garante que o mapa acompanhe o container em qualquer tela
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(el);
    const onResize = () => mapRef.current?.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Trava de posição: centro fixo nas coordenadas digitadas — arrasto,
  // teclado, caixa e rotação por toque desativados; moveend devolve ao ponto.
  useEffect(() => {
    const mapa = mapRef.current;
    if (!mapa || !ready) return;
    if (posicaoTravada) {
      mapa.stop();
      mapa.dragPan.disable();
      mapa.keyboard.disable();
      mapa.scrollZoom.disable();
      mapa.doubleClickZoom.disable();
      mapa.boxZoom.disable();
      mapa.touchZoomRotate.enable();
      mapa.touchZoomRotate.disableRotation();
      mapa.flyTo({ center: [posicaoTravada.lng, posicaoTravada.lat], essential: true });
    } else {
      mapa.dragPan.enable();
      mapa.keyboard.enable();
      mapa.scrollZoom.enable();
      mapa.doubleClickZoom.enable();
      mapa.boxZoom.enable();
      mapa.touchZoomRotate.enable();
      mapa.touchZoomRotate.enableRotation();
    }
  }, [posicaoTravada, ready]);

  // Rotação do mapa junto com a bússola: assina o sensor FORA do React —
  // o MapShell não re-renderiza a cada leitura, só o mapa gira.
  // O sensor já entrega o rumo VERDADEIRO (magnético + declinação do lugar,
  // compensado por inclinação e tela, com a calibração do usuário aplicada):
  // o alvo do mapa é exatamente esse rumo — o norte das cartas é o geográfico.
  useEffect(() => {
    if (!mapaRotaciona || modoMapa !== "tatico") return;
    return observarSensor((s) => {
      if (s.rumoAparelho == null) return;
      const mapa = mapRef.current;
      if (!mapa) return;
      const diff = Math.abs(((s.rumoAparelho - mapa.getBearing() + 540) % 360) - 180);
      if (diff < 0.3) return;
      mapa.rotateTo(s.rumoAparelho, { duration: 0 });
    });
  }, [mapaRotaciona, modoMapa]);

  // Acompanha a posição do usuário em tempo real
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          alt: pos.coords.altitude,
          acc: pos.coords.accuracy,
        };
        setUserPos(p);
        // A bússola usa a posição real do aparelho para a declinação local.
        definirPosicaoSensor(p.lat, p.lng);
        setVelMS(pos.coords.speed ?? null);
        try {
          localStorage.setItem(
            "tgis:last-position",
            JSON.stringify({ lng: p.lng, lat: p.lat, alt: p.alt, at: Date.now() }),
          );
        } catch {
          /* armazenamento indisponível */
        }

        // ---- Guia de Rota: gravação de trilha + navegação guiada ----
        const n = navRef.current;
        if (n.gravando) {
          const ult = trilhaRef.current[trilhaRef.current.length - 1];
          if (!ult || distanceMeters([ult[0], ult[1]], [p.lng, p.lat]) >= PASSO_TRILHA_M) {
            const nova = [...trilhaRef.current, [p.lng, p.lat] as [number, number]];
            trilhaRef.current = nova;
            setTrilha(nova);
            if (Date.now() - persistiuTrilhaEm.current > 30_000) {
              persistiuTrilhaEm.current = Date.now();
              void salvarTrilha({
                pontos: nova,
                iniciada_em: trilhaIniciadaEm.current ?? new Date().toISOString(),
                atualizada_em: new Date().toISOString(),
              });
            }
            if (
              nova.length % 20 === 0 &&
              andandoEmCirculos(nova) &&
              Date.now() - avisoCirculosEm.current > 600_000
            ) {
              avisoCirculosEm.current = Date.now();
              toast.warning("Você pode estar andando em círculos", {
                description:
                  "Percorreu bastante distância sem se afastar do ponto de partida. Confirme o rumo na bússola.",
              });
            }
          }
        }
        if (n.navegando && n.rota && n.rota.pontos.length > 0) {
          const indice = Math.min(n.indice, n.rota.pontos.length - 1);
          const vel = pos.coords.speed;
          const rumoGps = vel != null && vel >= 0.5 ? (pos.coords.heading ?? null) : null;
          const rumoOperador =
            rumoGps ??
            (sensorRef.current != null
              ? norm360(sensorRef.current + magneticDeclination(p.lat, p.lng))
              : null);
          const st = statusNavegacao({ pos: p, rota: n.rota, indice, rumoOperador });
          setNavStatus(st);
          if (st.chegou) {
            if (indice < n.rota.pontos.length - 1) {
              const proximo = indice + 1;
              setIndiceRota(proximo);
              navRef.current.indice = proximo;
              void salvarNavegacao({ rota: n.rota, indice: proximo });
              toast.success(`Chegou: ${n.rota.pontos[indice].nome}`, {
                description: `Próximo ponto: ${n.rota.pontos[proximo].nome}`,
              });
            } else {
              navRef.current.navegando = false;
              setNavegando(false);
              setNavStatus(null);
              void salvarNavegacao(null);
              toast.success("Chegada! Rota concluída.", {
                description: "Todos os waypoints foram alcançados.",
              });
            }
          }
        }
      },
      () => {
        /* sem permissão de localização */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Sem GPS, a declinação da bússola segue o centro do mapa (a melhor
  // estimativa disponível); com GPS, a posição real do aparelho manda.
  useEffect(() => {
    if (userPos) return;
    definirPosicaoSensor(center[1], center[0]);
  }, [center, userPos]);

  // Desenha a marcação fixa da posição atual
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userPos) return;
    if (!map.isStyleLoaded()) return; // o styledata do estilo inicial reexecuta via userPos
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [userPos.lng, userPos.lat] },
        },
      ],
    };
    const src = map.getSource("user-position") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
    } else {
      map.addSource("user-position", { type: "geojson", data });
      map.addLayer({
        id: "user-position-accuracy",
        type: "circle",
        source: "user-position",
        paint: {
          "circle-radius": 22,
          "circle-color": "#38BDF8",
          "circle-opacity": 0.15,
          "circle-stroke-color": "#38BDF8",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "user-position-dot",
        type: "circle",
        source: "user-position",
        paint: {
          "circle-radius": 7,
          "circle-color": "#38BDF8",
          "circle-stroke-color": "#0B0B0B",
          "circle-stroke-width": 2,
        },
      });
    }
    // Respeita o toggle "Ponto de posição no mapa" (Elementos da tela).
    const visPos = telaVisRef.current.pontoPosicao ? "visible" : "none";
    for (const id of ["user-position-accuracy", "user-position-dot"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visPos);
    }
  }, [ready, userPos, telaVis.pontoPosicao]);

  // Layer swap (troca de camada base / modo)
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    mapRef.current.setStyle(styleFor(baseEfetiva));
    // re-add custom sources after style swap — dados e visibilidade juntos,
    // senão medições e waypoints desaparecem ao trocar a camada base
    mapRef.current.once("styledata", () => {
      const map = mapRef.current!;
      adicionarFontesDesenho(map);
      sincronizarDesenho(map);
    });
  }, [baseEfetiva, ready, sincronizarDesenho]);

  // Liga/desliga e alimenta as camadas de inteligência conforme a
  // visibilidade — no tático e no Osiris (por trás do globo quando ele carrega).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    // Se o estilo ainda está processando (o app já foi liberado pelo timer
    // de segurança), o listener "styledata" sincroniza quando estiver pronto.
    if (!map.isStyleLoaded()) return;
    sincronizarCamadasIntel(map, {
      snapshot: intel,
      conflitos: CONFLITOS,
      noite,
      vis: intelVis,
      voos,
      iss,
      alertas,
      navios,
      cameras: CAMERAS,
      cabos: CABOS,
      noticias,
      satelites,
    });
  }, [ready, modoMapa, intel, noite, intelVis, voos, iss, alertas, navios, noticias, satelites]);

  // Coleta periódica dos dados de inteligência enquanto alguma camada estiver
  // ativa (qualquer modo): snapshot consolidado (sismos/eventos/focos/Kp) +
  // voos + alertas.
  const algumaIntelAtiva = Object.values(intelVis).some(Boolean);
  useEffect(() => {
    if (!algumaIntelAtiva) return;
    let vivo = true;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const carregar = async () => {
      if (offline) {
        setIntelStatus("erro");
        return;
      }
      setIntelStatus((s) => (s === "ok" ? "ok" : "carregando"));
      const chaveFirms = prefs.intelKeys.firms.trim();
      const [snapR, voosR, alertasR] = await Promise.allSettled([
        callIntel({ data: { firmsKey: chaveFirms || undefined } }),
        callVoos({ data: { lat: center[1], lng: center[0] } }),
        callAlertas(),
      ]);
      if (!vivo) return;
      if (snapR.status === "fulfilled") {
        setIntel(snapR.value);
        setIntelStatus("ok");
      } else {
        setIntelStatus("erro");
      }
      if (voosR.status === "fulfilled") setVoos(voosR.value.voos);
      if (alertasR.status === "fulfilled") setAlertas(alertasR.value.alertas);
    };
    void carregar();
    const timer = window.setInterval(() => void carregar(), 90_000);
    const aoVoltar = () => void carregar();
    window.addEventListener("online", aoVoltar);
    return () => {
      vivo = false;
      window.clearInterval(timer);
      window.removeEventListener("online", aoVoltar);
    };
  }, [algumaIntelAtiva, callIntel, callVoos, callAlertas, prefs.intelKeys.firms, center]);

  // ISS: atualização rápida (posição muda ~7 km/s) — camada ligada ou Hub aberto.
  useEffect(() => {
    if (!intelVis.satelites && openSheet !== "hub") return;
    let vivo = true;
    const carregar = () => {
      void callIss()
        .then((v) => {
          if (vivo) setIss(v);
        })
        .catch(() => {});
    };
    carregar();
    const timer = window.setInterval(carregar, 45_000);
    return () => {
      vivo = false;
      window.clearInterval(timer);
    };
  }, [intelVis.satelites, openSheet, callIss]);

  // TLEs dos satélites de observação: o servidor busca no Celestrak com cache
  // de 6 h — uma consulta por sessão basta enquanto a camada está ligada.
  const callTle = useServerFn(tleServidor);
  useEffect(() => {
    if (!intelVis.satelites) return;
    let vivo = true;
    void callTle()
      .then((c) => {
        if (vivo) setTles(c.tles);
      })
      .catch(() => {});
    const timer = window.setInterval(
      () => {
        void callTle()
          .then((c) => {
            if (vivo) setTles(c.tles);
          })
          .catch(() => {});
      },
      6 * 60 * 60 * 1000,
    );
    return () => {
      vivo = false;
      window.clearInterval(timer);
    };
  }, [intelVis.satelites, callTle]);

  // Propagação SGP4 local: roda no aparelho a cada 30 s enquanto há TLEs —
  // sem rede, as posições continuam se movendo (offline-friendly).
  useEffect(() => {
    if (!intelVis.satelites || !tles.length) return;
    let vivo = true;
    const propagar = () => {
      if (vivo) setSatelites(propagarSatelites(tles, Date.now()));
    };
    propagar();
    const timer = window.setInterval(propagar, 30_000);
    return () => {
      vivo = false;
      window.clearInterval(timer);
    };
  }, [intelVis.satelites, tles]);

  // Manchetes globais (GDELT): ciclo lento — a fonte tem limite de requisições.
  // Primeiro direto do navegador (limite por IP do usuário); o servidor é o
  // plano B, pois o IP do Vercel vive limitado pela GDELT.
  useEffect(() => {
    if (!algumaIntelAtiva) return;
    let vivo = true;
    const carregar = () => {
      buscarNoticiasNavegador()
        .then((ns) => {
          if (vivo) setNoticias(ns);
        })
        .catch(() =>
          callNoticias()
            .then((v) => {
              if (vivo) setNoticias(v.noticias);
            })
            .catch(() => {}),
        );
    };
    carregar();
    const timer = window.setInterval(carregar, 300_000);
    return () => {
      vivo = false;
      window.clearInterval(timer);
    };
  }, [algumaIntelAtiva, callNoticias]);

  // Cache offline: hidrata do IndexedDB ao entrar no app e salva após coletas.
  const hidratadoRef = useRef(false);
  useEffect(() => {
    if (!algumaIntelAtiva) return;
    if (intel || voos || alertas || hidratadoRef.current) return;
    hidratadoRef.current = true;
    void getSetting<{
      intel: IntelSnapshot | null;
      voos: IntelVoo[] | null;
      iss: IntelIss | null;
      alertas: IntelAlerta[] | null;
      noticias: IntelNoticia[] | null;
    }>("intel-cache")
      .then((v) => {
        if (!v) return;
        if (v.intel && !intel) {
          setIntel(v.intel);
          setIntelStatus("ok");
        }
        if (v.voos && !voos) setVoos(v.voos);
        if (v.iss && !iss) setIss(v.iss);
        if (v.alertas && !alertas) setAlertas(v.alertas);
        if (v.noticias && !noticias) setNoticias(v.noticias);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algumaIntelAtiva]);

  useEffect(() => {
    if (!intel) return;
    void setSetting("intel-cache", { intel, voos, iss, alertas, noticias }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intel]);

  // Busca a chave AIS do servidor (uma vez por sessão): com ela, a camada
  // "Navios ao vivo" funciona sem o usuário cadastrar a própria chave.
  useEffect(() => {
    let ativo = true;
    callChaves()
      .then((c) => {
        if (ativo) setChaveAisServidor(c.chaveAis);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navios ao vivo (AIS): conecta com chave (pessoal ou do servidor) e camada
  // ligada — em qualquer modo; no tático os pontos aparecem direto no mapa.
  useEffect(() => {
    const chave = prefs.intelKeys.ais.trim() || chaveAisServidor;
    if (!intelVis.navios || !chave || !ready) {
      setStatusAis("off");
      return;
    }
    const map = mapRef.current;
    const bounds = map?.getBounds();
    const spanLat = 25;
    const spanLng = 40;
    const sul = Math.max(-85, (bounds?.getSouth() ?? 0) - spanLat / 2);
    const norte = Math.min(85, (bounds?.getNorth() ?? 0) + spanLat / 2);
    const oeste = Math.max(-179, (bounds?.getWest() ?? 0) - spanLng / 2);
    const leste = Math.min(179, (bounds?.getEast() ?? 0) + spanLng / 2);
    const fechar = conectarAis({
      chave,
      bbox: [
        [sul, oeste],
        [norte, leste],
      ],
      onNavios: (lista) => setNavios(lista),
      onStatus: (s) => setStatusAis(s),
    });
    let fecharAtual: () => void = fechar;
    // Refaz a inscrição a cada 15 min para acompanhar a área visível.
    const refresh = window.setInterval(() => {
      setNavios([]);
      fecharAtual();
      const b2 = mapRef.current?.getBounds();
      fecharAtual = conectarAis({
        chave,
        bbox: [
          [
            Math.max(-85, (b2?.getSouth() ?? 0) - spanLat / 2),
            Math.max(-179, (b2?.getWest() ?? 0) - spanLng / 2),
          ],
          [
            Math.min(85, (b2?.getNorth() ?? 0) + spanLat / 2),
            Math.min(179, (b2?.getEast() ?? 0) + spanLng / 2),
          ],
        ],
        onNavios: (lista) => setNavios(lista),
        onStatus: (s) => setStatusAis(s),
      });
    }, 900_000);
    return () => {
      window.clearInterval(refresh);
      fecharAtual();
      setNavios([]);
    };
  }, [intelVis.navios, prefs.intelKeys.ais, chaveAisServidor, ready]);

  // Terminador dia/noite recalculado a cada 10 minutos no modo Osiris.
  useEffect(() => {
    if (modoMapa !== "osiris") return;
    setNoite(poligonoNoturno());
    const t = window.setInterval(() => setNoite(poligonoNoturno()), 600_000);
    return () => window.clearInterval(t);
  }, [modoMapa]);

  // Ao entrar no modo Osiris salva a vista tática e mostra o mundo inteiro;
  // ao voltar ao Tático restaura a vista anterior.
  const vistaTaticaRef = useRef<{ lng: number; lat: number; zoom: number } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (modoMapa === "osiris") {
      const c = map.getCenter();
      vistaTaticaRef.current = { lng: c.lng, lat: c.lat, zoom: map.getZoom() };
      userMovedRef.current = true; // o GPS não deve puxar o mapa na plataforma
      map.fitBounds(VISAO_GLOBAL.bounds, { padding: VISAO_GLOBAL.padding, duration: 1400 });
    } else if (vistaTaticaRef.current) {
      const v = vistaTaticaRef.current;
      map.flyTo({ center: [v.lng, v.lat], zoom: v.zoom, duration: 1000 });
    }
  }, [modoMapa, ready]);

  // Load waypoints from local DB
  useEffect(() => {
    listWaypoints()
      .then(setWaypoints)
      .catch(() => {});
  }, []);

  // Sync waypoints source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("waypoints") as maplibregl.GeoJSONSource | undefined;
    src?.setData(waypointsFC(waypoints));
  }, [waypoints, ready]);

  // Sync draw source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("draw") as maplibregl.GeoJSONSource | undefined;
    src?.setData(drawFC(drawCoords, tool));
  }, [drawCoords, tool, ready]);

  // Liga/desliga a visibilidade dos waypoints e do ponto de posição (seção
  // "Elementos da tela") sem mexer nos dados guardados.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    sincronizarDesenho(map);
  }, [ready, telaVis.waypoints, telaVis.pontoPosicao, sincronizarDesenho]);

  // Controles nativos (zoom, GPS e escala) conforme o toggle "Controles do mapa".
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const alvo = telaVis.controlesMapa;
    const sincronizarControle = (
      controle:
        maplibregl.NavigationControl | maplibregl.GeolocateControl | maplibregl.ScaleControl | null,
      pos: "top-right" | "bottom-left",
    ) => {
      if (!controle) return;
      const presente = map.hasControl(controle);
      if (alvo && !presente) map.addControl(controle, pos);
      if (!alvo && presente) map.removeControl(controle);
    };
    sincronizarControle(controlesRef.current.nav, "top-right");
    sincronizarControle(controlesRef.current.geo, "top-right");
    sincronizarControle(controlesRef.current.escala, "bottom-left");
  }, [ready, telaVis.controlesMapa]);

  // Click handling for tools
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (tool === "measure-line" || tool === "measure-area") {
        setDrawCoords((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
      } else if (tool === "marker") {
        setNewMarker({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          title: "",
          category: "custom",
          color: "#FF6B35",
        });
      }
    };
    map.on("click", onClick);
    map.getCanvas().style.cursor = tool === "none" ? "" : "crosshair";
    return () => {
      map.off("click", onClick);
      map.getCanvas().style.cursor = "";
    };
  }, [tool, ready]);

  const flyTo = useCallback(
    (lng: number, lat: number, zoom = 14) => {
      // Voar para outro lugar solta a trava — o usuário pediu outra posição.
      if (travaRef.current) updatePrefs({ posicaoTravada: null });
      mapRef.current?.flyTo({ center: [lng, lat], zoom });
    },
    [updatePrefs],
  );

  const travarPosicao = useCallback(
    (lat: number, lng: number) => {
      updatePrefs({ posicaoTravada: { lat, lng } });
      toast.success("Mapa travado nas coordenadas", {
        description: `${formatDecimalDegrees(lat)}, ${formatDecimalDegrees(
          lng,
        )} — o arrasto fica desativado.`,
      });
    },
    [updatePrefs],
  );
  const destravarPosicao = useCallback(() => {
    updatePrefs({ posicaoTravada: null });
    toast.success("Mapa destravado");
  }, [updatePrefs]);

  const handleGoto = () => {
    const c = parseCoordinate(gotoInput);
    if (!c) {
      toast.error("Não foi possível interpretar a coordenada", {
        description: "Tente DD (-15.79, -47.88), DMS ou MGRS.",
      });
      return;
    }
    flyTo(c[0], c[1]);
    setOpenSheet(null);
    toast.success("Alvo localizado");
  };

  const clearDraw = () => {
    setDrawCoords([]);
    setElevationData([]);
  };

  /** Limpa a tela: apaga medições, oculta os waypoints do mapa e desarma as ferramentas. */
  const limparTela = () => {
    setDrawCoords([]);
    setElevationData([]);
    setNewMarker(null);
    setTool("none");
    setOpenSheet(null);
    if (compassMode !== "mini") setCompassMode("mini");
    if (telaVis.waypoints) updatePrefs({ telaVis: { ...telaVis, waypoints: false } });
    toast.success(t("Tela limpa"), {
      description: t(
        "Medições apagadas e waypoints ocultos do mapa — traga de volta em Camadas › Elementos da tela.",
      ),
    });
  };

  /** Restaura todos os elementos da tela para o padrão (visíveis). */
  const restaurarTela = () => {
    updatePrefs({ telaVis: { ...TELA_VIS_PADRAO } });
    toast.success(t("Elementos da tela restaurados"));
  };

  // ---- Guia de Rota: ações do painel (folha ROTAS) ----
  const persistirRota = (nova: RotaSalva | null, indice = indiceRota) => {
    setRota(nova);
    void salvarNavegacao(nova ? { rota: nova, indice } : null);
  };

  const adicionarPosicaoNaRota = () => {
    if (!userPos) return toast.error("Sem localização disponível");
    const ponto = {
      lat: userPos.lat,
      lng: userPos.lng,
      nome: `Ponto ${(rota?.pontos.length ?? 0) + 1}`,
    };
    if (!rota) {
      persistirRota({
        id: crypto.randomUUID(),
        nome: "Rota nova",
        pontos: [ponto],
        criada_em: new Date().toISOString(),
      });
      toast.success("Rota criada com a sua posição atual");
    } else {
      persistirRota({ ...rota, pontos: [...rota.pontos, ponto] });
      toast.success(`Ponto adicionado: ${ponto.nome}`);
    }
  };

  const adicionarWaypointNaRota = (id: string) => {
    const w = waypoints.find((x) => x.id === id);
    if (!w) return toast.error("Waypoint não encontrado");
    if (!rota) {
      persistirRota({
        id: crypto.randomUUID(),
        nome: "Rota nova",
        pontos: [{ lat: w.latitude, lng: w.longitude, nome: w.title }],
        criada_em: new Date().toISOString(),
      });
    } else {
      persistirRota({
        ...rota,
        pontos: [...rota.pontos, { lat: w.latitude, lng: w.longitude, nome: w.title }],
      });
    }
    toast.success(`Waypoint adicionado: ${w.title}`);
  };

  const removerPontoRota = (i: number) => {
    if (!rota) return;
    const pontos = rota.pontos.filter((_, k) => k !== i);
    persistirRota({ ...rota, pontos });
    if (indiceRota >= pontos.length) setIndiceRota(Math.max(0, pontos.length - 1));
  };

  const moverPontoRota = (i: number, direcao: -1 | 1) => {
    if (!rota) return;
    const j = i + direcao;
    if (j < 0 || j >= rota.pontos.length) return;
    const pontos = [...rota.pontos];
    [pontos[i], pontos[j]] = [pontos[j], pontos[i]];
    persistirRota({ ...rota, pontos });
  };

  const renomearRota = (nome: string) => {
    if (rota) persistirRota({ ...rota, nome });
  };

  const iniciarNavegacao = () => {
    if (!rota || rota.pontos.length === 0) return;
    setIndiceRota(0);
    setNavegando(true);
    setNavStatus(null);
    void salvarNavegacao({ rota, indice: 0 });
    setOpenSheet(null);
    toast.success("Navegação iniciada", {
      description: `Alvo atual: ${rota.pontos[0].nome}. Siga o painel superior.`,
    });
  };

  const pararNavegacao = () => {
    setNavegando(false);
    setNavStatus(null);
    void salvarNavegacao(null);
    toast.message("Navegação encerrada");
  };

  const alternarGravacaoTrilha = () => {
    if (!gravando) {
      const semente: Array<[number, number]> = userPos ? [[userPos.lng, userPos.lat]] : [];
      trilhaRef.current = semente;
      trilhaIniciadaEm.current = new Date().toISOString();
      persistiuTrilhaEm.current = Date.now();
      setTrilha(semente);
      setGravando(true);
      toast.success("Gravando trilha", {
        description: "Um ponto a cada 10 m. O app avisa se você andar em círculos.",
      });
    } else {
      setGravando(false);
      if (trilhaRef.current.length > 1) {
        void salvarTrilha({
          pontos: trilhaRef.current,
          iniciada_em: trilhaIniciadaEm.current ?? new Date().toISOString(),
          atualizada_em: new Date().toISOString(),
        });
        toast.success("Trilha salva no aparelho");
      }
    }
  };

  const voltarAoInicio = () => {
    const inicio = trilha[0];
    if (!inicio) return toast.error("Nenhuma trilha gravada");
    const rotaVolta: RotaSalva = {
      id: crypto.randomUUID(),
      nome: "Início da trilha",
      pontos: [{ lat: inicio[1], lng: inicio[0], nome: "Início da trilha" }],
      criada_em: new Date().toISOString(),
    };
    setRota(rotaVolta);
    setIndiceRota(0);
    setNavegando(true);
    setNavStatus(null);
    void salvarNavegacao({ rota: rotaVolta, indice: 0 });
    setOpenSheet(null);
    toast.success("Navegando de volta ao início da trilha");
  };

  const exportarRotaGPX = () => {
    if (!rota || rota.pontos.length === 0) return;
    const nome = (rota.nome || "rota").replace(/[^\w-]+/g, "-").slice(0, 40);
    downloadText(
      `${nome}.gpx`,
      pathToGPX(
        rota.nome,
        rota.pontos.map((p) => [p.lng, p.lat]),
      ),
    );
    toast.success("GPX da rota exportado");
  };

  const exportarTrilhaGPX = () => {
    if (trilha.length < 2) return toast.error("Trilha muito curta para exportar");
    downloadText("trilha.gpx", pathToGPX("Trilha gravada", trilha));
    toast.success("GPX da trilha exportado");
  };

  const apagarTrilha = () => {
    trilhaRef.current = [];
    trilhaIniciadaEm.current = null;
    setTrilha([]);
    void salvarTrilha(null);
    toast.success("Trilha apagada");
  };

  // Boletim de inteligência: garante dados frescos ao abrir o painel.
  const carregarBoletim = useCallback(() => {
    setBoletimEm(Date.now());
    void callAr({ data: { lat: center[1], lng: center[0] } })
      .then(setAr)
      .catch(() => {});
    if (!noticias) {
      buscarNoticiasNavegador()
        .then(setNoticias)
        .catch(() =>
          callNoticias()
            .then((v) => setNoticias(v.noticias))
            .catch(() => {}),
        );
    }
    if (!alertas) {
      void callAlertas()
        .then((v) => setAlertas(v.alertas))
        .catch(() => {});
    }
    if (!iss)
      void callIss()
        .then(setIss)
        .catch(() => {});
    if (!intel) {
      void callIntel({ data: { firmsKey: prefs.intelKeys.firms.trim() || undefined } })
        .then(setIntel)
        .catch(() => {});
    }
  }, [
    callAr,
    callNoticias,
    callAlertas,
    callIss,
    callIntel,
    center,
    noticias,
    alertas,
    iss,
    intel,
    prefs.intelKeys.firms,
  ]);

  /** Salva o boletim atual como nota Markdown no Obsidian (ou baixa .md). */
  const salvarBoletimObsidian = useCallback(async () => {
    try {
      const markdown = notaBoletimMarkdown({
        geradoEm: boletimEm || Date.now(),
        intel,
        ar,
        alertas,
        iss,
        noticias,
      });
      const nome = nomeArquivoSeguro("boletim", { data: Date.now() });
      let estado = await estadoPastaObsidian();
      if (estado.estado !== "conectada" && obsidianSuportado()) {
        const quer =
          estado.estado === "sem-pasta"
            ? window.confirm(
                "Conectar ao Obsidian agora? O aplicativo criará a pasta “Manual do Sobrevivente” dentro da pasta que você escolher (de preferência o seu vault) e salvará o boletim lá.",
              )
            : window.confirm(
                "A pasta do Obsidian aguarda permissão. Conceder agora e salvar o boletim?",
              );
        if (!quer) return;
        if (estado.estado === "sem-pasta") {
          await conectarPastaObsidian();
        }
        estado = await estadoPastaObsidian();
      }
      if (estado.estado === "conectada") {
        await salvarNotaObsidian({
          subpasta: SUBPASTA_BOLETINS,
          nomeArquivo: nome,
          markdown,
        });
        toast.success("Boletim salvo como nota no Obsidian");
      } else {
        downloadText(nome, markdown, "text/markdown");
        toast.info(
          "Este navegador não grava em pastas — o boletim foi baixado como arquivo .md (arraste para dentro do seu vault).",
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/abort/i.test(msg))
        toast.error("Não foi possível salvar no Obsidian", { description: msg });
    }
  }, [boletimEm, intel, ar, alertas, iss, noticias]);

  const runElevation = async () => {
    if (drawCoords.length < 2) return;
    const sampled = samplePath(drawCoords, 50, 120);
    toast.loading("Coletando elevação...", { id: "elev" });
    try {
      const { elevations } = await callFetchElev({ data: { points: sampled } });
      const data: Array<{ d: number; e: number }> = [];
      let acc = 0;
      for (let i = 0; i < sampled.length; i++) {
        if (i > 0) {
          const a = sampled[i - 1];
          const b = sampled[i];
          const dx = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
          const dy = (b[1] - a[1]) * 110540;
          acc += Math.sqrt(dx * dx + dy * dy);
        }
        data.push({ d: Math.round(acc), e: Math.round(elevations[i] || 0) });
      }
      setElevationData(data);
      toast.success("Perfil de elevação pronto", { id: "elev" });
    } catch (e) {
      toast.error("Falha ao obter elevação", {
        id: "elev",
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const saveNewMarker = async () => {
    if (!newMarker || !newMarker.title.trim()) return;
    const id = crypto.randomUUID();
    const wp: LocalWaypoint = {
      id,
      user_id: null,
      title: newMarker.title.trim(),
      category: newMarker.category,
      color: newMarker.color,
      latitude: newMarker.lat,
      longitude: newMarker.lng,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      dirty: true,
    };
    await saveWaypoint(wp);
    setWaypoints((w) => [...w, wp]);
    setNewMarker(null);
    setTool("none");
    toast.success("Waypoint marcado");
  };

  const removeWaypoint = async (id: string) => {
    await deleteWaypoint(id);
    setWaypoints((w) => w.filter((x) => x.id !== id));
  };

  // Ações do menu hambúrguer (MenuApp). Ferramentas do mapa tático e painéis
  // do Osiris exigem o mapa nativo: vindo da Visão Osiris (globo em tela
  // cheia cobre os painéis), devolve ao modo tático antes de abrir.
  const acaoMenu = (a: AcaoMenuMapa | AcaoMenuOsiris) => {
    setOpenSheet(null);
    const irTatico = () => {
      if (modoMapa !== "tatico") updatePrefs({ mapMode: "tatico" });
    };
    const abrirHub = (secao?: string) => {
      setHubSecao(secao);
      setOpenSheet("hub");
      carregarBoletim();
    };
    switch (a) {
      case "goto":
        irTatico();
        setOpenSheet("goto");
        break;
      case "measure":
        irTatico();
        setOpenSheet("measure");
        break;
      case "marcador":
        irTatico();
        setTool(tool === "marker" ? "none" : "marker");
        toast.message(
          tool === "marker"
            ? "Ferramenta de marcador desativada"
            : "Toque no mapa para marcar um waypoint",
        );
        break;
      case "bussola":
        irTatico();
        setCompassMode(compassMode === "mini" ? "panel" : "mini");
        break;
      case "globo":
        irTatico();
        alternarProjecao();
        break;
      case "limpar":
        irTatico();
        limparTela();
        break;
      case "elementos":
        irTatico();
        setOpenSheet("layers");
        break;
      case "rota":
        irTatico();
        setOpenSheet("rota");
        break;
      case "noturno":
        // Modo noturno é global — não devolve ao tático.
        updatePrefs({ visaoNoturna: !prefs.visaoNoturna });
        toast.success(prefs.visaoNoturna ? "Modo noturno desativado" : "Modo noturno ativado", {
          description: prefs.visaoNoturna
            ? undefined
            : "Visão vermelha preserva a adaptação ao escuro.",
        });
        break;
      case "visao":
        // Já dentro da Visão Osiris o item é apenas um retorno visual.
        if (modoMapa !== "osiris") updatePrefs({ mapMode: "osiris" });
        break;
      case "hub":
        irTatico();
        abrirHub(undefined);
        break;
      case "boletim":
        irTatico();
        setOpenSheet("boletim");
        carregarBoletim();
        break;
      case "alertas":
        irTatico();
        setOpenSheet("alertas");
        carregarBoletim();
        break;
      case "camadas":
        irTatico();
        setOpenSheet("layers");
        break;
      case "astro":
        irTatico();
        abrirHub("astro");
        break;
      case "iss":
        irTatico();
        abrirHub("iss");
        break;
      case "ip":
        irTatico();
        abrirHub("ip");
        break;
      case "dominio":
        irTatico();
        abrirHub("dominio");
        break;
      case "chaves":
        irTatico();
        abrirHub("chaves");
        break;
    }
  };

  /** Botão hambúrguer que abre o menu geral (HUD tático, mobile e desktop). */
  const botaoMenu = (
    <button
      type="button"
      title={t("Abrir menu")}
      aria-label={t("Abrir menu")}
      data-test="btn-menu-app"
      onClick={() => setOpenSheet("menu")}
      className="glove-tap hud-panel flex h-[30px] w-[36px] items-center justify-center rounded-md text-foreground"
    >
      <MenuIcon className="h-4 w-4" />
    </button>
  );

  const decl = magneticDeclination(center[1], center[0]);
  const lineLen = pathLengthMeters(drawCoords);
  const polyArea = polygonAreaSqMeters(drawCoords);
  const areaFmt = formatArea(polyArea);

  return (
    <div className="absolute inset-0 bg-background">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Visão Osiris — globo 3D de inteligência global em tela cheia,
          mesma apresentação da visão-osiris do Centro de Sobrevivência */}
      {modoMapa === "osiris" && (
        <VisaoOsiris
          vis={prefs.osirisVis}
          onToggle={(id, v) => updatePrefs({ osirisVis: { ...prefs.osirisVis, [id]: v } })}
          onSetTodas={(v) =>
            updatePrefs({
              osirisVis: Object.fromEntries(
                Object.keys(prefs.osirisVis).map((k) => [k, v]),
              ) as unknown as VisOsiris,
            })
          }
          onVoltar={() => updatePrefs({ mapMode: "tatico" })}
          onAbrirMenu={() => {
            // Os painéis ficam por baixo do globo em tela cheia: devolve ao
            // tático e abre o menu geral em cima do mapa nativo.
            updatePrefs({ mapMode: "tatico" });
            setOpenSheet("menu");
          }}
        />
      )}

      {modoMapa === "tatico" && (
        <>
          {/* HUD superior mobile: fluxo vertical — filhos nunca se sobrepõem */}
          <div className="absolute left-2 right-20 top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex flex-col gap-2 md:hidden">
            <div className="flex items-start gap-2">
              {botaoMenu}
              <div data-test="modo-mapa-mobile">
                <MapModeSwitch modo={modoMapa} onTrocar={(m) => updatePrefs({ mapMode: m })} />
              </div>
            </div>
            {telaVis.coordenadas && (
              <PainelCentro center={center} decl={decl} onCopy={(t) => copy(t)} />
            )}
            {telaVis.posicao && (
              <PainelPosicao
                userPos={userPos}
                onCentrar={() => {
                  if (!userPos) return toast.error(t("Sem localização disponível"));
                  flyTo(userPos.lng, userPos.lat, 15);
                }}
                onUltimoLocal={() => {
                  try {
                    const raw = localStorage.getItem("tgis:last-position");
                    if (!raw) return toast.error(t("Nenhum local salvo"));
                    const p = JSON.parse(raw) as { lng: number; lat: number };
                    flyTo(p.lng, p.lat);
                  } catch {
                    toast.error(t("Nenhum local salvo"));
                  }
                }}
              />
            )}
            {(tool === "measure-line" || tool === "measure-area") && (
              <LeituraMedicao tool={tool} lineLen={lineLen} areaFmt={areaFmt} onClear={clearDraw} />
            )}
            {navegando && rota && (
              <BannerNavegacao
                alvoNome={rota.pontos[Math.min(indiceRota, rota.pontos.length - 1)].nome}
                progressoAtual={Math.min(indiceRota, rota.pontos.length - 1)}
                progressoTotal={rota.pontos.length}
                status={navStatus}
                velocidadeMS={velMS}
                onCentralizar={() => {
                  const alvo = rota.pontos[Math.min(indiceRota, rota.pontos.length - 1)];
                  flyTo(alvo.lng, alvo.lat, 16);
                }}
                onParar={pararNavegacao}
              />
            )}
          </div>

          {/* HUD superior desktop: posições absolutas clássicas */}
          <div className="absolute left-4 top-4 z-10 hidden w-[360px] md:block">
            {telaVis.coordenadas && (
              <PainelCentro center={center} decl={decl} onCopy={(t) => copy(t)} />
            )}
          </div>
          <div
            className={`absolute left-4 z-10 hidden w-[360px] md:block ${
              telaVis.coordenadas ? "top-[150px]" : "top-4"
            }`}
          >
            {telaVis.posicao && (
              <PainelPosicao
                userPos={userPos}
                onCentrar={() => {
                  if (!userPos) return toast.error(t("Sem localização disponível"));
                  flyTo(userPos.lng, userPos.lat, 15);
                }}
                onUltimoLocal={() => {
                  try {
                    const raw = localStorage.getItem("tgis:last-position");
                    if (!raw) return toast.error(t("Nenhum local salvo"));
                    const p = JSON.parse(raw) as { lng: number; lat: number };
                    flyTo(p.lng, p.lat);
                  } catch {
                    toast.error(t("Nenhum local salvo"));
                  }
                }}
              />
            )}
          </div>
          {/* Banner de navegação desktop: centro superior, entre os painéis
              da esquerda e o alternador/hambúrguer da direita. */}
          {navegando && rota && (
            <div className="absolute left-1/2 top-4 z-10 hidden w-[min(440px,40vw)] -translate-x-1/2 md:block">
              <BannerNavegacao
                alvoNome={rota.pontos[Math.min(indiceRota, rota.pontos.length - 1)].nome}
                progressoAtual={Math.min(indiceRota, rota.pontos.length - 1)}
                progressoTotal={rota.pontos.length}
                status={navStatus}
                velocidadeMS={velMS}
                onCentralizar={() => {
                  const alvo = rota.pontos[Math.min(indiceRota, rota.pontos.length - 1)];
                  flyTo(alvo.lng, alvo.lat, 16);
                }}
                onParar={pararNavegacao}
              />
            </div>
          )}
          {(tool === "measure-line" || tool === "measure-area") && (
            <div className="absolute left-1/2 top-32 z-10 hidden -translate-x-1/2 md:block">
              <LeituraMedicao tool={tool} lineLen={lineLen} areaFmt={areaFmt} onClear={clearDraw} />
            </div>
          )}

          {/* Alternador de modo + hambúrguer (desktop, canto superior direito) */}
          <div
            className="absolute right-4 top-4 z-10 hidden items-start gap-2 md:flex"
            data-test="modo-mapa-desktop"
          >
            {botaoMenu}
            <MapModeSwitch modo={modoMapa} onTrocar={(m) => updatePrefs({ mapMode: m })} />
          </div>

          {/* Right-side action rail — em 2 colunas no desktop para nunca
              alcançar os cantos inferiores (bússola, gráfico, atribuição). */}
          <div
            className={`absolute right-2 top-[calc(0.5rem+env(safe-area-inset-top))] z-10 max-h-[calc(100dvh-17rem)] flex-col gap-1 overflow-y-auto md:top-[13.75rem] md:grid md:gap-2 md:max-h-[calc(100dvh-19.75rem)] md:grid-cols-2 ${
              telaVis.ferramentas ? "flex" : "hidden"
            }`}
          >
            <RailBtn
              icon={Radar}
              label="Osiris"
              onClick={() => {
                setHubSecao(undefined);
                setOpenSheet("hub");
                carregarBoletim();
              }}
            />
            <RailBtn
              icon={Newspaper}
              label="Boletim"
              active={radarEm > 0}
              badge={radarEm}
              onClick={() => {
                setOpenSheet("boletim");
                carregarBoletim();
              }}
            />
            <RailBtn icon={Layers} label="Camadas" onClick={() => setOpenSheet("layers")} />
            <RailBtn icon={Navigation2} label="Ir para" onClick={() => setOpenSheet("goto")} />
            <RailBtn icon={Ruler} label="Medir" onClick={() => setOpenSheet("measure")} />
            <RailBtn
              icon={MapPin}
              label="Marcador"
              active={tool === "marker"}
              onClick={() => {
                setTool(tool === "marker" ? "none" : "marker");
                toast.message(
                  tool === "marker"
                    ? t("Ferramenta de marcador desativada")
                    : t("Toque no mapa para marcar um waypoint"),
                );
              }}
            />
            <RailBtn
              icon={Compass}
              label="Bússola"
              active={compassMode !== "mini"}
              onClick={() => setCompassMode(compassMode === "mini" ? "panel" : "mini")}
            />
            <RailBtn
              icon={Globe}
              label="Globo"
              active={projecao === "globe"}
              onClick={alternarProjecao}
            />
            <RailBtn icon={Eraser} label="Limpar" onClick={limparTela} />
          </div>

          {/* Elevation chart — no desktop centrado embaixo, longe do rail
              (direita) e da bússola (esquerda). Sobe quando a redline está
              ativa para não cobrir o letreiro. */}
          {elevationData.length > 1 && (
            <div
              className={`absolute left-2 right-2 z-10 hud-panel rounded-md p-3 md:left-1/2 md:right-auto md:w-[420px] md:-translate-x-1/2 ${
                telaVis.redline
                  ? "bottom-[calc(7.25rem+env(safe-area-inset-bottom))] md:bottom-8"
                  : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-4"
              } ${newMarker ? "hidden md:block" : "block"}`}
            >
              <div className="flex items-center justify-between mono text-xs mb-1">
                <span className="text-tactical-orange font-bold">{t("PERFIL DE ELEVAÇÃO")}</span>
                <button onClick={() => setElevationData([])}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={elevationData}
                    margin={{ left: -20, right: 8, top: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#aaa" }} stroke="#444" />
                    <YAxis tick={{ fontSize: 10, fill: "#aaa" }} stroke="#444" />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #333",
                        fontSize: 11,
                      }}
                      formatter={(v: number) => [formatElevation(v), t("Elevação")]}
                      labelFormatter={(d) => formatElevation(Number(d))}
                    />
                    <Area
                      type="monotone"
                      dataKey="e"
                      stroke="#FF6B35"
                      fill="url(#elev)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* New marker dialog — centrado embaixo no desktop (mesma faixa do
              gráfico de elevação, que fica oculto enquanto o diálogo abre). */}
          {newMarker && (
            <div
              className={`absolute left-2 right-2 z-20 hud-panel rounded-md p-4 space-y-3 md:left-1/2 md:right-auto md:w-96 md:-translate-x-1/2 ${
                telaVis.redline
                  ? "bottom-[calc(6.25rem+env(safe-area-inset-bottom))] md:bottom-8"
                  : "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="mono text-tactical-orange font-bold text-sm">
                  {t("NOVO WAYPOINT")}
                </span>
                <button onClick={() => setNewMarker(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("Título")}</Label>
                <Input
                  autoFocus
                  value={newMarker.title}
                  onChange={(e) => setNewMarker({ ...newMarker, title: e.target.value })}
                  placeholder={t("Ex: Fonte de água #3")}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("Categoria")}</Label>
                    <select
                      className="w-full bg-input text-foreground rounded-md h-10 px-2 border border-border text-sm"
                      value={newMarker.category}
                      onChange={(e) =>
                        setNewMarker({
                          ...newMarker,
                          category: e.target.value,
                          color: CATEGORY_COLORS[e.target.value] || newMarker.color,
                        })
                      }
                    >
                      {Object.entries(CATEGORY_LABELS_PT).map(([id, label]) => (
                        <option key={id} value={id}>
                          {t(label)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("Cor")}</Label>
                    <input
                      type="color"
                      value={newMarker.color}
                      onChange={(e) => setNewMarker({ ...newMarker, color: e.target.value })}
                      className="w-full h-10 bg-input rounded-md border border-border"
                    />
                  </div>
                </div>
                <div className="mono text-xs text-muted-foreground">
                  {formatDD(newMarker.lng, newMarker.lat)} · MGRS{" "}
                  {formatMGRS(newMarker.lng, newMarker.lat)}
                </div>
                <Button
                  onClick={saveNewMarker}
                  className="w-full bg-tactical-orange text-background hover:bg-tactical-orange/90 glove-tap"
                >
                  {t("Salvar waypoint")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sheets */}
      <Sheet open={openSheet === "layers"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">{t("CAMADAS DO MAPA")}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {modoMapa === "tatico" && (
              <section>
                <div className="mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t("Camadas base")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(BASE_LAYERS) as BaseLayerId[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setBaseLayer(k);
                        setOpenSheet(null);
                      }}
                      className={`glove-tap rounded-md border p-3 text-left mono text-sm ${
                        baseLayer === k
                          ? "border-tactical-orange bg-tactical-orange/10 text-tactical-orange"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {t(BASE_LAYERS[k].label)}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {modoMapa === "tatico" && (
              <section data-test="tela-elementos">
                <div className="mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t("Elementos da tela")}
                </div>
                <div className="space-y-2">
                  {LINHAS_TELA.map((linha) => (
                    <div
                      key={linha.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm">{t(linha.nome)}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {t(linha.dica)}
                        </div>
                      </div>
                      <Switch
                        checked={telaVis[linha.id]}
                        aria-label={t("Ativar elemento {n}", { n: linha.nome })}
                        onCheckedChange={(v) =>
                          updatePrefs({ telaVis: { ...telaVis, [linha.id]: v } })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="destructive"
                    className="glove-tap"
                    data-test="tela-limpar"
                    onClick={limparTela}
                  >
                    <Eraser className="mr-1 h-4 w-4" /> {t("Limpar tela")}
                  </Button>
                  <Button
                    variant="secondary"
                    className="glove-tap"
                    data-test="tela-restaurar"
                    onClick={restaurarTela}
                  >
                    {t("Restaurar tudo")}
                  </Button>
                </div>
              </section>
            )}

            <section>
              <div className="mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("Modo de visualização")}
              </div>
              <MapModeSwitch modo={modoMapa} onTrocar={(m) => updatePrefs({ mapMode: m })} />
              <p className="mt-2 text-xs text-muted-foreground">
                {modoMapa === "osiris"
                  ? t(
                      "A Visão Osiris abre o globo 3D de inteligência global (OSIRIS self-hosted) em tela cheia, com painel de camadas próprio — o mapa tático continua intacto atrás do botão de voltar.",
                    )
                  : t(
                      "Navegação clássica: bússola, MGRS, medições e waypoints. Mude para o modo Osiris para abrir a Visão Osiris, o globo de inteligência global em tela cheia.",
                    )}
              </p>
              {modoMapa === "tatico" && (
                <>
                  <div className="mono mt-4 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t("Projeção do mapa")}
                  </div>
                  <div className="grid grid-cols-2 gap-2" data-test="projecao-opcoes">
                    <button
                      type="button"
                      data-test="projecao-plano"
                      onClick={() => updatePrefs({ projecao: "mercator" })}
                      className={`glove-tap rounded-md border p-3 mono text-sm ${
                        projecao === "mercator"
                          ? "border-tactical-orange bg-tactical-orange/10 text-tactical-orange"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {t("Plana (mapa)")}
                    </button>
                    <button
                      type="button"
                      data-test="projecao-globo"
                      onClick={() => updatePrefs({ projecao: "globe" })}
                      className={`glove-tap rounded-md border p-3 mono text-sm ${
                        projecao === "globe"
                          ? "border-tactical-orange bg-tactical-orange/10 text-tactical-orange"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {t("Globo 3D")}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(
                      "O globo mostra o planeta como uma esfera — útil para rotas longas e para ver o dia e a noite; o mapa plano mantém a leitura de ruas e coordenadas local.",
                    )}
                  </p>
                </>
              )}
            </section>

            <section>
              <div className="mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("Camadas de inteligência")}
              </div>
              <div className="space-y-2">
                {LINHAS_INTEL.map((linha) => {
                  const desabilitada =
                    linha.id === "incendios" && intel !== null && !intel.incendiosDisponivel;
                  return (
                    <div
                      key={linha.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm">{t(linha.nome)}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {desabilitada
                            ? t("Sem dados agora — verifique a chave FIRMS (servidor ou Ajustes)")
                            : t(linha.dica)}
                        </div>
                        {linha.id === "navios" && intelVis.navios && (
                          <div
                            className="mono mt-1 text-[10px] text-tactical-orange"
                            data-test="ais-status"
                          >
                            {statusAis === "ativo"
                              ? t("Ao vivo — {n} navios na área", {
                                  n: formatInteger(navios.length),
                                })
                              : statusAis === "conectando"
                                ? t("Conectando ao AISStream…")
                                : statusAis === "erro"
                                  ? t("Falha na conexão AIS — nova tentativa em instantes")
                                  : ""}
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={intelVis[linha.id]}
                        disabled={desabilitada}
                        aria-label={t("Ativar camada {n}", { n: linha.nome })}
                        onCheckedChange={(v) =>
                          updatePrefs({ intelVis: { ...intelVis, [linha.id]: v } })
                        }
                      />
                    </div>
                  );
                })}
              </div>
              {intelStatus === "erro" && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {t("Sem conexão agora — as camadas mostram os últimos dados coletados.")}
                </p>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "goto"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">{t("IR PARA COORDENADA")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              autoFocus
              placeholder="-15.7942, -47.8822  ·  ou  23KMR 1234 5678  ·  ou  15°47'39&quot;S..."
              value={gotoInput}
              onChange={(e) => setGotoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGoto()}
            />
            <Button
              onClick={handleGoto}
              className="w-full bg-tactical-orange text-background glove-tap"
            >
              {t("Voar até o alvo")}
            </Button>
            <p className="text-xs text-muted-foreground mono">
              {t("Aceita formatos DD, DMS e MGRS.")}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "rota"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">GUIA DE ROTA</SheetTitle>
          </SheetHeader>
          <div className="mt-4" data-test="painel-rota">
            <PainelRota
              rota={rota}
              navegando={navegando}
              gravando={gravando}
              trilha={
                trilha.length > 0
                  ? {
                      pontos: trilha,
                      iniciada_em: trilhaIniciadaEm.current ?? "",
                      atualizada_em: "",
                    }
                  : null
              }
              waypoints={waypoints}
              temPosicao={!!userPos}
              onAdicionarPosicao={adicionarPosicaoNaRota}
              onAdicionarWaypoint={adicionarWaypointNaRota}
              onRemoverPonto={removerPontoRota}
              onMoverPonto={moverPontoRota}
              onRenomearRota={renomearRota}
              onIniciar={iniciarNavegacao}
              onParar={pararNavegacao}
              onAlternarGravacao={alternarGravacaoTrilha}
              onVoltarInicio={voltarAoInicio}
              onExportarRota={exportarRotaGPX}
              onExportarTrilha={exportarTrilhaGPX}
              onApagarTrilha={apagarTrilha}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "measure"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">{t("MEDIÇÃO")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setTool("measure-line");
                setDrawCoords([]);
                setOpenSheet(null);
                toast.message(t("Toque no mapa para adicionar pontos"));
              }}
              className="glove-tap"
            >
              {t("Distância linear")}
            </Button>
            <Button
              onClick={() => {
                setTool("measure-area");
                setDrawCoords([]);
                setOpenSheet(null);
                toast.message(t("Toque no mapa para desenhar o polígono"));
              }}
              className="glove-tap"
            >
              {t("Área do polígono")}
            </Button>
            <Button
              variant="secondary"
              disabled={drawCoords.length < 2}
              onClick={() => {
                runElevation();
                setOpenSheet(null);
              }}
              className="glove-tap col-span-2"
            >
              {t("Gerar perfil de elevação")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearDraw();
                setTool("none");
                setOpenSheet(null);
              }}
              className="glove-tap col-span-2"
            >
              {t("Limpar e sair")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "boletim"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">
              {t("BOLETIM DE INTELIGÊNCIA")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="mono text-[10px] text-muted-foreground">
              {boletimEm
                ? t("Conferido às {n} · centro do mapa", { n: formatTime(boletimEm) })
                : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="glove-tap mono text-[11px]"
                data-test="boletim-obsidian"
                onClick={() => void salvarBoletimObsidian()}
              >
                <NotebookPen className="mr-1 h-3.5 w-3.5" /> Obsidian
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="glove-tap mono text-[11px]"
                onClick={carregarBoletim}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> {t("Atualizar")}
              </Button>
            </div>
          </div>

          <div className="mt-3 max-h-[62dvh] space-y-3 overflow-y-auto pr-1">
            {/* MODO ALERTA — resumo do radar de proximidade no topo do boletim */}
            <div
              data-test="radar-resumo"
              className="rounded-md border border-border bg-background/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="mono flex items-center gap-2 text-[12px] font-bold text-tactical-orange">
                  <Siren className="h-3.5 w-3.5" /> {t("MODO ALERTA")}
                  {radarEm > 0 && (
                    <span
                      data-test="radar-total"
                      className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      {radarEm}
                    </span>
                  )}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="glove-tap h-7 mono text-[10px]"
                  onClick={() => setOpenSheet("alertas")}
                >
                  {t("Radar completo")}
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {t("Radar de proximidade · referência: {n}", {
                  n: userPos ? t("minha posição") : t("centro do mapa"),
                })}
              </p>
              {radarAlertas.length === 0 ? (
                <p className="mono mt-2 text-[11px] text-emerald-400">
                  {t("NENHUMA AMEAÇA NO RADAR")}
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {radarAlertas.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex items-start gap-2 text-[11px] leading-snug">
                      <span
                        aria-hidden
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          a.nivel === "critico"
                            ? "bg-red-500"
                            : a.nivel === "atencao"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{a.titulo}</span>
                        {a.distanciaKm != null && <> · a {formatNumber(a.distanciaKm, 1)} km</>}
                        {(() => {
                          const rel = horaRelativa(a.hora, Date.now());
                          return rel ? ` · ${rel}` : "";
                        })()}
                        <span className="text-muted-foreground"> · {a.fonte}</span>
                      </span>
                    </li>
                  ))}
                  {radarAlertas.length > 5 && (
                    <li className="text-[10px] text-muted-foreground">
                      {t("+ {n} no radar completo", { n: radarAlertas.length - 5 })}
                    </li>
                  )}
                </ul>
              )}
            </div>

            <SecaoBoletim titulo="CLIMA ESPACIAL" fonte="NOAA SWPC">
              {intel?.climaEspacial ? (
                <div>
                  <span
                    className={
                      intel.climaEspacial.nivel === "tempestade"
                        ? "text-red-400"
                        : intel.climaEspacial.nivel === "instavel"
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }
                  >
                    KP {formatNumber(intel.climaEspacial.kp, 1)}
                  </span>{" "}
                  — {intel.climaEspacial.classificacao}
                  {intel.climaEspacial.medidoEm && (
                    <div className="text-[10px] text-muted-foreground">
                      Medição {formatDateTime(new Date(intel.climaEspacial.medidoEm).getTime())}
                    </div>
                  )}
                </div>
              ) : (
                <SemDados />
              )}
            </SecaoBoletim>

            <SecaoBoletim titulo="QUALIDADE DO AR" fonte="Open-Meteo">
              {ar ? (
                <div>
                  <span
                    className={
                      ar.nivel === "boa" || ar.nivel === "razoavel"
                        ? "text-emerald-400"
                        : ar.nivel === "moderada"
                          ? "text-yellow-300"
                          : "text-red-400"
                    }
                  >
                    IQAr {formatInteger(ar.aqiEuropeu)}
                  </span>{" "}
                  — {ar.classificacao}
                  <div className="text-[10px] text-muted-foreground">
                    PM2,5 {formatNumber(ar.pm25, 1)} · PM10 {formatNumber(ar.pm10, 1)} · Ozônio{" "}
                    {formatInteger(ar.ozonio)} µg/m³
                  </div>
                </div>
              ) : (
                <SemDados />
              )}
            </SecaoBoletim>

            <SecaoBoletim titulo="ALERTAS OFICIAIS FORTES" fonte="GDACS (UE/ONU)">
              {(alertas ?? []).filter((a) => a.nivel !== "Green").length > 0 ? (
                <div className="space-y-1">
                  {(alertas ?? [])
                    .filter((a) => a.nivel !== "Green")
                    .slice(0, 6)
                    .map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="block w-full rounded px-1 py-0.5 text-left hover:bg-background/60"
                        onClick={() => {
                          flyTo(a.lng, a.lat, 6);
                          setOpenSheet(null);
                        }}
                      >
                        <span className={a.nivel === "Red" ? "text-red-400" : "text-amber-400"}>
                          ●
                        </span>{" "}
                        <span className="font-bold">{a.tipo}</span> — {a.pais}: {a.nome}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  {alertas ? t("Nenhum alerta laranja/vermelho ativo agora.") : <SemDados />}
                </div>
              )}
            </SecaoBoletim>

            <SecaoBoletim titulo="SISMOS SIGNIFICATIVOS" fonte="USGS · M4,5+ nas últimas 24 h">
              {(intel?.sismos ?? []).filter((s) => s.mag >= 4.5).length > 0 ? (
                <div className="space-y-1">
                  {[...(intel?.sismos ?? [])]
                    .filter((s) => s.mag >= 4.5)
                    .sort((a, b) => b.mag - a.mag)
                    .slice(0, 6)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="block w-full rounded px-1 py-0.5 text-left hover:bg-background/60"
                        onClick={() => {
                          flyTo(s.lng, s.lat, 6);
                          setOpenSheet(null);
                        }}
                      >
                        <span className="font-bold text-tactical-orange">
                          M{formatNumber(s.mag, 1)}
                        </span>{" "}
                        {s.lugar}
                        <span className="text-[10px] text-muted-foreground">
                          {" "}
                          · {formatDateTime(s.hora)}
                        </span>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  {t("Nenhum sismo M4,5+ nas últimas 24 h.")}
                </div>
              )}
            </SecaoBoletim>

            <SecaoBoletim titulo="EVENTOS NATURAIS ATIVOS" fonte="NASA EONET">
              {(intel?.eventos ?? []).length > 0 ? (
                <div className="space-y-1">
                  {[...(intel?.eventos ?? [])]
                    .sort((a, b) => b.hora - a.hora)
                    .slice(0, 5)
                    .map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="block w-full rounded px-1 py-0.5 text-left hover:bg-background/60"
                        onClick={() => {
                          flyTo(e.lng, e.lat, 6);
                          setOpenSheet(null);
                        }}
                      >
                        <span className="font-bold text-amber-400">{e.categoria}</span> — {e.titulo}
                      </button>
                    ))}
                </div>
              ) : (
                <SemDados />
              )}
            </SecaoBoletim>

            <SecaoBoletim titulo="ISS — ESTAÇÃO ESPACIAL INTERNACIONAL" fonte="WhereTheISS.at">
              {iss ? (
                <div>
                  {t("Altitude")} {formatInteger(iss.altitudeKm)} km ·{" "}
                  {formatInteger(iss.velocidadeKmh)} km/h ·{" "}
                  {iss.visibilidade === "daylight" ? t("iluminada") : t("na sombra da Terra")}
                  <div className="text-[10px] text-muted-foreground">
                    {t("Posição")} {formatDecimalDegrees(iss.lat)}, {formatDecimalDegrees(iss.lng)}{" "}
                    ·{t("camada ativa no mapa mostra a trajetória.")}
                  </div>
                </div>
              ) : (
                <SemDados />
              )}
            </SecaoBoletim>

            <SecaoBoletim titulo="MANCHETES GLOBAIS DE EMERGÊNCIA" fonte="GDELT · últimas 24 h">
              {(noticias ?? []).length > 0 ? (
                <div className="space-y-1.5">
                  {(noticias ?? []).slice(0, 8).map((n, i) => (
                    <a
                      key={`${n.url}-${i}`}
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded px-1 py-0.5 hover:bg-background/60"
                    >
                      {n.titulo}
                      <span className="text-[10px] text-muted-foreground">
                        {" "}
                        · {n.fonte}
                        {n.hora ? ` · ${formatTime(n.hora)}` : ""}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <SemDados />
              )}
            </SecaoBoletim>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {t(
                "Fontes ao vivo: USGS · NASA EONET/FIRMS · NOAA SWPC · GDACS · GDELT · WhereTheISS.at · Open-Meteo · rede ADS-B (adsb.lol) · AISStream (opcional). Referências curadas: zonas de conflito, centrais nucleares e pontos marítimos estratégicos — não são feeds em tempo real.",
              )}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* MODO ALERTA — radar de proximidade (ameaças perto do operador) */}
      <Sheet open={openSheet === "alertas"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange flex items-center gap-2">
              <Siren className="h-4 w-4" /> {t("MODO ALERTA")}
              {radarEm > 0 && (
                <span
                  data-test="radar-total"
                  className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white"
                >
                  {radarEm}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="mono text-[10px] text-muted-foreground">
              {t("Radar de proximidade · referência: {n}", {
                n: userPos ? t("minha posição") : t("centro do mapa"),
              })}
              {boletimEm ? ` · ${t("conferido às {n}", { n: formatTime(boletimEm) })}` : ""}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="glove-tap mono text-[11px]"
              onClick={carregarBoletim}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> {t("Atualizar")}
            </Button>
          </div>

          {radarAlertas.length === 0 ? (
            <div className="mt-6 mb-4 rounded-md border border-border bg-background/40 p-4 text-center">
              <p className="mono text-sm text-emerald-400">{t("NENHUMA AMEAÇA NO RADAR")}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                {t(
                  "Nenhum foco de calor, sismo forte, evento natural ou alerta oficial próximo do ponto de referência. O radar continua varrendo a cada 90 segundos enquanto o aplicativo estiver aberto — e você pode mover o mapa para examinar outra região.",
                )}
              </p>
            </div>
          ) : (
            <div className="mt-3 max-h-[62dvh] space-y-2 overflow-y-auto pr-1">
              {radarAlertas.map((a) => (
                <div
                  key={a.id}
                  data-test="radar-item"
                  className="rounded-md border border-border bg-background/40 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        a.nivel === "critico"
                          ? "bg-red-500"
                          : a.nivel === "atencao"
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="mono text-[13px] font-bold leading-tight">{a.titulo}</p>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                        {a.detalhe}
                      </p>
                      <p className="mono mt-1.5 text-[10px] text-muted-foreground">
                        {a.fonte}
                        {a.distanciaKm != null && (
                          <>
                            {" · "}
                            <span
                              className={
                                a.nivel === "critico"
                                  ? "text-red-400"
                                  : a.nivel === "atencao"
                                    ? "text-amber-400"
                                    : ""
                              }
                            >
                              a {formatNumber(a.distanciaKm, 1)} km
                            </span>
                          </>
                        )}
                        {(() => {
                          const rel = horaRelativa(a.hora, Date.now());
                          return rel ? ` · ${rel}` : "";
                        })()}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {a.lng != null && a.lat != null && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="glove-tap h-7 mono text-[10px]"
                            onClick={() => {
                              flyTo(
                                a.lng as number,
                                a.lat as number,
                                (a.distanciaKm ?? 0) < 10 ? 12 : (a.distanciaKm ?? 0) < 50 ? 10 : 8,
                              );
                              setOpenSheet(null);
                            }}
                          >
                            <Crosshair className="mr-1 h-3 w-3" /> {t("Ver no mapa")}
                          </Button>
                        )}
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="glove-tap inline-flex h-7 items-center rounded-md border border-border px-2 mono text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            {t("Fonte oficial ↗")}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {t(
              "Critérios do radar: focos de calor NASA FIRMS até 50 km (crítico até 15 km) · sismos USGS M4+ até 600 km (crítico M5,5+ até 300 km ou aviso de tsunami) · alertas oficiais GDACS até 1000 km (vermelho/laranja) e verdes até 300 km · eventos NASA EONET até 500 km · tempestade geomagnética NOAA (global). Coleta a cada 90 s com cache offline.",
            )}
          </p>
        </SheetContent>
      </Sheet>

      {/* Hub Osiris — menu central de inteligência */}
      <OsirisHub
        open={openSheet === "hub"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        snapshot={intel}
        iss={iss}
        voos={voos ?? []}
        intelVis={intelVis}
        center={center}
        secaoInicial={hubSecao}
        onAbrirCamadas={() => setOpenSheet("layers")}
        onAbrirBoletim={() => setOpenSheet("boletim")}
        onFlyTo={(lng, lat, zoom = 10) => {
          flyTo(lng, lat, zoom);
          setOpenSheet(null);
        }}
        onAtualizar={carregarBoletim}
      />

      {/* Menu geral — botão hambúrguer com submenu do Osiris */}
      <MenuApp
        open={openSheet === "menu"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        modo={modoMapa}
        marcadorAtivo={tool === "marker"}
        bussolaAtiva={compassMode !== "mini"}
        globoAtivo={projecao === "globe"}
        onAcaoMapa={acaoMenu}
        onAcaoOsiris={acaoMenu}
      />

      {/* Bússola flutuante sobre o mapa (só no modo tático, se visível).
          No desktop fica no canto INFERIOR ESQUERDO, acima da escala — o
          canto direito pertence ao rail de ações e nunca é coberto. */}
      {modoMapa === "tatico" && telaVis.bussola && (
        <div
          className={
            compassMode === "full"
              ? "absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/60 p-3 pb-24 backdrop-blur-md"
              : `absolute z-30 ${
                  // Painel: à esquerda da trilha (no desktop o rail tem 2
                  // colunas — o painel fica 148px afastado da borda, entre
                  // ele e o centro, sempre acima da atribuição).
                  compassMode === "panel"
                    ? "right-[5.5rem] top-[20.5rem] bottom-8 md:right-[10.5rem] md:top-auto md:bottom-14"
                    : "right-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:left-4 md:right-auto md:bottom-11"
                } ${elevationData.length > 1 || newMarker ? "hidden md:block" : "block"}`
          }
          onClick={
            compassMode === "full"
              ? (e) => {
                  // Tocar fora do cartão devolve ao painel flutuante.
                  if (e.target === e.currentTarget) setCompassMode("panel");
                }
              : undefined
          }
        >
          <div
            className={
              compassMode === "mini"
                ? "hud-panel rounded-full p-1.5 shadow-lg"
                : compassMode === "panel"
                  ? "compass-card compass-in flex w-[min(66vw,19rem)] flex-col max-h-full overflow-hidden md:max-h-[min(max(calc(100dvh-14rem),17rem),32rem)]"
                  : "compass-card compass-in flex w-full max-w-md flex-col overflow-hidden"
            }
          >
            <div
              className={`flex shrink-0 items-center justify-between gap-1 ${
                compassMode === "panel"
                  ? "px-3 pt-3 pb-1"
                  : compassMode === "full"
                    ? "px-4 pt-4 pb-1"
                    : "mb-1"
              }`}
            >
              <span className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
                {compassMode === "mini" ? "" : t("Bússola")}
              </span>
              <div className="flex items-center gap-1.5">
                {compassMode !== "mini" && (
                  <button
                    type="button"
                    aria-label="Aprender a usar a bússola"
                    title="Aprender a usar a bússola — treinamento interativo"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-tactical-orange/50 bg-tactical-orange/10 text-tactical-orange transition-colors hover:bg-tactical-orange/20"
                    onClick={() => navegar({ to: "/tutorial" })}
                  >
                    <GraduationCap className="h-4 w-4" />
                  </button>
                )}
                {compassMode !== "mini" && (
                  <button
                    type="button"
                    aria-label={t("Minimizar bússola")}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10"
                    onClick={() => setCompassMode("mini")}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
                {compassMode === "panel" && (
                  <button
                    type="button"
                    aria-label={t("Ver bússola em tela cheia")}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-tactical-orange/50 bg-tactical-orange/10 text-tactical-orange transition-colors hover:bg-tactical-orange/20"
                    onClick={() => setCompassMode("full")}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                {compassMode === "full" && (
                  <button
                    type="button"
                    aria-label={t("Reduzir bússola")}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-tactical-orange/50 bg-tactical-orange/10 text-tactical-orange transition-colors hover:bg-tactical-orange/20"
                    onClick={() => setCompassMode("panel")}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-label={t("Abrir bússola")}
              title={t("Abrir bússola")}
              className={compassMode === "mini" ? "block glove-tap cursor-pointer" : "hidden"}
              onClick={() => setCompassMode("panel")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCompassMode("panel");
                }
              }}
            >
              <CompassRose
                heading={heading}
                declination={decl}
                center={center}
                altitude={userPos?.alt ?? null}
                variant="mini"
                magnetic={bussolaMagnetica}
                onToggleMagnetic={alternarNorteBussola}
              />
            </div>

            {compassMode !== "mini" && (
              <div
                className={
                  compassMode === "panel" ? "min-h-0 flex-1 overflow-y-auto p-3 pt-1" : "px-4 py-3"
                }
              >
                <CompassRose
                  heading={heading}
                  declination={decl}
                  center={center}
                  altitude={userPos?.alt ?? null}
                  variant={compassMode}
                  magnetic={bussolaMagnetica}
                  onToggleMagnetic={alternarNorteBussola}
                  bearingToWaypoint={
                    waypoints[0]
                      ? bearingDeg(center, [waypoints[0].longitude, waypoints[0].latitude])
                      : null
                  }
                  waypointLabel={waypoints[0]?.title ?? null}
                  onRotate={(h) => mapRef.current?.rotateTo(h, { duration: 0 })}
                  onReset={() => mapRef.current?.rotateTo(0, { duration: 400 })}
                />
                {/* Rotação e posição rolam JUNTO com o conteúdo do cartão:
                    fixos no rodapé eles esmagavam a rosa em telas baixas
                    (o cartão inteiro ficava menor que cabeçalho + controles). */}
                <MapaControlesComSensor
                  className={
                    compassMode === "panel"
                      ? "mt-2 border-t border-white/10 pt-2.5"
                      : "mt-3 border-t border-white/10 pt-3"
                  }
                  rotaciona={mapaRotaciona}
                  onRotaciona={(v) => updatePrefs({ mapaRotaciona: v })}
                  travado={posicaoTravada}
                  centroAtual={center}
                  onTravar={travarPosicao}
                  onDestravar={destravarPosicao}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posição travada: chip flutuante para ver e destravar quando a seção
          MAPA do cartão não está à vista (miniatura, Osiris ou bússola oculta) */}
      {posicaoTravada && (compassMode === "mini" || modoMapa !== "tatico" || !telaVis.bussola) && (
        <div
          data-test="mapa-travado"
          className={`absolute left-2 z-20 md:bottom-12 md:left-1/2 md:-translate-x-1/2 ${
            telaVis.redline && modoMapa === "tatico"
              ? "bottom-[calc(6.25rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
          }`}
        >
          <button
            type="button"
            onClick={destravarPosicao}
            title={t("Destravar a posição do mapa")}
            aria-label={t("Destravar a posição do mapa")}
            className="hud-panel mono flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-tactical-green shadow-lg"
          >
            <Lock className="h-3 w-3 shrink-0" />
            <span>
              {formatDecimalDegrees(posicaoTravada.lat)}, {formatDecimalDegrees(posicaoTravada.lng)}
            </span>
            <X className="h-3 w-3 shrink-0" />
          </button>
        </div>
      )}

      {/* Redline do boletim: letreiro fixo na barra inferior com TODAS as
          informações do Boletim de Inteligência e da bússola em rotação. */}
      {modoMapa === "tatico" && telaVis.redline && (
        <RedlineBoletim
          heading={heading}
          declination={decl}
          center={center}
          altitude={userPos?.alt ?? null}
          bearingToWaypoint={
            waypoints[0]
              ? bearingDeg(center, [waypoints[0].longitude, waypoints[0].latitude])
              : null
          }
          waypointLabel={waypoints[0]?.title ?? null}
        />
      )}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  water: "#3FA9F5",
  shelter: "#8B6F47",
  danger: "#E63946",
  foraging: "#6BBF59",
  cache: "#F4A261",
  custom: "#FF6B35",
};

const CATEGORY_LABELS_PT: Record<string, string> = {
  water: "Água",
  shelter: "Abrigo",
  danger: "Perigo",
  foraging: "Coleta",
  cache: "Cache",
  custom: "Personalizado",
};

function RailBtn({
  icon: Icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: typeof Crosshair;
  label: string;
  onClick: () => void;
  active?: boolean;
  /** Contador de ameaças (MODO ALERTA) — pílula no canto do botão. */
  badge?: number;
}) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      title={t(label)}
      className={`glove-tap hud-panel relative rounded-md flex flex-col items-center justify-center gap-0.5 px-2 py-0.5 md:py-1 mono text-[10px] ${
        active ? "text-tactical-orange border-tactical-orange" : "text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 md:h-5 md:w-5" />
      <span className="uppercase tracking-wider">{t(label)}</span>
      {badge != null && badge > 0 && (
        <span
          data-test="radar-badge"
          className="absolute -top-1.5 -right-1.5 min-w-[1.15rem] rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-[1.15rem] text-white"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

/** Painel de coordenadas do centro do mapa (compartilhado entre mobile e desktop). */
function PainelCentro({
  center,
  decl,
  onCopy,
}: {
  center: [number, number];
  decl: number;
  onCopy: (t: string) => void;
}) {
  const { t: trad } = useI18n();
  return (
    <div className="hud-panel rounded-md p-2 mono text-xs" data-test="painel-centro">
      <div className="flex items-center justify-between text-tactical-orange">
        <span className="font-bold tracking-wider">{trad("CENTRO")}</span>
        <span>Δ {formatSignedDegrees(decl)}</span>
      </div>
      <div className="grid grid-cols-[60px_1fr] gap-x-2 mt-1 text-foreground">
        <span className="text-muted-foreground">DD</span>
        <button
          className="text-left truncate"
          onClick={() => onCopy(formatDD(center[0], center[1]))}
        >
          {formatDD(center[0], center[1])}
        </button>
        <span className="text-muted-foreground">DMS</span>
        <button
          className="text-left truncate"
          onClick={() => onCopy(formatDMS(center[0], center[1]))}
        >
          {formatDMS(center[0], center[1])}
        </button>
        <span className="text-muted-foreground">MGRS</span>
        <button
          className="text-left truncate"
          onClick={() => onCopy(formatMGRS(center[0], center[1]))}
        >
          {formatMGRS(center[0], center[1])}
        </button>
      </div>
    </div>
  );
}

type MapShellUserPos = { lng: number; lat: number; alt: number | null; acc: number } | null;

/** Painel da posição atual do usuário (compartilhado entre mobile e desktop). */
function PainelPosicao({
  userPos,
  onCentrar,
  onUltimoLocal,
}: {
  userPos: MapShellUserPos;
  onCentrar: () => void;
  onUltimoLocal: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="hud-panel rounded-md p-2 mono text-xs" data-test="painel-posicao">
      <div className="flex items-center justify-between text-sky-400">
        <span className="font-bold tracking-wider">{t("MINHA POSIÇÃO")}</span>
        <span>{userPos ? `± ${formatElevation(userPos.acc)}` : t("aguardando sinal")}</span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2 text-foreground">
        <Cell label={t("Latitude")} value={userPos ? formatDecimalDegrees(userPos.lat) : "—"} />
        <Cell label={t("Longitude")} value={userPos ? formatDecimalDegrees(userPos.lng) : "—"} />
        <Cell
          label={t("Altitude")}
          value={userPos && userPos.alt != null ? formatElevation(userPos.alt) : "—"}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="glove-tap flex-1 rounded border border-sky-400/60 text-sky-400 py-1 uppercase tracking-wider"
          onClick={onCentrar}
        >
          {t("Centrar em mim")}
        </button>
        <button
          type="button"
          className="glove-tap flex-1 rounded border border-border text-muted-foreground py-1 uppercase tracking-wider"
          onClick={onUltimoLocal}
        >
          {t("Último local")}
        </button>
      </div>
    </div>
  );
}

/** Leitura da ferramenta de medição ativa. */
function LeituraMedicao({
  tool,
  lineLen,
  areaFmt,
  onClear,
}: {
  tool: "measure-line" | "measure-area";
  lineLen: number;
  areaFmt: ReturnType<typeof formatArea>;
  onClear: () => void;
}) {
  return (
    <div
      className="hud-panel rounded-md px-3 py-2 mono text-xs flex items-center gap-3"
      data-test="leitura-medicao"
    >
      {tool === "measure-line" ? (
        <>
          <span className="text-tactical-orange">DIST</span>
          <span>{formatMeters(lineLen)}</span>
          <span className="text-muted-foreground">·</span>
          <span>{formatNauticalMiles(lineLen)}</span>
        </>
      ) : (
        <>
          <span className="text-tactical-orange">ÁREA</span>
          <span>{areaFmt.m2}</span>
          <span className="text-muted-foreground">·</span>
          <span>{areaFmt.ha}</span>
          <span className="text-muted-foreground">·</span>
          <span>{areaFmt.acres}</span>
        </>
      )}
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function copy(t: string) {
  navigator.clipboard?.writeText(t);
  toast.success(tGlobal("Copiado"), { description: t });
}

function emptyFC() {
  return { type: "FeatureCollection" as const, features: [] };
}
function waypointsFC(ws: LocalWaypoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: ws.map((w) => ({
      type: "Feature" as const,
      properties: { id: w.id, title: w.title, color: w.color },
      geometry: { type: "Point" as const, coordinates: [w.longitude, w.latitude] },
    })),
  };
}
/** Rota como LineString + pontos (o alvo atual recebe alvo:true para o anel). */
function rotaFC(rota: RotaSalva | null, indice: number) {
  if (!rota || rota.pontos.length === 0) return emptyFC();
  const coords = rota.pontos.map((p) => [p.lng, p.lat] as [number, number]);
  const features: GeoJSON.Feature[] = [];
  if (coords.length >= 2) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords },
    });
  }
  rota.pontos.forEach((p, i) => {
    features.push({
      type: "Feature",
      properties: { i, alvo: i === indice, nome: p.nome },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    });
  });
  return { type: "FeatureCollection" as const, features };
}

/** Trilha gravada como LineString ([lng, lat] — ordem GeoJSON). */
function trilhaFC(pontos: Array<[number, number]>) {
  if (pontos.length < 2) return emptyFC();
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: pontos },
      },
    ],
  };
}

function drawFC(coords: [number, number][], tool: Tool) {
  if (coords.length === 0) return emptyFC();
  const features: GeoJSON.Feature[] = coords.map((c, i) => ({
    type: "Feature",
    properties: { i },
    geometry: { type: "Point", coordinates: c },
  }));
  if (coords.length >= 2 && tool === "measure-line") {
    features.unshift({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords },
    });
  } else if (coords.length >= 3 && tool === "measure-area") {
    features.unshift({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background/50 px-2 py-1">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="truncate text-[11px] text-foreground">{value}</div>
    </div>
  );
}

/** Seção do boletim com cabeçalho tático e fonte citada. */
function SecaoBoletim({
  titulo,
  fonte,
  children,
}: {
  titulo: string;
  fonte: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-md border border-border bg-background/40 p-3">
      <div className="mono mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
          {t(titulo)}
        </span>
        <span className="text-[9px] text-muted-foreground">{fonte}</span>
      </div>
      <div className="mono text-xs leading-relaxed">{children}</div>
    </section>
  );
}

function SemDados() {
  const { t } = useI18n();
  return (
    <span className="text-muted-foreground">{t("Aguardando coleta… toque em Atualizar.")}</span>
  );
}
