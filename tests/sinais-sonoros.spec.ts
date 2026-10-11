import { describe, expect, it } from "vitest";
import { ORDEM_SINAIS, passosSinal, SINAIS, type PassoMorseLike } from "@/lib/sinais-sonoros";

const morseSos: PassoMorseLike[] = [
  { aceso: true, ms: 200 },
  { aceso: false, ms: 200 },
];

describe("Sinais sonoros de emergência", () => {
  it("tem os cinco sinais na ordem da aba", () => {
    expect(ORDEM_SINAIS).toEqual(["apito", "sirene", "alarme", "buzina", "sos"]);
  });

  it("o apito é o sinal internacional: 3 toques com pausas", () => {
    const passos = passosSinal("apito");
    const toques = passos.filter((p) => p.aceso);
    expect(toques).toHaveLength(3);
    expect(toques.every((p) => p.freq === 2100)).toBe(true);
    expect(toques.every((p) => p.ms === 1000)).toBe(true);
  });

  it("a sirene varre a frequência (wail)", () => {
    const passos = passosSinal("sirene");
    expect(passos.some((p) => p.freqFim != null)).toBe(true);
    expect(passos[0].freq).toBe(400);
    expect(passos[0].freqFim).toBe(1300);
  });

  it("a buzina toca 3 rajadas graves", () => {
    const passos = passosSinal("buzina");
    const rajadas = passos.filter((p) => p.aceso);
    expect(rajadas).toHaveLength(3);
    expect(rajadas[0].freq).toBeLessThan(600);
  });

  it("o SOS sonoro herda o padrão Morse e põe tom de 600 Hz", () => {
    const passos = passosSinal("sos", morseSos);
    expect(passos.length).toBeGreaterThan(morseSos.length);
    const primeiroTom = passos.find((p) => p.aceso)!;
    expect(primeiroTom.freq).toBe(600);
  });

  it("todo sinal tem nome e descrição para a interface", () => {
    for (const id of ORDEM_SINAIS) {
      expect(SINAIS[id].nome.length).toBeGreaterThan(3);
      expect(SINAIS[id].descricao.length).toBeGreaterThan(20);
    }
  });
});
