import { describe, expect, it } from "vitest";
import { avisoCape, nivelCape } from "@/lib/cape";

describe("CAPE — alerta de tempestade", () => {
  it("abaixo de 300 J/kg é estável, sem alerta", () => {
    expect(nivelCape(150).nivel).toBe("estavel");
    expect(nivelCape(150).alerta).toBe(false);
  });

  it("300–1000 é instabilidade moderada, sem alerta", () => {
    expect(nivelCape(600).nivel).toBe("moderado");
    expect(nivelCape(600).alerta).toBe(false);
  });

  it("1000–2500 é CAPE alto COM alerta", () => {
    expect(nivelCape(1800).nivel).toBe("alto");
    expect(nivelCape(1800).alerta).toBe(true);
  });

  it("acima de 2500 é ambiente severo COM alerta", () => {
    expect(nivelCape(3000).nivel).toBe("severo");
    expect(nivelCape(3000).alerta).toBe(true);
  });

  it("sem dado não alerta", () => {
    expect(nivelCape(null).alerta).toBe(false);
    expect(avisoCape(null)).toBeNull();
  });

  it("o aviso diz 'TEMPESTADE SE FORMANDO PERTO DE VOCÊ' com o valor", () => {
    const aviso = avisoCape(1800)!;
    expect(aviso).toContain("TEMPESTADE SE FORMANDO PERTO DE VOCÊ");
    expect(aviso).toContain("1800");
  });
});
