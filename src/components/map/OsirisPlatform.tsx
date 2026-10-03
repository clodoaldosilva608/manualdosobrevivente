/**
 * Plataforma Osiris — centro de comando de inteligência global.
 *
 * Substitui o HUD tático quando o modo Osiris está ativo. O mapa permanece
 * interativo no centro (o chrome usa pointer-events-none com painéis
 * pointer-events-auto) e concentra TODAS as funcionalidades:
 *
 *  - Barra superior: marca, contadores ao vivo, clima espacial (Kp),
 *    relógios UTC/local, situação da coleta e alternador Tático ↔ Osiris;
 *  - Painel de camadas (esquerda no desktop, gaveta no celular): as 11
 *    camadas com contadores e liga/desliga tudo;
 *  - Feed global ao vivo (direita no desktop, gaveta no celular): alertas
 *    GDACS, sismos M4,5+, eventos EONET e manchetes GDELT unificados por
 *    horário — cada item voa até o alvo no mapa;
 *  - Ferramentas: Boletim completo, astronomia tática, ISS, investigação
 *    OSINT (IP e domínio), chaves FIRMS/AIS, ir para coordenada e visão
 *    global;
 *  - Letreiro inferior com as emergências e manchetes das últimas 24 h.
 *
 * No celular os painéis viram gavetas acionadas pela barra de abas inferior
 * (Mapa · Feed · Camadas · Mais), deixando a visão global do mapa livre.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CloudLightning,
  Globe2,
  KeyRound,
  Layers,
  Map as MapIcon,
  Navigation2,
  Newspaper,
  Radar,
  RefreshCw,
  Rss,
  Satellite,
  Search,
  Sun,
  Wrench,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MapModeSwitch, type ModoMapa } from "@/components/map/MapModeSwitch";
import { LINHAS_INTEL } from "@/components/map/intel-camadas-lista";
import { CONFLITOS } from "@/lib/intel-conflicts";
import { CENTRAIS_NUCLEARES } from "@/lib/intel-nuclear";
import { ESTREITOS, PORTOS } from "@/lib/intel-maritimo";
import { formatDuration, formatInteger, formatNumber, formatTime } from "@/lib/format";
import type {
  IntelAlerta,
  IntelIss,
  IntelNavio,
  IntelNoticia,
  IntelSnapshot,
  IntelVisibilidade,
  IntelVoo,
} from "@/lib/intel.types";

/** Estado da coleta de inteligência (compartilhado com o MapShell). */
export type StatusIntel = "idle" | "carregando" | "ok" | "erro";

type StatusAis = "conectando" | "ativo" | "erro" | "fechado" | "off";

export interface OsirisPlatformProps {
  modo: ModoMapa;
  onTrocarModo: (m: ModoMapa) => void;
  status: StatusIntel;
  snapshot: IntelSnapshot | null;
  vis: IntelVisibilidade;
  onToggleVis: (id: keyof IntelVisibilidade, v: boolean) => void;
  onSetTodasVis: (v: boolean) => void;
  voos: IntelVoo[] | null;
  iss: IntelIss | null;
  alertas: IntelAlerta[] | null;
  noticias: IntelNoticia[] | null;
  navios: IntelNavio[];
  statusAis: StatusAis;
  onAbrirBoletim: () => void;
  onAbrirHub: (secao: "astro" | "iss" | "ip" | "dominio" | "chaves") => void;
  onIrPara: () => void;
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  onVisaoGlobal: () => void;
  onAtualizar: () => void;
}

type PainelMobile = "nenhum" | "feed" | "camadas" | "ferramentas";

// ---------------------------------------------------------------------------
// Itens do feed global (união das fontes com coordenada ou link)
// ---------------------------------------------------------------------------

interface ItemFeed {
  chave: string;
  tipo: "alerta" | "sismo" | "evento" | "noticia";
  titulo: string;
  meta: string;
  /** Unix em ms (null quando a fonte não informa). */
  hora: number | null;
  lng?: number;
  lat?: number;
  zoom?: number;
  url?: string;
  cor: string;
}

function construirFeed(
  snapshot: IntelSnapshot | null,
  alertas: IntelAlerta[] | null,
  noticias: IntelNoticia[] | null,
): ItemFeed[] {
  const itens: ItemFeed[] = [];

  for (const a of alertas ?? []) {
    itens.push({
      chave: `alerta-${a.id}`,
      tipo: "alerta",
      titulo: `${a.tipo} — ${a.nome}`,
      meta: `${a.pais} · GDACS`,
      hora: a.inicio ? new Date(a.inicio).getTime() : null,
      lng: a.lng,
      lat: a.lat,
      zoom: 5,
      cor:
        a.nivel === "Red"
          ? "text-red-400"
          : a.nivel === "Orange"
            ? "text-amber-400"
            : "text-emerald-400",
    });
  }

  for (const s of snapshot?.sismos ?? []) {
    if (s.mag < 4.5) continue;
    itens.push({
      chave: `sismo-${s.id}`,
      tipo: "sismo",
      titulo: `M${formatNumber(s.mag, 1)} — ${s.lugar}`,
      meta: `profundidade ${formatInteger(s.profundidade)} km · USGS`,
      hora: s.hora,
      lng: s.lng,
      lat: s.lat,
      zoom: 5,
      cor: "text-yellow-300",
    });
  }

  for (const e of (snapshot?.eventos ?? [])
    .slice()
    .sort((a, b) => b.hora - a.hora)
    .slice(0, 12)) {
    itens.push({
      chave: `evento-${e.id}`,
      tipo: "evento",
      titulo: `${e.categoria} — ${e.titulo}`,
      meta: "NASA EONET",
      hora: e.hora,
      lng: e.lng,
      lat: e.lat,
      zoom: 5,
      cor: "text-orange-300",
    });
  }

  for (const n of (noticias ?? []).slice(0, 10)) {
    itens.push({
      chave: `noticia-${n.url}`,
      tipo: "noticia",
      titulo: n.titulo,
      meta: `${n.fonte}${n.hora ? ` · ${formatTime(n.hora)}` : ""}`,
      hora: n.hora || null,
      url: n.url,
      cor: "text-sky-300",
    });
  }

  itens.sort((a, b) => (b.hora ?? 0) - (a.hora ?? 0));
  return itens.slice(0, 60);
}

/** "há 12 min" / "há 3 h" / "há 2 d" — para o feed e o letreiro. */
function haQuanto(hora: number | null): string {
  if (!hora) return "";
  const s = Math.max(1, Math.round((Date.now() - hora) / 1000));
  return `há ${formatDuration(s)}`;
}

// ---------------------------------------------------------------------------
// Peças reutilizadas entre desktop e gavetas do celular
// ---------------------------------------------------------------------------

function Relogios() {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (agora === null) return null; // evita divergência de hidratação
  const utc = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(agora);
  return (
    <span className="mono flex shrink-0 items-center gap-2 text-[10px] leading-none">
      <span className="text-muted-foreground">
        UTC <span className="text-foreground">{utc}</span>
      </span>
      <span className="text-muted-foreground">
        LOCAL <span className="text-foreground">{formatTime(agora)}</span>
      </span>
    </span>
  );
}

function SituacaoColeta({ status }: { status: StatusIntel }) {
  const mapa: Record<StatusIntel, { rotulo: string; cor: string; ponto: string }> = {
    ok: { rotulo: "AO VIVO", cor: "text-emerald-400", ponto: "bg-emerald-400" },
    carregando: { rotulo: "ATUALIZANDO…", cor: "text-amber-400", ponto: "bg-amber-400" },
    erro: { rotulo: "OFFLINE · ÚLTIMOS DADOS", cor: "text-red-400", ponto: "bg-red-400" },
    idle: { rotulo: "INICIANDO…", cor: "text-muted-foreground", ponto: "bg-muted-foreground" },
  };
  const s = mapa[status];
  return (
    <span className={`mono flex shrink-0 items-center gap-1 text-[10px] font-bold ${s.cor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.ponto} animate-pulse`} />
      {s.rotulo}
    </span>
  );
}

/** Painel das 11 camadas de inteligência (desktop e gaveta mobile). */
function CamadasPanel({
  snapshot,
  vis,
  voos,
  iss,
  alertas,
  navios,
  statusAis,
  onToggleVis,
  onSetTodasVis,
}: {
  snapshot: IntelSnapshot | null;
  vis: IntelVisibilidade;
  voos: IntelVoo[] | null;
  iss: IntelIss | null;
  alertas: IntelAlerta[] | null;
  navios: IntelNavio[];
  statusAis: StatusAis;
  onToggleVis: (id: keyof IntelVisibilidade, v: boolean) => void;
  onSetTodasVis: (v: boolean) => void;
}) {
  const fortes = (alertas ?? []).filter((a) => a.nivel !== "Green").length;
  const mil = (voos ?? []).filter((v) => v.militar).length;

  const contagem: Record<keyof IntelVisibilidade, string | null> = {
    sismos: snapshot ? formatInteger(snapshot.sismos.length) : null,
    eventos: snapshot ? formatInteger(snapshot.eventos.length) : null,
    incendios: snapshot?.incendiosDisponivel ? formatInteger(snapshot.incendios.length) : "chave",
    conflitos: formatInteger(CONFLITOS.length),
    voos: voos ? `${formatInteger(voos.length)} · ${formatInteger(mil)} MIL` : null,
    satelites: iss ? "no ar" : null,
    alertas: alertas ? `${formatInteger(fortes)} fortes` : null,
    maritimo: `${ESTREITOS.length}+${PORTOS.length}`,
    nuclear: formatInteger(CENTRAIS_NUCLEARES.length),
    noite: "tempo real",
    navios:
      statusAis === "ativo"
        ? formatInteger(navios.length)
        : statusAis === "conectando"
          ? "conectando…"
          : statusAis === "erro"
            ? "sem chave"
            : null,
  };

  return (
    <div data-test="osiris-camadas" className="flex flex-col">
      <div className="mono mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
        <span className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Camadas de inteligência
        </span>
        <span className="flex gap-1">
          <button
            type="button"
            className="rounded border border-border px-1.5 py-0.5 text-[9px] font-normal text-muted-foreground hover:text-foreground"
            onClick={() => onSetTodasVis(true)}
          >
            Todas
          </button>
          <button
            type="button"
            className="rounded border border-border px-1.5 py-0.5 text-[9px] font-normal text-muted-foreground hover:text-foreground"
            onClick={() => onSetTodasVis(false)}
          >
            Nenhuma
          </button>
        </span>
      </div>
      <div className="space-y-1.5">
        {LINHAS_INTEL.map((linha) => {
          const desabilitada =
            linha.id === "incendios" && snapshot !== null && !snapshot.incendiosDisponivel;
          return (
            <div
              key={linha.id}
              className="flex items-center justify-between gap-2 rounded border border-border/70 bg-background/40 px-2 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: linha.cor }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[12px] leading-tight">{linha.nome}</div>
                  <div className="mono truncate text-[9px] leading-tight text-muted-foreground">
                    {desabilitada ? "Cadastre a chave gratuita FIRMS em Ajustes" : linha.dica}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {contagem[linha.id] !== null && (
                  <span className="mono text-[9px] text-muted-foreground">
                    {contagem[linha.id]}
                  </span>
                )}
                <Switch
                  checked={vis[linha.id]}
                  disabled={desabilitada}
                  aria-label={`Ativar camada ${linha.nome}`}
                  onCheckedChange={(v) => onToggleVis(linha.id, v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Feed global unificado (alertas + sismos + eventos + manchetes). */
function FeedPanel({
  feed,
  onFlyTo,
  vazio,
}: {
  feed: ItemFeed[];
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  vazio: boolean;
}) {
  const icone = {
    alerta: AlertTriangle,
    sismo: Activity,
    evento: CloudLightning,
    noticia: Newspaper,
  } as const;

  return (
    <div data-test="osiris-feed" className="flex flex-col">
      <div className="mono mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
        <Rss className="h-3.5 w-3.5" /> Feed global ao vivo
        <span className="ml-auto font-normal text-muted-foreground">
          {formatInteger(feed.length)} eventos
        </span>
      </div>
      {vazio ? (
        <p className="mono text-[11px] leading-relaxed text-muted-foreground">
          Aguardando a primeira coleta das fontes (USGS, GDACS, EONET, GDELT)… toque em Atualizar.
        </p>
      ) : (
        <div className="space-y-1">
          {feed.map((item) => {
            const Icone = icone[item.tipo];
            const quando = haQuanto(item.hora);
            const corpo = (
              <>
                <Icone className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${item.cor}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] leading-snug">{item.titulo}</span>
                  <span className="mono block truncate text-[9px] text-muted-foreground">
                    {item.meta}
                    {quando ? ` · ${quando}` : ""}
                  </span>
                </span>
              </>
            );
            const base =
              "flex w-full items-start gap-2 rounded border border-transparent px-1.5 py-1 text-left hover:border-border hover:bg-background/60";
            return item.lng !== undefined && item.lat !== undefined ? (
              <button
                key={item.chave}
                type="button"
                data-test="osiris-feed-item"
                className={base}
                onClick={() => onFlyTo(item.lng!, item.lat!, item.zoom ?? 5)}
              >
                {corpo}
              </button>
            ) : (
              <a
                key={item.chave}
                href={item.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                data-test="osiris-feed-item"
                className={base}
              >
                {corpo}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Ferramentas da plataforma — tudo em um painel. */
function FerramentasPanel({
  onAbrirBoletim,
  onAbrirHub,
  onIrPara,
  onVisaoGlobal,
}: {
  onAbrirBoletim: () => void;
  onAbrirHub: (secao: "astro" | "iss" | "ip" | "dominio" | "chaves") => void;
  onIrPara: () => void;
  onVisaoGlobal: () => void;
}) {
  const botoes: Array<{
    rotulo: string;
    descricao: string;
    icone: typeof Sun;
    acao: () => void;
  }> = [
    {
      rotulo: "Boletim completo",
      descricao: "Resumo consolidado das 7 fontes",
      icone: Newspaper,
      acao: onAbrirBoletim,
    },
    {
      rotulo: "Astronomia tática",
      descricao: "Sol, lua, crepúsculos e orientação",
      icone: Sun,
      acao: () => onAbrirHub("astro"),
    },
    {
      rotulo: "ISS em tempo real",
      descricao: "Posição, órbita e pegada",
      icone: Satellite,
      acao: () => onAbrirHub("iss"),
    },
    {
      rotulo: "Investigar IP",
      descricao: "Geolocalização e operadora",
      icone: Globe2,
      acao: () => onAbrirHub("ip"),
    },
    {
      rotulo: "Investigar domínio",
      descricao: "Registro RDAP (WHOIS)",
      icone: Search,
      acao: () => onAbrirHub("dominio"),
    },
    {
      rotulo: "Chaves FIRMS/AIS",
      descricao: "Desbloqueia focos de calor e navios",
      icone: KeyRound,
      acao: () => onAbrirHub("chaves"),
    },
    {
      rotulo: "Ir para coordenada",
      descricao: "DD, DMS ou MGRS",
      icone: Navigation2,
      acao: onIrPara,
    },
    {
      rotulo: "Visão global",
      descricao: "Recentraliza o mundo inteiro",
      icone: Globe2,
      acao: onVisaoGlobal,
    },
  ];
  return (
    <div data-test="osiris-ferramentas" className="flex flex-col">
      <div className="mono mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
        <Wrench className="h-3.5 w-3.5" /> Ferramentas
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {botoes.map(({ rotulo, descricao, icone: Icone, acao }) => (
          <button
            key={rotulo}
            type="button"
            className="flex flex-col items-start gap-0.5 rounded border border-border/70 bg-background/40 px-2 py-2 text-left hover:border-tactical-orange/60"
            onClick={acao}
          >
            <span className="flex items-center gap-1.5">
              <Icone className="h-3.5 w-3.5 text-tactical-orange" />
              <span className="mono text-[10px] font-bold uppercase leading-tight">{rotulo}</span>
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">{descricao}</span>
          </button>
        ))}
      </div>
      <p className="mono mt-2 text-[9px] leading-relaxed text-muted-foreground">
        Medição, marcadores, waypoints e bússola ficam no modo Tático — alterne na barra superior.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function OsirisPlatform({
  modo,
  onTrocarModo,
  status,
  snapshot,
  vis,
  onToggleVis,
  onSetTodasVis,
  voos,
  iss,
  alertas,
  noticias,
  navios,
  statusAis,
  onAbrirBoletim,
  onAbrirHub,
  onIrPara,
  onFlyTo,
  onVisaoGlobal,
  onAtualizar,
}: OsirisPlatformProps) {
  const [painelMobile, setPainelMobile] = useState<PainelMobile>("nenhum");

  const feed = useMemo(
    () => construirFeed(snapshot, alertas, noticias),
    [snapshot, alertas, noticias],
  );

  // Voar a partir do feed: fecha a gaveta do celular para revelar o mapa.
  const voarDoFeed = useCallback(
    (lng: number, lat: number, zoom?: number) => {
      setPainelMobile("nenhum");
      onFlyTo(lng, lat, zoom);
    },
    [onFlyTo],
  );

  const fortes = (alertas ?? []).filter((a) => a.nivel !== "Green").length;
  const voosMil = (voos ?? []).filter((v) => v.militar).length;

  const camadasProps = {
    snapshot,
    vis,
    voos,
    iss,
    alertas,
    navios,
    statusAis,
    onToggleVis,
    onSetTodasVis,
  };

  const itensTicker = useMemo(() => {
    const alertasTxt = (alertas ?? [])
      .filter((a) => a.nivel !== "Green")
      .slice(0, 6)
      .map(
        (a) => `● ${a.nivel === "Red" ? "VERMELHO" : "LARANJA"} — ${a.tipo}: ${a.nome} (${a.pais})`,
      );
    const noticiasTxt = (noticias ?? []).slice(0, 8).map((n) => n.titulo);
    const tudo = [...alertasTxt, ...noticiasTxt];
    return tudo.length > 0 ? tudo : ["Aguardando coleta das fontes de emergência (GDACS/GDELT)…"];
  }, [alertas, noticias]);

  const abrirPainel = (p: PainelMobile) => setPainelMobile((atual) => (atual === p ? "nenhum" : p));

  // Painéis laterais só existem em telas md+ — no celular entram como gavetas.
  // (Renderização condicional evita conteúdo duplicado escondido por CSS.)
  const [ehDesktop, setEhDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const atualizar = () => setEhDesktop(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ---------------- Barra superior ---------------- */}
      <header
        data-test="osiris-topbar"
        className="pointer-events-auto absolute inset-x-0 top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md"
      >
        <div className="flex h-12 items-center gap-2 px-2 pt-[max(0px,env(safe-area-inset-top))] md:px-3">
          <span className="mono flex shrink-0 items-center gap-1.5 text-tactical-orange">
            <Radar className="h-4 w-4 animate-pulse" />
            <span className="text-[12px] font-bold tracking-widest">OSIRIS</span>
            <span className="hidden text-[9px] font-normal tracking-wider text-muted-foreground lg:inline">
              · PLATAFORMA DE INTELIGÊNCIA GLOBAL
            </span>
          </span>

          {/* Contadores ao vivo (rolam no celular) */}
          <div className="mono flex min-w-0 flex-1 items-center gap-3 overflow-x-auto text-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-foreground">
              SISMOS{" "}
              <span className="text-yellow-300">{formatInteger(snapshot?.sismos.length ?? 0)}</span>
            </span>
            <span className="shrink-0 text-foreground">
              EVENTOS{" "}
              <span className="text-amber-400">{formatInteger(snapshot?.eventos.length ?? 0)}</span>
            </span>
            <span className="hidden shrink-0 text-foreground sm:inline">
              CONFLITOS <span className="text-red-400">{formatInteger(CONFLITOS.length)}</span>
            </span>
            <span className="hidden shrink-0 text-foreground sm:inline">
              VOOS{" "}
              <span className="text-sky-300">
                {formatInteger(voos?.length ?? 0)}
                {voosMil > 0 ? ` (MIL ${formatInteger(voosMil)})` : ""}
              </span>
            </span>
            <span className="hidden shrink-0 text-foreground md:inline">
              ALERTAS{" "}
              <span className={fortes > 0 ? "text-red-400" : "text-emerald-400"}>
                {alertas ? `${formatInteger(fortes)} FORTES` : "—"}
              </span>
            </span>
            {snapshot?.climaEspacial && (
              <span
                className={`hidden shrink-0 md:inline ${
                  snapshot.climaEspacial.nivel === "tempestade"
                    ? "text-red-400"
                    : snapshot.climaEspacial.nivel === "instavel"
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                KP {formatNumber(snapshot.climaEspacial.kp, 1)}
              </span>
            )}
          </div>

          <span className="hidden xl:inline">
            <Relogios />
          </span>
          <span className="hidden sm:inline">
            <SituacaoColeta status={status} />
          </span>
          <button
            type="button"
            title="Atualizar dados agora"
            aria-label="Atualizar dados agora"
            className="glove-tap shrink-0 rounded border border-border p-1.5 text-muted-foreground hover:text-foreground"
            onClick={onAtualizar}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <div data-test="modo-mapa-desktop" className="hidden md:block">
            <MapModeSwitch modo={modo} onTrocar={onTrocarModo} />
          </div>
          <div data-test="modo-mapa-mobile" className="md:hidden">
            <MapModeSwitch modo={modo} onTrocar={onTrocarModo} />
          </div>
        </div>
      </header>

      {/* ---------------- Painel de camadas + ferramentas (desktop) ---------------- */}
      {ehDesktop && (
        <aside className="pointer-events-auto absolute bottom-[4.75rem] left-3 top-14 z-10 w-72 overflow-y-auto rounded-md border border-border bg-background/85 p-2.5 backdrop-blur-md">
          <CamadasPanel {...camadasProps} />
          <div className="sticky bottom-0 -mx-2.5 -mb-2.5 mt-2 border-t border-border bg-background/95 px-2.5 pb-2.5 pt-2">
            <FerramentasPanel
              onAbrirBoletim={onAbrirBoletim}
              onAbrirHub={onAbrirHub}
              onIrPara={onIrPara}
              onVisaoGlobal={onVisaoGlobal}
            />
          </div>
        </aside>
      )}

      {/* ---------------- Feed global (desktop) ---------------- */}
      {ehDesktop && (
        <aside className="pointer-events-auto absolute bottom-[4.75rem] right-3 top-14 z-10 w-[340px] overflow-y-auto rounded-md border border-border bg-background/85 p-2.5 backdrop-blur-md">
          <FeedPanel feed={feed} onFlyTo={voarDoFeed} vazio={!snapshot && !alertas && !noticias} />
        </aside>
      )}

      {/* ---------------- Letreiro de emergências ---------------- */}
      <div
        data-test="osiris-ticker"
        className="pointer-events-auto absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-8"
      >
        <div className="hud-panel flex h-9 items-center overflow-hidden">
          <span className="mono flex h-full shrink-0 items-center border-r border-border bg-red-950/40 px-2 text-[9px] font-bold uppercase tracking-widest text-red-400">
            Emergência 24 h
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="osiris-ticker flex w-max items-center gap-8 px-4">
              {itensTicker.map((t, i) => (
                <span key={`a-${i}`} className="mono whitespace-nowrap text-[10px] text-foreground">
                  {t}
                </span>
              ))}
              {itensTicker.map((t, i) => (
                <span
                  key={`b-${i}`}
                  aria-hidden
                  className="mono whitespace-nowrap text-[10px] text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            title="Abrir Boletim de inteligência"
            className="mono flex h-full shrink-0 items-center gap-1 border-l border-border px-2 text-[9px] font-bold uppercase tracking-widest text-tactical-orange md:hidden"
            onClick={onAbrirBoletim}
          >
            <Newspaper className="h-3.5 w-3.5" /> Boletim
          </button>
        </div>
      </div>

      {/* ---------------- Gavetas do celular ---------------- */}
      {painelMobile !== "nenhum" && (
        <div className="md:hidden">
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0 z-20 bg-black/55"
            onClick={() => setPainelMobile("nenhum")}
          />
          <div
            data-test="osiris-gaveta"
            className="pointer-events-auto absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+2.25rem)] z-30 max-h-[62dvh] overflow-y-auto rounded-t-lg border border-border bg-background/95 p-3 backdrop-blur-md"
          >
            {painelMobile === "feed" ? (
              <FeedPanel
                feed={feed}
                onFlyTo={voarDoFeed}
                vazio={!snapshot && !alertas && !noticias}
              />
            ) : painelMobile === "camadas" ? (
              <CamadasPanel {...camadasProps} />
            ) : (
              <FerramentasPanel
                onAbrirBoletim={onAbrirBoletim}
                onAbrirHub={onAbrirHub}
                onIrPara={onIrPara}
                onVisaoGlobal={onVisaoGlobal}
              />
            )}
          </div>
        </div>
      )}

      {/* ---------------- Barra de abas (celular) ---------------- */}
      <nav
        data-test="osiris-tabbar"
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {(
          [
            { id: "nenhum", rotulo: "Mapa", icone: MapIcon, teste: "aba-mapa" },
            { id: "feed", rotulo: "Feed", icone: Rss, teste: "aba-feed" },
            { id: "camadas", rotulo: "Camadas", icone: Layers, teste: "aba-camadas" },
            { id: "ferramentas", rotulo: "Mais", icone: Wrench, teste: "aba-ferramentas" },
          ] as const
        ).map(({ id, rotulo, icone: Icone, teste }) => (
          <button
            key={id}
            type="button"
            data-test={teste}
            className={`glove-tap flex flex-1 flex-col items-center justify-center gap-0.5 mono text-[9px] uppercase tracking-wider ${
              painelMobile === id ? "text-tactical-orange" : "text-muted-foreground"
            }`}
            onClick={() => abrirPainel(id)}
          >
            <Icone className="h-4 w-4" />
            {rotulo}
          </button>
        ))}
      </nav>
    </div>
  );
}
