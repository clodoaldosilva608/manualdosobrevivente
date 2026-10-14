import { describe, expect, it } from "vitest";
import { BRIEFINGS, legendaAtual } from "@/lib/briefings";

describe("briefings — dados", () => {
  it("traz os três perfis da equipe", () => {
    expect(BRIEFINGS.map((b) => b.id)).toEqual([
      "preparador-urbano",
      "sobrevivente-mato",
      "operadora-tatica",
    ]);
  });

  it("cada briefing tem vídeo, poster e falas", () => {
    for (const b of BRIEFINGS) {
      expect(b.url).toMatch(/^\/briefing-[\w-]+\.mp4$/);
      expect(b.poster).toBe(`${b.url.replace(".mp4", "")}-poster.jpg`);
      expect(b.falas.length).toBeGreaterThanOrEqual(1);
      expect(b.duracao).toBeGreaterThan(0);
      expect(b.titulo).toBeTruthy();
      expect(b.descricao).toBeTruthy();
    }
  });

  it("falas ordenadas, dentro da duração e sem sobreposição", () => {
    for (const b of BRIEFINGS) {
      let fimAnterior = 0;
      for (const fala of b.falas) {
        expect(fala.inicio).toBeGreaterThanOrEqual(fimAnterior);
        expect(fala.inicio).toBeGreaterThanOrEqual(0);
        expect(fala.fim).toBeLessThanOrEqual(b.duracao + 0.1);
        expect(fala.fim).toBeGreaterThan(fala.inicio);
        expect(fala.texto.trim().length).toBeGreaterThan(0);
        fimAnterior = fala.fim;
      }
      // A sequência cobre a narração do início ao fim sem buracos longos.
      expect(b.falas[0].inicio).toBeLessThanOrEqual(0.5);
      expect(b.falas[b.falas.length - 1].fim).toBeGreaterThanOrEqual(b.duracao - 0.6);
    }
  });
});

describe("legendaAtual", () => {
  const falas = [
    { inicio: 1, fim: 3, texto: "primeira" },
    { inicio: 3, fim: 5.5, texto: "segunda" },
  ];

  it("antes da primeira fala não há legenda", () => {
    expect(legendaAtual(falas, 0)).toBeNull();
    expect(legendaAtual(falas, 0.99)).toBeNull();
  });

  it("dentro da fala devolve o texto (limite inclusivo)", () => {
    expect(legendaAtual(falas, 1)).toBe("primeira");
    expect(legendaAtual(falas, 2.9)).toBe("primeira");
    expect(legendaAtual(falas, 3)).toBe("segunda");
    expect(legendaAtual(falas, 5.49)).toBe("segunda");
  });

  it("no fim (exclusivo) e depois da última não há legenda", () => {
    expect(legendaAtual(falas, 3 + 2.5)).toBeNull();
    expect(legendaAtual(falas, 5.5)).toBeNull();
    expect(legendaAtual(falas, 9.9)).toBeNull();
  });

  it("lista vazia nunca devolve legenda", () => {
    expect(legendaAtual([], 4)).toBeNull();
  });

  it("as falas reais dos briefings sincronizam com o relógio do vídeo", () => {
    const urbano = BRIEFINGS[0];
    expect(legendaAtual(urbano.falas, 0.4)).toContain("preparador urbano");
    expect(legendaAtual(urbano.falas, 3)).toContain("Planejo");
    expect(legendaAtual(urbano.falas, 6)).toContain("emergência");
    expect(legendaAtual(urbano.falas, 0)).toBeNull();
  });
});
