import { describe, expect, it } from "vitest";
import { morseParaTexto, normalizarTexto, padraoMorse, textoParaMorse } from "@/lib/morse";

describe("código Morse", () => {
  it("normaliza acentos e caixa", () => {
    expect(normalizarTexto("socorro!")).toBe("SOCORRO!");
    expect(normalizarTexto("Água é vida")).toBe("AGUA E VIDA");
    expect(normalizarTexto("coração")).toBe("CORACAO");
  });

  it("converte SOS e mensagens de campo", () => {
    expect(textoParaMorse("SOS")).toBe("... --- ...");
    expect(textoParaMorse("AJUDA")).toBe(".- .--- ..- -.. .-");
    expect(textoParaMorse("AGUA")).toBe(".- --. ..- .-");
    expect(textoParaMorse("águA")).toBe(".- --. ..- .-");
  });

  it("separa palavras com barra", () => {
    expect(textoParaMorse("AGUA AQUI")).toBe(".- --. ..- .- / .- --.- ..- ..");
  });

  it("traduz Morse de volta para texto", () => {
    expect(morseParaTexto("... --- ...")).toBe("SOS");
    expect(morseParaTexto(".- --. ..- .- / .- --.- ..- ..")).toBe("AGUA AQUI");
  });

  it("faz ida e volta de dígitos e pontuação", () => {
    const original = "COORDENADA 15-47?";
    const morse = textoParaMorse(original);
    expect(morseParaTexto(morse)).toBe(original);
  });

  it("ignora caracteres sem código", () => {
    expect(textoParaMorse("S.O.S")).toBe("... .-.-.- --- .-.-.- ...");
  });

  it("padrão SOS: ponto 1 unidade, traço 3, pausas 1/3/7", () => {
    const padrao = padraoMorse("SOS", 100);
    // S = ...  O = ---  S = ...
    const acesos = padrao.filter((p) => p.aceso);
    expect(acesos.map((p) => p.ms)).toEqual([100, 100, 100, 300, 300, 300, 100, 100, 100]);
    // Pausas: 2 internas do S + 3u antes do O + 2 internas do O + 3u antes
    // do S final + 2 internas do S final + 7u de repetição.
    const pausas = padrao.filter((p) => !p.aceso);
    expect(pausas.map((p) => p.ms)).toEqual([100, 100, 300, 100, 100, 300, 100, 100, 700]);
  });

  it("padrão aponta a letra em transmissão pelo índice do texto", () => {
    const padrao = padraoMorse("SOS", 200);
    const primeiroAceso = padrao.find((p) => p.aceso)!;
    expect(primeiroAceso.letra).toBe(0);
    // O traço do O aponta para o índice 1.
    const tracoO = padrao.find((p) => p.aceso && p.ms === 600)!;
    expect(tracoO.letra).toBe(1);
    // Último passo é a pausa de repetição (fora do texto).
    expect(padrao[padrao.length - 1]).toMatchObject({ aceso: false, letra: -1 });
  });

  it("mensagem com acento transmite igual à sem acento", () => {
    expect(padraoMorse("ÁGUA", 200)).toEqual(padraoMorse("AGUA", 200));
  });
});
