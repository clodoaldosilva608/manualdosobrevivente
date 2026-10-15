/**
 * Pré-aquecimento da camada base (src/lib/preaquecer-base.ts).
 *
 * A queixa "ao trocar de camada, algumas não carregam de imediato" vinha
 * do setStyle imediato: o estilo novo nasce sem tile nenhum e a base só
 * pinta conforme os pedidos saem da fila do Service Worker (0,5–2 s cada
 * nos provedores voluntários). O pré-aquecimento baixa os tiles da vista
 * atual ANTES de aplicar o estilo — na troca, os tiles saem do cache.
 *
 * Este spec prova a matemática da pirâmide (XYZ e WMS bbox-epsg-3857), os
 * limites (maxzoom da base, linha de data, pólos, teto de tiles), o
 * rodízio de subdomínios igual ao do MapLibre e o tempo limite que solta a
 * troca mesmo com a rede pendente.
 */
import { describe, expect, it, vi } from "vitest";
import {
  LIMITE_TILES,
  preaquecerTiles,
  tilesVisiveis,
  urlDoTile,
  type Retangulo,
} from "../src/lib/preaquecer-base";

const RECIFE: Retangulo = { oeste: -34.94, sul: -8.0, leste: -34.93, norte: -7.99 };

describe("tilesVisiveis", () => {
  it("devolve o tile único que cobre uma vista pequena (Recife, z11)", () => {
    const tiles = tilesVisiveis(RECIFE, 11, 19);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toEqual({ z: 11, x: 825, y: 1069 });
  });

  it("arredonda o zoom fracionário igual à pirâmide do MapLibre", () => {
    const a = tilesVisiveis(RECIFE, 11.4, 19);
    expect(a[0].z).toBe(11);
    const b = tilesVisiveis(RECIFE, 12.6, 19);
    expect(b[0].z).toBe(13);
  });

  it("contém o zoom no maxzoom da base (oceano 13, satélite 19)", () => {
    const z13 = tilesVisiveis(RECIFE, 16, 13);
    expect(z13[0].z).toBe(13);
    // Zoom menor que o mínimo da pirâmide fica em 2.
    const z2 = tilesVisiveis(RECIFE, 1, 19);
    expect(z2[0].z).toBe(2);
  });

  it("cobre a travessia da linha de data sem repetir tile", () => {
    const tiles = tilesVisiveis({ oeste: 179.5, sul: -1, leste: -179.5, norte: 1 }, 2, 19);
    // z2: x=3 (lado oeste do mapa) e x=0 (lado leste, com wrap), y=1..2.
    expect(tiles).toHaveLength(4);
    const xs = new Set(tiles.map((t) => t.x));
    expect(xs).toEqual(new Set([3, 0]));
    const ys = new Set(tiles.map((t) => t.y));
    expect(ys).toEqual(new Set([1, 2]));
  });

  it("respeita o limite de segurança por pré-aquecimento", () => {
    // Vista do mundo inteiro em z2 = 16 tiles; com teto menor, corta.
    const tiles = tilesVisiveis({ oeste: -180, sul: -85, leste: 180, norte: 85 }, 2, 19, 5);
    expect(tiles).toHaveLength(5);
    expect(LIMITE_TILES).toBeGreaterThanOrEqual(16);
  });

  it("contém y nos pólos (latitudes fora da pirâmide Mercator)", () => {
    const tiles = tilesVisiveis({ oeste: -10, sul: 89, leste: 10, norte: 89.9 }, 5, 19);
    for (const t of tiles) {
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThan(1 << t.z);
    }
  });
});

describe("urlDoTile", () => {
  it("expande o template XYZ", () => {
    const url = urlDoTile("https://x.test/{z}/{x}/{y}.png", { z: 10, x: 412, y: 534 });
    expect(url).toBe("https://x.test/10/412/534.png");
  });

  it("expande o bbox-epsg-3857 do WMS em metros Mercator", () => {
    const template = "https://bdgex.test/mapcache?BBOX={bbox-epsg-3857}&SRS=EPSG%3A3857";
    // z1 x1 y1: quadrante sudeste — minx 0, miny −½ mundo, maxx/maxy ½ mundo.
    const url = urlDoTile(template, { z: 1, x: 1, y: 1 });
    const MEIO_MUNDO = 20037508.342789244;
    expect(url).toBe(
      `https://bdgex.test/mapcache?BBOX=0,${-MEIO_MUNDO},${MEIO_MUNDO},0&` + "SRS=EPSG%3A3857",
    );
  });

  it("bbox do tile z0 cobre o mundo inteiro", () => {
    const url = urlDoTile("WMS&BBOX={bbox-epsg-3857}", { z: 0, x: 0, y: 0 });
    expect(url).toBe(
      "WMS&BBOX=-20037508.342789244,-20037508.342789244,20037508.342789244,20037508.342789244",
    );
  });
});

describe("preaquecerTiles", () => {
  it("dispara um pedido por tile em rodízio de subdomínios (igual ao MapLibre)", async () => {
    const urls: string[] = [];
    const total = await preaquecerTiles(
      ["https://a.test/{z}/{x}/{y}.png", "https://b.test/{z}/{x}/{y}.png"],
      [
        { z: 10, x: 825, y: 1069 },
        { z: 10, x: 826, y: 1069 },
        { z: 10, x: 827, y: 1069 },
      ],
      { tempoLimiteMs: 200, buscar: (u) => (urls.push(u), Promise.resolve(null)) },
    );
    expect(total).toBe(3);
    expect(urls[0]).toBe("https://a.test/10/825/1069.png");
    expect(urls[1]).toBe("https://b.test/10/826/1069.png");
    expect(urls[2]).toBe("https://a.test/10/827/1069.png");
  });

  it("resolve no tempo limite mesmo com pedidos pendentes na rede", async () => {
    const inicio = Date.now();
    const total = await preaquecerTiles(["https://lento.test/{z}.png"], [{ z: 3, x: 2, y: 3 }], {
      tempoLimiteMs: 40,
      buscar: () => new Promise(() => undefined), // nunca resolve (rede pendente)
    });
    expect(total).toBe(1);
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(35);
    expect(Date.now() - inicio).toBeLessThan(2000);
  });

  it("falhas de rede não derrubam o pré-aquecimento", async () => {
    const total = await preaquecerTiles(["https://x.test/{z}.png"], [{ z: 1, x: 0, y: 0 }], {
      tempoLimiteMs: 100,
      buscar: () => Promise.reject(new Error("sem rede")),
    });
    expect(total).toBe(1);
  });

  it("entradas vazias não disparam nada", async () => {
    const disparos = vi.fn((u: string) => Promise.resolve(null));
    expect(await preaquecerTiles([], [{ z: 1, x: 0, y: 0 }], { buscar: disparos })).toBe(0);
    expect(await preaquecerTiles(["https://x.test/{z}.png"], [], { buscar: disparos })).toBe(0);
    expect(disparos).not.toHaveBeenCalled();
  });
});
