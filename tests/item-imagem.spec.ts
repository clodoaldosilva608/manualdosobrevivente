import { describe, expect, it } from "vitest";
import { imagemPadraoDoItem, CHAVES_DESENHOS } from "@/lib/item-imagem";
import { MODELOS } from "@/lib/mochilas-modelo";

/** Extrai o conteúdo de um data URI SVG para conferir o desenho usado. */
function svgDe(nome: string, categoria: string): string {
  const uri = imagemPadraoDoItem(nome, categoria);
  expect(uri).toMatch(/^data:image\/svg\+xml/);
  return decodeURIComponent(uri);
}

/** Todos os nomes únicos de itens dos 5 modelos prontos. */
const NOMES_DOS_MODELOS: Array<{ nome: string; categoria: string }> = (() => {
  const vistos = new Set<string>();
  const saida: Array<{ nome: string; categoria: string }> = [];
  for (const modelo of MODELOS) {
    for (const item of modelo.itens) {
      const chave = `${item.name}|${item.category}`;
      if (!vistos.has(chave)) {
        vistos.add(chave);
        saida.push({ nome: item.name, categoria: item.category });
      }
    }
  }
  return saida;
})();

describe("imagem padrão de cada item da mochila", () => {
  it("tem uma biblioteca com desenhos suficientes (≥ 45 temas)", () => {
    expect(CHAVES_DESENHOS.length).toBeGreaterThanOrEqual(45);
  });

  it("TODOS os itens dos modelos prontos recebem uma imagem (data URI SVG válido)", () => {
    expect(NOMES_DOS_MODELOS.length).toBeGreaterThan(60);
    for (const { nome, categoria } of NOMES_DOS_MODELOS) {
      const svg = svgDe(nome, categoria);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    }
  });

  it("itens distintos recebem desenhos referentes (não tudo vira o mesmo)", () => {
    const unicos = new Set(
      NOMES_DOS_MODELOS.map(({ nome, categoria }) => imagemPadraoDoItem(nome, categoria)),
    );
    // Com ~90 itens e ~50 desenhos temáticos, a maioria dos itens tem desenho próprio.
    expect(unicos.size).toBeGreaterThanOrEqual(30);
  });

  it("casamentos temáticos: água, kit, lanterna, power bank, barraca, mapa, apito e higiene", () => {
    const agua = svgDe("Água (2 garrafas de 500 ml)", "hydration");
    const kit = svgDe("Kit de primeiros socorros compacto", "medical");
    const luz = svgDe("Lanterna frontal + pilhas reserva", "luz");
    const bateria = svgDe("Power bank 10.000 mAh + cabo", "luz");
    const abrigo = svgDe("Barraca leve 1–2 pessoas", "shelter");
    const nav = svgDe("Mapa impresso da região + bússola", "navegacao");
    const socorro = svgDe("Apito de emergência", "comunicacao");
    const limpeza = svgDe("Protetor solar e repelente", "higiene");

    expect(agua).not.toBe(kit);
    expect(kit).not.toBe(luz);
    expect(luz).not.toBe(bateria);
    expect(abrigo).not.toBe(nav);
    expect(socorro).not.toBe(limpeza);
    // O kit médico traz a cruz; o power bank traz o raio; o apito traz ondas.
    expect(kit).toMatch(/M32 31v12|M26 37h12/);
    expect(bateria).toMatch(/z" fill="#FFD166"/);
    expect(nav).toMatch(/circle cx="32" cy="30" r="7"/);
  });

  it("a categoria serve de reserva quando o nome não casa", () => {
    const generico = svgDe("Item muito estranho sem palavra-chave", "tools");
    const outro = svgDe("Outro item estranho", "medical");
    expect(generico).not.toBe(outro);
  });

  it("cada modelo pronto cobre todas as categorias com imagem definida", () => {
    for (const modelo of MODELOS) {
      for (const item of modelo.itens) {
        const uri = imagemPadraoDoItem(item.name, item.category);
        expect(uri.startsWith("data:image/svg+xml")).toBe(true);
      }
    }
  });
});
