/**
 * Material de divulgação — validação do conteúdo da aba "Divulgação" do admin.
 *
 * Garante que o material operacional nunca quebra: links completos, passo a
 * passo do Search Console com sitemap, plano D1–D7 completo, posts copiáveis
 * (X dentro do limite) e criativos servidos de /divulgacao/.
 */
import { describe, expect, it } from "vitest";
import {
  BASE_DIVULGACAO,
  CRIATIVOS,
  FUNDACAO_SEMANA1,
  LINKS_CAMPANHA,
  METAS_SEMANA2,
  PASSOS_GSC,
  PLANO_SEMANA2,
  POSTS_DIVULGACAO,
  URL_BING,
  URL_GSC,
  URL_SITEMAP,
  linkCompleto,
} from "@/lib/divulgacao";

describe("links da campanha", () => {
  it("cobre a vitrine pública com endereços completos", () => {
    expect(LINKS_CAMPANHA.length).toBeGreaterThanOrEqual(5);
    for (const item of LINKS_CAMPANHA) {
      expect(item.rotulo.trim()).not.toBe("");
      expect(item.caminho.startsWith("/")).toBe(true);
      expect(item.descricao.trim()).not.toBe("");
      expect(linkCompleto(item.caminho)).toBe(`${BASE_DIVULGACAO}${item.caminho}`);
    }
    const caminhos = LINKS_CAMPANHA.map((item) => item.caminho);
    expect(caminhos).toContain("/manual");
    expect(caminhos).toContain("/apoiar");
    expect(caminhos).toContain("/colaboradores");
  });
});

describe("passo a passo dos buscadores", () => {
  it("tem os 6 passos, todos com conteúdo", () => {
    expect(PASSOS_GSC).toHaveLength(6);
    for (const passo of PASSOS_GSC) {
      expect(passo.titulo.trim()).not.toBe("");
      expect(passo.detalhe.trim()).not.toBe("");
    }
  });

  it("anuncia sitemap, indexação e Bing com endereços prontos", () => {
    const passos = PASSOS_GSC.map(
      (passo) => `${passo.titulo} ${passo.detalhe} ${passo.copiar ?? ""}`,
    );
    const tudo = passos.join("\n");
    expect(tudo).toContain("api/sitemap");
    expect(tudo).toContain("indexação");
    expect(tudo).toContain("Bing");
    expect(URL_SITEMAP).toBe(`${BASE_DIVULGACAO}/api/sitemap`);
    expect(URL_GSC).toBe("https://search.google.com/search-console");
    expect(URL_BING).toBe("https://www.bing.com/webmasters");
  });

  it("passo 1 copia a home e passo 3 copia o sitemap", () => {
    expect(PASSOS_GSC[0]?.copiar).toBe(`${BASE_DIVULGACAO}/`);
    expect(PASSOS_GSC[2]?.copiar).toBe(URL_SITEMAP);
    expect(PASSOS_GSC[0]?.link).toBe(URL_GSC);
    expect(PASSOS_GSC[4]?.link).toBe(URL_BING);
  });
});

describe("plano da semana 2", () => {
  it("tem os 7 dias com foco, ação e canal", () => {
    expect(PLANO_SEMANA2.map((dia) => dia.dia)).toEqual(["D1", "D2", "D3", "D4", "D5", "D6", "D7"]);
    for (const dia of PLANO_SEMANA2) {
      expect(dia.foco.trim()).not.toBe("");
      expect(dia.acao.trim()).not.toBe("");
      expect(dia.canal.trim()).not.toBe("");
    }
  });

  it("D1 é buscadores e D6 é medição", () => {
    expect(PLANO_SEMANA2[0]?.foco).toBe("Buscadores");
    expect(PLANO_SEMANA2[5]?.foco).toBe("Medição");
  });
});

describe("posts prontos", () => {
  it("cobre os canais da semana, todos copiáveis", () => {
    expect(POSTS_DIVULGACAO.length).toBeGreaterThanOrEqual(8);
    for (const post of POSTS_DIVULGACAO) {
      expect(post.canal.trim()).not.toBe("");
      expect(post.titulo.trim()).not.toBe("");
      expect(post.corpo.trim()).not.toBe("");
    }
    const canais = POSTS_DIVULGACAO.map((post) => post.canal).join(" ");
    for (const rede of ["WhatsApp", "Instagram", "Telegram", "LinkedIn", "X"]) {
      expect(canais).toContain(rede);
    }
  });

  it("todo post carrega o endereço do app (no corpo, na dica ou em 'link na bio')", () => {
    for (const post of POSTS_DIVULGACAO) {
      const conteudo = `${post.corpo} ${post.dica ?? ""}`;
      const aponta =
        conteudo.includes(BASE_DIVULGACAO) || conteudo.toLowerCase().includes("link na bio");
      expect(aponta, `post sem destino: ${post.canal}`).toBe(true);
    }
  });

  it("nenhum post de X passa de 280 caracteres", () => {
    for (const post of POSTS_DIVULGACAO.filter((p) => p.canal.startsWith("X "))) {
      expect(post.corpo.length).toBeLessThanOrEqual(280);
    }
  });

  it("a legenda de Instagram carrega hashtags", () => {
    const legenda = POSTS_DIVULGACAO.find((post) => post.canal.startsWith("Instagram · legenda"));
    expect(legenda).toBeDefined();
    const hashtags = legenda?.corpo.match(/#/g) ?? [];
    expect(hashtags.length).toBeGreaterThanOrEqual(5);
  });
});

describe("criativos e guia", () => {
  it("served files existem em /divulgacao/ com miniatura declarada", () => {
    expect(CRIATIVOS).toHaveLength(3);
    for (const item of CRIATIVOS) {
      expect(item.arquivo.startsWith("/divulgacao/")).toBe(true);
      expect(/\.(png|pdf)$/.test(item.arquivo)).toBe(true);
      expect(item.rotulo.trim()).not.toBe("");
      expect(item.uso.trim()).not.toBe("");
      expect(typeof item.miniatura).toBe("boolean");
    }
    expect(CRIATIVOS.some((item) => item.arquivo.endsWith(".pdf"))).toBe(true);
    expect(CRIATIVOS.filter((item) => item.miniatura)).toHaveLength(2);
  });
});

describe("metas de medição", () => {
  it("tem pelo menos 4 metas com método de conferência", () => {
    expect(METAS_SEMANA2.length).toBeGreaterThanOrEqual(4);
    for (const meta of METAS_SEMANA2) {
      expect(meta.alvo.trim()).not.toBe("");
      expect(meta.como.trim()).not.toBe("");
    }
  });

  it("metas citam operadores e indexação", () => {
    const alvos = METAS_SEMANA2.map((meta) => `${meta.alvo} ${meta.como}`).join(" ");
    expect(alvos).toContain("operadores");
    expect(alvos).toContain("indexadas");
  });
});

describe("fundação da semana 1", () => {
  it("registra o alicerce já no ar", () => {
    expect(FUNDACAO_SEMANA1.length).toBeGreaterThanOrEqual(3);
    const tudo = FUNDACAO_SEMANA1.map((item) => item.texto).join(" ");
    expect(tudo).toContain("robots.txt");
    expect(tudo).toContain("/api/sitemap");
  });
});
