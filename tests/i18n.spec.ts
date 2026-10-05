import { describe, expect, it } from "vitest";
import { traduzir, IDIOMAS } from "@/lib/i18n";
import { DIC_ES } from "@/lib/i18n/dic-es";
import { DIC_EN } from "@/lib/i18n/dic-en";
import { DIC_RU } from "@/lib/i18n/dic-ru";
import { DIC_ZH } from "@/lib/i18n/dic-zh";
import { DIC_JA } from "@/lib/i18n/dic-ja";

describe("dicionários sincronizados", () => {
  const dics: Array<[string, Record<string, string>]> = [
    ["es", DIC_ES],
    ["en", DIC_EN],
    ["ru", DIC_RU],
    ["zh", DIC_ZH],
    ["ja", DIC_JA],
  ];

  it("todos os idiomas têm exatamente o mesmo conjunto de chaves", () => {
    const base = Object.keys(dics[0][1]).sort();
    for (const [nome, dic] of dics.slice(1)) {
      const atual = Object.keys(dic).sort();
      expect(atual, `dicionário ${nome} difere do es`).toEqual(base);
    }
    expect(base.length).toBeGreaterThan(300);
  });

  it("nenhuma tradução vazia", () => {
    for (const [nome, dic] of dics) {
      for (const [chave, valor] of Object.entries(dic)) {
        expect(valor.trim(), `valor vazio em ${nome}: ${chave}`).not.toBe("");
      }
    }
  });

  it("as chaves pt-BR continuam presentes (não foram traduzidas por engano)", () => {
    const alvo = "MOCHILA DE EMERGÊNCIA";
    expect(Object.keys(DIC_EN)).toContain(alvo);
    expect(DIC_EN[alvo]).toBe("EMERGENCY PACK");
  });
});

describe("traduzir()", () => {
  it("devolve a tradução do idioma escolhido", () => {
    expect(traduzir("en", "Mapa")).toBe("Map");
    expect(traduzir("es", "Mapa")).toBe("Mapa");
    expect(traduzir("ru", "Mapa")).toBe("Карта");
    expect(traduzir("zh", "Mapa")).toBe("地图");
    expect(traduzir("ja", "Mapa")).toBe("マップ");
  });

  it("caiu no pt-BR para chave sem tradução (fallback progressivo)", () => {
    expect(traduzir("en", "String que não existe no dicionário")).toBe(
      "String que não existe no dicionário",
    );
  });

  it("substitui variáveis {nome}", () => {
    expect(traduzir("en", "{n} itens", { n: 7 })).toBe("7 items");
    expect(traduzir("pt", "{n} itens", { n: 7 })).toBe("{n} itens".replace("{n}", "7"));
  });

  it("IDIOMAS cobre os 6 idiomas pedidos com locale válido", () => {
    expect(IDIOMAS.map((i) => i.id)).toEqual(["pt", "es", "en", "ru", "zh", "ja"]);
    for (const op of IDIOMAS) {
      expect(op.locale).toMatch(/^[a-z]{2}(-[A-Za-z]{2,4})?$/);
      expect(op.nativo.length).toBeGreaterThan(0);
    }
  });
});
