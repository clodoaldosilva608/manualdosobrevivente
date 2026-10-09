import { describe, expect, it } from "vitest";
import {
  CENTRO_URL,
  VERSAO_DEEP_LINK,
  urlComeceAqui,
  urlCursos,
  urlComunidade,
  urlCurso,
  urlLoja,
  urlNewsletter,
  urlPro,
} from "@/lib/hub-links";
import {
  CONTEXTOS,
  ITENS,
  itensPorContexto,
  urlItemNaLoja,
  urlDepositoNaLoja,
} from "@/lib/deposito";
import { LISTA_PERFIS, PERFIS, perfilValido } from "@/lib/perfil-wizard";
import { MODELOS } from "@/lib/mochilas-modelo";
import { MANUAL } from "@/lib/manual-content";

describe("deep links do hub (contrato v1)", () => {
  it("todos os deep links apontam para o Centro com UTM completo", () => {
    const urls = [
      urlComeceAqui(),
      urlLoja("filtro de água", "deposito:filtro-squeeze"),
      urlCursos(),
      urlCurso("kit-72h"),
      urlComunidade(),
      urlNewsletter(),
      urlPro(),
    ];
    for (const u of urls) {
      const url = new URL(u);
      expect(url.origin).toBe(new URL(CENTRO_URL).origin);
      expect(url.searchParams.get("utm_source")).toBe("manual");
      expect(url.searchParams.get("utm_medium")).toBe("app");
      expect(url.searchParams.get("utm_term")).toBe(VERSAO_DEEP_LINK);
    }
  });

  it("urlLoja acopla a busca do item em q", () => {
    const url = new URL(urlLoja("kit 72h", "deposito:Teste"));
    expect(url.pathname).toBe("/loja");
    expect(url.searchParams.get("q")).toBe("kit 72h");
    expect(url.searchParams.get("utm_content")).toBe("deposito:Teste");
  });

  it("urlCurso mantém o slug no caminho", () => {
    expect(new URL(urlCurso("enchentes")).pathname).toBe("/cursos/enchentes");
  });
});

describe("depósito de suprimentos", () => {
  it("catálogo curado: contexto válido, busca e perfil reais", () => {
    const idsContexto = new Set(CONTEXTOS.map((c) => c.id));
    const perfis = new Set(["urbano", "trilha", "litoral", "rural"]);
    for (const item of ITENS) {
      expect(idsContexto.has(item.contexto), item.id).toBe(true);
      expect(item.busca.length, item.id).toBeGreaterThan(3);
      expect(item.faixa, item.id).toMatch(/^R\$/);
      for (const p of item.perfis) expect(perfis.has(p), item.id).toBe(true);
      const url = new URL(urlItemNaLoja(item));
      expect(url.pathname).toBe("/loja");
      expect(url.searchParams.get("utm_content")).toBe(`deposito:${item.id}`);
    }
  });

  it("filtro por contexto e deep link da vitrine", () => {
    const agua = itensPorContexto("agua");
    expect(agua.length).toBeGreaterThan(0);
    for (const i of agua) expect(i.contexto).toBe("agua");
    expect(new URL(urlDepositoNaLoja("agua")).searchParams.get("q")).toContain("agua");
  });
});

describe("wizard de perfil", () => {
  it("quatro perfis, cada um com modelo de mochila existente e tópicos reais", () => {
    const idsModelos = new Set(MODELOS.map((m) => m.id));
    const slugs = new Set(MANUAL.map((m) => m.slug));
    for (const id of LISTA_PERFIS) {
      const p = PERFIS[id];
      expect(idsModelos.has(p.modeloMochila), id).toBe(true);
      expect(p.topicos.length).toBeGreaterThanOrEqual(4);
      for (const top of p.topicos) expect(slugs.has(top.slug), `${id}:${top.slug}`).toBe(true);
      expect(p.prioridadeDeposito.length).toBeGreaterThan(0);
    }
  });

  it("perfilValido valida só os perfis existentes", () => {
    for (const id of LISTA_PERFIS) expect(perfilValido(id)).toBe(true);
    expect(perfilValido("nenhum")).toBe(false);
    expect(perfilValido(42)).toBe(false);
  });
});
