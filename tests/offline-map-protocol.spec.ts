import { describe, expect, it } from "vitest";
import {
  EVENTO_AREAS,
  PROTOCOLO_OFFLINE,
  especificacaoSourceArea,
  idLayerArea,
  idSourceArea,
  parseUrlOffline,
  pontoInsercaoBase,
  registrarProtocoloOffline,
  resolverTileOffline,
  sincronizarAreasOffline,
} from "@/lib/offline-map-protocol";
import type { CachedArea } from "@/lib/db";

describe("parseUrlOffline", () => {
  it("lê tg-offline://fonte/z/x/y", () => {
    expect(parseUrlOffline("tg-offline:topo/12/2450/1677")).toEqual({
      sourceId: "topo",
      z: 12,
      x: 2450,
      y: 1677,
    });
  });

  it("rejeita url de outro protocolo e malformadas", () => {
    expect(parseUrlOffline("https://a.tile.opentopomap.org/12/2450/1677.png")).toBeNull();
    expect(parseUrlOffline("tg-offline:")).toBeNull();
    expect(parseUrlOffline("tg-offline:topo/aa/1/2")).toBeNull();
    expect(parseUrlOffline("tg-offline:topo/1/2")).toBeNull();
    expect(parseUrlOffline("tg-offline:topo/1/2/")).toBeNull();
    expect(parseUrlOffline("")).toBeNull();
  });
});

describe("resolverTileOffline", () => {
  it("devolve o ArrayBuffer do bloco salvo", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    const r = await resolverTileOffline("tg-offline:topo/12/1/2", async () => blob);
    expect(r.data).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(r.data as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("devolve data null quando o bloco não existe ou a url é inválida", async () => {
    const r1 = await resolverTileOffline("tg-offline:topo/12/9/9", async () => undefined);
    expect(r1.data).toBeNull();
    const r2 = await resolverTileOffline("https://outro", async () => undefined);
    expect(r2.data).toBeNull();
  });

  it("erros do armazenamento viram tile transparente, não exceção", async () => {
    const r = await resolverTileOffline("tg-offline:topo/1/1/1", async () => {
      throw new Error("IDB quebrado");
    });
    expect(r.data).toBeNull();
  });
});

describe("registrarProtocoloOffline", () => {
  it("registra o handler no namespace do maplibre", async () => {
    let handler: ((p: { url: string }, a: AbortController) => Promise<unknown>) | null = null;
    const mlFalso = {
      addProtocol: (proto: string, carga: typeof handler) => {
        expect(proto).toBe(PROTOCOLO_OFFLINE);
        handler = carga;
      },
    };
    // @ts-expect-error — namespace falso só com addProtocol
    registrarProtocoloOffline(mlFalso);
    expect(handler).toBeTruthy();
    // O handler registrado resolve tiles do protocolo (usa o resolver padrão;
    // sem IDB em teste, devolve data null manso).
    const resultado = (await handler!({ url: "tg-offline:x/1/1/1" }, new AbortController())) as {
      data: unknown;
    };
    expect("data" in resultado).toBe(true);
  });
});

describe("especificação e ids de área", () => {
  const area: CachedArea = {
    id: "area-1",
    name: "Teste",
    source_id: "topo",
    bbox: [-46, -24, -45.9, -23.9],
    min_zoom: 11,
    max_zoom: 14,
    tile_count: 42,
    bytes: 1000,
    created_at: 1,
  };

  it("source raster usa o protocolo e a faixa de zoom da área", () => {
    const spec = especificacaoSourceArea(area);
    expect(spec.type).toBe("raster");
    expect(spec.tiles[0]).toBe("tg-offline:topo/{z}/{x}/{y}");
    expect(spec.minzoom).toBe(11);
    expect(spec.maxzoom).toBe(14);
    expect(spec.tileSize).toBe(256);
  });

  it("ids são estáveis e distintos", () => {
    expect(idSourceArea("a")).toBe("tg-area-src-a");
    expect(idLayerArea("a")).toBe("tg-area-a");
    expect(idSourceArea("a")).not.toBe(idLayerArea("a"));
  });

  it("ponto de inserção pula o background", () => {
    expect(
      pontoInsercaoBase([
        { id: "bg", type: "background" },
        { id: "ruas", type: "line" },
      ]),
    ).toBe("ruas");
    expect(pontoInsercaoBase([{ id: "bg", type: "background" }])).toBeUndefined();
  });
});

/** Mapa mínimo que registra chamadas — para testar a sincronização. */
function mapaFalso() {
  const sources = new Map<string, unknown>();
  const layers = new Map<string, unknown>();
  let ordem: string[] = ["bg", "ruas"];
  const tipos: Record<string, string> = { bg: "background", ruas: "line" };
  const log: string[] = [];
  return {
    log,
    getStyle: () => ({ layers: ordem.map((id) => ({ id, type: tipos[id] ?? "raster" })) }),
    getSource: (id: string) => sources.get(id),
    getLayer: (id: string) => layers.get(id),
    addSource: (id: string, spec: unknown) => {
      sources.set(id, spec);
      log.push(`+src:${id}`);
    },
    addLayer: (spec: { id: string }, antes?: string) => {
      layers.set(spec.id, spec);
      tipos[spec.id] = "raster";
      const idx = antes ? ordem.indexOf(antes) : ordem.length;
      ordem = [...ordem.slice(0, idx), spec.id, ...ordem.slice(idx)];
      log.push(`+layer:${spec.id}@antes=${antes ?? "fim"}`);
    },
    removeLayer: (id: string) => {
      layers.delete(id);
      ordem = ordem.filter((x) => x !== id);
      log.push(`-layer:${id}`);
    },
    removeSource: (id: string) => {
      sources.delete(id);
      log.push(`-src:${id}`);
    },
  };
}

function areaCom(id: string): CachedArea {
  return {
    id,
    name: id,
    source_id: "topo",
    bbox: [-46, -24, -45.9, -23.9],
    min_zoom: 10,
    max_zoom: 13,
    tile_count: 1,
    bytes: 1,
    created_at: 1,
  };
}

describe("sincronizarAreasOffline", () => {
  it("adiciona source+layer de cada área na base da pilha", async () => {
    const map = mapaFalso();
    const n = await sincronizarAreasOffline(map, async () => [areaCom("a"), areaCom("b")]);
    expect(n).toBe(2);
    expect(map.getSource(idSourceArea("a"))).toBeTruthy();
    expect(map.getLayer(idLayerArea("a"))).toBeTruthy();
    // Layer entra antes da primeira não-background ("ruas" no estilo real).
    expect(map.log).toContain(`+layer:${idLayerArea("a")}@antes=ruas`);
  });

  it("é idempotente — segunda passada não duplica", async () => {
    const map = mapaFalso();
    const areas = async () => [areaCom("a")];
    await sincronizarAreasOffline(map, areas);
    const marcas = map.log.length;
    const n2 = await sincronizarAreasOffline(map, areas);
    expect(n2).toBe(1);
    expect(map.log.length).toBe(marcas); // nada novo foi adicionado
  });

  it("remove órfãos de áreas apagadas", async () => {
    const map = mapaFalso();
    await sincronizarAreasOffline(map, async () => [areaCom("a"), areaCom("b")]);
    const n = await sincronizarAreasOffline(map, async () => [areaCom("a")]);
    expect(n).toBe(1);
    expect(map.getLayer(idLayerArea("b"))).toBeUndefined();
    expect(map.getSource(idSourceArea("b"))).toBeUndefined();
    expect(map.log).toContain(`-layer:${idLayerArea("b")}`);
    expect(map.log).toContain(`-src:${idSourceArea("b")}`);
  });

  it("listar quebrado devolve 0 sem derrubar nada", async () => {
    const map = mapaFalso();
    const n = await sincronizarAreasOffline(map, async () => {
      throw new Error("IDB indisponível");
    });
    expect(n).toBe(0);
  });
});

describe("constantes", () => {
  it("evento e protocolo com nomes estáveis", () => {
    expect(PROTOCOLO_OFFLINE).toBe("tg-offline");
    expect(EVENTO_AREAS).toBe("tgis:areas-offline");
  });
});
