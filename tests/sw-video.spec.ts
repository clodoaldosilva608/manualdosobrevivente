/**
 * Handler de vídeo do Service Worker (public/sw.js) — raiz do bug
 * "os vídeos não estão reproduzindo".
 *
 * O elemento <video> pede o arquivo por PARTES (Range: bytes=0-). O handler
 * antigo buscava com o Range e tentava guardar a resposta parcial (206) —
 * cache.put rejeita resposta parcial e o catch devolvia 504: o vídeo nunca
 * tocava. Este spec carrega o sw.js num contexto isolado (node:vm, como o
 * sw-fila.spec) e prova o contrato do cacheFirstVideo:
 *  1. pedido com Range → busca SEM Range (resposta 200 integral), guarda e
 *     responde com o arquivo completo;
 *  2. chamadas seguintes saem do cache (rede só uma vez);
 *  3. acerto de cache responde direto, sem tocar na rede.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const CAMINHO_SW = fileURLToPath(new URL("../public/sw.js", import.meta.url));

interface SwVideoContexto {
  cacheFirstVideo: (request: Request, nomeCache: string) => Promise<Response>;
}

function carregarSw(opcoes: {
  fetchResponde: (url: string, comRange: boolean) => Response;
  guardado?: Map<string, Response>;
}): { ctx: SwVideoContexto; chamadasFetch: Request[]; cache: Map<string, Response> } {
  const codigo = readFileSync(CAMINHO_SW, "utf-8");
  const cache = opcoes.guardado ?? new Map<string, Response>();
  const chamadasFetch: Request[] = [];
  const cachesFalso = {
    open: async () => ({
      match: async (req: Request) => cache.get(new URL(req.url).pathname),
      put: async (req: Request, res: Response) => {
        // Como a Cache API real: resposta parcial NUNCA é guardada.
        if (res.status === 206) throw new TypeError("resposta parcial não cacheável");
        cache.set(new URL(req.url).pathname, res);
      },
    }),
  };
  const fetchFalso = async (entrada: Request | string) => {
    const req = typeof entrada === "string" ? new Request(entrada) : entrada;
    chamadasFetch.push(req);
    const comRange = req.headers.has("range");
    return opcoes.fetchResponde(req.url, comRange);
  };
  const contexto = vm.createContext({
    self: { addEventListener: () => {} },
    console,
    setTimeout,
    clearTimeout,
    Request,
    Response,
    fetch: fetchFalso,
    caches: cachesFalso,
  });
  vm.runInContext(codigo, contexto);
  return { ctx: contexto as unknown as SwVideoContexto, chamadasFetch, cache };
}

const URL_VIDEO = "https://manualdosobrevivente.vercel.app/briefing-sobrevivente-mato.mp4";

describe("cacheFirstVideo (Range do <video>)", () => {
  it("pedido com Range busca o arquivo INTEGRAL (sem Range), guarda e responde 200", async () => {
    const { ctx, chamadasFetch, cache } = carregarSw({
      // Servidor: Range → 206 parcial; sem Range → 200 completo.
      fetchResponde: (url, comRange) =>
        new Response("VIDEO-CONTEUDO", { status: comRange ? 206 : 200 }),
    });
    const pedido = new Request(URL_VIDEO, { headers: { range: "bytes=0-" } });

    const resposta = await ctx.cacheFirstVideo(pedido, "shell-v53");

    expect(chamadasFetch).toHaveLength(1);
    // O fetch interno NÃO repassa o Range — busca o arquivo inteiro.
    expect(chamadasFetch[0].headers.has("range")).toBe(false);
    expect(resposta.status).toBe(200);
    expect(await resposta.text()).toBe("VIDEO-CONTEUDO");
    // O cache guarda a resposta integral (o 206 teria lançado na Cache API real).
    expect(cache.has("/briefing-sobrevivente-mato.mp4")).toBe(true);
  });

  it("segunda chamada sai do cache — rede só uma vez", async () => {
    const { ctx, chamadasFetch } = carregarSw({
      fetchResponde: (_url, comRange) =>
        new Response("VIDEO-CONTEUDO", { status: comRange ? 206 : 200 }),
    });
    const p1 = new Request(URL_VIDEO, { headers: { range: "bytes=0-" } });
    const p2 = new Request(URL_VIDEO, { headers: { range: "bytes=512-" } });

    await ctx.cacheFirstVideo(p1, "shell-v53");
    const r2 = await ctx.cacheFirstVideo(p2, "shell-v53");

    expect(chamadasFetch).toHaveLength(1);
    expect(r2.status).toBe(200);
    expect(await r2.text()).toBe("VIDEO-CONTEUDO");
  });

  it("acerto de cache puro responde direto, sem rede", async () => {
    const guardado = new Map<string, Response>();
    guardado.set("/abertura.mp4", new Response("ABERTURA", { status: 200 }));
    const { ctx, chamadasFetch } = carregarSw({
      fetchResponde: () => new Response("DA-REDE", { status: 200 }),
      guardado,
    });
    const pedido = new Request("https://manualdosobrevivente.vercel.app/abertura.mp4", {
      headers: { range: "bytes=0-" },
    });

    const resposta = await ctx.cacheFirstVideo(pedido, "shell-v53");

    expect(chamadasFetch).toHaveLength(0);
    expect(resposta.status).toBe(200);
    expect(await resposta.text()).toBe("ABERTURA");
  });

  it("falha de rede devolve 504 (nunca trava o player)", async () => {
    const { ctx } = carregarSw({
      fetchResponde: () => {
        throw new Error("sem conexão");
      },
    });
    const pedido = new Request(URL_VIDEO, { headers: { range: "bytes=0-" } });
    const resposta = await ctx.cacheFirstVideo(pedido, "shell-v53");
    expect(resposta.status).toBe(504);
  });
});
