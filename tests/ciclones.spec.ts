/**
 * Unidade das funções puras do ciclones.ts (NOAA NHC/JTWC via Esri Live
 * Feeds): classificação Saffir-Simpson e montagem das coleções GeoJSON —
 * incluindo a escolha da posição observada mais recente de cada tempestade.
 */
import { describe, expect, it } from "vitest";
import { categoriaCiclone, ktEmKmh, montarConjunto, type EsriFC } from "../src/lib/ciclones";

describe("categoriaCiclone", () => {
  it("segue as faixas oficiais do NHC em nós", () => {
    expect(categoriaCiclone(20).id).toBe("depressao");
    expect(categoriaCiclone(34).id).toBe("tempestade");
    expect(categoriaCiclone(63).id).toBe("tempestade");
    expect(categoriaCiclone(64).id).toBe("cat1");
    expect(categoriaCiclone(82).id).toBe("cat1");
    expect(categoriaCiclone(83).id).toBe("cat2");
    expect(categoriaCiclone(95).id).toBe("cat2");
    expect(categoriaCiclone(96).id).toBe("cat3");
    expect(categoriaCiclone(112).id).toBe("cat3");
    expect(categoriaCiclone(113).id).toBe("cat4");
    expect(categoriaCiclone(137).id).toBe("cat5");
  });

  it("valores inválidos caem em intensidade n/d", () => {
    expect(categoriaCiclone(NaN).id).toBe("nd");
  });
});

describe("ktEmKmh", () => {
  it("converte nós para km/h", () => {
    expect(ktEmKmh(85)).toBe(157); // 85 × 1,852 = 157,42
  });
});

/** Fábrica de feição Esri simplificada. */
function feicao(props: Record<string, unknown>, coords: [number, number], tipo = "Point"): EsriFC {
  return {
    features: [{ properties: props, geometry: { type: tipo, coordinates: coords } }],
  };
}

describe("montarConjunto", () => {
  const obs: EsriFC = {
    features: [
      {
        properties: {
          STORMID: "al092026",
          STORMNAME: "Isaias",
          STORMTYPE: "Hurricane2",
          BASIN: "al",
          DTG: 1000,
          INTENSITY: 85,
          MSLP: 975,
        },
        geometry: { type: "Point", coordinates: [-89.3, 24.4] },
      },
      {
        // boletim antigo — deve perder para o DTG 2000
        properties: {
          STORMID: "al092026",
          STORMNAME: "Isaias",
          DTG: 500,
          INTENSITY: 60,
          MSLP: 990,
        },
        geometry: { type: "Point", coordinates: [-90.0, 23.0] },
      },
      {
        properties: {
          STORMID: "al092026",
          STORMNAME: "Isaias",
          DTG: 2000,
          INTENSITY: 90,
          MSLP: 970,
        },
        geometry: { type: "Point", coordinates: [-89.0, 24.8] },
      },
    ],
  };

  const prev: EsriFC = {
    features: [
      {
        properties: {
          STORMID: "al092026",
          STORMNAME: "Isaias",
          TAU: 0,
          MAXWIND: 90,
          TCDIR: 50,
          TCSPD: 12,
          MSLP: 970,
          FLDATELBL: "2026-10-08 2:00 PM",
        },
        geometry: { type: "Point", coordinates: [-89.0, 24.8] },
      },
      {
        properties: {
          STORMID: "al092026",
          STORMNAME: "Isaias",
          TAU: 24,
          MAXWIND: 75,
          MSLP: 980,
          FLDATELBL: "2026-10-09 2:00 PM",
        },
        geometry: { type: "Point", coordinates: [-86.0, 26.0] },
      },
    ],
  };

  const linhas: EsriFC = {
    features: [
      {
        properties: { STORMID: "al092026", STORMNAME: "Isaias" },
        geometry: {
          type: "LineString",
          coordinates: [
            [-90, 23],
            [-89, 24.8],
          ],
        },
      },
    ],
  };

  const cones: EsriFC = {
    features: [
      {
        properties: { STORMID: "al092026", STORMNAME: "Isaias", MAX_LABEL: "Hurricane force" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-89, 24],
              [-87, 25],
              [-89, 26],
              [-89, 24],
            ],
          ],
        },
      },
    ],
  };

  it("mantém só a posição observada mais recente por tempestade", () => {
    const c = montarConjunto(obs, feicao({}, [0, 0], "LineString"), prev, linhas, cones);
    expect(c.observados.features).toHaveLength(1);
    const p = c.observados.features[0].properties as Record<string, unknown>;
    expect(p["nome"]).toBe("ISAIAS");
    expect(p["kt"]).toBe(90);
    expect((c.observados.features[0].geometry as GeoJSON.Point).coordinates).toEqual([-89.0, 24.8]);
  });

  it("acrescenta movimento (direção e velocidade) do TAU 0", () => {
    const c = montarConjunto(obs, linhas, prev, linhas, cones);
    const p = c.observados.features[0].properties as Record<string, unknown>;
    expect(p["movimento"]).toContain("50°");
    expect(p["movimento"]).toContain("22 km/h"); // 12 kt ≈ 22 km/h
  });

  it("projeta pontos com rótulo +Xh e cores por categoria", () => {
    const c = montarConjunto(obs, linhas, prev, linhas, cones);
    const taus = (c.previsaoPontos.features as GeoJSON.Feature[]).map(
      (f) => (f.properties as Record<string, unknown>)["tau"],
    );
    expect(taus).toEqual([0, 24]);
    const rotulo = (c.previsaoPontos.features[1].properties as Record<string, unknown>)[
      "rotuloTau"
    ];
    expect(rotulo).toBe("+24h");
    const corPrev = (c.previsaoPontos.features[1].properties as Record<string, unknown>)["cor"];
    // 75 kt ≥ 64 → no mínimo cat.1 (laranja), nunca amarelo de tempestade
    expect(corPrev).toBe(categoriaCiclone(75).cor);
  });

  it("lista os nomes distintos", () => {
    const c = montarConjunto(obs, linhas, prev, linhas, cones);
    expect(c.nomes).toEqual(["ISAIAS"]);
  });

  it("coleções vazias quando não há tempestades", () => {
    const vazio: EsriFC = { features: [] };
    const c = montarConjunto(vazio, vazio, vazio, vazio, vazio);
    expect(c.nomes).toEqual([]);
    expect(c.observados.features).toHaveLength(0);
    expect(c.cones.features).toHaveLength(0);
  });
});
