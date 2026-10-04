import { describe, expect, it } from "vitest";
import {
  parseTle,
  propagarSatelite,
  propagarSatelites,
  type TleSatelite,
} from "@/lib/satelite-propagacao";
import { centroidePais } from "@/lib/pais-centroides";

// TLE clássico de exemplo (documentação do satellite.js / Celestrak) —
// epoch antigo de propósito: o SGP4 propaga igualmente e a posição continua
// plausível (o teste valida faixas físicas, não precisão de época).
const ISS_LINHA1 = "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927";
const ISS_LINHA2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";

const TEXTO_GRUPO = `ISS (ZARYA)
${ISS_LINHA1}
${ISS_LINHA2}
TIANGONG
1 48274U 21035A   24270.51782528  .00016717  00000-0  10274-2 0  9993
2 48274  41.4700 300.0000 0005000 100.0000 260.0000 15.62000000320000
`;

describe("parse de TLE (formato Celestrak)", () => {
  it("extrai nome, NORAD e as duas linhas de cada bloco", () => {
    const lista = parseTle(TEXTO_GRUPO);
    expect(lista).toHaveLength(2);
    expect(lista[0]).toMatchObject({ norad: 25544, nome: "ISS (ZARYA)" });
    expect(lista[0].linha1).toBe(ISS_LINHA1);
    expect(lista[0].linha2).toBe(ISS_LINHA2);
    expect(lista[1]?.norad).toBe(48274);
  });

  it("retorna lista vazia para texto vazio ou inválido", () => {
    expect(parseTle("")).toEqual([]);
    expect(parseTle("sem linhas validas aqui")).toEqual([]);
  });
});

describe("propagação SGP4 local", () => {
  it("propaga a ISS para um instante físico plausível", () => {
    const tle: TleSatelite = {
      norad: 25544,
      nome: "ISS (ZARYA)",
      linha1: ISS_LINHA1,
      linha2: ISS_LINHA2,
    };
    const pos = propagarSatelite(tle, Date.now());
    expect(pos).not.toBeNull();
    expect(pos!.lat).toBeGreaterThanOrEqual(-90);
    expect(pos!.lat).toBeLessThanOrEqual(90);
    expect(pos!.lng).toBeGreaterThanOrEqual(-180);
    expect(pos!.lng).toBeLessThanOrEqual(180);
    // Inclinação da ISS ~51,6° — a latitude não pode passar disso.
    expect(Math.abs(pos!.lat)).toBeLessThanOrEqual(52.5);
    // Órbita LEO: entre 300 e 500 km de altitude.
    expect(pos!.altitudeKm).toBeGreaterThan(300);
    expect(pos!.altitudeKm).toBeLessThan(500);
    // Velocidade orbital: ~27.000–28.500 km/h.
    expect(pos!.velocidadeKmh).toBeGreaterThan(25000);
    expect(pos!.velocidadeKmh).toBeLessThan(30000);
  });

  it("descarta satélite com TLE corrompido e segue a lista", () => {
    const bons: TleSatelite[] = [
      { norad: 25544, nome: "ISS (ZARYA)", linha1: ISS_LINHA1, linha2: ISS_LINHA2 },
    ];
    const quebrado: TleSatelite = {
      norad: 99999,
      nome: "lixo",
      linha1: "1 99999U 00000A   99999.99999999  .00000000  00000-0  00000-0 0  9990",
      linha2: "2 99999 000.0000 000.0000 0000000 000.0000 000.0000 00.00000000000000",
    };
    const saida = propagarSatelites([quebrado, ...bons], Date.now());
    expect(saida).toHaveLength(bons.length);
    expect(saida[0]?.nome).toBe("ISS (ZARYA)");
  });

  it("dois instantes distintos movem o satélite (posição muda)", () => {
    const tle: TleSatelite = {
      norad: 25544,
      nome: "ISS (ZARYA)",
      linha1: ISS_LINHA1,
      linha2: ISS_LINHA2,
    };
    const a = propagarSatelite(tle, Date.now());
    const b = propagarSatelite(tle, Date.now() + 45 * 60 * 1000); // meia órbita
    expect(a && b).toBeTruthy();
    // Em ~45 min a ISS anda mais de meia volta: as posições divergem bem.
    const deslocou = Math.abs(a!.lng - b!.lng) + Math.abs(a!.lat - b!.lat);
    expect(deslocou).toBeGreaterThan(10);
  });
});

describe("centroide de países (geolocalização das manchetes GDELT)", () => {
  it("resolve nomes diretos, com sufixo e case-insensitive", () => {
    const brasil = centroidePais("Brazil");
    expect(brasil).not.toBeNull();
    expect(brasil![0]).toBeLessThan(-40); // lng oeste
    expect(brasil![1]).toBeLessThan(0); // lat sul

    // Igual em qualquer caixa e com anotação da fonte.
    expect(centroidePais("brazil")).toEqual(brasil);
    expect(centroidePais("United States (north)")).toEqual(centroidePais("United States"));

    // Outros países conhecidos.
    expect(centroidePais("Portugal")).not.toBeNull();
    expect(centroidePais("Japan")).not.toBeNull();
  });

  it("retorna null para país fora da tabela", () => {
    expect(centroidePais("Atlantida")).toBeNull();
    expect(centroidePais("")).toBeNull();
  });
});
