/**
 * Fila de tiles do Service Worker (public/sw.js) — raiz do bug "mapa preto".
 *
 * O semáforo limita tiles simultâneos para os provedores não recusarem
 * rajadas. Dois vazamentos faziam o mapa chegar PRETO no destino de um voo
 * do boletim e nunca voltar:
 *  1. fetch abortado pelo MapLibre (quadro ultrapassado da animação) podia
 *     NUNCA resolver dentro do SW — cada hang segurava uma vaga para sempre;
 *  2. a transferência de vaga decrementava o contador sem o complemento —
 *     cada handoff furava o limite até zero (rajada de tiles de novo).
 *
 * Este spec carrega o sw.js num contexto isolado (node:vm) e prova os
 * invariantes: teto de concorrência, transferência sem vazamento, alívio de
 * carga (fila cheia) e o temporizador que solta a vaga de fetches pendentes.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const CAMINHO_SW = fileURLToPath(new URL("../public/sw.js", import.meta.url));

interface SwContexto {
  pegarVagaTile: () => Promise<void> | null;
  devolverVagaTile: () => void;
  buscarComTempo: (req: Request) => Promise<unknown>;
}

function carregarSw(globais: Record<string, unknown> = {}): SwContexto {
  const codigo = readFileSync(CAMINHO_SW, "utf-8");
  const contexto = vm.createContext({
    self: { addEventListener: () => {} },
    console,
    setTimeout,
    clearTimeout,
    ...globais,
  });
  vm.runInContext(codigo, contexto);
  return contexto as unknown as SwContexto;
}

describe("fila de tiles do service worker", () => {
  it("mantém o teto de concorrência e conserva o contador sob rajada", async () => {
    const sw = carregarSw();
    let emAndamento = 0;
    let pico = 0;
    const resultados = await Promise.all(
      Array.from({ length: 40 }, async (_, i) => {
        const vaga = sw.pegarVagaTile();
        if (!vaga) return "fila";
        await vaga;
        emAndamento++;
        pico = Math.max(pico, emAndamento);
        await new Promise((r) => setTimeout(r, i % 7));
        emAndamento--;
        sw.devolverVagaTile();
        return "ok";
      }),
    );
    // Com 40 pedidos concorrentes, nada acima do teto (o vazamento antigo
    // deixava o pico passar de 8 conforme os handoffs se acumulavam).
    expect(pico).toBeLessThanOrEqual(8);
    expect(resultados.every((r) => r === "ok")).toBe(true);
    // Contador zerado: a próxima vaga vem imediata (direta, sem fila).
    const vaga = sw.pegarVagaTile();
    expect(vaga).not.toBeNull();
    await vaga;
    sw.devolverVagaTile();
  });

  it("transfere a vaga sem furar o teto (handoff 1:1)", async () => {
    const sw = carregarSw();
    let emAndamento = 0;
    let pico = 0;
    // Ocupa todas as vagas diretas e mantém o fluxo contínuo: enquanto um
    // solta, outro entra — cada transferência deve conservar a contagem.
    const ciclo = async (_, i: number) => {
      for (let volta = 0; volta < 6; volta++) {
        const vaga = sw.pegarVagaTile();
        if (!vaga) return i;
        await vaga;
        emAndamento++;
        pico = Math.max(pico, emAndamento);
        emAndamento--;
        sw.devolverVagaTile();
      }
      return i;
    };
    await Promise.all(Array.from({ length: 20 }, ciclo));
    expect(pico).toBeLessThanOrEqual(8);
    const vaga = sw.pegarVagaTile();
    expect(vaga).not.toBeNull();
    await vaga;
    sw.devolverVagaTile();
  });

  it("aplica alívio de carga: fila cheia devolve null e a fila se recupera", async () => {
    const sw = carregarSw();
    const pedidos = Array.from({ length: 100 }, () => sw.pegarVagaTile());
    const recusadas = pedidos.filter((v) => v === null);
    // 100 pedidos: 8 vagas diretas + 80 na fila + recusas (alívio de carga).
    expect(recusadas.length).toBe(100 - 88);
    // Esvazia tudo — cada vaga devolvida transfere ou decrementa, nunca os dois.
    await Promise.all(
      pedidos
        .filter((v): v is Promise<void> => v !== null)
        .map(async (v) => {
          await v;
          sw.devolverVagaTile();
        }),
    );
    const vaga = sw.pegarVagaTile();
    expect(vaga).not.toBeNull();
    await vaga;
    sw.devolverVagaTile();
  });

  it("buscarComTempo repassa a resposta do fetch", async () => {
    const sw = carregarSw({ fetch: () => Promise.resolve(new Response("ok")) });
    const res = await sw.buscarComTempo(new Request("https://tiles.teste/1.png"));
    expect(res).toBeInstanceOf(Response);
    const swErro = carregarSw({ fetch: () => Promise.reject(new Error("rede caiu")) });
    await expect(swErro.buscarComTempo(new Request("https://tiles.teste/2.png"))).rejects.toThrow(
      "rede caiu",
    );
  });

  it("o temporizador solta a vaga mesmo com fetch pendente para sempre", async () => {
    // setTimeout falso dispara na hora e o fetch nunca resolve: o caminho
    // antigo segurava a vaga até travar a fila inteira — agora rejeita.
    const sw = carregarSw({
      fetch: () => new Promise(() => {}),
      setTimeout: (fn: () => void) => {
        queueMicrotask(fn);
        return 1;
      },
      clearTimeout: () => {},
    });
    await expect(sw.buscarComTempo(new Request("https://tiles.teste/3.png"))).rejects.toThrow(
      "tile esgotado",
    );
  });
});
