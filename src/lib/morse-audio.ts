/**
 * Som do código Morse — tom de áudio contínuo que acompanha o estrobo.
 *
 * Mesma disciplina do pulso luminoso: quando a luz acende, o tom soa;
 * quando apaga, silencia. O tom (600 Hz, padrão de rádio de campo) é
 * gerado com Web Audio API — começa sempre num gesto do usuário (o toque
 * em transmitir), como exige o navegador.
 */

const FREQUENCIA_HZ = 600;
const VOLUME = 0.2;

export class MorseSom {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private ganho: GainNode | null = null;

  /** Liga o tom (idempotente). Chame num gesto do usuário. */
  iniciar() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Construtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Construtor) return;
      const ctx = new Construtor();
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = FREQUENCIA_HZ;
      ganho.gain.value = 0;
      osc.connect(ganho).connect(ctx.destination);
      osc.start();
      this.ctx = ctx;
      this.osc = osc;
      this.ganho = ganho;
    } catch {
      /* sem áudio disponível — o estrobo da luz continua valendo */
    }
  }

  /** Ajusta o tom ao estado do pulso atual (aceso = soa, apagado = cala). */
  definir(aceso: boolean) {
    if (!this.ctx || !this.ganho) return;
    try {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      const agora = this.ctx.currentTime;
      // Rampinha de 6 ms evita o estalo liga/desliga.
      this.ganho.gain.cancelScheduledValues(agora);
      this.ganho.gain.setTargetAtTime(aceso ? VOLUME : 0, agora, 0.006);
    } catch {
      /* ignora */
    }
  }

  /** Encerra o tom e libera os recursos. */
  parar() {
    try {
      if (this.ganho && this.ctx) {
        const agora = this.ctx.currentTime;
        this.ganho.gain.cancelScheduledValues(agora);
        this.ganho.gain.setTargetAtTime(0, agora, 0.006);
      }
      const osc = this.osc;
      const ctx = this.ctx;
      if (osc && ctx) {
        window.setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
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
      this.ganho = null;
      this.ctx = null;
    }
  }
}
