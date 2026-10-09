import { describe, expect, it } from "vitest";
import { crc16, montarPixCopiaECola } from "@/lib/pix.brcode";

describe("PIX BR Code (copia e cola)", () => {
  it("calcula o CRC16-CCITT-FALSE com o vetor padrão conhecido", () => {
    // Vetor de verificação clássico do CRC-16/CCITT-FALSE: "123456789" → 0x29B1
    expect(crc16("123456789")).toBe("29B1");
    // String vazia mantém o valor inicial do registrador
    expect(crc16("")).toBe("FFFF");
  });

  it("monta o payload estruturado (GUI, moeda, país e CRC)", () => {
    const payload = montarPixCopiaECola({
      chave: "12345678-1234-1234-1234-123456789012",
      nomeRecebedor: "Clodoaldo Silva",
      cidade: "Recife",
    });
    expect(payload).toContain("000201");
    expect(payload).toContain("0014br.gov.bcb.pix");
    expect(payload).toContain("013612345678-1234-1234-1234-123456789012");
    expect(payload).toContain("5303986");
    expect(payload).toContain("5802BR");
    expect(payload).toContain("5915Clodoaldo Silva");
    expect(payload).toContain("6006Recife");
    // Rodapé CRC: tag 63 + comprimento 04 + 4 hex
    expect(payload.slice(-8, -4)).toBe("6304");
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
    // CRC consistente: recomputando sobre o payload sem o rodapé confere
    expect(crc16(payload.slice(0, -4))).toBe(payload.slice(-4));
  });

  it("inclui o valor quando informado e omite quando não", () => {
    const comValor = montarPixCopiaECola({
      chave: "chave@teste.com",
      nomeRecebedor: "Clodoaldo",
      cidade: "Recife",
      valor: 25,
    });
    expect(comValor).toContain("540525.00");
    const semValor = montarPixCopiaECola({
      chave: "chave@teste.com",
      nomeRecebedor: "Clodoaldo",
      cidade: "Recife",
    });
    expect(semValor).not.toContain("5405");
  });

  it("normaliza acentos, corta nome/cidade e rejeita dados incompletos", () => {
    const payload = montarPixCopiaECola({
      chave: "chave@teste.com",
      nomeRecebedor: "Ándré Éclair Silva Sobrevivencialista Demais",
      cidade: "Conselheiro Lafaiete",
    });
    // Nome cortado em 25 e cidade em 15, sem acentos
    expect(payload).toContain("5925Andre Eclair Silva Sobrev");
    expect(payload).toContain("6015Conselheiro Laf");
    expect(montarPixCopiaECola({ chave: "", nomeRecebedor: "X", cidade: "Y" })).toBe("");
    expect(montarPixCopiaECola({ chave: "k", nomeRecebedor: "", cidade: "Y" })).toBe("");
    expect(montarPixCopiaECola({ chave: "k", nomeRecebedor: "X", cidade: "" })).toBe("");
  });
});
