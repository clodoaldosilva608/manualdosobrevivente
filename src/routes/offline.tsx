import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, Trash2, Map as MapIcon, BookOpen } from "lucide-react";
import {
  tileCountForBbox,
  downloadAreaTiles,
  listAreas,
  deleteArea,
  type DownloadProgress,
} from "@/lib/offline-tiles";
import type { CachedArea } from "@/lib/db";
import { listManualAssets, saveManualAsset, deleteManualAssets } from "@/lib/db";
import { MANUAL } from "@/lib/manual-content";
import { formatInteger, formatNumber, formatDateTime } from "@/lib/format";

const SOURCES = [
  {
    id: "topo",
    label: "Topográfico",
    url: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
  },
  {
    id: "satellite",
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "streets",
    label: "Ruas",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
] as const;

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Downloads offline — TacticalGIS" },
      {
        name: "description",
        content:
          "Baixe áreas do mapa e o manual completo para usar sem internet na mochila de emergência.",
      },
      { property: "og:title", content: "Downloads offline — TacticalGIS" },
      {
        property: "og:description",
        content: "Mapas e manual salvos no aparelho para uso sem sinal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  const [sourceId, setSourceId] = useState<string>("topo");
  const [name, setName] = useState("");
  const [bbox, setBbox] = useState<[number, number, number, number]>([
    -47.95, -15.87, -47.79, -15.71,
  ]);
  const [minZoom, setMinZoom] = useState(10);
  const [maxZoom, setMaxZoom] = useState(14);
  const [areas, setAreas] = useState<CachedArea[]>([]);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [manualSaved, setManualSaved] = useState<string[]>([]);
  const [manualBusy, setManualBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([listAreas(), listManualAssets()]);
      setAreas(a);
      setManualSaved(m.map((x) => x.slug));
    } catch {
      /* armazenamento indisponível */
    }
  }, []);

  useEffect(() => {
    void refresh();
    try {
      const raw = localStorage.getItem("tgis:last-position");
      if (raw) {
        const p = JSON.parse(raw) as { lng: number; lat: number };
        if (Number.isFinite(p.lng) && Number.isFinite(p.lat)) {
          setBbox([p.lng - 0.08, p.lat - 0.08, p.lng + 0.08, p.lat + 0.08]);
        }
      }
    } catch {
      /* posição salva inválida */
    }
  }, [refresh]);

  const useCurrentPosition = () => {
    if (!("geolocation" in navigator)) return toast.error("Localização indisponível");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords;
        setBbox([lng - 0.08, lat - 0.08, lng + 0.08, lat + 0.08]);
        toast.success("Área centrada na sua posição");
      },
      () => toast.error("Não foi possível obter sua posição"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const estimate = tileCountForBbox(bbox, minZoom, maxZoom);
  const estimateMB = (estimate * 22) / 1024; // ~22 KB por tile

  const startDownload = async () => {
    if (progress) return;
    if (estimate > 6000) {
      return toast.error("Área muito grande", {
        description: "Reduza o zoom máximo ou o tamanho da área.",
      });
    }
    const src = SOURCES.find((s) => s.id === sourceId)!;
    setProgress({ done: 0, total: estimate, bytes: 0 });
    try {
      await downloadAreaTiles(
        {
          id: crypto.randomUUID(),
          name: name.trim() || `Área ${formatDateTime(Date.now())}`,
          source_id: src.id,
          bbox,
          min_zoom: minZoom,
          max_zoom: maxZoom,
        },
        src.url,
        (p) => setProgress(p),
      );
      toast.success("Área salva para uso offline");
      setName("");
      void refresh();
    } catch (e) {
      toast.error("Falha no download", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setProgress(null);
    }
  };

  const downloadManual = async () => {
    setManualBusy(true);
    try {
      for (const entry of MANUAL) {
        let blob: Blob | undefined;
        try {
          const res = await fetch(entry.image);
          if (res.ok) blob = await res.blob();
        } catch {
          /* imagem indisponível — salva só o texto */
        }
        await saveManualAsset({
          slug: entry.slug,
          title: entry.title,
          html_body: entry.body,
          ...(blob ? { image_blob: blob } : {}),
          saved_at: Date.now(),
        });
      }
      toast.success(`${formatInteger(MANUAL.length)} tópicos salvos no aparelho`);
      void refresh();
    } catch {
      toast.error("Não foi possível salvar o manual");
    } finally {
      setManualBusy(false);
    }
  };

  const removeManual = async () => {
    await deleteManualAssets();
    toast.success("Manual offline removido");
    void refresh();
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider">
          DOWNLOADS OFFLINE
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Salve mapas e o manual no aparelho para usar sem sinal.
        </p>
      </header>

      <section className="rounded-md border border-border bg-card p-4 space-y-4">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <MapIcon className="h-4 w-4" /> Mapas
        </h2>

        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSourceId(s.id)}
              className={`glove-tap rounded-md border px-3 py-2 mono text-xs uppercase ${
                sourceId === s.id
                  ? "border-tactical-orange text-tactical-orange bg-tactical-orange/10"
                  : "border-border text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Nome da área</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Trilha da Serra"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Zoom mínimo</Label>
            <Input
              type="number"
              min={1}
              max={17}
              value={minZoom}
              onChange={(e) => setMinZoom(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Zoom máximo</Label>
            <Input
              type="number"
              min={1}
              max={17}
              value={maxZoom}
              onChange={(e) => setMaxZoom(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mono text-xs text-muted-foreground">
          <span>Oeste {formatNumber(bbox[0], 3)}</span>
          <span>Sul {formatNumber(bbox[1], 3)}</span>
          <span>Leste {formatNumber(bbox[2], 3)}</span>
          <span>Norte {formatNumber(bbox[3], 3)}</span>
        </div>

        <Button variant="secondary" onClick={useCurrentPosition} className="w-full glove-tap">
          Centrar na minha posição
        </Button>

        <p className="mono text-xs">
          Estimativa: {formatInteger(estimate)} blocos ·{" "}
          <span className="text-tactical-orange">{formatNumber(estimateMB, 1)} MB</span>
        </p>

        {progress ? (
          <div className="space-y-2">
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
            <p className="mono text-xs text-muted-foreground">
              {formatInteger(progress.done)} de {formatInteger(progress.total)} blocos ·{" "}
              {formatNumber(progress.bytes / 1024 / 1024, 1)} MB
            </p>
          </div>
        ) : (
          <Button onClick={startDownload} className="w-full glove-tap">
            <Download className="h-4 w-4" /> Baixar área
          </Button>
        )}

        <ul className="space-y-2">
          {areas.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/50 p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{a.name}</div>
                <div className="mono text-[11px] text-muted-foreground">
                  {formatInteger(a.tile_count)} blocos · {formatNumber(a.bytes / 1024 / 1024, 1)} MB
                  · zoom {a.min_zoom}–{a.max_zoom}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Apagar área ${a.name}`}
                onClick={async () => {
                  await deleteArea(a.id);
                  toast.success("Área apagada");
                  void refresh();
                }}
                className="glove-tap text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {areas.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhuma área salva ainda.</li>
          )}
        </ul>
      </section>

      <section className="rounded-md border border-border bg-card p-4 space-y-3">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Manual
        </h2>
        <p className="text-sm text-muted-foreground">
          {manualSaved.length
            ? `${formatInteger(manualSaved.length)} de ${formatInteger(MANUAL.length)} tópicos salvos com texto e foto.`
            : "Nenhum tópico salvo. Baixe para ler sem internet."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={downloadManual} disabled={manualBusy} className="w-full glove-tap">
            <Download className="h-4 w-4" /> Baixar manual completo
          </Button>
          <Button
            variant="secondary"
            onClick={removeManual}
            disabled={manualBusy || manualSaved.length === 0}
            className="w-full glove-tap"
          >
            <Trash2 className="h-4 w-4" /> Remover manual offline
          </Button>
        </div>
        <ul className="mono text-[11px] text-muted-foreground space-y-1">
          {MANUAL.map((e) => (
            <li key={e.slug} className="flex items-center justify-between gap-2">
              <span className="truncate">{e.title}</span>
              <span className={manualSaved.includes(e.slug) ? "text-tactical-orange" : ""}>
                {manualSaved.includes(e.slug) ? "salvo" : "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
