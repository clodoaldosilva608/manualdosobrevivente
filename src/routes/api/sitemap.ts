/**
 * Sitemap dinâmico — vitrine pública + todos os verbetes do Manual.
 *
 * Servido em /api/sitemap (o plugin de rotas não aceita ponto no caminho) e
 * anunciado pelo robots.txt na diretiva Sitemap — indexadores aceitam o
 * mapa em qualquer caminho, desde que o corpo seja XML válido. Os verbetes
 * vêm direto de MANUAL (src/lib/manual-content.ts): verbete novo no Manual
 * entra no sitemap no próximo deploy, sem manutenção.
 *
 * Base canônica: manualdosobrevivente.vercel.app (sem hífens) — o alias
 * com hífens redireciona o tráfego e não deve aparecer no sitemap.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MANUAL } from "@/lib/manual-content";

const BASE = "https://manualdosobrevivente.vercel.app";

/** Vitrine estática, em ordem de importância para a divulgação. */
const VITRINE: Array<{ caminho: string; prioridade: string; frequencia: string }> = [
  { caminho: "/", prioridade: "1.0", frequencia: "weekly" },
  { caminho: "/manual", prioridade: "0.9", frequencia: "weekly" },
  { caminho: "/tutorial", prioridade: "0.8", frequencia: "monthly" },
  { caminho: "/colaboradores", prioridade: "0.7", frequencia: "weekly" },
  { caminho: "/apoiar", prioridade: "0.7", frequencia: "monthly" },
  { caminho: "/parceiros", prioridade: "0.6", frequencia: "monthly" },
];

function escaparXml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function entradaXml(caminho: string, frequencia: string, prioridade: string): string {
  return [
    "  <url>",
    `    <loc>${BASE}${escaparXml(caminho)}</loc>`,
    `    <changefreq>${frequencia}</changefreq>`,
    `    <priority>${prioridade}</priority>`,
    "  </url>",
  ].join("\n");
}

function montarSitemap(): string {
  const verbetes = MANUAL.map((entrada) => ({
    caminho: `/manual/${entrada.slug}`,
    prioridade: "0.8",
    frequencia: "monthly",
  }));
  const entradas = [...VITRINE, ...verbetes]
    .map((item) => entradaXml(item.caminho, item.frequencia, item.prioridade))
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entradas}\n</urlset>\n`;
}

export const Route = createFileRoute("/api/sitemap")({
  server: {
    handlers: {
      GET: async () =>
        new Response(montarSitemap(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // Uma hora de janela: buscadores re-crawlam sem pressionar o
            // servidor e o conteúdo novo aparece em até uma hora.
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
