import { describe, expect, it } from "vitest";
import {
  diferencaAngulo,
  norm360,
  rumoMagneticoDeEixos,
  rumoVerdadeiroBruto,
  suavizarRumo,
} from "@/lib/bussola-calculo";

describe("bússola — cálculo do rumo", () => {
  it("normaliza ângulos para [0, 360)", () => {
    expect(norm360(-90)).toBe(270);
    expect(norm360(450)).toBe(90);
    expect(norm360(359.9)).toBeCloseTo(359.9);
  });

  it("diferença assinada escolhe o caminho curto", () => {
    expect(diferencaAngulo(350, 10)).toBe(20);
    expect(diferencaAngulo(10, 350)).toBe(-20);
    expect(diferencaAngulo(0, 179)).toBe(179);
    expect(diferencaAngulo(0, 181)).toBe(-179);
  });

  it("aparelho deitado, topo ao norte (alpha 0) → rumo magnético 0", () => {
    expect(rumoMagneticoDeEixos({ alpha: 0, beta: 0, gamma: 0 })).toBe(0);
  });

  it("aparelho deitado, topo ao oeste (alpha 90) → rumo magnético 270", () => {
    expect(rumoMagneticoDeEixos({ alpha: 90, beta: 0, gamma: 0 })).toBe(270);
  });

  it("aparelho em pé (beta 90) segue o rumo correto — compensação de inclinação", () => {
    // Em pé com a tela virada para o usuário e topo ao norte: alpha 0.
    expect(rumoMagneticoDeEixos({ alpha: 0, beta: 90, gamma: 0 })).toBe(0);
    // Usuário virou para o leste: alpha 270 → rumo 90. A fórmula ingênua
    // 360−alpha também acertaria; a matriz generaliza para inclinações
    // intermediárias, que o caso seguinte cobre.
    expect(rumoMagneticoDeEixos({ alpha: 270, beta: 90, gamma: 0 })).toBe(90);
  });

  it("inclinação intermediária (beta 45) mantém o rumo — ingênua erraria", () => {
    // 45° levantado, topo ao norte: alpha 0, gamma 0 → rumo 0.
    expect(rumoMagneticoDeEixos({ alpha: 0, beta: 45, gamma: 0 })).toBe(0);
    // Com gamma 30 (aparelho de lado) a matriz compensa; a ingênua não.
    // α=0, β=45, γ=30: topo em (0.5, 0.6124, 0.6124) → atan2(0.5, 0.6124).
    const comGama = rumoMagneticoDeEixos({ alpha: 0, beta: 45, gamma: 30 });
    expect(comGama).not.toBe(0); // mudou — não é mais o caso degenerado
    expect(comGama).toBeCloseTo(39.2, 0);
  });

  it("compensa a rotação de tela (paisagem)", () => {
    const retrato = rumoMagneticoDeEixos({ alpha: 0, beta: 0, gamma: 0 });
    const paisagem = rumoMagneticoDeEixos({
      alpha: 0,
      beta: 0,
      gamma: 0,
      anguloTela: 90,
    });
    expect(norm360(paisagem - retrato)).toBe(90);
  });

  it("iOS: webkitCompassHeading já é verdadeiro — ignora alpha", () => {
    expect(
      rumoVerdadeiroBruto({ alpha: 123, beta: 0, gamma: 0, webkitCompassHeading: 45 }, -18),
    ).toBe(45);
  });

  it("Android: rumo magnético + declinação (leste positivo) → verdadeiro", () => {
    // Declinação de −18° (oeste, caso do Brasil Central): 0 magnético = 342 verdadeiro.
    expect(rumoVerdadeiroBruto({ alpha: 0, beta: 0, gamma: 0 }, -18)).toBe(342);
    // Declinação leste soma.
    expect(rumoVerdadeiroBruto({ alpha: 0, beta: 0, gamma: 0 }, 15)).toBe(15);
  });

  it("leitura incompleta devolve null", () => {
    expect(rumoMagneticoDeEixos({ alpha: 10, beta: null, gamma: 5 })).toBeNull();
    expect(rumoVerdadeiroBruto({ alpha: null, beta: 0, gamma: 0 }, 0)).toBeNull();
  });

  it("suavização caminha o caminho curto sem ultrapassar o alvo", () => {
    expect(suavizarRumo(null, 100)).toBe(100);
    expect(suavizarRumo(0, 10, 0.5)).toBe(5);
    expect(suavizarRumo(350, 10, 0.5)).toBe(0); // 350→10 = +20 curto
    expect(suavizarRumo(10, 350, 0.5)).toBe(0); // 10→350 = −20 curto (0 ≡ 360)
  });

  it("salto grande aplica direto (recalibração)", () => {
    expect(suavizarRumo(0, 180, 0.35)).toBe(180);
    expect(suavizarRumo(10, 300, 0.35)).toBe(300);
  });
});
