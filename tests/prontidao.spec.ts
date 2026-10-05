import { describe, expect, it } from "vitest";
import {
  classificarProntidao,
  rotuloVeredito,
  corVeredito,
  type VerificacaoProntidao,
} from "@/lib/prontidao-offline";

function check(estado: VerificacaoProntidao["estado"], critica = false): VerificacaoProntidao {
  return { id: Math.random().toString(36).slice(2), rotulo: "x", estado, detalhe: "", critica };
}

describe("classificarProntidao", () => {
  it("PRONTO quando tudo ok", () => {
    expect(classificarProntidao([check("ok"), check("ok")])).toBe("pronto");
  });

  it("PARCIAL com qualquer aviso", () => {
    expect(classificarProntidao([check("ok"), check("aviso")])).toBe("parcial");
  });

  it("PARCIAL com falha não crítica", () => {
    expect(classificarProntidao([check("ok"), check("falha", false)])).toBe("parcial");
  });

  it("NÃO PRONTO com falha crítica", () => {
    expect(classificarProntidao([check("ok"), check("falha", true)])).toBe("nao-pronto");
  });

  it("aceita lista vazia como pronto", () => {
    expect(classificarProntidao([])).toBe("pronto");
  });
});

describe("rótulos e cores do veredito", () => {
  it("rótulo de cada veredito", () => {
    expect(rotuloVeredito("pronto")).toBe("PRONTO PARA OPERAR OFFLINE");
    expect(rotuloVeredito("parcial")).toBe("PARCIALMENTE PRONTO");
    expect(rotuloVeredito("nao-pronto")).toContain("NÃO PRONTO");
  });

  it("cores distintas por veredito", () => {
    const cores = new Set([
      corVeredito("pronto"),
      corVeredito("parcial"),
      corVeredito("nao-pronto"),
    ]);
    expect(cores.size).toBe(3);
    expect(corVeredito("pronto")).toContain("tactical-orange");
    expect(corVeredito("nao-pronto")).toContain("destructive");
  });
});
