import { describe, expect, it } from "vitest";
import {
  statusValidade,
  diasRestantes,
  rotuloValidade,
  resumoValidade,
  corStatusValidade,
} from "@/lib/validade";

const AGORA = new Date("2026-10-05T12:00:00").getTime();
const DIA = 86_400_000;

function dataRelativa(dias: number): string {
  return new Date(AGORA + dias * DIA).toISOString().slice(0, 10);
}

describe("diasRestantes", () => {
  it("conta dias para o futuro com data só (AAAA-MM-DD)", () => {
    expect(diasRestantes(dataRelativa(10), AGORA)).toBe(10);
  });

  it("devolve negativo para vencidos", () => {
    expect(diasRestantes(dataRelativa(-3), AGORA)).toBe(-3);
  });

  it("aceita data completa ISO", () => {
    const futuro = new Date(AGORA + 2 * DIA + 3_600_000).toISOString();
    expect(diasRestantes(futuro, AGORA)).toBeGreaterThanOrEqual(2);
  });

  it("devolve NaN para vazio ou inválido", () => {
    expect(Number.isNaN(diasRestantes("", AGORA))).toBe(true);
    expect(Number.isNaN(diasRestantes("inválida", AGORA))).toBe(true);
  });
});

describe("statusValidade", () => {
  it("classifica os cinco estados", () => {
    expect(statusValidade(dataRelativa(-1), AGORA)).toBe("vencido");
    expect(statusValidade(dataRelativa(0), AGORA)).toBe("critico");
    expect(statusValidade(dataRelativa(7), AGORA)).toBe("critico");
    expect(statusValidade(dataRelativa(8), AGORA)).toBe("atencao");
    expect(statusValidade(dataRelativa(30), AGORA)).toBe("atencao");
    expect(statusValidade(dataRelativa(31), AGORA)).toBe("proximo");
    expect(statusValidade(dataRelativa(90), AGORA)).toBe("proximo");
    expect(statusValidade(dataRelativa(91), AGORA)).toBe("ok");
  });

  it("devolve null sem data ou data inválida", () => {
    expect(statusValidade(null, AGORA)).toBeNull();
    expect(statusValidade(undefined, AGORA)).toBeNull();
    expect(statusValidade("banana", AGORA)).toBeNull();
  });
});

describe("rotuloValidade", () => {
  it("rotula vencido com dias decorridos", () => {
    expect(rotuloValidade("vencido", -5)).toEqual({
      chave: "Vencido há {n} dias",
      vars: { n: 5 },
    });
    expect(rotuloValidade("vencido", -1)).toEqual({ chave: "Vencido desde ontem" });
  });

  it("rotula vence hoje e em dias", () => {
    expect(rotuloValidade("critico", 0)).toEqual({ chave: "Vence hoje" });
    expect(rotuloValidade("critico", 3)).toEqual({ chave: "Vence em {n} dia", vars: { n: 3 } });
    expect(rotuloValidade("atencao", 12)).toEqual({
      chave: "Vence em {n} dias",
      vars: { n: 12 },
    });
    expect(rotuloValidade("proximo", 60)).toEqual({
      chave: "Vence em {n} dias",
      vars: { n: 60 },
    });
    expect(rotuloValidade("ok", 120)).toEqual({ chave: "Dentro da validade" });
  });

  it("cada estado tem cor própria", () => {
    const cores = (["vencido", "critico", "atencao", "proximo", "ok"] as const).map(
      corStatusValidade,
    );
    expect(new Set(cores).size).toBeGreaterThanOrEqual(3);
    expect(cores[0]).toContain("destructive");
  });
});

describe("resumoValidade", () => {
  const itens = [
    { id: "a", name: "Remédio", expires_at: dataRelativa(-2), mochila_id: "m1" },
    { id: "b", name: "Pilhas", expires_at: dataRelativa(5), mochila_id: "m1" },
    { id: "c", name: "Barras", expires_at: dataRelativa(20), mochila_id: null },
    { id: "d", name: "Água", expires_at: null },
    { id: "e", name: "Filtro", expires_at: dataRelativa(400), mochila_id: "m2" },
  ];

  it("agrupa por gravidade e ignora sem data", () => {
    const r = resumoValidade(itens, () => null, AGORA);
    expect(r.vencidos.map((a) => a.item_id)).toEqual(["a"]);
    expect(r.criticos.map((a) => a.item_id)).toEqual(["b"]);
    expect(r.atencao.map((a) => a.item_id)).toEqual(["c"]);
    expect(r.tranquilos).toBe(1);
    expect(r.totalComValidade).toBe(4);
  });

  it("alertas ordenados do mais urgente para o menos", () => {
    const r = resumoValidade(itens, () => null, AGORA);
    expect(r.alertas.map((a) => a.dias)).toEqual([-2, 5, 20]);
  });

  it("leva o nome da mochila no alerta", () => {
    const r = resumoValidade(itens, (id) => (id === "m1" ? "MOCHILA 8H" : null), AGORA);
    expect(r.vencidos[0].mochila_nome).toBe("MOCHILA 8H");
    expect(r.atencao[0].mochila_nome).toBeNull();
  });
});
