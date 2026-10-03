import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listWaypoints,
  listGear,
  listChecklist,
  listManualAssets,
  saveWaypoint,
  clearLocalData,
  type LocalWaypoint,
} from "@/lib/db";
import { listAreas, deleteArea } from "@/lib/offline-tiles";
import { waypointsToGPX, downloadText, parseGpxOrKml } from "@/lib/gpx-kml";
import { formatInteger, formatDateTime, formatNumber } from "@/lib/format";
import { usePreferences } from "@/hooks/usePreferences";
import {
  pushLocalToCloud,
  pullCloudToLocal,
  getLastSyncAt,
  pushAll,
  pullAll,
} from "@/lib/cloud-sync";
import { CloudUpload, CloudDownload, Trash2, Upload, Download } from "lucide-react";
import { getReportSettings, saveReportSettings, sendReportNow } from "@/lib/report.functions";

interface ReportForm {
  enabled: boolean;
  weekday: number;
  local_time: string;
  timezone: string;
  recipient_email: string;
}

interface ReportHistoryItem {
  id: string;
  sent_at: string;
  status: string;
  waypoint_count: number;
  gear_count: number;
  checklist_count: number;
}

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ajustes — TacticalGIS" },
      {
        name: "description",
        content:
          "Conta, preferências de unidades e coordenadas, backup na nuvem e dados salvos no aparelho.",
      },
      { property: "og:title", content: "Ajustes — TacticalGIS" },
      {
        property: "og:description",
        content: "Conta, preferências, exportação, backup na nuvem e limpeza de dados offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

interface Counts {
  waypoints: number;
  gear: number;
  checklist: number;
  manual: number;
  areas: number;
  bytes: number;
}

function Settings() {
  const [email, setEmail] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>({
    enabled: false,
    weekday: 1,
    local_time: "08:00",
    timezone: "America/Sao_Paulo",
    recipient_email: "",
  });
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { prefs, update } = usePreferences();
  const callPush = useServerFn(pushAll);
  const callPull = useServerFn(pullAll);
  const callGetReports = useServerFn(getReportSettings);
  const callSaveReports = useServerFn(saveReportSettings);
  const callSendReport = useServerFn(sendReportNow);

  useEffect(() => {
    let alive = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setEmail(session?.user?.email ?? null);
      setLoadingSession(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setEmail(data.session?.user?.email ?? null);
      setLoadingSession(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshReports = useCallback(async () => {
    if (!email) return;
    try {
      const result = await callGetReports();
      if (result.settings) {
        setReportForm({
          enabled: result.settings.enabled,
          weekday: result.settings.weekday,
          local_time: result.settings.local_time.slice(0, 5),
          timezone: result.settings.timezone,
          recipient_email: result.settings.recipient_email,
        });
      } else {
        setReportForm((current) => ({ ...current, recipient_email: email }));
      }
      setReportHistory(result.history);
    } catch {
      toast.error("Não foi possível carregar os relatórios");
    }
  }, [callGetReports, email]);

  useEffect(() => {
    void refreshReports();
  }, [refreshReports]);

  const refresh = useCallback(async () => {
    try {
      const [w, g, c, m, a, sync] = await Promise.all([
        listWaypoints(),
        listGear(),
        listChecklist(),
        listManualAssets(),
        listAreas(),
        getLastSyncAt(),
      ]);
      setCounts({
        waypoints: w.length,
        gear: g.length,
        checklist: c.filter((x) => x.done).length,
        manual: m.length,
        areas: a.length,
        bytes: a.reduce((s, x) => s + x.bytes, 0),
      });
      setLastSync(sync);
    } catch {
      setCounts({ waypoints: 0, gear: 0, checklist: 0, manual: 0, areas: 0, bytes: 0 });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exportGPX = async () => {
    try {
      const wps = await listWaypoints();
      if (!wps.length) return toast.error("Nenhum waypoint para exportar");
      downloadText(`waypoints-${Date.now()}.gpx`, waypointsToGPX(wps));
      toast.success(`${formatInteger(wps.length)} waypoints exportados`);
    } catch {
      toast.error("Não foi possível exportar os waypoints");
    }
  };

  const exportBackup = async () => {
    try {
      const [w, g, c] = await Promise.all([listWaypoints(), listGear(), listChecklist()]);
      downloadText(
        `backup-tacticalgis-${Date.now()}.json`,
        JSON.stringify({ version: 1, waypoints: w, gear: g, checklist: c }, null, 2),
        "application/json",
      );
      toast.success("Backup gerado");
    } catch {
      toast.error("Não foi possível gerar o backup");
    }
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const features = parseGpxOrKml(text, file.name);
      const points = features.filter((f) => f.coords.length > 0);
      if (!points.length) return toast.error("Nenhum ponto encontrado no arquivo");
      const now = new Date().toISOString();
      for (const f of points) {
        const [lng, lat] = f.coords[0]!;
        const wp: LocalWaypoint = {
          id: crypto.randomUUID(),
          user_id: null,
          title: f.title || "Ponto importado",
          description: f.description ?? null,
          category: "custom",
          color: "#FF6B35",
          latitude: lat,
          longitude: lng,
          created_at: now,
          updated_at: now,
          dirty: true,
        };
        await saveWaypoint(wp);
      }
      toast.success(`${formatInteger(points.length)} pontos importados`);

      void refresh();
    } catch {
      toast.error("Não foi possível ler o arquivo");
    }
  };

  const doPush = async () => {
    if (!email) return toast.error("Entre na conta para usar a nuvem");
    setBusy("push");
    try {
      const r = await pushLocalToCloud(callPush as never);
      toast.success(
        `Enviado: ${formatInteger(r.waypoints)} waypoints, ${formatInteger(r.gear)} itens`,
      );
      void refresh();
    } catch (e) {
      toast.error("Falha ao enviar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const doPull = async () => {
    if (!email) return toast.error("Entre na conta para usar a nuvem");
    setBusy("pull");
    try {
      const r = await pullCloudToLocal(callPull as never);
      toast.success(
        `Recebido: ${formatInteger(r.waypoints)} waypoints, ${formatInteger(r.gear)} itens`,
      );
      void refresh();
    } catch (e) {
      toast.error("Falha ao trazer da nuvem", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const clearMaps = async () => {
    if (!window.confirm("Apagar todos os mapas salvos para uso offline?")) return;
    const areas = await listAreas();
    for (const a of areas) await deleteArea(a.id);
    toast.success("Mapas offline apagados");
    void refresh();
  };

  const clearAll = async () => {
    if (!window.confirm("Apagar waypoints, mochila e checklist salvos neste aparelho?")) return;
    await clearLocalData();
    toast.success("Dados locais apagados");
    void refresh();
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error("Não foi possível encerrar a sessão");
    toast.success("Sessão encerrada");
  };

  const saveReports = async () => {
    setBusy("reports-save");
    try {
      await callSaveReports({ data: reportForm });
      toast.success("Relatório semanal configurado");
      await refreshReports();
    } catch (error) {
      toast.error("Não foi possível salvar o relatório", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const sendReport = async () => {
    setBusy("reports-send");
    try {
      await callSaveReports({ data: reportForm });
      await callSendReport();
      toast.success("Relatório enviado por e-mail");
      await refreshReports();
    } catch (error) {
      toast.error("Não foi possível enviar o relatório", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider">
          AJUSTES
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conta, preferências, backup e dados salvos no aparelho.
        </p>
      </header>

      <Section title="Conta">
        {loadingSession ? (
          <div className="text-sm text-muted-foreground">Verificando sessão…</div>
        ) : email ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="mono text-sm break-all">{email}</span>
            <Button variant="destructive" onClick={signOut} className="glove-tap shrink-0">
              Sair
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Não autenticado.{" "}
            <Link to="/login" className="text-tactical-orange underline">
              Entre
            </Link>{" "}
            para guardar waypoints, mochila e checklist na nuvem.
          </div>
        )}
      </Section>

      <Section title="Preferências">
        <Choice
          label="Unidades"
          value={prefs.units}
          options={[
            { id: "metric", label: "Métrico" },
            { id: "nautical", label: "Náutico" },
          ]}
          onChange={(v) => update({ units: v as "metric" | "nautical" })}
        />
        <Choice
          label="Coordenada padrão"
          value={prefs.coordFormat}
          options={[
            { id: "DD", label: "DD" },
            { id: "DMS", label: "DMS" },
            { id: "MGRS", label: "MGRS" },
          ]}
          onChange={(v) => update({ coordFormat: v as "DD" | "DMS" | "MGRS" })}
        />
        <Choice
          label="Referência de norte"
          value={prefs.northRef}
          options={[
            { id: "true", label: "Verdadeiro" },
            { id: "magnetic", label: "Magnético" },
          ]}
          onChange={(v) => update({ northRef: v as "true" | "magnetic" })}
        />
      </Section>

      <Section title="Dados no aparelho">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Waypoints" value={counts ? formatInteger(counts.waypoints) : "—"} />
          <Stat label="Itens da mochila" value={counts ? formatInteger(counts.gear) : "—"} />
          <Stat
            label="Checklist concluído"
            value={counts ? formatInteger(counts.checklist) : "—"}
          />
          <Stat label="Tópicos baixados" value={counts ? formatInteger(counts.manual) : "—"} />
          <Stat label="Áreas de mapa" value={counts ? formatInteger(counts.areas) : "—"} />
          <Stat
            label="Espaço dos mapas"
            value={counts ? `${formatNumber(counts.bytes / 1024 / 1024, 1)} MB` : "—"}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={exportGPX} className="glove-tap w-full">
            <Download className="h-4 w-4" /> Exportar GPX
          </Button>
          <Button onClick={exportBackup} variant="secondary" className="glove-tap w-full">
            <Download className="h-4 w-4" /> Backup completo
          </Button>
          <Button
            variant="secondary"
            className="glove-tap w-full sm:col-span-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Importar GPX ou KML
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".gpx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </Section>

      <Section title="Nuvem">
        <p className="text-xs text-muted-foreground">
          {lastSync
            ? `Última sincronização: ${formatDateTime(lastSync)}`
            : "Nada sincronizado ainda."}
        </p>
        <p className="text-xs text-muted-foreground">
          Alterações em waypoints, mochila, checklist e preferências também são salvas
          automaticamente quando houver conexão.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={doPush} disabled={busy !== null} className="glove-tap w-full">
            <CloudUpload className="h-4 w-4" /> Enviar para a nuvem
          </Button>
          <Button
            onClick={doPull}
            disabled={busy !== null}
            variant="secondary"
            className="glove-tap w-full"
          >
            <CloudDownload className="h-4 w-4" /> Trazer da nuvem
          </Button>
        </div>
      </Section>

      {email && (
        <Section title="Relatório semanal por e-mail">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={reportForm.enabled}
              onCheckedChange={(checked) =>
                setReportForm((current) => ({ ...current, enabled: checked === true }))
              }
              aria-label="Ativar relatório semanal"
            />
            Enviar relatório automaticamente
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="mono text-[10px] uppercase text-muted-foreground">
                Dia da semana
              </span>
              <select
                value={reportForm.weekday}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    weekday: Number(event.target.value),
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={0}>Domingo</option>
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="mono text-[10px] uppercase text-muted-foreground">Horário</span>
              <Input
                type="time"
                value={reportForm.local_time}
                onChange={(event) =>
                  setReportForm((current) => ({ ...current, local_time: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="mono text-[10px] uppercase text-muted-foreground">Destinatário</span>
              <Input
                type="email"
                value={reportForm.recipient_email}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    recipient_email: event.target.value,
                  }))
                }
                placeholder="voce@exemplo.com"
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={saveReports}
              disabled={busy !== null || !reportForm.recipient_email}
            >
              Salvar programação
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={sendReport}
              disabled={busy !== null || !reportForm.recipient_email}
            >
              Enviar agora
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="mono text-[10px] uppercase text-muted-foreground">Histórico recente</h3>
            {reportHistory.length ? (
              reportHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-xs"
                >
                  <span>{formatDateTime(item.sent_at)}</span>
                  <span
                    className={item.status === "sent" ? "text-tactical-green" : "text-destructive"}
                  >
                    {item.status === "sent" ? "Enviado" : "Falhou"}
                  </span>
                  <span className="w-full text-muted-foreground">
                    {formatInteger(item.waypoint_count)} waypoints ·{" "}
                    {formatInteger(item.gear_count)} itens · {formatInteger(item.checklist_count)}{" "}
                    concluídos
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum envio registrado.</p>
            )}
          </div>
        </Section>
      )}

      <Section title="Limpeza">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={clearMaps} className="glove-tap w-full">
            <Trash2 className="h-4 w-4" /> Apagar mapas offline
          </Button>
          <Button variant="destructive" onClick={clearAll} className="glove-tap w-full">
            <Trash2 className="h-4 w-4" /> Apagar dados locais
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-4 space-y-3">
      <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`glove-tap rounded-md border px-3 py-2 mono text-xs uppercase tracking-wider ${
              value === o.id
                ? "border-tactical-orange text-tactical-orange bg-tactical-orange/10"
                : "border-border text-muted-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mono text-xl font-bold text-tactical-orange">{value}</div>
    </div>
  );
}
