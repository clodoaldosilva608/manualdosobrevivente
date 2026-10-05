import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Trash2,
  Map as MapIcon,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
} from "lucide-react";
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
import { useI18n } from "@/lib/i18n";
import {
  executarProntidao,
  classificarProntidao,
  rotuloVeredito,
  corVeredito,
  type VerificacaoProntidao,
} from "@/lib/prontidao-offline";

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
  const { t } = useI18n();
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
  const [verificacoes, setVerificacoes] = useState<VerificacaoProntidao[] | null>(null);
  const [testando, setTestando] = useState(false);

  const veredito = verificacoes ? classificarProntidao(verificacoes) : null;

  const rodarProntidao = async () => {
    if (testando) return;
    setTestando(true);
    try {
      const resultado = await executarProntidao();
      setVerificacoes(resultado);
    } catch {
      toast.error(t("Não foi possível concluir o teste"));
    } finally {
      setTestando(false);
    }
  };

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
    if (!("geolocation" in navigator)) return toast.error(t("Localização indisponível"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords;
        setBbox([lng - 0.08, lat - 0.08, lng + 0.08, lat + 0.08]);
        toast.success(t("Área centrada na sua posição"));
      },
      () => toast.error(t("Não foi possível obter sua posição")),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const estimate = tileCountForBbox(bbox, minZoom, maxZoom);
  const estimateMB = (estimate * 22) / 1024; // ~22 KB por tile

  const startDownload = async () => {
    if (progress) return;
    if (estimate > 6000) {
      return toast.error(t("Área muito grande"), {
        description: t("Reduza o zoom máximo ou o tamanho da área."),
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
      toast.success(t("Área salva para uso offline"));
      setName("");
      void refresh();
    } catch (e) {
      toast.error(t("Falha ao baixar a área"), {
        description: e instanceof Error ? e.message : undefined,
      });
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
      toast.error(t("Não foi possível salvar o manual"));
    } finally {
      setManualBusy(false);
    }
  };

  const removeManual = async () => {
    await deleteManualAssets();
    toast.success(t("Manual offline removido"));
    void refresh();
  };

  const printManual = () => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error(t("Libere as janelas para gerar o PDF"));
      return;
    }
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const body = MANUAL.map(
      (e) =>
        `<section><h2>${esc(e.title)}</h2><p><em>${esc(e.summary)}</em></p>` +
        `<img src="${new URL(e.image, window.location.origin).href}" alt="${esc(e.imageAlt)}" />` +
        `<pre>${esc(e.body)}</pre>` +
        (e.checklist?.length
          ? `<ul>${e.checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
          : "") +
        `</section>`,
    ).join("");
    w.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Manual de Sobrevivência</title>` +
        `<style>body{font-family:system-ui,sans-serif;margin:28px;color:#111}h1{color:#c2410c}` +
        `section{page-break-after:always}img{max-width:100%;border-radius:8px}` +
        `pre{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.5}</style></head>` +
        `<body><h1>Manual de Sobrevivência</h1>${body}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pb-8 md:p-8">
      <header>
        <h1 className="mono break-words text-xl font-bold tracking-wider text-tactical-orange sm:text-2xl md:text-3xl">
          {t("DOWNLOADS OFFLINE")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Salve mapas e o manual no aparelho para usar sem sinal.")}
        </p>
      </header>

      <section
        data-test="prontidao"
        className="rounded-md border border-border bg-card p-4 space-y-3"
      >
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> {t("TESTE DE PRONTIDÃO OFFLINE")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Verifica o que o aparelho já tem preparado para operar sem internet: Service Worker, cache do app, mapas, manual e banco local.",
          )}
        </p>

        {veredito && verificacoes && (
          <div
            data-test="prontidao-veredito"
            className={`mono rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-widest ${corVeredito(veredito)}`}
          >
            {t(rotuloVeredito(veredito))}
          </div>
        )}

        {verificacoes && (
          <ul className="space-y-1.5">
            {verificacoes.map((v) => (
              <li
                key={v.id}
                data-test={`prontidao-item-${v.id}`}
                className="flex items-start gap-2 rounded-md border border-border bg-background/50 px-3 py-2"
              >
                {v.estado === "ok" && (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tactical-orange" />
                )}
                {v.estado === "aviso" && (
                  <AlertTriangle className="text-tactical-amber mt-0.5 h-4 w-4 shrink-0" />
                )}
                {v.estado === "falha" && (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <span className="min-w-0">
                  <span className="mono block text-xs font-bold uppercase tracking-wider">
                    {t(v.rotulo)}
                  </span>
                  <span className="block text-xs text-muted-foreground">{v.detalhe}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Button
          onClick={rodarProntidao}
          disabled={testando}
          data-test="prontidao-executar"
          className="w-full glove-tap"
        >
          <ShieldCheck className="mr-1 h-4 w-4" />
          {verificacoes ? t("Executar teste novamente") : t("Executar teste")}
        </Button>
      </section>

      <section className="rounded-md border border-border bg-card p-4 space-y-4">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <MapIcon className="h-4 w-4" /> {t("Mapas")}
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
              {t(s.label)}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{t("Nome da área")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Ex: Trilha da Serra")}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{t("Zoom mínimo")}</Label>
            <Input
              type="number"
              min={1}
              max={17}
              value={minZoom}
              onChange={(e) => setMinZoom(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">{t("Zoom máximo")}</Label>
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
          <span>
            {t("Oeste")} {formatNumber(bbox[0], 3)}
          </span>
          <span>
            {t("Sul")} {formatNumber(bbox[1], 3)}
          </span>
          <span>
            {t("Leste")} {formatNumber(bbox[2], 3)}
          </span>
          <span>
            {t("Norte")} {formatNumber(bbox[3], 3)}
          </span>
        </div>

        <Button variant="secondary" onClick={useCurrentPosition} className="w-full glove-tap">
          {t("Centrar na minha posição")}
        </Button>

        <p className="mono text-xs">
          {t("Estimativa")}: {formatInteger(estimate)} {t("blocos")} ·{" "}
          <span className="text-tactical-orange">{formatNumber(estimateMB, 1)} MB</span>
        </p>

        {progress ? (
          <div className="space-y-2">
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
            <p className="mono text-xs text-muted-foreground">
              {formatInteger(progress.done)} {t("de")} {formatInteger(progress.total)} {t("blocos")}{" "}
              · {formatNumber(progress.bytes / 1024 / 1024, 1)} MB
            </p>
          </div>
        ) : (
          <Button onClick={startDownload} className="w-full glove-tap">
            <Download className="h-4 w-4" /> {t("Baixar área")}
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
                  {formatInteger(a.tile_count)} {t("blocos")} ·{" "}
                  {formatNumber(a.bytes / 1024 / 1024, 1)} MB · {t("zoom")} {a.min_zoom}–
                  {a.max_zoom}
                </div>
              </div>
              <button
                type="button"
                aria-label={`${t("Apagar área")} ${a.name}`}
                onClick={async () => {
                  await deleteArea(a.id);
                  toast.success(t("Área apagada"));
                  void refresh();
                }}
                className="glove-tap text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {areas.length === 0 && (
            <li className="text-xs text-muted-foreground">{t("Nenhuma área salva ainda.")}</li>
          )}
        </ul>
      </section>

      <section className="rounded-md border border-border bg-card p-4 space-y-3">
        <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> {t("Manual")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {manualSaved.length
            ? t("{n} de {m} tópicos salvos com texto e foto.", {
                n: formatInteger(manualSaved.length),
                m: formatInteger(MANUAL.length),
              })
            : t("Nenhum tópico salvo. Baixe para ler sem internet.")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={downloadManual} disabled={manualBusy} className="w-full glove-tap">
            <Download className="h-4 w-4" /> {t("Baixar manual completo")}
          </Button>
          <Button variant="outline" onClick={printManual} className="w-full glove-tap">
            <FileText className="h-4 w-4" /> {t("Gerar PDF do manual")}
          </Button>
          <Button
            variant="secondary"
            onClick={removeManual}
            disabled={manualBusy || manualSaved.length === 0}
            className="w-full glove-tap sm:col-span-2"
          >
            <Trash2 className="h-4 w-4" /> {t("Remover manual offline")}
          </Button>
        </div>

        <ul className="mono text-[11px] text-muted-foreground space-y-1">
          {MANUAL.map((e) => (
            <li key={e.slug} className="flex items-center justify-between gap-2">
              <span className="truncate">{e.title}</span>
              <span className={manualSaved.includes(e.slug) ? "text-tactical-orange" : ""}>
                {manualSaved.includes(e.slug) ? t("salvo") : "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
