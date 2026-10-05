import { describe, expect, it } from "vitest";
import { nivelUniversal, suavizarGravidade, TOLERANCIA_NIVEL } from "@/lib/nivel";

const G = 9.81;

describe("nível universal (qualquer posição)", () => {
  it("deitado com a tela para cima: nivelado, bolha no centro", () => {
    const n = nivelUniversal(0, 0, G);
    expect(n).not.toBeNull();
    expect(n!.total).toBeCloseTo(0, 5);
    expect(n!.nivelado).toBe(true);
    expect(n!.telaParaCima).toBe(true);
    expect(n!.postura).toBe("deitado");
    expect(n!.bolhaX).toBeCloseTo(0, 5);
    expect(n!.bolhaY).toBeCloseTo(0, 5);
  });

  it("deitado com a tela para BAIXO também é nivelado (universal)", () => {
    const n = nivelUniversal(0, 0, -G);
    expect(n).not.toBeNull();
    expect(n!.total).toBeCloseTo(0, 5);
    expect(n!.nivelado).toBe(true);
    expect(n!.telaParaCima).toBe(false);
    expect(n!.postura).toBe("deitado");
  });

  it("leitura inválida (sem vetor) devolve null", () => {
    expect(nivelUniversal(0, 0, 0)).toBeNull();
    expect(nivelUniversal(0.1, 0.1, 0.1)).toBeNull();
  });

  it("lado direito baixo 30°: angX positivo e bolha para a direita", () => {
    const n = nivelUniversal(
      -Math.sin((30 * Math.PI) / 180) * G,
      0,
      Math.cos((30 * Math.PI) / 180) * G,
    );
    expect(n!.angX).toBeCloseTo(30, 1);
    expect(n!.angY).toBeCloseTo(0, 5);
    expect(n!.total).toBeCloseTo(30, 1);
    expect(n!.bolhaX).toBeCloseTo(1, 5); // 30° enche a escala (±30°)
    expect(n!.bolhaY).toBeCloseTo(0, 5);
    expect(n!.nivelado).toBe(false);
    expect(n!.postura).toBe("inclinado");
  });

  it("posição de leitura (topo erguido 60°): borda de baixo baixa, bolha para baixo", () => {
    const n = nivelUniversal(
      0,
      Math.sin((60 * Math.PI) / 180) * G,
      Math.cos((60 * Math.PI) / 180) * G,
    );
    expect(n!.angY).toBeCloseTo(60, 1);
    expect(n!.total).toBeCloseTo(60, 1);
    expect(n!.bolhaY).toBeCloseTo(1, 5);
    expect(n!.bolhaX).toBeCloseTo(0, 5);
  });

  it("em pé (retrato, topo para cima): 90°, postura de-pe", () => {
    const n = nivelUniversal(0, G, 0);
    expect(n!.total).toBeCloseTo(90, 5);
    expect(n!.postura).toBe("de-pe");
  });

  it("em pé na PAISAGEM (a=90): a rotação de tela é compensada", () => {
    // Aparelho de pé com o lado direito (+x) para cima, interface em paisagem.
    const n = nivelUniversal(G, 0, 0, 90);
    expect(n!.total).toBeCloseTo(90, 5);
    expect(n!.postura).toBe("de-pe");
    // Na tela, a gravidade aponta para o topo dela (a borda de baixo é a baixa).
    expect(n!.angY).toBeCloseTo(90, 1);
    expect(n!.angX).toBeCloseTo(0, 1);
  });

  it("deitado nivelado na paisagem (a=90) continua nivelado", () => {
    const n = nivelUniversal(0, 0, G, 90);
    expect(n!.total).toBeCloseTo(0, 5);
    expect(n!.nivelado).toBe(true);
  });

  it("de lado (45°): postura de-lado e tolerância respeitada", () => {
    const n = nivelUniversal(
      -Math.sin((45 * Math.PI) / 180) * G,
      0,
      Math.cos((45 * Math.PI) / 180) * G,
    );
    expect(n!.total).toBeCloseTo(45, 1);
    expect(n!.postura).toBe("de-lado");
    // Com tolerância frouxa (60°), 45° vira "nivelado" — o parâmetro manda.
    const frouxo = nivelUniversal(
      -Math.sin((45 * Math.PI) / 180) * G,
      0,
      Math.cos((45 * Math.PI) / 180) * G,
      0,
      60,
    );
    expect(frouxo!.nivelado).toBe(true);
    expect(TOLERANCIA_NIVEL).toBe(2.5);
  });
});

describe("suavização do vetor gravidade", () => {
  it("primeira leitura aplica direto", () => {
    const s = suavizarGravidade(null, 1, 2, 3);
    expect(s).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("caminha uma fração até o alvo (passa-baixa)", () => {
    const s = suavizarGravidade({ x: 0, y: 0, z: 10 }, 2, 4, 10, 0.25);
    expect(s.x).toBeCloseTo(0.5, 5);
    expect(s.y).toBeCloseTo(1, 5);
    expect(s.z).toBeCloseTo(10, 5);
  });

  it("salto brusco (aparelho virado) aplica direto, sem inércia", () => {
    const s = suavizarGravidade({ x: 0, y: 0, z: 9.8 }, 0, 9.8, 0, 0.25);
    expect(s).toEqual({ x: 0, y: 9.8, z: 0 });
  });
});
