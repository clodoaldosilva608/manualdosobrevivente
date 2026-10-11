/**
 * Sinais sonoros de emergência — apito, sirene, alarme, buzina e SOS
 * cantado em Morse, gerados com Web Audio API (nenhum arquivo de áudio).
 *
 * O apito segue o sinal internacional de socorro reconhecido em terra:
 * TRÊS TOQUES seguidos, repetidos de minuto a minuto. A sirene e o alarme
 * reproduzem as varreduras de wail/yelp das sirenes civis — o som que
 * reconhecemos como "algo sério está acontecendo". A buzina imita o
 * claxon veicular para sinalizar em trilha ou acampamento.
 *
 * Todos os padrões são funções PURAS (passosSinal) — testáveis sem áudio —
 * e o motor (SinalSonoro) só agenda o que a função devolve.
 */

export type SinalId = "apito" | "sirene" | "alarme" | "buzina" | "sos";

export interface PassoSinal {
  /** Tom ligado neste passo. */
  aceso: boolean;
  /** Frequência inicial (Hz) quando aceso. */
  freq: number;
  /** Frequência final — presença indica varredura (sirene/alarme). */
  freqFim?: number;
  /** Duração do passo em ms. */
  ms: number;
}

export const SINAIS: Record<SinalId, { nome: string; descricao: string; onda: OscillatorType }> = {
  apito: {
    nome: "Apito de socorro",
    descricao:
      "Sinal internacional: 3 toques longos, pausa e repetição — quem ouve sabe que é socorro.",
    onda: "sine",
  },
  sirene: {
    nome: "Sirene de emergência",
    descricao:
      "Varredura lenta (wail) das sirenes civis — alerta a área inteira de que algo sério acontece.",
    onda: "sine",
  },
  alarme: {
    nome: "Alarme rápido",
    descricao: "Varredura curta e aguda (yelp) — chama atenção imediata a curta distância.",
    onda: "triangle",
  },
  buzina: {
    nome: "Buzina de campo",
    descricao:
      "Claxon veicular grave em rajadas — atravessa mata fechada e vento melhor que o apito.",
    onda: "sawtooth",
  },
  sos: {
    nome: "SOS sonoro (Morse)",
    descricao: "··· — — — ··· em tom de 600 Hz — padrão de rádio reconhecido no mundo inteiro.",
    onda: "sine",
  },
};

/** Ordem de exibição na aba S.O.S. */
export const ORDEM_SINAIS: SinalId[] = ["apito", "sirene", "alarme", "buzina", "sos"];

/**
 * Passos de cada sinal (loop infinito enquanto o operador não parar).
 * Apito: 3 toques de 1 s (2100 Hz, com vibrato no motor) e pausa de 3 s.
 */
/** Formato mínimo dos passos Morse reusados (compatível com PassoMorse). */
export interface PassoMorseLike {
  aceso: boolean;
  ms: number;
}

export function passosSinal(id: SinalId, morseSos?: PassoMorseLike[]): PassoSinal[] {
  switch (id) {
    case "apito":
      return [
        { aceso: true, freq: 2100, ms: 1000 },
        { aceso: false, freq: 0, ms: 1000 },
        { aceso: true, freq: 2100, ms: 1000 },
        { aceso: false, freq: 0, ms: 1000 },
        { aceso: true, freq: 2100, ms: 1000 },
        { aceso: false, freq: 0, ms: 3000 },
      ];
    case "sirene":
      return [
        { aceso: true, freq: 400, freqFim: 1300, ms: 3000 },
        { aceso: true, freq: 1300, freqFim: 400, ms: 1500 },
      ];
    case "alarme":
      return [
        { aceso: true, freq: 600, freqFim: 1200, ms: 350 },
        { aceso: true, freq: 1200, freqFim: 600, ms: 350 },
      ];
    case "buzina":
      return [
        { aceso: true, freq: 370, ms: 1200 },
        { aceso: false, freq: 0, ms: 400 },
        { aceso: true, freq: 370, ms: 1200 },
        { aceso: false, freq: 0, ms: 400 },
        { aceso: true, freq: 370, ms: 1200 },
        { aceso: false, freq: 0, ms: 1800 },
      ];
    case "sos":
      // Morse S-O-S (unidade 200 ms) + pausa de palavra — injetado de fora
      // para reusar exatamente o mesmo padrão da transmissão luminosa.
      return [
        ...(morseSos ?? []).map((p) => ({ ...p, freq: p.aceso ? 600 : 0 })),
        { aceso: false, freq: 0, ms: 1500 },
      ];
  }
}

const VOLUME = 0.28;

/**
 * Motor de um sinal sonoro: agenda os passos em loop até parar.
 * Nasce sempre num gesto do usuário (toque no botão), como exige o navegador.
 * O apito ganha vibrato (modulação de 6 Hz) — é o que o distingue de um tom
 * "eletrônico" e imita um apito real soprado.
 */
export class SinalSonoro {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private vibrato: OscillatorNode | null = null;
  private ganho: GainNode | null = null;
  private timer: number | null = null;
  private id: SinalId | null = null;
  private passos: PassoSinal[] = [];
  private indice = 0;

  get tocando(): SinalId | null {
    return this.id;
  }

  /** Começa a tocar o sinal em loop (idempotente por sinal). */
  tocar(id: SinalId, morseSos?: PassoMorseLike[]): void {
    this.parar();
    try {
      const Construtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Construtor) return;
      const ctx = new Construtor();
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = SINAIS[id].onda;
      osc.frequency.value = 0;
      ganho.gain.value = 0;
      osc.connect(ganho).connect(ctx.destination);
      osc.start();
      let vibrato: OscillatorNode | null = null;
      if (id === "apito") {
        vibrato = ctx.createOscillator();
        const profundidade = ctx.createGain();
        vibrato.frequency.value = 6;
        profundidade.gain.value = 90;
        vibrato.connect(profundidade).connect(osc.frequency);
        vibrato.start();
      }
      this.ctx = ctx;
      this.osc = osc;
      this.ganho = ganho;
      this.vibrato = vibrato;
      this.id = id;
      this.passos = passosSinal(id, morseSos);
      this.indice = 0;
      if (ctx.state === "suspended") void ctx.resume();
      this.agendar();
    } catch {
      /* sem áudio disponível */
    }
  }

  private agendar(): void {
    if (!this.ctx || !this.osc || !this.ganho || !this.id) return;
    const passo = this.passos[this.indice % this.passos.length];
    this.indice++;
    const agora = this.ctx.currentTime;
    try {
      this.ganho.gain.cancelScheduledValues(agora);
      this.osc.frequency.cancelScheduledValues(agora);
      if (passo.aceso) {
        this.ganho.gain.setTargetAtTime(VOLUME, agora, 0.008);
        this.osc.frequency.setValueAtTime(passo.freq, agora);
        if (passo.freqFim != null) {
          this.osc.frequency.linearRampToValueAtTime(passo.freqFim, agora + passo.ms / 1000);
        }
      } else {
        this.ganho.gain.setTargetAtTime(0, agora, 0.008);
      }
    } catch {
      /* segue */
    }
    this.timer = window.setTimeout(() => this.agendar(), passo.ms);
  }

  /** Encerra o sinal e libera os recursos. */
  parar(): void {
    if (this.timer != null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      if (this.ganho && this.ctx) {
        const agora = this.ctx.currentTime;
        this.ganho.gain.cancelScheduledValues(agora);
        this.ganho.gain.setTargetAtTime(0, agora, 0.008);
      }
      const osc = this.osc;
      const vibrato = this.vibrato;
      const ctx = this.ctx;
      if (osc && ctx) {
        window.setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
            vibrato?.stop();
            vibrato?.disconnect();
            void ctx.close();
          } catch {
            /* já encerrado */
          }
        }, 120);
      }
    } catch {
      /* ignora */
    } finally {
      this.osc = null;
      this.vibrato = null;
      this.ganho = null;
      this.ctx = null;
      this.id = null;
      this.passos = [];
      this.indice = 0;
    }
  }
}
