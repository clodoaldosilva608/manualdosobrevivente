/**
 * Unidade das funções puras do clima-openmeteo.ts (vento em partículas e
 * temperatura em pontos, sem chave): grade de amostragem, URL, cor por
 * temperatura, interpretação da resposta e interpolação bilinear do vento.
 */
import { describe, expect, it } from "vitest";
import {
  amostrarGrade,
  componentesVento,
  corTemperatura,
  gradeVento,
  interpretarGrade,
  rotuloTemperatura,
  urlGradeOpenMeteo,
  type Retangulo,
} from "../src/lib/clima-openmeteo";

const r: Retangulo = { o: -36, s: -9, l: -34, n: -7 };

describe("amostrarGrade", () => {
  it("começa no canto noroeste e cresce para leste/sul", () => {
    const g = amostrarGrade(r, 3, 2);
    expect(g).toHaveLength(6);
    expect(g[0]).toEqual([-36, -7]); // NO
    expect(g[1]).toEqual([-35, -7]); // leste da linha 0
    expect(g[3]).toEqual([-36, -9]); // SO (linha 1)
    expect(g[5]).toEqual([-34, -9]); // SE
  });

  it("limita a latitude aos polos e longitude ao antimeridiano", () => {
    const g = amostrarGrade({ o: -180, s: -90, l: 180, n: 90 }, 2, 2);
    for (const [lng, lat] of g) {
      expect(Math.abs(lng)).toBeLessThanOrEqual(179.9);
      expect(Math.abs(lat)).toBeLessThanOrEqual(85);
    }
  });
});

describe("urlGradeOpenMeteo", () => {
  it("monta uma única consulta com todas as coordenadas", () => {
    const url = urlGradeOpenMeteo([
      [-34.8, -8.0],
      [-35.0, -8.5],
    ]);
    expect(url).toContain("https://api.open-meteo.com/v1/forecast");
    expect(url).toContain("latitude=-8.000,-8.500");
    expect(url).toContain("longitude=-34.800,-35.000");
    expect(url).toContain("current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m");
    expect(url).toContain("wind_speed_unit=ms");
  });
});

describe("corTemperatura", () => {
  it("varre a escala frio → quente", () => {
    expect(corTemperatura(-25)).toBe("#4338CA");
    expect(corTemperatura(-5)).toBe("#22D3EE");
    expect(corTemperatura(20)).toBe("#FDE047");
    expect(corTemperatura(30)).toBe("#F97316");
    expect(corTemperatura(45)).toBe("#DC2626");
  });

  it("devolve cinza para valor inválido", () => {
    expect(corTemperatura(NaN)).toBe("#94A3B8");
  });
});

describe("rotuloTemperatura", () => {
  it("arredonda e acrescenta °", () => {
    expect(rotuloTemperatura(27.4)).toBe("27°");
    expect(rotuloTemperatura(-1.6)).toBe("-2°");
    expect(rotuloTemperatura(NaN)).toBe("—");
  });
});

describe("componentesVento", () => {
  it("vento de leste (90°) sopra para oeste — u negativo, v zero", () => {
    const { u, v } = componentesVento(10, 90);
    expect(u).toBeCloseTo(-10, 6);
    expect(v).toBeCloseTo(0, 6);
  });

  it("vento de sul (180°) sopra para norte — v positivo", () => {
    const { u, v } = componentesVento(10, 180);
    expect(u).toBeCloseTo(0, 6);
    expect(v).toBeCloseTo(10, 6);
  });

  it("valores inválidos devolvem vetor nulo", () => {
    expect(componentesVento(NaN, 90)).toEqual({ u: 0, v: 0 });
  });
});

describe("interpretarGrade", () => {
  const pontos: Array<[number, number]> = [
    [-34.8, -8.0],
    [-35.0, -8.5],
  ];

  it("interpreta a resposta em array (várias coordenadas)", () => {
    const leituras = interpretarGrade(
      [
        {
          latitude: -8.0,
          longitude: -34.8,
          current: {
            temperature_2m: 26.5,
            weather_code: 95,
            wind_speed_10m: 6.2,
            wind_direction_10m: 110,
          },
        },
        {
          latitude: -8.5,
          longitude: -35.0,
          current: {
            temperature_2m: 24.1,
            weather_code: 0,
            wind_speed_10m: 3.1,
            wind_direction_10m: 90,
          },
        },
      ],
      pontos,
    );
    expect(leituras).toHaveLength(2);
    expect(leituras[0].temperatura).toBe(26.5);
    expect(leituras[0].codigo).toBe(95);
    expect(leituras[1].ventoMs).toBeCloseTo(3.1);
  });

  it("interpreta resposta de coordenada única (objeto)", () => {
    const leituras = interpretarGrade(
      { latitude: -8.0, longitude: -34.8, current: { temperature_2m: 27, weather_code: 1 } },
      [pontos[0]],
    );
    expect(leituras).toHaveLength(1);
    expect(leituras[0].lng).toBe(-34.8);
  });

  it("descarta leituras sem temperatura utilizável", () => {
    const leituras = interpretarGrade(
      [{ latitude: -8.0, longitude: -34.8, current: {} }],
      [pontos[0]],
    );
    expect(leituras).toHaveLength(0);
  });
});

describe("gradeVento (bilinear)", () => {
  it("no nó exato devolve o vetor do ponto; no centro interpola", () => {
    // Grade 2×2: NO vento de sul 10 m/s (v=10), NE calmo, SO/SE vento de sul 20
    const leituras = [
      { lng: -36, lat: -7, temperatura: 25, codigo: 0, ventoMs: 10, direcao: 180, rajadaMs: NaN },
      { lng: -34, lat: -7, temperatura: 25, codigo: 0, ventoMs: 0, direcao: 0, rajadaMs: NaN },
      { lng: -36, lat: -9, temperatura: 25, codigo: 0, ventoMs: 20, direcao: 180, rajadaMs: NaN },
      { lng: -34, lat: -9, temperatura: 25, codigo: 0, ventoMs: 20, direcao: 180, rajadaMs: NaN },
    ];
    const g = gradeVento(r, 2, 2, leituras);
    const no = g.buscar(-36, -7);
    expect(no.v).toBeCloseTo(10, 5);
    const centro = g.buscar(-35, -8); // meio da grade
    expect(centro.v).toBeCloseTo(12.5, 1); // média dos quatro (0,10,20,20)
    const borda = g.buscar(-200, 90); // fora — gruda na borda
    expect(Number.isFinite(borda.u)).toBe(true);
  });
});
