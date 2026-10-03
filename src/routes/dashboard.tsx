import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listWaypoints,
  listGear,
  listChecklist,
  listManualAssets,
  getSetting,
  type LocalWaypoint,
  type LocalGearItem,
  type ChecklistState,
} from "@/lib/db";
import { listAreas } from "@/lib/offline-tiles";
import { downloadText } from "@/lib/gpx-kml";
import { formatInteger, formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel de dados — TacticalGIS" },
      {
        name: "description",
        content:
          "Resumo de waypoints, mochila, checklist e ajustes salvos, com exportação em CSV e PDF.",
      },
      { property: "og:title", content: "Painel de dados — TacticalGIS" },
      {
        property: "og:description",
        content: "Quantidades salvas no aparelho e exportação do relatório em CSV e PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

interface Snapshot {
  waypoints: LocalWaypoint[];
  gear: LocalGearItem[];
  checklist: ChecklistState[];
  manual: number;
  areas: number;
  bytes: number;
  prefs: Record<string, unknown>;
  at: number;
}

export async function buildSnapshot(): Promise<Snapshot> {
  const [waypoints, gear, checklist, manual, areas] = await Promise.all([
    listWaypoints(),
    listGear(),
    listChecklist(),
    listManualAssets(),
    listAreas(),
  ]);
  const prefs: Record<string, unknown> = {};
  for (const key of ["units", "coordFormat", "northRef"]) {
    prefs[key] = (await getSetting(key)) ?? null;
  }
  return {
    waypoints,
    gear,
    checklist,
    manual: manual.length,
    areas: areas.length,
    bytes: areas.reduce((s, a) => s + (a.bytes || 0), 0),
    prefs,
    at: Date.now(),
  };
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function snapshotToCSV(s: Snapshot): string {
  const rows: string[][] = [["tipo", "nome", "detalhe_1", "detalhe_2", "detalhe_3"]];
  for (const w of s.waypoints) {
    rows.push([
      "waypoint",
      w.title,
      formatNumber(w.latitude, 5),
      formatNumber(w.longitude, 5),
      w.category,
    ]);
  }
  for (const g of s.gear) {
    rows.push([
      "mochila",
      g.name,
      `${g.quantity} un`,
      `${g.weight_g} g`,
      g.packed ? "guardado" : "pendente",
    ]);
  }
  for (const c of s.checklist) {
    rows.push([
      "checklist",
      c.key,
      c.done ? "concluído" : "pendente",
      formatDateTime(c.updated_at),
      "",
    ]);
  }
  for (const [k, v] of Object.entries(s.prefs)) {
    rows.push(["ajuste", k, String(v ?? "padrão"), "", ""]);
  }
  return rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export function snapshotToHTML(s: Snapshot): string {
  const li = (t: string, n: number) => `<li><strong>${n}</strong> ${t}</li>`;
  const rows = (title: string, items: string[]) =>
    `<h2>${title}</h2><ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório TacticalGIS</title>
<style>body{font-family:system-ui,sans-serif;margin:32px;color:#111}h1{color:#c2410c}
h2{margin-top:24px;border-bottom:1px solid #ddd}li{margin:4px 0}</style></head><body>
<h1>Relatório TacticalGIS</h1>
<p>Gerado em ${formatDateTime(s.at)}</p>
<ul>${li("waypoints", s.waypoints.length)}${li("itens na mochila", s.gear.length)}${li(
    "marcações de checklist",
    s.checklist.length,
  )}${li("guias do manual salvos", s.manual)}${li("áreas de mapa offline", s.areas)}</ul>
${rows(
  "Waypoints",
  s.waypoints.map(
    (w) => `${w.title} — ${formatNumber(w.latitude, 5)}, ${formatNumber(w.longitude, 5)}`,
  ),
)}
${rows(
  "Mochila",
  s.gear.map((g) => `${g.name} — ${g.quantity} un — ${g.weight_g} g`),
)}
${rows(
  "Checklist",
  s.checklist.map((c) => `${c.key} — ${c.done ? "concluído" : "pendente"}`),
)}
${rows(
  "Ajustes",
  Object.entries(s.prefs).map(([k, v]) => `${k}: ${String(v ?? "padrão")}`),
)}
</body></html>`;
}

function Dashboard() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnap(await buildSnapshot());
    } catch {
      toast.error("Não foi possível ler os dados do aparelho");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exportCSV = () => {
    if (!snap) return;
    downloadText(
      "relatorio-tacticalgis.csv",
      "\uFEFF" + snapshotToCSV(snap),
      "text/csv;charset=utf-8",
    );
    toast.success("Planilha CSV gerada");
  };

  const exportPDF = () => {
    if (!snap) return;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Libere as janelas para gerar o PDF");
    w.document.write(snapshotToHTML(snap));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="mono min-w-0 break-words text-lg font-bold uppercase tracking-widest text-tactical-orange sm:text-xl">
          Painel de dados
        </h1>
        <Button className="shrink-0" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </header>
      <p className="mt-1 text-sm text-muted-foreground">
        Tudo o que está guardado neste aparelho, pronto para exportar.
      </p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2 mono">
        <Stat label="Waypoints" value={snap ? formatInteger(snap.waypoints.length) : "—"} />
        <Stat label="Itens da mochila" value={snap ? formatInteger(snap.gear.length) : "—"} />
        <Stat label="Checklist" value={snap ? formatInteger(snap.checklist.length) : "—"} />
        <Stat label="Guias salvos" value={snap ? formatInteger(snap.manual) : "—"} />
        <Stat label="Áreas offline" value={snap ? formatInteger(snap.areas) : "—"} />
        <Stat
          label="Mapas salvos"
          value={snap ? `${formatNumber(snap.bytes / 1024 / 1024, 1)} MB` : "—"}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={exportCSV} disabled={!snap} className="glove-tap">
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
        <Button onClick={exportPDF} disabled={!snap} variant="outline" className="glove-tap">
          <FileText className="h-4 w-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      <section className="mt-6 rounded-md border border-border bg-background/50 p-3">
        <h2 className="mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Ajustes salvos
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {snap &&
            Object.entries(snap.prefs).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="mono text-tactical-orange">{String(v ?? "padrão")}</span>
              </li>
            ))}
        </ul>
        {snap && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Leitura feita em {formatDateTime(snap.at)}
          </p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-tactical-orange">{value}</div>
    </div>
  );
}
