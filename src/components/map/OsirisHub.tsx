/**
 * Hub OSIRIS — menu central de inteligência do modo Osiris.
 *
 * Reúne em um só lugar: atalhos das camadas e do Boletim, astronomia tática
 * do centro do mapa (sol, lua, crepúsculos e estrela de orientação), ISS em
 * tempo real e as ferramentas de investigação OSINT (IP e domínio via RDAP).
 * Todos os textos em pt-BR, dados calculados localmente ou via server
 * functions (nada de chaves expostas no navegador).
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Globe,
  KeyRound,
  Layers,
  Moon,
  Newspaper,
  Radar,
  RefreshCw,
  Satellite,
  Search,
  Sun,
} from "lucide-react";
import * as SunCalc from "suncalc";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCelestial } from "@/lib/celestial";
import { distanceMeters } from "@/lib/geo";
import { CONFLITOS } from "@/lib/intel-conflicts";
import {
  investigarDominio,
  investigarIp,
  type DominioInfo,
  type IpInfo,
} from "@/lib/osint.functions";
import type { IntelIss, IntelSnapshot, IntelVisibilidade, IntelVoo } from "@/lib/intel.types";
import {
  formatDateTime,
  formatDegrees,
  formatDistance,
  formatInteger,
  formatNumber,
  formatTime,
} from "@/lib/format";

interface OsirisHubProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  snapshot: IntelSnapshot | null;
  iss: IntelIss | null;
  voos: IntelVoo[];
  intelVis: IntelVisibilidade;
  center: [number, number];
  /** Seção do acordeão aberta automaticamente (ferramentas da plataforma). */
  secaoInicial?: string;
  onAbrirCamadas: () => void;
  onAbrirBoletim: () => void;
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  onAtualizar: () => void;
}

const valid = (d: Date | undefined | null): Date | null =>
  d && !Number.isNaN(d.getTime()) ? d : null;

/** Linha rotulada compacta reutilizada em todas as seções. */
function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1 last:border-0">
      <span className="mono shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </span>
      <span className="mono text-right text-[11px]">{valor}</span>
    </div>
  );
}

function ChipResumo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="hud-panel rounded px-2 py-1 text-center">
      <div className="mono text-[9px] uppercase tracking-wider text-muted-foreground">{rotulo}</div>
      <div className="mono text-sm font-bold text-tactical-orange">{valor}</div>
    </div>
  );
}

/** Tabela completa de fenômenos do dia no centro do mapa. */
function AstronomiaTatica({ center }: { center: [number, number] }) {
  const [lng, lat] = center;
  const hoje = new Date();
  const c = getCelestial(lat, lng, hoje);
  const t = SunCalc.getTimes(hoje, lat, lng);
  const luaT = SunCalc.getMoonTimes(hoje, lat, lng);
  const hm = (d: Date | undefined | null) => {
    const v = valid(d);
    return v ? formatTime(v.getTime()) : "—";
  };
  const az = (d: Date | undefined | null) => {
    const v = valid(d);
    if (!v) return "";
    const rad = SunCalc.getPosition(v, lat, lng).azimuth;
    const graus = ((rad * 180) / Math.PI + 360) % 360;
    return ` · azimute ${formatDegrees(graus)}`;
  };

  return (
    <div className="space-y-2">
      <div className="mono text-[10px] text-muted-foreground">
        Posição do centro do mapa · {c.hemisphereLabel} · sol{" "}
        {c.isDay ? "acima do horizonte" : "abaixo do horizonte"}
      </div>
      <div className="rounded border border-border/70 px-3 py-2">
        <div className="mono mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-tactical-orange">
          <Sun className="h-3.5 w-3.5" /> Sol
        </div>
        <Linha rotulo="Nascer do sol" valor={`${hm(t.sunrise)}${az(t.sunrise)}`} />
        <Linha rotulo="Pôr do sol" valor={`${hm(t.sunset)}${az(t.sunset)}`} />
        <Linha rotulo="Meio-dia solar" valor={hm(t.solarNoon)} />
        <Linha rotulo="Hora dourada (manhã)" valor={hm(t.goldenHourEnd)} />
        <Linha rotulo="Hora dourada (tarde)" valor={hm(t.goldenHour)} />
        <Linha rotulo="Crepúsculo civil" valor={`${hm(t.dawn)} — ${hm(t.dusk)}`} />
        <Linha
          rotulo="Crepúsculo náutico"
          valor={`${hm(t.nauticalDawn)} — ${hm(t.nauticalDusk)}`}
        />
        <Linha rotulo="Noite astronômica" valor={`${hm(t.night)} — ${hm(t.nightEnd)}`} />
        <Linha rotulo="Altitude do sol agora" valor={formatDegrees(c.sunAltitude, 1)} />
      </div>
      <div className="rounded border border-border/70 px-3 py-2">
        <div className="mono mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-tactical-orange">
          <Moon className="h-3.5 w-3.5" /> Lua
        </div>
        <Linha
          rotulo="Fase"
          valor={`${c.moonPhaseLabel} · ${formatNumber(c.moonIllumination, 0)}% iluminada`}
        />
        <Linha rotulo="Nascer da lua" valor={hm(luaT.rise)} />
        <Linha rotulo="Pôr da lua" valor={hm(luaT.set)} />
        <Linha rotulo="No céu agora" valor={c.moonUp ? "sim" : "não"} />
      </div>
      <div className="rounded border border-border/70 px-3 py-2 text-[11px]">
        <span className="mono text-[10px] font-bold uppercase text-tactical-orange">
          Orientação noturna ·{" "}
        </span>
        {c.starHint}
      </div>
      <p className="mono text-[10px] leading-relaxed text-muted-foreground">
        Crepúsculos marcam janelas de movimento discreto: civil ainda há luz útil, náutico as
        estrelas de navegação aparecem, astronômico é escuridão total.
      </p>
    </div>
  );
}

function IssPainel({
  iss,
  onFlyTo,
}: {
  iss: IntelIss | null;
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
}) {
  if (!iss) {
    return (
      <p className="mono text-[11px] text-muted-foreground">
        Aguardando a coleta da posição da ISS (WhereTheISS.at) — toque em Atualizar.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border/70 px-3 py-2">
        <Linha
          rotulo="Coordenadas"
          valor={`${formatNumber(iss.lat, 3)}, ${formatNumber(iss.lng, 3)}`}
        />
        <Linha rotulo="Altitude" valor={`${formatInteger(iss.altitudeKm)} km`} />
        <Linha rotulo="Velocidade" valor={`${formatInteger(iss.velocidadeKmh)} km/h`} />
        <Linha
          rotulo="Iluminação"
          valor={iss.visibilidade === "daylight" ? "iluminada (dia)" : "sombra da Terra"}
        />
        <Linha
          rotulo="Pegada de visibilidade"
          valor={`raio de ${formatInteger(iss.pegadaKm)} km`}
        />
      </div>
      <p className="mono text-[10px] leading-relaxed text-muted-foreground">
        A ISS dá uma volta na Terra a cada ~92 minutos. Dentro da pegada, quem olhar para o céu no
        horizonte oposto ao sol em pleno crepúsculo pode vê-la cruzar o céu como um ponto brilhante.
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="glove-tap mono text-[11px]"
        onClick={() => {
          onFlyTo(iss.lng, iss.lat, 4);
        }}
      >
        <Satellite className="mr-1 h-3.5 w-3.5" /> Ver no mapa
      </Button>
    </div>
  );
}

function InvestigarIp({
  center,
  onFlyTo,
}: {
  center: [number, number];
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
}) {
  const callIp = useServerFn(investigarIp);
  const [valor, setValor] = useState("");
  const [res, setRes] = useState<IpInfo | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const consultar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const r = await callIp({ data: { ip: valor.trim() } });
      setRes(r);
    } catch (e) {
      setRes(null);
      setErro(e instanceof Error ? e.message : "Falha na consulta");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="mono text-[10px] leading-relaxed text-muted-foreground">
        Geolocalização e operadora de qualquer endereço IP (fonte pública ipwho.is). Deixe vazio
        para investigar o IP de origem desta conexão.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!carregando) void consultar();
        }}
      >
        <Input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="ex.: 8.8.8.8"
          className="mono h-9 text-[12px]"
          inputMode="text"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={carregando}
          className="glove-tap mono shrink-0 text-[11px]"
        >
          <Search className="mr-1 h-3.5 w-3.5" /> {carregando ? "…" : "Consultar"}
        </Button>
      </form>
      {erro && <p className="mono text-[11px] text-red-400">{erro}</p>}
      {res && (
        <div className="space-y-2">
          <div className="rounded border border-border/70 px-3 py-2">
            <Linha rotulo="Endereço" valor={res.ip + (res.origem ? " (origem)" : "")} />
            <Linha rotulo="País" valor={`${res.pais} ${res.paisCodigo}`} />
            <Linha rotulo="Região/Cidade" valor={`${res.regiao} · ${res.cidade}`} />
            {res.latitude !== null && res.longitude !== null && (
              <Linha
                rotulo="Coordenadas"
                valor={
                  <button
                    type="button"
                    className="underline decoration-dotted"
                    onClick={() => onFlyTo(res.longitude!, res.latitude!, 9)}
                  >
                    {formatNumber(res.latitude, 4)}, {formatNumber(res.longitude, 4)}
                  </button>
                }
              />
            )}
            {res.latitude !== null && res.longitude !== null && (
              <Linha
                rotulo="Do centro do mapa"
                valor={formatDistance(
                  distanceMeters([center[0], center[1]], [res.longitude, res.latitude]),
                )}
              />
            )}
            <Linha rotulo="Fuso" valor={res.fuso} />
            <Linha rotulo="Provedor" valor={res.isp} />
            <Linha rotulo="Organização" valor={res.org} />
            <Linha rotulo="ASN" valor={res.asn} />
            {res.dominio && <Linha rotulo="Domínio" valor={res.dominio} />}
          </div>
          {res.latitude !== null && res.longitude !== null && (
            <Button
              variant="secondary"
              size="sm"
              className="glove-tap mono text-[11px]"
              onClick={() => onFlyTo(res.longitude!, res.latitude!, 9)}
            >
              <Globe className="mr-1 h-3.5 w-3.5" /> Localizar no mapa
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function InvestigarDominio() {
  const callDom = useServerFn(investigarDominio);
  const [valor, setValor] = useState("");
  const [res, setRes] = useState<DominioInfo | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const consultar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const r = await callDom({ data: { dominio: valor.trim() } });
      setRes(r);
    } catch (e) {
      setRes(null);
      setErro(e instanceof Error ? e.message : "Falha na consulta");
    } finally {
      setCarregando(false);
    }
  };

  const dt = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : formatDateTime(d.getTime());
  };

  return (
    <div className="space-y-2">
      <p className="mono text-[10px] leading-relaxed text-muted-foreground">
        Registro público de domínios via RDAP (sucessor do WHOIS): registrador, datas de criação e
        expiração e servidores de nomes. Útil para checar fontes suspeitas de notícias e pedidos de
        "resgate".
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!carregando) void consultar();
        }}
      >
        <Input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="ex.: exemplo.com"
          className="mono h-9 text-[12px]"
          inputMode="text"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={carregando}
          className="glove-tap mono shrink-0 text-[11px]"
        >
          <Search className="mr-1 h-3.5 w-3.5" /> {carregando ? "…" : "Consultar"}
        </Button>
      </form>
      {erro && <p className="mono text-[11px] text-red-400">{erro}</p>}
      {res && (
        <div className="rounded border border-border/70 px-3 py-2">
          <Linha rotulo="Domínio" valor={res.dominio} />
          <Linha rotulo="Registrador" valor={res.registrador} />
          <Linha rotulo="Criado em" valor={dt(res.criadoEm)} />
          <Linha rotulo="Atualizado em" valor={dt(res.atualizadoEm)} />
          <Linha rotulo="Expira em" valor={dt(res.expiraEm)} />
          <Linha
            rotulo="Servidores DNS"
            valor={res.nameservers.length ? res.nameservers.join(", ") : "—"}
          />
          {res.status.length > 0 && <Linha rotulo="Status" valor={res.status.join(", ")} />}
        </div>
      )}
    </div>
  );
}

export function OsirisHub({
  open,
  onOpenChange,
  snapshot,
  iss,
  voos,
  intelVis,
  center,
  secaoInicial,
  onAbrirCamadas,
  onAbrirBoletim,
  onFlyTo,
  onAtualizar,
}: OsirisHubProps) {
  const voosMilitares = voos.filter((v) => v.militar).length;
  const camadasAtivas = Object.values(intelVis).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent side="bottom" className="bg-card border-border" data-test="hub-osiris">
        <SheetHeader>
          <SheetTitle className="mono flex items-center gap-2 text-tactical-orange">
            <Radar className="h-4 w-4" /> OSIRIS — CENTRO DE INTELIGÊNCIA
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="mono text-[10px] text-muted-foreground">
            {snapshot
              ? `Coletado às ${formatTime(snapshot.atualizadoEm)} · fontes oficiais`
              : "Aguardando primeira coleta…"}
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="glove-tap mono text-[11px]"
            onClick={onAtualizar}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <ChipResumo
            rotulo="Sismos"
            valor={snapshot ? formatInteger(snapshot.sismos.length) : "—"}
          />
          <ChipResumo
            rotulo="Eventos"
            valor={snapshot ? formatInteger(snapshot.eventos.length) : "—"}
          />
          <ChipResumo rotulo="Conflitos" valor={formatInteger(CONFLITOS.length)} />
          <ChipResumo
            rotulo="Voos"
            valor={
              voos.length
                ? `${formatInteger(voos.length)} (${formatInteger(voosMilitares)} mil)`
                : "—"
            }
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            data-test="hub-atalho-camadas"
            className="hud-panel flex items-center gap-2 rounded px-3 py-2.5 text-left"
            onClick={onAbrirCamadas}
          >
            <Layers className="h-4 w-4 shrink-0 text-tactical-orange" />
            <span className="mono text-[11px] font-bold uppercase">Camadas</span>
            <span className="mono ml-auto text-[10px] text-muted-foreground">
              {formatInteger(camadasAtivas)}/11
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            data-test="hub-atalho-boletim"
            className="hud-panel flex items-center gap-2 rounded px-3 py-2.5 text-left"
            onClick={onAbrirBoletim}
          >
            <Newspaper className="h-4 w-4 shrink-0 text-tactical-orange" />
            <span className="mono text-[11px] font-bold uppercase">Boletim completo</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <Accordion
          key={secaoInicial ?? "padrao"}
          type="single"
          collapsible
          defaultValue={secaoInicial}
          className="mt-3"
        >
          <AccordionItem value="astro">
            <AccordionTrigger className="mono text-[12px] uppercase">
              <span className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-tactical-orange" /> Astronomia tática
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <AstronomiaTatica center={center} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="iss">
            <AccordionTrigger className="mono text-[12px] uppercase">
              <span className="flex items-center gap-2">
                <Satellite className="h-3.5 w-3.5 text-tactical-orange" /> ISS em tempo real
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <IssPainel iss={iss} onFlyTo={onFlyTo} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ip">
            <AccordionTrigger className="mono text-[12px] uppercase">
              <span className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-tactical-orange" /> Investigar IP
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <InvestigarIp center={center} onFlyTo={onFlyTo} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dominio">
            <AccordionTrigger className="mono text-[12px] uppercase">
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-tactical-orange" /> Investigar domínio (RDAP)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <InvestigarDominio />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="chaves">
            <AccordionTrigger className="mono text-[12px] uppercase">
              <span className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-tactical-orange" /> Chaves de inteligência
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <p className="mono text-[11px] leading-relaxed text-muted-foreground">
                Duas camadas usam chaves gratuitas salvas somente no aparelho: focos de calor (NASA
                FIRMS) e navios ao vivo (AISStream.io). Cadastre-se nos sites oficiais e cole as
                chaves em Ajustes.
              </p>
              <Link
                to="/settings"
                className="mono inline-flex items-center gap-1 text-[11px] font-bold uppercase text-tactical-orange underline decoration-dotted"
              >
                Abrir Ajustes <ArrowRight className="h-3 w-3" />
              </Link>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <p className="mono mt-3 text-[9px] leading-relaxed text-muted-foreground">
          Fontes: USGS · NASA EONET/FIRMS · NOAA SWPC · GDACS · GDELT · ADS-B.lol · WhereTheISS.at ·
          Open-Meteo · ipwho.is · rdap.org — consolidadas pelo servidor do aplicativo, com cache e
          fallback.
        </p>
      </SheetContent>
    </Sheet>
  );
}
