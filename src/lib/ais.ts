/**
 * Cliente AIS ao vivo (aisstream.io) — WebSocket do navegador.
 *
 * A chave gratuita do usuário fica só no aparelho (IndexedDB). A conexão é
 * direta do navegador para wss://stream.aisstream.io (a fonte permite CORS/
 * WebSocket de origem arbitrária). Os navios chegam como relatos de posição;
 * acumulamos por MMSI e entregamos lotes a cada 5 s para não sobrecarregar
 * o mapa.
 */
import type { IntelNavio } from "./intel.types";

export type StatusAis = "conectando" | "ativo" | "erro" | "fechado";

export interface OpcoesAis {
  chave: string;
  /** Caixa [[sul, oeste], [norte, leste]] em graus decimais. */
  bbox: [[number, number], [number, number]];
  onNavios: (navios: IntelNavio[]) => void;
  onStatus: (status: StatusAis) => void;
}

interface RelatoAis {
  MessageType?: string;
  MetaData?: {
    MMSI?: number;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    time_utc?: string;
  };
  Message?: {
    PositionReport?: { Sog?: number; Cog?: number; UserId?: number };
  };
}

const MAX_NAVIOS = 2000;

/** Abre a conexão AIS e devolve função de limpeza (fecha o socket). */
export function conectarAis(opcoes: OpcoesAis): () => void {
  let fechado = false;
  let ws: WebSocket | null = null;
  let tentativa = 0;
  let timerReconexao: ReturnType<typeof setTimeout> | null = null;
  const navios = new Map<string, IntelNavio>();
  const onNavios = opcoes.onNavios;

  const liberar = setInterval(() => {
    if (navios.size > 0) onNavios([...navios.values()].slice(0, MAX_NAVIOS));
  }, 5_000);

  const inscrever = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const [[sul, oeste], [norte, leste]] = opcoes.bbox;
    ws.send(
      JSON.stringify({
        APIKey: opcoes.chave,
        BoundingBoxes: [
          [
            [sul, oeste],
            [norte, leste],
          ],
        ],
        FilterMessageTypes: ["PositionReport"],
      }),
    );
  };

  const conectar = () => {
    if (fechado) return;
    opcoes.onStatus("conectando");
    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    } catch {
      opcoes.onStatus("erro");
      return;
    }
    ws.onopen = () => {
      tentativa = 0;
      opcoes.onStatus("ativo");
      inscrever();
    };
    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: RelatoAis;
      try {
        msg = JSON.parse(ev.data) as RelatoAis;
      } catch {
        return;
      }
      if (msg?.MessageType !== "PositionReport" || !msg.MetaData) return;
      const md = msg.MetaData;
      if (typeof md.latitude !== "number" || typeof md.longitude !== "number") return;
      const pr = msg.Message?.PositionReport;
      const mmsi = String(md.MMSI ?? pr?.UserId ?? "");
      if (!mmsi) return;
      navios.set(mmsi, {
        mmsi,
        nome: (md.ShipName ?? "").trim(),
        lng: md.longitude,
        lat: md.latitude,
        velocidade: typeof pr?.Sog === "number" ? pr.Sog : null,
        rumo: typeof pr?.Cog === "number" && pr.Cog < 360 ? pr.Cog : null,
        hora: md.time_utc ? new Date(md.time_utc).getTime() : Date.now(),
      });
    };
    ws.onclose = () => {
      if (fechado) return;
      tentativa++;
      opcoes.onStatus(tentativa > 5 ? "erro" : "conectando");
      timerReconexao = setTimeout(conectar, Math.min(30_000, 2_000 * tentativa));
    };
    ws.onerror = () => {
      ws?.close();
    };
  };

  conectar();

  return () => {
    fechado = true;
    clearInterval(liberar);
    if (timerReconexao) clearTimeout(timerReconexao);
    try {
      ws?.close();
    } catch {
      /* já fechado */
    }
    opcoes.onStatus("fechado");
  };
}
