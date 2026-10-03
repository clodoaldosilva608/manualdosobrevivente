import { describe, expect, it } from "vitest";
import { origemPermitidaNaCsp, valorFrameAncestors } from "../src/lib/embed-osiris.functions";

const CSP_FORK =
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: wss: data: blob:; frame-ancestors 'self' https://centrodesobrevivencia.vercel.app https://centrodesobrevivencia.app https://centrodesobrevivencia-lovable.vercel.app https://manual-do-sobrevivente.vercel.app http://localhost:8080 http://localhost:4173 http://localhost:3000;";

describe("verificação de embed do globo OSIRIS", () => {
  it("extrai o valor da diretiva frame-ancestors", () => {
    const fontes = valorFrameAncestors(CSP_FORK);
    expect(fontes).toContain("centrodesobrevivencia.vercel.app");
    expect(fontes).not.toContain("default-src");
  });

  it("reconhece a origem de produção autorizada no fork", () => {
    expect(origemPermitidaNaCsp(CSP_FORK, "https://manual-do-sobrevivente.vercel.app")).toBe(true);
  });

  it("reconhece localhost de desenvolvimento", () => {
    expect(origemPermitidaNaCsp(CSP_FORK, "http://localhost:8080")).toBe(true);
  });

  it("rejeita origem ausente da lista", () => {
    expect(origemPermitidaNaCsp(CSP_FORK, "https://exemplo-aleatorio.vercel.app")).toBe(false);
  });

  it("compara sem diferenciar maiúsculas e exige fonte exata", () => {
    expect(
      origemPermitidaNaCsp(CSP_FORK.toUpperCase(), "HTTPS://MANUAL-DO-SOBREVIVENTE.VERCEL.APP"),
    ).toBe(true);
    // subdomínio da origem autorizada não pode herdar a permissão
    expect(origemPermitidaNaCsp(CSP_FORK, "https://x.manual-do-sobrevivente.vercel.app")).toBe(
      false,
    );
  });

  it("responde false sem CSP ou sem a diretiva", () => {
    expect(origemPermitidaNaCsp(null, "https://manual-do-sobrevivente.vercel.app")).toBe(false);
    expect(origemPermitidaNaCsp("", "https://manual-do-sobrevivente.vercel.app")).toBe(false);
    expect(origemPermitidaNaCsp("default-src 'self';", "https://a.b")).toBe(false);
  });

  it("trata CSP sem frame-ancestors terminando em ponto e vírgula", () => {
    expect(valorFrameAncestors("frame-ancestors 'self' https://a.b")).toBe("'self' https://a.b");
    expect(valorFrameAncestors("img-src *; frame-ancestors 'none';")).toBe("'none'");
  });
});
