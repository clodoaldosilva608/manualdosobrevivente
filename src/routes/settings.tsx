import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listWaypoints,
  listGear,
  listChecklist,
  listManualAssets,
  saveWaypoint,
  clearLocalData,
  getSetting,
  setSetting,
  type LocalWaypoint,
} from "@/lib/db";
import { listAreas, deleteArea } from "@/lib/offline-tiles";
import { waypointsToGPX, downloadText, parseGpxOrKml } from "@/lib/gpx-kml";
import { formatInteger, formatDateTime, formatNumber } from "@/lib/format";
import { usePreferences } from "@/hooks/usePreferences";
import { useI18n, IDIOMAS } from "@/lib/i18n";
import {
  pushLocalToCloud,
  pullCloudToLocal,
  getLastSyncAt,
  pushAll,
  pullAll,
} from "@/lib/cloud-sync";
import {
  CloudUpload,
  CloudDownload,
  Trash2,
  Upload,
  Download,
  KeyRound,
  UserRound,
} from "lucide-react";
import { getReportSettings, saveReportSettings, sendReportNow } from "@/lib/report.functions";
import { chavesServidor, type ChavesServidor } from "@/lib/intel.functions";
import { BackupFolderCard } from "@/components/BackupFolderCard";
import { ObsidianCard } from "@/components/ObsidianCard";
import { ConfigAssistente } from "@/components/assistente/ConfigAssistente";
import { BotaoConvidar } from "@/components/ConviteSheet";
import { usePwaInstall } from "@/lib/pwa";
import { contaAtiva, type ContaLocal } from "@/lib/conta";

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
  const [contaLocal, setContaLocal] = useState<ContaLocal | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const { podeInstalar, instalado, plataforma, instalar } = usePwaInstall();
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
  const { t, idioma, definir } = useI18n();
  const callPush = useServerFn(pushAll);
  const callPull = useServerFn(pullAll);
  const callGetReports = useServerFn(getReportSettings);
  const callSaveReports = useServerFn(saveReportSettings);
  const callSendReport = useServerFn(sendReportNow);
  const callChaves = useServerFn(chavesServidor);
  // Chaves que o servidor já providencia (FIRMS fica no servidor; AIS alimenta a conexão do navegador).
  const [chavesServ, setChavesServ] = useState<ChavesServidor | null>(null);

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

  useEffect(() => {
    let alive = true;
    void contaAtiva()
      .then((c) => {
        if (alive) setContaLocal(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Consulta uma vez quais chaves o servidor já providencia (dicas em Ajustes).
  useEffect(() => {
    let alive = true;
    callChaves()
      .then((c) => {
        if (alive) setChavesServ(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error(t("Não foi possível carregar os relatórios"));
    }
  }, [callGetReports, email, t]);

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

  useEffect(() => {
    let alive = true;
    getSetting<boolean>("cloud-auto-sync")
      .then((v) => {
        if (alive) setAutoSync(v === true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const alternarAutoSync = async (ligar: boolean) => {
    setAutoSync(ligar);
    try {
      await setSetting("cloud-auto-sync", ligar);
      window.dispatchEvent(new Event("tactical-gis:local-data-changed"));
    } catch {
      /* armazenamento indisponível */
    }
  };

  const exportGPX = async () => {
    try {
      const wps = await listWaypoints();
      if (!wps.length) return toast.error(t("Nenhum waypoint para exportar"));
      downloadText(`waypoints-${Date.now()}.gpx`, waypointsToGPX(wps));
      toast.success(t("{n} waypoints exportados", { n: formatInteger(wps.length) }));
    } catch {
      toast.error(t("Não foi possível exportar os waypoints"));
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
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pb-8 md:p-8">
      <header>
        <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider">
          {t("AJUSTES")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Conta, preferências, backup e dados salvos no aparelho.")}
        </p>
      </header>

      <Section title={t("Idioma do aplicativo")}>
        <p className="text-xs text-muted-foreground">
          {t(
            "O padrão é o português do Brasil. A escolha fica guardada neste aparelho — conteúdo de fontes externas pode continuar no idioma original.",
          )}
        </p>
        <div className="flex flex-wrap gap-2" data-test="seletor-idioma">
          {IDIOMAS.map((op) => (
            <button
              key={op.id}
              type="button"
              data-test={`idioma-${op.id}`}
              onClick={() => definir(op.id)}
              className={`glove-tap rounded-md border px-3 py-2 mono text-xs uppercase tracking-wider ${
                idioma === op.id
                  ? "border-tactical-orange text-tactical-orange bg-tactical-orange/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              title={op.pt}
            >
              {op.nativo}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("Conta")}>
        {contaLocal ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="mono truncate text-sm font-bold" data-test="ajustes-conta-local">
                {contaLocal.nome}{" "}
                <span className="text-muted-foreground">· {contaLocal.email}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t(
                  "Conta local deste aparelho — pronta para a nuvem quando o banco de dados existir.",
                )}
              </p>
            </div>
            <Link to="/conta" className="shrink-0">
              <Button variant="outline" className="glove-tap">
                <UserRound className="h-4 w-4" /> {t("Gerenciar")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t(
                "Nenhuma conta neste aparelho. Crie a sua conta local — ela fica guardada aqui, funciona offline e estará pronta para sincronizar com a nuvem no futuro.",
              )}
            </p>
            <Link to="/conta" className="shrink-0">
              <Button className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90">
                <UserRound className="h-4 w-4" /> {t("Criar conta")}
              </Button>
            </Link>
          </div>
        )}
      </Section>

      <Section title={t("Preferências")}>
        <Choice
          label={t("Unidades")}
          value={prefs.units}
          options={[
            { id: "metric", label: t("Métrico") },
            { id: "nautical", label: t("Náutico") },
          ]}
          onChange={(v) => update({ units: v as "metric" | "nautical" })}
        />
        <Choice
          label={t("Coordenada padrão")}
          value={prefs.coordFormat}
          options={[
            { id: "DD", label: "DD" },
            { id: "DMS", label: "DMS" },
            { id: "MGRS", label: "MGRS" },
          ]}
          onChange={(v) => update({ coordFormat: v as "DD" | "DMS" | "MGRS" })}
        />
        <Choice
          label={t("Referência de norte")}
          value={prefs.northRef}
          options={[
            { id: "true", label: t("Verdadeiro") },
            { id: "magnetic", label: t("Magnético") },
          ]}
          onChange={(v) => update({ northRef: v as "true" | "magnetic" })}
        />
      </Section>

      <Section title={t("Uso noturno")}>
        <p className="text-xs text-muted-foreground">
          A visão noturna vermelha (padrão de campo militar) preserva a adaptação do olho ao escuro:
          dá para ler o aparelho de noite sem "cegar" a visão nem atrair atenção.
        </p>
        <Choice
          label="Modo noturno"
          value={prefs.visaoNoturna ? "on" : "off"}
          options={[
            { id: "off", label: "Desligado" },
            { id: "on", label: "Visão noturna" },
          ]}
          onChange={(v) => update({ visaoNoturna: v === "on" })}
        />
        {prefs.visaoNoturna && (
          <>
            <div className="space-y-1">
              <label
                htmlFor="noturno-vermelho"
                className="mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Intensidade do vermelho · {Math.round(prefs.noturnoVermelho * 100)}%
              </label>
              <input
                id="noturno-vermelho"
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={prefs.noturnoVermelho}
                onChange={(e) => update({ noturnoVermelho: Number(e.target.value) })}
                className="w-full accent-tactical-orange"
                data-test="noturno-vermelho"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="noturno-escurecer"
                className="mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Escurecer tela · {Math.round(prefs.noturnoEscurecer * 100)}%
              </label>
              <input
                id="noturno-escurecer"
                type="range"
                min={0}
                max={0.75}
                step={0.05}
                value={prefs.noturnoEscurecer}
                onChange={(e) => update({ noturnoEscurecer: Number(e.target.value) })}
                className="w-full accent-tactical-orange"
                data-test="noturno-escurecer"
              />
            </div>
          </>
        )}
      </Section>

      <Section title={t("Chaves de inteligência (opcional)")}>
        <p className="text-xs text-muted-foreground">
          {t(
            "Camadas extras do modo Osiris. Chaves pessoais ficam salvas apenas neste aparelho e são usadas só para consultar as fontes oficiais — e podem ficar vazias quando o app já vem com chaves configuradas no servidor.",
          )}
        </p>
        <div className="space-y-1">
          <Label htmlFor="chave-firms">{t("NASA FIRMS — focos de calor")}</Label>
          <Input
            id="chave-firms"
            autoComplete="off"
            placeholder={
              chavesServ?.firmsServidor
                ? t("Chave do servidor ativa — opcional")
                : t("Cole aqui sua MAP_KEY da NASA FIRMS")
            }
            value={prefs.intelKeys.firms}
            onChange={(e) => update({ intelKeys: { ...prefs.intelKeys, firms: e.target.value } })}
          />
          {chavesServ?.firmsServidor ? (
            <p className="text-[10px] text-tactical-orange">
              {t("Chave do servidor ativa — os focos de calor já funcionam; a sua é opcional.")}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {t(
                'Cadastre grátis em firms.modaps.eosdis.nasa.gov (conta NASA Earthdata). A camada "Focos de calor" ativa em poucos minutos.',
              )}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="chave-ais">{t("AISStream.io — navios ao vivo")}</Label>
          <Input
            id="chave-ais"
            autoComplete="off"
            placeholder={
              chavesServ?.chaveAis
                ? t("Chave do servidor ativa — opcional")
                : t("Cole aqui sua chave do AISStream.io")
            }
            value={prefs.intelKeys.ais}
            onChange={(e) => update({ intelKeys: { ...prefs.intelKeys, ais: e.target.value } })}
          />
          {chavesServ?.chaveAis ? (
            <p className="text-[10px] text-tactical-orange">
              {t("Chave do servidor ativa — os navios ao vivo já funcionam; a sua é opcional.")}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {t(
                'Cadastre grátis em aisstream.io. Os navios aparecem ao redor da área visível do mapa, com o modo Osiris e a camada "Navios" ligados.',
              )}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="chave-owm">{t("OpenWeatherMap — vento e temperatura")}</Label>
          <Input
            id="chave-owm"
            data-test="chave-owm"
            autoComplete="off"
            placeholder={t("Cole aqui sua chave do OpenWeatherMap")}
            value={prefs.intelKeys.owm}
            onChange={(e) => update({ intelKeys: { ...prefs.intelKeys, owm: e.target.value } })}
          />
          <p className="text-[10px] text-muted-foreground">
            {t(
              'Cadastre grátis em openweathermap.org/api — a chave pode levar até 2 horas para ativar. Liga as camadas "Vento (superfície)" e "Temperatura (superfície)", iguais às do Zoom Earth.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5 shrink-0" />
          {t("Nenhum dado destas chaves sai do seu aparelho além da consulta direta à fonte.")}
        </div>
      </Section>

      {/* ASSISTENTE IA — identidade, chave API com passo a passo e memória */}
      <div id="assistente-ia">
        <ConfigAssistente />
      </div>

      <Section title={t("Dados no aparelho")}>
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t("Waypoints")} value={counts ? formatInteger(counts.waypoints) : "—"} />
          <Stat label={t("Itens da mochila")} value={counts ? formatInteger(counts.gear) : "—"} />
          <Stat
            label={t("Checklist concluído")}
            value={counts ? formatInteger(counts.checklist) : "—"}
          />
          <Stat label={t("Tópicos baixados")} value={counts ? formatInteger(counts.manual) : "—"} />
          <Stat label={t("Áreas de mapa")} value={counts ? formatInteger(counts.areas) : "—"} />
          <Stat
            label={t("Espaço dos mapas")}
            value={counts ? `${formatNumber(counts.bytes / 1024 / 1024, 1)} MB` : "—"}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={exportGPX} className="glove-tap w-full">
            <Download className="h-4 w-4" /> {t("Exportar GPX")}
          </Button>
          <Button onClick={exportBackup} variant="secondary" className="glove-tap w-full">
            <Download className="h-4 w-4" /> {t("Backup completo")}
          </Button>
          <Button
            variant="secondary"
            className="glove-tap w-full sm:col-span-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> {t("Importar GPX ou KML")}
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

      <Section title={t("Nuvem (opcional)")}>
        <div className="rounded border border-border/70 px-3 py-2">
          {loadingSession ? (
            <p className="text-xs text-muted-foreground">{t("Verificando sessão…")}</p>
          ) : email ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="mono text-xs break-all">{email}</span>
              <Button variant="destructive" size="sm" onClick={signOut} className="glove-tap">
                {t("Sair")}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("Sincronização entre aparelhos via Supabase (experimental):")}{" "}
              <Link to="/login" className="text-tactical-orange underline">
                {t("entre com a conta de nuvem")}
              </Link>
              .
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "Seus dados vivem neste aparelho. A nuvem só é usada se você ativar a sincronização e entrar com sua conta.",
          )}
        </p>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox
            checked={autoSync}
            onCheckedChange={(checked) => void alternarAutoSync(checked === true)}
            aria-label={t("Sincronizar automaticamente com a nuvem")}
          />
          {t("Sincronizar automaticamente com a nuvem")}
        </label>
        <p className="text-xs text-muted-foreground">
          {lastSync
            ? t("Última sincronização: {n}", { n: formatDateTime(lastSync) })
            : t("Nada sincronizado ainda.")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={doPush}
            disabled={busy !== null}
            className="glove-tap w-full"
            title={email ? undefined : t("Entre na conta para usar a nuvem")}
          >
            <CloudUpload className="h-4 w-4" /> {t("Enviar para a nuvem")}
          </Button>
          <Button
            onClick={doPull}
            disabled={busy !== null}
            variant="secondary"
            className="glove-tap w-full"
            title={email ? undefined : t("Entre na conta para usar a nuvem")}
          >
            <CloudDownload className="h-4 w-4" /> {t("Trazer da nuvem")}
          </Button>
        </div>
      </Section>

      <BackupFolderCard />

      <ObsidianCard />

      <Section title={t("Aplicativo")}>
        {instalado ? (
          <p className="text-sm text-tactical-green">
            {t("Aplicativo instalado — rodando em tela cheia com suporte offline.")}
          </p>
        ) : podeInstalar ? (
          <div className="space-y-2">
            <Button onClick={() => void instalar()} className="glove-tap w-full">
              <Download className="h-4 w-4" /> {t("Instalar aplicativo")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("Instale para abrir em tela cheia e usar mesmo sem internet.")}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {plataforma === "ios"
              ? t(
                  'Para instalar no iPhone/iPad: botão Compartilhar no Safari → "Adicionar à Tela de Início".',
                )
              : t(
                  'Para instalar: use a opção "Instalar aplicativo" do navegador ou o ícone na barra de endereço.',
                )}
          </p>
        )}
      </Section>

      <Section title={t("Convide os amigos")}>
        <p className="text-sm text-muted-foreground">
          {t("Mande o Manual para quem ainda se perde na trilha.")}
        </p>
        <BotaoConvidar className="glove-tap w-full" />
      </Section>

      {email && (
        <Section title={t("Relatório semanal por e-mail")}>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={reportForm.enabled}
              onCheckedChange={(checked) =>
                setReportForm((current) => ({ ...current, enabled: checked === true }))
              }
              aria-label={t("Ativar relatório semanal")}
            />
            {t("Enviar relatório automaticamente")}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="mono text-[10px] uppercase text-muted-foreground">
                {t("Dia da semana")}
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
                <option value={0}>{t("Domingo")}</option>
                <option value={1}>{t("Segunda-feira")}</option>
                <option value={2}>{t("Terça-feira")}</option>
                <option value={3}>{t("Quarta-feira")}</option>
                <option value={4}>{t("Quinta-feira")}</option>
                <option value={5}>{t("Sexta-feira")}</option>
                <option value={6}>{t("Sábado")}</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="mono text-[10px] uppercase text-muted-foreground">
                {t("Horário")}
              </span>
              <Input
                type="time"
                value={reportForm.local_time}
                onChange={(event) =>
                  setReportForm((current) => ({ ...current, local_time: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="mono text-[10px] uppercase text-muted-foreground">
                {t("Destinatário")}
              </span>
              <Input
                type="email"
                value={reportForm.recipient_email}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    recipient_email: event.target.value,
                  }))
                }
                placeholder={t("voce@exemplo.com")}
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={saveReports}
              disabled={busy !== null || !reportForm.recipient_email}
            >
              {t("Salvar programação")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={sendReport}
              disabled={busy !== null || !reportForm.recipient_email}
            >
              {t("Enviar agora")}
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="mono text-[10px] uppercase text-muted-foreground">
              {t("Histórico recente")}
            </h3>
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
                    {item.status === "sent" ? t("Enviado") : t("Falhou")}
                  </span>
                  <span className="w-full break-words text-muted-foreground">
                    {formatInteger(item.waypoint_count)} {t("waypoints")} ·{" "}
                    {formatInteger(item.gear_count)} {t("itens")} ·{" "}
                    {formatInteger(item.checklist_count)} {t("concluídos")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">{t("Nenhum envio registrado.")}</p>
            )}
          </div>
        </Section>
      )}

      <Section title={t("Limpeza")}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={clearMaps} className="glove-tap w-full">
            <Trash2 className="h-4 w-4" /> {t("Apagar mapas offline")}
          </Button>
          <Button variant="destructive" onClick={clearAll} className="glove-tap w-full">
            <Trash2 className="h-4 w-4" /> {t("Apagar dados locais")}
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
