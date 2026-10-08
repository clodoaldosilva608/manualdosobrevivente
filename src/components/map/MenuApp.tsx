/**
 * MenuApp — o menu geral do aplicativo, aberto pelo botão hambúrguer.
 *
 * Reúne todas as funcionalidades em um só lugar, com um submenu dedicado ao
 * OSIRIS que separa as funções de inteligência global (Visão Osiris, Hub,
 * Boletim, camadas de inteligência, astronomia, ISS, investigação OSINT e
 * chaves de API) das demais: navegação entre telas e ferramentas do mapa
 * tático.
 *
 * Ações que dependem do mapa tático são delegadas ao MapShell via callbacks —
 * quando acionadas a partir da Visão Osiris, o app devolve ao modo tático
 * antes de abri-las (os painéis ficam por baixo do globo em tela cheia).
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Backpack,
  BookOpen,
  ChevronDown,
  CloudSun,
  Compass,
  DownloadCloud,
  Eraser,
  Eye,
  Globe,
  Globe2,
  GraduationCap,
  KeyRound,
  Layers,
  LayoutDashboard,
  UserRound,
  Map,
  MapPin,
  Moon,
  Navigation2,
  Network,
  Newspaper,
  Radar,
  Route as RouteIcon,
  Ruler,
  Satellite,
  Server,
  Settings,
  Siren,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ModoMapa } from "@/components/map/MapModeSwitch";
import { LINHAS_INTEL } from "@/components/map/intel-camadas-lista";
import { useI18n } from "@/lib/i18n";

export type AcaoMenuMapa =
  | "goto"
  | "measure"
  | "marcador"
  | "bussola"
  | "globo"
  | "limpar"
  | "elementos"
  | "alertas"
  | "rota"
  | "noturno"
  | "zoomearth";
export type AcaoMenuOsiris =
  "visao" | "hub" | "boletim" | "camadas" | "astro" | "iss" | "ip" | "dominio" | "chaves";

export interface MenuAppProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  modo: ModoMapa;
  /** Estado das ferramentas do mapa tático — realça o item ativo. */
  marcadorAtivo: boolean;
  bussolaAtiva: boolean;
  globoAtivo: boolean;
  onAcaoMapa: (a: AcaoMenuMapa) => void;
  onAcaoOsiris: (a: AcaoMenuOsiris) => void;
}

interface ItemMenu {
  rotulo: string;
  dica: string;
  icone: LucideIcon;
}

/** Telas do aplicativo (mesmas rotas da navegação inferior/superior). */
const ROTAS: Array<ItemMenu & { to: string }> = [
  { to: "/", rotulo: "Mapa", dica: "Mapa tático e navegação", icone: Map },
  {
    to: "/tutorial",
    rotulo: "Treinamento",
    dica: "Aprenda a usar a bússola passo a passo",
    icone: GraduationCap,
  },
  { to: "/manual", rotulo: "Manual", dica: "Técnicas de sobrevivência", icone: BookOpen },
  { to: "/inventory", rotulo: "Mochila", dica: "Inventário de equipamentos", icone: Backpack },
  { to: "/sos", rotulo: "SOS", dica: "Emergências e primeiros socorros", icone: Siren },
  { to: "/dashboard", rotulo: "Painel", dica: "Resumo operacional", icone: LayoutDashboard },
  { to: "/offline", rotulo: "Offline", dica: "Mapas e dados para campo", icone: DownloadCloud },
  { to: "/settings", rotulo: "Ajustes", dica: "Configurações do aplicativo", icone: Settings },
  { to: "/conta", rotulo: "Conta", dica: "Perfil local do operador", icone: UserRound },
];

/** Ferramentas do HUD tático — exigem o mapa nativo (noturno é global). */
const FERRAMENTAS: Array<ItemMenu & { id: AcaoMenuMapa }> = [
  {
    id: "alertas",
    rotulo: "Modo Alerta",
    dica: "Radar de ameaças próximas de você",
    icone: Siren,
  },
  { id: "goto", rotulo: "Ir para", dica: "Voar até coordenadas", icone: Navigation2 },
  {
    id: "rota",
    rotulo: "Guia de rota",
    dica: "Navegação por waypoints e trilha gravada",
    icone: RouteIcon,
  },
  { id: "measure", rotulo: "Medir", dica: "Distância e área no mapa", icone: Ruler },
  { id: "marcador", rotulo: "Marcador", dica: "Marcar waypoint no mapa", icone: MapPin },
  { id: "bussola", rotulo: "Bússola", dica: "Orientação e declinação", icone: Compass },
  {
    id: "zoomearth",
    rotulo: "Satélite ao vivo",
    dica: "Zoom Earth: radar, vento e temperatura",
    icone: CloudSun,
  },
  {
    id: "noturno",
    rotulo: "Modo noturno",
    dica: "Visão vermelha que preserva o escuro",
    icone: Moon,
  },
  {
    id: "globo",
    rotulo: "Globo 3D",
    dica: "Projeção esférica do planeta",
    icone: Globe,
  },
  {
    id: "limpar",
    rotulo: "Limpar tela",
    dica: "Apagar medições e ocultar waypoints do mapa",
    icone: Eraser,
  },
  {
    id: "elementos",
    rotulo: "Elementos da tela",
    dica: "Escolher o que aparece sobre o mapa",
    icone: Eye,
  },
];

/** Submenu do OSIRIS — tudo que pertence à inteligência global. */
const OSIRIS: Array<ItemMenu & { id: AcaoMenuOsiris }> = [
  { id: "visao", rotulo: "Visão Osiris", dica: "Globo 3D de inteligência global", icone: Globe2 },
  { id: "hub", rotulo: "Hub de inteligência", dica: "Centro de comando OSINT", icone: Radar },
  { id: "boletim", rotulo: "Boletim tático", dica: "Consolidado do momento", icone: Newspaper },
  {
    id: "camadas",
    rotulo: "Camadas de inteligência",
    dica: `${LINHAS_INTEL.length} camadas ao vivo`,
    icone: Layers,
  },
  { id: "astro", rotulo: "Astronomia tática", dica: "Sol, lua e visibilidade", icone: Sunrise },
  { id: "iss", rotulo: "ISS em tempo real", dica: "Posição da estação espacial", icone: Satellite },
  { id: "ip", rotulo: "Investigar IP", dica: "Geolocalização e operadora", icone: Network },
  { id: "dominio", rotulo: "Investigar domínio", dica: "Registro público RDAP", icone: Server },
  { id: "chaves", rotulo: "Chaves FIRMS/AIS", dica: "Radar de fogo e navios", icone: KeyRound },
];

/** Rótulo de seção em caixa alta com espaçamento. */
function RotuloSecao({ children }: { children: string }) {
  return (
    <p className="mono px-1 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

/** Linha do menu: ícone + rótulo + dica (traduzidos na renderização), com estado ativo opcional. */
function LinhaItem({
  icone: Icone,
  rotulo,
  dica,
  ativo = false,
  onClick,
  teste,
}: ItemMenu & { ativo?: boolean; onClick: () => void; teste: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      data-test={teste}
      aria-pressed={ativo}
      className="glove-tap flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-tactical-orange"
    >
      <Icone
        className={`h-4 w-4 shrink-0 ${ativo ? "text-tactical-orange" : "text-muted-foreground"}`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block mono text-[13px] leading-tight ${
            ativo ? "font-bold text-tactical-orange" : "text-foreground"
          }`}
        >
          {t(rotulo)}
        </span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">
          {t(dica)}
        </span>
      </span>
      {ativo && (
        <span className="mono shrink-0 text-[9px] uppercase tracking-wider text-tactical-orange">
          {t("ativo")}
        </span>
      )}
    </button>
  );
}

export function MenuApp({
  open,
  onOpenChange,
  modo,
  marcadorAtivo,
  bussolaAtiva,
  globoAtivo,
  onAcaoMapa,
  onAcaoOsiris,
}: MenuAppProps) {
  // Submenu do OSIRIS nasce aberto: é o agrupamento que diferencia o menu.
  const [osirisAberto, setOsirisAberto] = useState(true);
  const { t } = useI18n();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-[300px] flex-col gap-0 bg-card p-0 sm:w-[340px]"
        data-test="menu-app"
      >
        <SheetHeader className="border-b border-border p-4 pr-12">
          <SheetTitle className="mono text-sm font-bold uppercase tracking-widest text-tactical-orange">
            {t("Menu operacional")}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {t("Todas as funções do Manual do Sobrevivente")}
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {/* ── Navegação entre telas ── */}
          <section>
            <RotuloSecao>{t("Navegação")}</RotuloSecao>
            <ul className="space-y-0.5">
              {ROTAS.map(({ to, rotulo, dica, icone: Icone }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => onOpenChange(false)}
                    className="glove-tap flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-tactical-orange"
                    data-test={`menu-rota-${to === "/" ? "mapa" : to.slice(1)}`}
                  >
                    <Icone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block mono text-[13px] leading-tight text-foreground">
                        {t(rotulo)}
                      </span>
                      <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                        {t(dica)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Ferramentas do mapa tático ── */}
          <section>
            <RotuloSecao>{t("Ferramentas do mapa")}</RotuloSecao>
            <div className="space-y-0.5">
              {FERRAMENTAS.map(({ id, rotulo, dica, icone }) => (
                <LinhaItem
                  key={id}
                  icone={icone}
                  rotulo={rotulo}
                  dica={dica}
                  ativo={
                    id === "marcador"
                      ? marcadorAtivo
                      : id === "bussola"
                        ? bussolaAtiva
                        : id === "globo"
                          ? globoAtivo
                          : false
                  }
                  onClick={() => onAcaoMapa(id)}
                  teste={`menu-item-${id}`}
                />
              ))}
            </div>
          </section>

          {/* ── Submenu OSIRIS — inteligência global ── */}
          <section className="rounded-lg border border-tactical-orange/40 bg-tactical-orange/5">
            <button
              type="button"
              onClick={() => setOsirisAberto((v) => !v)}
              aria-expanded={osirisAberto}
              data-test="menu-osiris-botao"
              className="glove-tap flex w-full items-center justify-between px-3 py-3"
            >
              <span className="mono flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-tactical-orange">
                <Radar className="h-4 w-4" /> Osiris
              </span>
              <ChevronDown
                className={`h-4 w-4 text-tactical-orange transition-transform ${
                  osirisAberto ? "" : "-rotate-90"
                }`}
              />
            </button>
            {osirisAberto && (
              <div className="space-y-0.5 px-1.5 pb-2" data-test="menu-osiris-submenu">
                {OSIRIS.map(({ id, rotulo, dica, icone }) => (
                  <LinhaItem
                    key={id}
                    icone={icone}
                    rotulo={rotulo}
                    dica={dica}
                    ativo={id === "visao" && modo === "osiris"}
                    onClick={() => onAcaoOsiris(id)}
                    teste={`menu-item-${id}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="border-t border-border p-3 text-[10px] leading-relaxed text-muted-foreground">
          {t(
            "Fontes ao vivo: USGS · NASA EONET/FIRMS · NOAA SWPC · GDACS · GDELT · WhereTheISS.at · Open-Meteo · adsb.lol · AISStream (opcional)",
          )}
        </p>
      </SheetContent>
    </Sheet>
  );
}
