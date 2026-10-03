import { useEffect, useRef, useState, useCallback } from "react";
import type maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Layers,
  Crosshair,
  Ruler,
  MapPin,
  Compass,
  Download,
  Navigation2,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  Minus,
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
} from "@/lib/geo";
import { magneticDeclination } from "@/lib/declination";
import { listWaypoints, saveWaypoint, deleteWaypoint, type LocalWaypoint } from "@/lib/db";
import { fetchElevations } from "@/lib/elevation.functions";
import CompassRose from "@/components/map/CompassRose";
import {
  formatDegrees,
  formatSignedDegrees,
  formatElevation,
  formatDecimalDegrees,
} from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";

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
    tiles: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: "© CARTO, © OpenStreetMap",
    maxzoom: 19,
  },
};

type Tool = "none" | "measure-line" | "measure-area" | "marker";

const styleFor = (layer: BaseLayerId): maplibregl.StyleSpecification => {
  const l = BASE_LAYERS[layer];
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
    },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
};

export default function MapShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMovedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>("topo");
  const [center, setCenter] = useState<[number, number]>([-47.8822, -15.7942]);

  const [heading, setHeading] = useState(0);
  const [tool, setTool] = useState<Tool>("none");
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]);
  const [waypoints, setWaypoints] = useState<LocalWaypoint[]>([]);
  const [openSheet, setOpenSheet] = useState<null | "layers" | "goto" | "measure" | "markers">(
    null,
  );
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

  // Init map (client only)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      const map = new ml.Map({
        container: containerRef.current,
        style: styleFor(baseLayer),
        center,
        zoom: 11,
        attributionControl: { compact: true },
      });
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new ml.ScaleControl({ unit: "metric", maxWidth: 120 }), "bottom-left");
      map.addControl(
        new ml.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "top-right",
      );
      map.on("dragstart", () => {
        userMovedRef.current = true;
      });
      map.on("move", () => {
        const c = map.getCenter();
        setCenter([c.lng, c.lat]);
        setHeading(map.getBearing());
      });

      map.on("load", () => {
        // sources for drawing + markers
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
        setReady(true);
      });
      mapRef.current = map;

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
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        try {
          localStorage.setItem(
            "tgis:last-position",
            JSON.stringify({ lng: p.lng, lat: p.lat, alt: p.alt, at: Date.now() }),
          );
        } catch {
          /* armazenamento indisponível */
        }
      },
      () => {
        /* sem permissão de localização */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Desenha a marcação fixa da posição atual
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userPos) return;
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
  }, [ready, userPos]);

  // Layer swap
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    mapRef.current.setStyle(styleFor(baseLayer));
    // re-add custom sources after style swap
    mapRef.current.once("styledata", () => {
      const map = mapRef.current!;
      if (!map.getSource("draw")) {
        map.addSource("draw", { type: "geojson", data: drawFC(drawCoords, tool) });
        map.addLayer({
          id: "draw-line",
          type: "line",
          source: "draw",
          filter: ["==", "$type", "LineString"],
          paint: { "line-color": "#FF6B35", "line-width": 3, "line-dasharray": [2, 1] },
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
      }
      if (!map.getSource("waypoints")) {
        map.addSource("waypoints", { type: "geojson", data: waypointsFC(waypoints) });
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
      }
    });
  }, [baseLayer, ready]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom });
  }, []);

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

  const decl = magneticDeclination(center[1], center[0]);
  const lineLen = pathLengthMeters(drawCoords);
  const polyArea = polygonAreaSqMeters(drawCoords);
  const areaFmt = formatArea(polyArea);

  return (
    <div className="absolute inset-0 bg-background">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* HUD superior mobile: fluxo vertical — filhos nunca se sobrepõem */}
      <div className="absolute left-2 right-20 top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex flex-col gap-2 md:hidden">
        <PainelCentro center={center} decl={decl} onCopy={(t) => copy(t)} />
        <PainelPosicao
          userPos={userPos}
          onCentrar={() => {
            if (!userPos) return toast.error("Sem localização disponível");
            mapRef.current?.flyTo({ center: [userPos.lng, userPos.lat], zoom: 15 });
          }}
          onUltimoLocal={() => {
            try {
              const raw = localStorage.getItem("tgis:last-position");
              if (!raw) return toast.error("Nenhum local salvo");
              const p = JSON.parse(raw) as { lng: number; lat: number };
              mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14 });
            } catch {
              toast.error("Nenhum local salvo");
            }
          }}
        />
        {(tool === "measure-line" || tool === "measure-area") && (
          <LeituraMedicao tool={tool} lineLen={lineLen} areaFmt={areaFmt} onClear={clearDraw} />
        )}
      </div>

      {/* HUD superior desktop: posições absolutas clássicas */}
      <div className="absolute left-4 top-4 z-10 hidden w-[360px] md:block">
        <PainelCentro center={center} decl={decl} onCopy={(t) => copy(t)} />
      </div>
      <div className="absolute left-4 top-[150px] z-10 hidden w-[360px] md:block">
        <PainelPosicao
          userPos={userPos}
          onCentrar={() => {
            if (!userPos) return toast.error("Sem localização disponível");
            mapRef.current?.flyTo({ center: [userPos.lng, userPos.lat], zoom: 15 });
          }}
          onUltimoLocal={() => {
            try {
              const raw = localStorage.getItem("tgis:last-position");
              if (!raw) return toast.error("Nenhum local salvo");
              const p = JSON.parse(raw) as { lng: number; lat: number };
              mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14 });
            } catch {
              toast.error("Nenhum local salvo");
            }
          }}
        />
      </div>
      {(tool === "measure-line" || tool === "measure-area") && (
        <div className="absolute left-1/2 top-32 z-10 hidden -translate-x-1/2 md:block">
          <LeituraMedicao tool={tool} lineLen={lineLen} areaFmt={areaFmt} onClear={clearDraw} />
        </div>
      )}

      {/* Right-side action rail */}
      <div className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex flex-col gap-2 md:top-36">
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
                ? "Ferramenta de marcador desativada"
                : "Toque no mapa para marcar um waypoint",
            );
          }}
        />
        <RailBtn
          icon={Compass}
          label="Bússola"
          active={compassMode !== "mini"}
          onClick={() => setCompassMode(compassMode === "mini" ? "panel" : "mini")}
        />
      </div>

      {/* Elevation chart */}
      {elevationData.length > 1 && (
        <div
          className={`absolute left-2 right-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 hud-panel rounded-md p-3 md:left-auto md:right-4 md:bottom-4 md:w-[420px] ${
            newMarker ? "hidden md:block" : "block"
          }`}
        >
          <div className="flex items-center justify-between mono text-xs mb-1">
            <span className="text-tactical-orange font-bold">PERFIL DE ELEVAÇÃO</span>
            <button onClick={() => setElevationData([])}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#aaa" }} stroke="#444" />
                <YAxis tick={{ fontSize: 10, fill: "#aaa" }} stroke="#444" />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }}
                  formatter={(v: number) => [formatElevation(v), "Elevação"]}
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

      {/* New marker dialog */}
      {newMarker && (
        <div className="absolute left-2 right-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:w-96 z-20 hud-panel rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="mono text-tactical-orange font-bold text-sm">NOVO WAYPOINT</span>
            <button onClick={() => setNewMarker(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input
              autoFocus
              value={newMarker.title}
              onChange={(e) => setNewMarker({ ...newMarker, title: e.target.value })}
              placeholder="Ex: Fonte de água #3"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Categoria</Label>
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
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Cor</Label>
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
              Salvar waypoint
            </Button>
          </div>
        </div>
      )}

      {/* Sheets */}
      <Sheet open={openSheet === "layers"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">CAMADAS BASE</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4">
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
                {BASE_LAYERS[k].label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "goto"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">IR PARA COORDENADA</SheetTitle>
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
              Voar até o alvo
            </Button>
            <p className="text-xs text-muted-foreground mono">Aceita formatos DD, DMS e MGRS.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "measure"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">MEDIÇÃO</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setTool("measure-line");
                setDrawCoords([]);
                setOpenSheet(null);
                toast.message("Toque no mapa para adicionar pontos");
              }}
              className="glove-tap"
            >
              Distância linear
            </Button>
            <Button
              onClick={() => {
                setTool("measure-area");
                setDrawCoords([]);
                setOpenSheet(null);
                toast.message("Toque no mapa para desenhar o polígono");
              }}
              className="glove-tap"
            >
              Área do polígono
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
              Gerar perfil de elevação
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
              Limpar e sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bússola flutuante sobre o mapa */}
      <div
        className={
          compassMode === "full"
            ? "absolute inset-0 z-30 flex items-start justify-center bg-background/70 backdrop-blur-sm overflow-y-auto p-3 pb-24"
            : `absolute right-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-30 ${
                elevationData.length > 1 || newMarker ? "hidden md:block" : "block"
              }`
        }
      >
        <div
          className={
            compassMode === "mini"
              ? "hud-panel rounded-full p-1.5 shadow-lg"
              : compassMode === "panel"
                ? "hud-panel rounded-lg w-[min(72vw,18rem)] max-h-[calc(100dvh-10rem)] overflow-hidden shadow-xl"
                : "hud-panel rounded-lg p-3 w-full max-w-md shadow-xl"
          }
        >
          <div
            className={`flex items-center justify-between gap-1 ${
              compassMode === "panel" ? "sticky top-0 z-10 bg-card/95 p-2" : "mb-1"
            }`}
          >
            <span className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
              {compassMode === "mini" ? "" : "Bússola"}
            </span>
            <div className="flex items-center gap-1">
              {compassMode !== "mini" && (
                <button
                  type="button"
                  aria-label="Minimizar bússola"
                  className="glove-tap rounded border border-border p-1 text-muted-foreground"
                  onClick={() => setCompassMode("mini")}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              )}
              {compassMode === "panel" && (
                <button
                  type="button"
                  aria-label="Ver bússola em tela cheia"
                  className="glove-tap rounded border border-tactical-orange/60 p-1 text-tactical-orange"
                  onClick={() => setCompassMode("full")}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              )}
              {compassMode === "full" && (
                <button
                  type="button"
                  aria-label="Reduzir bússola"
                  className="glove-tap rounded border border-tactical-orange/60 p-1 text-tactical-orange"
                  onClick={() => setCompassMode("panel")}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label="Abrir bússola"
            className={compassMode === "mini" ? "block glove-tap" : "hidden"}
            onClick={() => setCompassMode("panel")}
          >
            <CompassRose
              heading={heading}
              declination={decl}
              center={center}
              altitude={userPos?.alt ?? null}
              variant="mini"
            />
          </button>

          {compassMode !== "mini" && (
            <div
              className={
                compassMode === "panel"
                  ? "overflow-y-auto p-2 pt-0 max-h-[calc(100dvh-12.5rem)]"
                  : ""
              }
            >
              <CompassRose
                heading={heading}
                declination={decl}
                center={center}
                altitude={userPos?.alt ?? null}
                variant={compassMode}
                bearingToWaypoint={
                  waypoints[0]
                    ? bearingDeg(center, [waypoints[0].longitude, waypoints[0].latitude])
                    : null
                }
                waypointLabel={waypoints[0]?.title ?? null}
                onRotate={(h) => mapRef.current?.rotateTo(h, { duration: 0 })}
                onReset={() => mapRef.current?.rotateTo(0, { duration: 400 })}
              />
            </div>
          )}
        </div>
      </div>
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
}: {
  icon: typeof Crosshair;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`glove-tap hud-panel rounded-md flex flex-col items-center justify-center gap-0.5 px-2 py-1 mono text-[10px] ${
        active ? "text-tactical-orange border-tactical-orange" : "text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="uppercase tracking-wider">{label}</span>
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
  return (
    <div className="hud-panel rounded-md p-2 mono text-xs">
      <div className="flex items-center justify-between text-tactical-orange">
        <span className="font-bold tracking-wider">CENTRO</span>
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
  return (
    <div className="hud-panel rounded-md p-2 mono text-xs">
      <div className="flex items-center justify-between text-sky-400">
        <span className="font-bold tracking-wider">MINHA POSIÇÃO</span>
        <span>{userPos ? `± ${formatElevation(userPos.acc)}` : "aguardando sinal"}</span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2 text-foreground">
        <Cell label="Latitude" value={userPos ? formatDecimalDegrees(userPos.lat) : "—"} />
        <Cell label="Longitude" value={userPos ? formatDecimalDegrees(userPos.lng) : "—"} />
        <Cell
          label="Altitude"
          value={userPos && userPos.alt != null ? formatElevation(userPos.alt) : "—"}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="glove-tap flex-1 rounded border border-sky-400/60 text-sky-400 py-1 uppercase tracking-wider"
          onClick={onCentrar}
        >
          Centrar em mim
        </button>
        <button
          type="button"
          className="glove-tap flex-1 rounded border border-border text-muted-foreground py-1 uppercase tracking-wider"
          onClick={onUltimoLocal}
        >
          Último local
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
    <div className="hud-panel rounded-md px-3 py-2 mono text-xs flex items-center gap-3">
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
  toast.success("Copiado", { description: t });
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
