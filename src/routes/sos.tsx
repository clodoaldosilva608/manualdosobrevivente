import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Siren, Flashlight, Share2, Antenna } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDD, formatDMS, formatMGRS } from "@/lib/coords";
import { formatDecimalDegrees } from "@/lib/format";
import { toast } from "sonner";
import { ShareSheet } from "@/components/ShareSheet";
import { MENSAGENS_PRE_DEFINIDAS, padraoMorse, textoParaMorse, type PassoMorse } from "@/lib/morse";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { title: "S.O.S — TacticalGIS" },
      {
        name: "description",
        content:
          "Sinalização de emergência: estrobo SOS, mensagens em código Morse escritas por você no estrobo e coordenadas em texto grande para ditado por rádio.",
      },
      { property: "og:title", content: "S.O.S — TacticalGIS" },
      {
        property: "og:description",
        content:
          "Sinalização de emergência, Morse no estrobo e coordenadas prontas para compartilhamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SOS,
});

/** Velocidades de transmissão: duração do PONTO em milissegundos. */
const VELOCIDADES = [
  { rotulo: "LENTO", unidade: 300 },
  { rotulo: "NORMAL", unidade: 200 },
  { rotulo: "RÁPIDO", unidade: 120 },
] as const;

function SOS() {
  const [pos, setPos] = useState<{ lng: number; lat: number } | null>(null);
  const [estroboAceso, setEstroboAceso] = useState(false);
  // null = parado; "sos" = padrão S-O-S; "texto" = mensagem escrita.
  const [transmitindo, setTransmitindo] = useState<null | "sos" | "texto">(null);
  const [letraAtual, setLetraAtual] = useState(-1);
  const [mensagem, setMensagem] = useState("SOS");
  const [unidade, setUnidade] = useState<number>(200);
  const [shareOpen, setShareOpen] = useState(false);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lng: p.coords.longitude, lat: p.coords.latitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const aplicarTocha = useCallback((aceso: boolean) => {
    const track = torchTrackRef.current;
    if (!track) return;
    try {
      // @ts-expect-error torch constraint not in lib.dom.d.ts
      track.applyConstraints({ advanced: [{ torch: aceso }] });
    } catch {
      /* ignora falha não crítica */
    }
  }, []);

  const parar = useCallback(() => {
    setTransmitindo(null);
    setEstroboAceso(false);
    setLetraAtual(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (torchTrackRef.current) {
      aplicarTocha(false);
      torchTrackRef.current.stop();
      torchTrackRef.current = null;
    }
  }, [aplicarTocha]);

  /** Liga o estrobo (tocha quando disponível + tela branca) no padrão informado. */
  const transmitir = async (passos: PassoMorse[], tipo: "sos" | "texto") => {
    parar();
    setTransmitindo(tipo);
    let torch = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
      if (caps.torch) {
        torchTrackRef.current = track;
        torch = true;
      } else {
        track.stop();
      }
    } catch {
      /* sem câmera ou sem permissão: o estrobo da tela continua valendo */
    }
    let i = 0;
    const tick = () => {
      const passo = passos[i % passos.length];
      setEstroboAceso(passo.aceso);
      if (tipo === "texto") setLetraAtual(passo.letra);
      if (torch) aplicarTocha(passo.aceso);
      i++;
      timerRef.current = window.setTimeout(tick, passo.ms);
    };
    tick();
  };

  useEffect(() => () => parar(), [parar]);

  const padraoSos = useMemo(() => padraoMorse("SOS", 200), []);
  const morseTexto = useMemo(() => textoParaMorse(mensagem), [mensagem]);

  const transmitirMensagem = () => {
    if (transmitindo === "texto") {
      parar();
      return;
    }
    if (!morseTexto) {
      toast.message("Escreva uma mensagem com letras ou números");
      return;
    }
    void transmitir(padraoMorse(mensagem, unidade), "texto");
  };

  const shareText = pos
    ? `LOCALIZAÇÃO DE EMERGÊNCIA\nDD ${formatDD(pos.lng, pos.lat)}\nDMS ${formatDMS(pos.lng, pos.lat)}\nMGRS ${formatMGRS(pos.lng, pos.lat)}`
    : "LOCALIZAÇÃO DE EMERGÊNCIA\nPosição GPS ainda não obtida.";
  const mapUrl = pos
    ? `https://www.google.com/maps/search/?api=1&query=${formatDecimalDegrees(pos.lat, 6)},${formatDecimalDegrees(pos.lng, 6)}`
    : null;

  const shareLocation = () => {
    if (!pos) toast.message("Sem posição GPS ainda — o aviso será enviado sem coordenadas");
    setShareOpen(true);
  };

  return (
    <div className={`min-h-full transition-colors ${estroboAceso ? "bg-white" : "bg-background"}`}>
      <div className="container mx-auto max-w-2xl p-4 pb-8 md:p-8">
        <h1 className="mono flex min-w-0 items-center gap-3 text-3xl font-bold tracking-widest text-destructive md:text-4xl">
          <Siren className="h-8 w-8 shrink-0" /> S.O.S
        </h1>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          Sinalização de emergência, código Morse e coordenadas prontas para ditado.
        </p>

        <div className="rounded-md border-2 border-destructive bg-card p-6 mb-4">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            POSIÇÃO ATUAL
          </div>
          {pos ? (
            <div className="space-y-3 mono">
              <Big label="DD" value={formatDD(pos.lng, pos.lat)} />
              <Big label="DMS" value={formatDMS(pos.lng, pos.lat)} />
              <Big label="MGRS" value={formatMGRS(pos.lng, pos.lat)} />
            </div>
          ) : (
            <div className="text-muted-foreground">Obtendo GPS…</div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
          <Button
            onClick={() => (transmitindo === "sos" ? parar() : void transmitir(padraoSos, "sos"))}
            data-test="sos-estrobo"
            className={`glove-tap min-h-20 h-auto whitespace-normal text-base font-bold mono sm:text-lg ${
              transmitindo === "sos"
                ? "bg-destructive text-destructive-foreground"
                : "bg-tactical-orange text-background"
            }`}
          >
            <Flashlight className="h-6 w-6 mr-2" />
            {transmitindo === "sos" ? "PARAR SOS" : "INICIAR SOS"}
          </Button>
          <Button
            onClick={shareLocation}
            className="glove-tap min-h-20 h-auto whitespace-normal text-base font-bold mono bg-secondary text-foreground sm:text-lg"
          >
            <Share2 className="h-6 w-6 mr-2" />
            COMPARTILHAR
          </Button>
        </div>

        {/* ---- Mensagem escrita em código Morse no estrobo ---- */}
        <div className="rounded-md border border-border bg-card p-4 md:p-5">
          <div className="mono text-xs uppercase tracking-widest text-tactical-orange flex items-center gap-2 mb-3">
            <Antenna className="h-4 w-4" /> Mensagem em código Morse
          </div>

          <Input
            data-test="morse-entrada"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            maxLength={80}
            placeholder="Escreva a mensagem (ex.: AJUDA, PERDIDO, FERIDO)"
            className="mono uppercase glove-tap"
            aria-label="Mensagem para transmitir em Morse"
          />

          <div className="mt-3">
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Mensagens prontas
            </div>
            <div className="flex flex-wrap gap-1.5" data-test="morse-predefinidas">
              {MENSAGENS_PRE_DEFINIDAS.map((p) => (
                <button
                  key={p.texto}
                  type="button"
                  title={p.descricao}
                  onClick={() => setMensagem(p.texto)}
                  className="glove-tap mono text-[11px] font-bold rounded border px-2 py-1 leading-none border-border text-foreground hover:border-tactical-orange/60"
                >
                  {p.texto}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Velocidade do ponto
            </div>
            <div className="flex gap-1.5" data-test="morse-velocidade">
              {VELOCIDADES.map((v) => (
                <button
                  key={v.rotulo}
                  type="button"
                  onClick={() => setUnidade(v.unidade)}
                  className={`glove-tap mono text-[11px] font-bold rounded border px-2.5 py-1 leading-none ${
                    unidade === v.unidade
                      ? "border-tactical-orange bg-tactical-orange/15 text-tactical-orange"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {v.rotulo}
                </button>
              ))}
            </div>
          </div>

          {morseTexto && (
            <div className="mt-3 rounded bg-background/60 border border-border p-2.5">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Tradução em Morse
              </div>
              <div
                data-test="morse-preview"
                className="mono text-sm text-tactical-orange break-all leading-relaxed"
              >
                {morseTexto}
              </div>
            </div>
          )}

          <div
            data-test="morse-letras"
            className="mt-3 flex flex-wrap gap-1 mono text-base font-bold"
          >
            {mensagem
              .toUpperCase()
              .split("")
              .map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className={`inline-flex h-7 min-w-6 items-center justify-center rounded px-1 ${
                    transmitindo === "texto" && letraAtual === i
                      ? "bg-tactical-orange text-background"
                      : c.trim() === ""
                        ? ""
                        : "text-muted-foreground"
                  }`}
                >
                  {c.trim() === "" ? "\u00A0" : c}
                </span>
              ))}
          </div>

          <Button
            onClick={transmitirMensagem}
            data-test="morse-transmitir"
            className={`glove-tap w-full mt-3 min-h-14 h-auto whitespace-normal text-base font-bold mono ${
              transmitindo === "texto"
                ? "bg-destructive text-destructive-foreground"
                : "bg-tactical-orange text-background"
            }`}
          >
            <Antenna className="h-5 w-5 mr-2" />
            {transmitindo === "texto" ? "PARAR TRANSMISSÃO" : "TRANSMITIR NO ESTROBO"}
          </Button>

          <p className="text-xs text-muted-foreground mt-3 mono">
            {transmitindo === "texto"
              ? "TRANSMITINDO em Morse — a lanterna do celular pisca quando disponível e a tela inteira pisca junto."
              : "Ponto, traço e pausas seguem o padrão internacional. Use a tocha à noite e a tela de dia."}
          </p>
        </div>

        <ShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          title="Localização SOS"
          text={shareText}
          mapUrl={mapUrl}
        />
        <p className="text-xs text-muted-foreground mt-4 mono">
          O botão INICIAR SOS repete S-O-S sem parar. Para qualquer outra mensagem, escreva acima e
          transmita — a plataforma converte para código Morse automaticamente.
        </p>
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl md:text-3xl font-bold text-tactical-orange break-all">{value}</div>
    </div>
  );
}
