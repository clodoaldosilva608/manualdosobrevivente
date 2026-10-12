/**
 * Corretivos da semana 1 do lançamento — descoberta pelos buscadores.
 *
 * Provas:
 *   1. /robots.txt existe, permite a vitrine, tranca o núcleo do app
 *      (/admin, /api/ …) e anuncia o sitemap em /api/sitemap;
 *   2. /api/sitemap responde XML válido com a vitrine estática + TODOS os
 *      verbetes do Manual (MANUAL — a contagem acompanha o conteúdo) e
 *      nunca lista rotas privadas.
 */
import { describe, expect, it } from "vitest";
import { MANUAL } from "@/lib/manual-content";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

/** Vitrine estática — deve bater com VITRINE em src/routes/api/sitemap.ts. */
const VITRINE = ["/", "/manual", "/tutorial", "/colaboradores", "/apoiar", "/parceiros"];

async function get(caminho: string): Promise<string> {
  const res = await fetch(`${BASE}${caminho}`);
  expect(res.status).toBe(200);
  return await res.text();
}

describe("robots.txt", () => {
  it("existe, tranca o núcleo e anuncia o sitemap", async () => {
    const res = await fetch(`${BASE}/robots.txt`);
    expect(res.status).toBe(200);
    const corpo = await res.text();
    expect(corpo).toContain("User-agent: *");
    expect(corpo).toContain("Disallow: /admin");
    expect(corpo).toContain("Disallow: /api/");
    expect(corpo).toContain("Disallow: /inventory");
    expect(corpo).toContain("Sitemap: https://manualdosobrevivente.vercel.app/api/sitemap");
  });

  it("não tranca a vitrine pública (nenhuma linha Disallow de conteúdo)", async () => {
    const corpo = await (await fetch(`${BASE}/robots.txt`)).text();
    const proibicoes = corpo
      .split("\n")
      .map((linha) => linha.trim())
      .filter((linha) => linha.startsWith("Disallow:"));
    for (const rota of VITRINE) {
      expect(proibicoes).not.toContain(`Disallow: ${rota}`);
    }
  });
});

describe("canonical no SSR (semana 2)", () => {
  /** As duas raízes servem o mesmo conteúdo — a canônica deve vencer no HTML. */
  for (const caminho of [
    "/",
    "/manual",
    "/manual/water-purification",
    "/tutorial",
    "/colaboradores",
    "/apoiar",
    "/parceiros",
  ]) {
    it(`${caminho} declara canonical + og:url no domínio sem hífens`, async () => {
      const html = await get(caminho);
      const canônica = `https://manualdosobrevivente.vercel.app${caminho === "/" ? "/" : caminho}`;
      expect(html).toContain(`<link rel="canonical" href="${canônica}"`);
      expect(html).toContain(`property="og:url" content="${canônica}"`);
    });
  }
});

describe("sitemap (/api/sitemap)", () => {
  it("responde XML com cabeçalho de sitemap", async () => {
    const res = await fetch(`${BASE}/api/sitemap`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    const corpo = await res.text();
    expect(corpo.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(corpo).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("lista a vitrine + todos os verbetes do Manual", async () => {
    const corpo = await (await fetch(`${BASE}/api/sitemap`)).text();
    for (const rota of VITRINE) {
      expect(corpo).toContain(`<loc>https://manualdosobrevivente.vercel.app${rota}</loc>`);
    }
    for (const entrada of MANUAL) {
      expect(corpo).toContain(
        `<loc>https://manualdosobrevivente.vercel.app/manual/${entrada.slug}</loc>`,
      );
    }
    // 6 vitrine + 1 por verbete — nenhuma URL fora do esperado.
    const total = (corpo.match(/<loc>/g) ?? []).length;
    expect(total).toBe(VITRINE.length + MANUAL.length);
  });

  it("nunca lista rotas privadas", async () => {
    const corpo = await (await fetch(`${BASE}/api/sitemap`)).text();
    for (const privada of ["/admin", "/api/", "/conta", "/settings", "/inventory"]) {
      expect(corpo).not.toContain(`/${privada}`);
    }
  });
});
