/**
 * Material de divulgação servido pelo próprio app (E2E contra dev server).
 *
 * Provas:
 *   1. Os criativos e o guia em PDF respondem 200 com o Content-Type certo
 *      (a aba Divulgação do admin aponta para estes arquivos);
 *   2. /admin segue fora dos buscadores (noindex) — material de operação
 *      não vira página de busca.
 */
import { describe, expect, it } from "vitest";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

describe("ativos de divulgação", () => {
  const ATIVOS: Array<[string, string]> = [
    ["/divulgacao/criativo-feed-1080.png", "image/png"],
    ["/divulgacao/criativo-story-1080x1920.png", "image/png"],
    ["/divulgacao/guia-semana2-search-console.pdf", "application/pdf"],
  ];

  for (const [caminho, tipo] of ATIVOS) {
    it(`responde 200 com o tipo certo: ${caminho}`, async () => {
      const res = await fetch(`${BASE}${caminho}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type") ?? "").toContain(tipo);
    });
  }
});

describe("/admin permanece fora dos buscadores", () => {
  it("SSR declara noindex", async () => {
    const res = await fetch(`${BASE}/admin`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("noindex");
  });
});
