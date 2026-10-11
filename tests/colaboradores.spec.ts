import { describe, expect, it } from "vitest";
import {
  COLABORADORES,
  TOTAL_COLABORADORES,
  rotuloApoiador,
  segmentoColaboradores,
  segmentoDeNomes,
} from "@/lib/colaboradores";

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

  it("segmentoDeNomes monta o letreiro de qualquer lista com rótulo próprio", () => {
    const nomes = ["Ana Duarte", "Bia Nunes", "Cado Lima"];
    const s = segmentoDeNomes(nomes, new Date("2026-10-11T10:00:00"), "APOIADORES");
    expect(s).toContain("APOIADORES (3)");
    for (const nome of nomes) expect(s).toContain(nome);
    // cada nome aparece exatamente uma vez (lista girada, sem repetição)
    expect(s.split("Ana Duarte")).toHaveLength(2);
  });

  it("segmentoDeNomes é o mesmo formato da lista semente (compatibilidade)", () => {
    const s = segmentoDeNomes(COLABORADORES, new Date("2026-10-11T10:00:00"));
    expect(s).toBe(segmentoColaboradores(new Date("2026-10-11T10:00:00")));
  });

  it("segmentoDeNomes com lista vazia devolve vazio (chamador decide o fallback)", () => {
    expect(segmentoDeNomes([], new Date())).toBe("");
  });

  it("rotuloApoiador junta o nome ao valor já arrecadado", () => {
    const rotulo = rotuloApoiador("Ricardo Menezes", 25);
    expect(rotulo).toContain("Ricardo Menezes");
    expect(rotulo).toContain("25");
    expect(rotulo).toContain("R$");
  });

  it("rotuloApoiador sem valor (null, 0 ou lixo) devolve só o nome", () => {
    expect(rotuloApoiador("Ana Duarte", null)).toBe("Ana Duarte");
    expect(rotuloApoiador("Ana Duarte", 0)).toBe("Ana Duarte");
    expect(rotuloApoiador("Ana Duarte", undefined)).toBe("Ana Duarte");
    expect(rotuloApoiador("Ana Duarte", Number.NaN)).toBe("Ana Duarte");
  });

  it("rotuloApoiador aceita centavos", () => {
    expect(rotuloApoiador("Ana Duarte", 25.5)).toContain("25,50");
  });
});
