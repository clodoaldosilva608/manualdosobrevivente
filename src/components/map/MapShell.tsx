import { useEffect, useRef, useState, useCallback } from "react";
import type maplibregl from "maplibre-gl";
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
import {
  listWaypoints,
  saveWaypoint,
  deleteWaypoint,
  type LocalWaypoint,
} from "@/lib/db";
import { fetchElevations } from "@/lib/elevation.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type BaseLayerId = "satellite" | "topo" | "streets" | "dark";
const BASE_LAYERS: Record<
  BaseLayerId,
  { label: string; tiles: string; attribution: string; maxzoom?: number }
> = {
  satellite: {
    label: "Satellite",
    tiles:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, Maxar, Earthstar Geographics",
    maxzoom: 19,
  },
  topo: {
    label: "Topographic",
    tiles: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap",
    maxzoom: 17,
  },
  streets: {
    label: "Streets",
    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxzoom: 19,
  },
  dark: {
    label: "Dark Tactical",
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
  const [ready, setReady] = useState(false);
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>("topo");
  const [center, setCenter] = useState<[number, number]>([-105.2705, 40.0150]);
  const [heading, setHeading] = useState(0);
  const [tool, setTool] = useState<Tool>("none");
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]);
  const [waypoints, setWaypoints] = useState<LocalWaypoint[]>([]);
  const [openSheet, setOpenSheet] = useState<
    null | "layers" | "goto" | "measure" | "markers" | "compass"
  >(null);
  const [gotoInput, setGotoInput] = useState("");
  const [newMarker, setNewMarker] = useState<{
    lng: number;
    lat: number;
    title: string;
    category: string;
    color: string;
  } | null>(null);
  const [elevationData, setElevationData] = useState<
    Array<{ d: number; e: number }>
  >([]);
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
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    listWaypoints().then(setWaypoints).catch(() => {});
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
      toast.error("Could not parse coordinate", {
        description: "Try DD (40.01, -105.27), DMS, or MGRS.",
      });
      return;
    }
    flyTo(c[0], c[1]);
    setOpenSheet(null);
    toast.success("Target acquired");
  };

  const clearDraw = () => {
    setDrawCoords([]);
    setElevationData([]);
  };

  const runElevation = async () => {
    if (drawCoords.length < 2) return;
    const sampled = samplePath(drawCoords, 50, 120);
    toast.loading("Sampling elevation...", { id: "elev" });
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
      toast.success("Elevation profile ready", { id: "elev" });
    } catch (e) {
      toast.error("Elevation lookup failed", {
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
    toast.success("Waypoint dropped");
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
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top HUD: coordinates */}
      <div className="absolute left-2 right-2 top-2 z-10 md:left-4 md:right-auto md:top-4 md:w-[360px] hud-panel rounded-md p-2 mono text-xs">
        <div className="flex items-center justify-between text-tactical-orange">
          <span className="font-bold tracking-wider">CENTER</span>
          <span>Δ {decl >= 0 ? "+" : ""}{decl.toFixed(1)}°</span>
        </div>
        <div className="grid grid-cols-[60px_1fr] gap-x-2 mt-1 text-foreground">
          <span className="text-muted-foreground">DD</span>
          <button
            className="text-left truncate"
            onClick={() => copy(formatDD(center[0], center[1]))}
          >
            {formatDD(center[0], center[1])}
          </button>
          <span className="text-muted-foreground">DMS</span>
          <button
            className="text-left truncate"
            onClick={() => copy(formatDMS(center[0], center[1]))}
          >
            {formatDMS(center[0], center[1])}
          </button>
          <span className="text-muted-foreground">MGRS</span>
          <button
            className="text-left truncate"
            onClick={() => copy(formatMGRS(center[0], center[1]))}
          >
            {formatMGRS(center[0], center[1])}
          </button>
        </div>
      </div>

      {/* Right-side action rail */}
      <div className="absolute right-2 top-32 md:top-36 z-10 flex flex-col gap-2">
        <RailBtn icon={Layers} label="Layers" onClick={() => setOpenSheet("layers")} />
        <RailBtn icon={Navigation2} label="Go to" onClick={() => setOpenSheet("goto")} />
        <RailBtn icon={Ruler} label="Measure" onClick={() => setOpenSheet("measure")} />
        <RailBtn
          icon={MapPin}
          label="Marker"
          active={tool === "marker"}
          onClick={() => {
            setTool(tool === "marker" ? "none" : "marker");
            toast.message(tool === "marker" ? "Marker tool off" : "Tap map to drop a waypoint");
          }}
        />
        <RailBtn icon={Compass} label="Compass" onClick={() => setOpenSheet("compass")} />
      </div>

      {/* Active tool readout */}
      {(tool === "measure-line" || tool === "measure-area") && (
        <div className="absolute left-1/2 -translate-x-1/2 top-28 md:top-32 z-10 hud-panel rounded-md px-3 py-2 mono text-xs flex items-center gap-3">
          {tool === "measure-line" ? (
            <>
              <span className="text-tactical-orange">DIST</span>
              <span>{formatMeters(lineLen)}</span>
              <span className="text-muted-foreground">·</span>
              <span>{formatNauticalMiles(lineLen)}</span>
            </>
          ) : (
            <>
              <span className="text-tactical-orange">AREA</span>
              <span>{areaFmt.m2}</span>
              <span className="text-muted-foreground">·</span>
              <span>{areaFmt.ha}</span>
              <span className="text-muted-foreground">·</span>
              <span>{areaFmt.acres}</span>
            </>
          )}
          <button onClick={clearDraw} className="text-muted-foreground hover:text-foreground">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Elevation chart */}
      {elevationData.length > 1 && (
        <div className="absolute left-2 right-2 md:left-auto md:right-4 md:bottom-4 md:w-[420px] bottom-20 z-10 hud-panel rounded-md p-3">
          <div className="flex items-center justify-between mono text-xs mb-1">
            <span className="text-tactical-orange font-bold">ELEVATION PROFILE</span>
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
                  formatter={(v: number) => [`${v} m`, "Elev"]}
                  labelFormatter={(d) => `${d} m`}
                />
                <Area type="monotone" dataKey="e" stroke="#FF6B35" fill="url(#elev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* New marker dialog */}
      {newMarker && (
        <div className="absolute inset-x-0 bottom-16 md:bottom-4 md:right-4 md:left-auto md:w-96 z-20 hud-panel rounded-md p-4 mx-2 md:mx-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="mono text-tactical-orange font-bold text-sm">NEW WAYPOINT</span>
            <button onClick={() => setNewMarker(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input
              autoFocus
              value={newMarker.title}
              onChange={(e) => setNewMarker({ ...newMarker, title: e.target.value })}
              placeholder="Water source #3"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
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
                  {Object.keys(CATEGORY_COLORS).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <input
                  type="color"
                  value={newMarker.color}
                  onChange={(e) => setNewMarker({ ...newMarker, color: e.target.value })}
                  className="w-full h-10 bg-input rounded-md border border-border"
                />
              </div>
            </div>
            <div className="mono text-xs text-muted-foreground">
              {formatDD(newMarker.lng, newMarker.lat)} · MGRS {formatMGRS(newMarker.lng, newMarker.lat)}
            </div>
            <Button onClick={saveNewMarker} className="w-full bg-tactical-orange text-background hover:bg-tactical-orange/90 glove-tap">
              Drop waypoint
            </Button>
          </div>
        </div>
      )}

      {/* Sheets */}
      <Sheet open={openSheet === "layers"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">BASE LAYERS</SheetTitle>
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
            <SheetTitle className="mono text-tactical-orange">GO TO COORDINATE</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              autoFocus
              placeholder="40.0150, -105.2705  ·  or  13TDE 1234 5678  ·  or  40°00'54&quot;N..."
              value={gotoInput}
              onChange={(e) => setGotoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGoto()}
            />
            <Button onClick={handleGoto} className="w-full bg-tactical-orange text-background glove-tap">
              Fly to target
            </Button>
            <p className="text-xs text-muted-foreground mono">
              Accepts DD, DMS, and MGRS formats.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "measure"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">MEASUREMENT</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setTool("measure-line");
                setDrawCoords([]);
                setOpenSheet(null);
                toast.message("Tap map to add points");
              }}
              className="glove-tap"
            >
              Linear distance
            </Button>
            <Button
              onClick={() => {
                setTool("measure-area");
                setDrawCoords([]);
                setOpenSheet(null);
                toast.message("Tap map to draw polygon");
              }}
              className="glove-tap"
            >
              Polygon area
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
              Generate elevation profile
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
              Clear & exit
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "compass"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="mono text-tactical-orange">COMPASS</SheetTitle>
          </SheetHeader>
          <CompassReadout heading={heading} declination={decl} center={center} waypoints={waypoints} />
        </SheetContent>
      </Sheet>
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

function CompassReadout({
  heading,
  declination,
  center,
  waypoints,
}: {
  heading: number;
  declination: number;
  center: [number, number];
  waypoints: LocalWaypoint[];
}) {
  const trueHeading = ((heading % 360) + 360) % 360;
  const magneticHeading = ((trueHeading - declination + 360) % 360);
  const nearest = waypoints[0];
  const bearingToWp = nearest
    ? bearingDeg(center, [nearest.longitude, nearest.latitude])
    : null;
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 mono">
      <Readout label="HEADING (T)" value={`${trueHeading.toFixed(0)}°`} />
      <Readout label="HEADING (M)" value={`${magneticHeading.toFixed(0)}°`} />
      <Readout label="DECLINATION" value={`${declination >= 0 ? "+" : ""}${declination.toFixed(1)}°`} />
      <Readout
        label="BEARING TO WP"
        value={bearingToWp != null ? `${bearingToWp.toFixed(0)}°` : "—"}
      />
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3 bg-background/50">
      <div className="text-[10px] text-muted-foreground tracking-wider">{label}</div>
      <div className="text-2xl text-tactical-orange font-bold">{value}</div>
    </div>
  );
}

function copy(t: string) {
  navigator.clipboard?.writeText(t);
  toast.success("Copied", { description: t });
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
