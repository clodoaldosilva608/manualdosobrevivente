import { describe, expect, it } from "vitest";
import { COLABORADORES, TOTAL_COLABORADORES, segmentoColaboradores } from "@/lib/colaboradores";

describe("Colaboradores da Redline", () => {
  it("tem exatamente 78 colaboradores", () => {
    expect(TOTAL_COLABORADORES).toBe(78);
    expect(COLABORADORES).toHaveLength(78);
  });

  it("a ordem NÃO é alfabética (pedido explícito do operador)", () => {
    const alfabetica = [...COLABORADORES].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(COLABORADORES).not.toEqual(alfabetica);
  });

  it("não tem nomes repetidos", () => {
    expect(new Set(COLABORADORES).size).toBe(78);
  });

  it("o segmento traz cabeçalho, total e nomes", () => {
    const s = segmentoColaboradores(new Date("2026-10-11T10:00:00"));
    expect(s).toContain("COLABORADORES (78)");
    expect(s).toContain("Renata Farias");
  });

  it("a rotação muda o ponto de partida ao longo do dia", () => {
    const manha = segmentoColaboradores(new Date("2026-10-11T07:00:00"));
    const noite = segmentoColaboradores(new Date("2026-10-11T22:00:00"));
    expect(manha).not.toBe(noite);
  });
});
