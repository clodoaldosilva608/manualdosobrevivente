import { describe, expect, it } from "vitest";
import {
  anguloManobra,
  anuncioManobra,
  avancarNavegacaoRuas,
  distanciaFalavel,
  iconeManobra,
  manobrasFC,
  parsearRotaOSRM,
  resumoRotaRuas,
  rotaRuasFC,
  textoManobra,
  type AnunciosRuas,
  type RotaRuas,
} from "../src/lib/rota-ruas";

/** Identidade: o teste roda no idioma padrão (pt-BR). */
const t = (texto: string, vars?: Record<string, string | number>) => {
  if (!vars) return texto;
  let saida = texto;
  for (const [k, v] of Object.entries(vars)) saida = saida.split(`{${k}}`).join(String(v));
  return saida;
};

const mParaGraus = (m: number) => m / 111_320;
const LNG = -47.8822;
const LAT0 = -15.7942;

/** Geometria em linha reta para o norte, 1 vértice a cada `passo` metros. */
function geometriaReta(totalM: number, passoM: number): Array<[number, number]> {
  const pontos: Array<[number, number]> = [];
  for (let d = 0; d <= totalM; d += passoM) pontos.push([LNG, LAT0 + mParaGraus(d)]);
  return pontos;
}

/** Rota sintética: partida → vire à esquerda aos 500 m → chegue aos 1000 m. */
function rotaSintetica(): RotaRuas {
  const geometria = geometriaReta(1000, 100);
  return {
    id: "r1",
    nome: "Rota de teste",
    geometria,
    manobras: [
      {
        lat: LAT0,
        lng: LNG,
        tipo: "depart",
        modificador: null,
        rua: "Av. Central",
        saida: null,
        distanciaM: 500,
        indiceVertice: 0,
      },
      {
        lat: LAT0 + mParaGraus(500),
        lng: LNG,
        tipo: "turn",
        modificador: "left",
        rua: "Rua do Farol",
        saida: null,
        distanciaM: 500,
        indiceVertice: 5,
      },
      {
        lat: LAT0 + mParaGraus(1000),
        lng: LNG,
        tipo: "arrive",
        modificador: null,
        rua: null,
        saida: null,
        distanciaM: 0,
        indiceVertice: 10,
      },
    ],
    distanciaM: 1000,
    duracaoS: 600,
    destinoNome: "Farol",
    destinoLat: LAT0 + mParaGraus(1000),
    destinoLng: LNG,
    perfil: "carro",
    criada_em: "2026-01-01T00:00:00.000Z",
  };
}

const posNaDistancia = (dM: number) => ({ lat: LAT0 + mParaGraus(dM), lng: LNG });

describe("Rota de ruas — ícones e ângulos", () => {
  it("mapeia tipo+modificador do OSRM para a forma visual", () => {
    expect(iconeManobra("depart", null)).toBe("partida");
    expect(iconeManobra("arrive", null)).toBe("chegada");
    expect(iconeManobra("turn", "right")).toBe("direita");
    expect(iconeManobra("turn", "left")).toBe("esquerda");
    expect(iconeManobra("turn", "slight right")).toBe("leve-direita");
    expect(iconeManobra("turn", "sharp left")).toBe("acentuada-esquerda");
    expect(iconeManobra("turn", "uturn")).toBe("retorno");
    expect(iconeManobra("roundabout", null)).toBe("rotatoria");
    expect(iconeManobra("on ramp", "right")).toBe("acesso");
    expect(iconeManobra("off ramp", "left")).toBe("saida");
    expect(iconeManobra("fork", "straight")).toBe("frente");
    expect(iconeManobra("end of road", "right")).toBe("direita");
    expect(iconeManobra("new name", null)).toBe("frente");
  });

  it("ângulos das setas: direita 90, esquerda −90, retorno 180, chegada sem seta", () => {
    expect(anguloManobra("direita")).toBe(90);
    expect(anguloManobra("esquerda")).toBe(-90);
    expect(anguloManobra("leve-direita")).toBe(40);
    expect(anguloManobra("retorno")).toBe(180);
    expect(anguloManobra("chegada")).toBeNull();
    expect(anguloManobra("rotatoria")).toBeNull();
  });
});

describe("Rota de ruas — texto das instruções", () => {
  it("vire à esquerda na rua", () => {
    const texto = textoManobra(
      { tipo: "turn", modificador: "left", rua: "Rua do Farol", saida: null },
      t,
    );
    expect(texto).toBe("Vire à esquerda na Rua do Farol");
  });

  it("sem rua: instrução limpa", () => {
    const texto = textoManobra({ tipo: "turn", modificador: "right", rua: null, saida: null }, t);
    expect(texto).toBe("Vire à direita");
  });

  it("rotatória com saída, retorno, end of road e chegada", () => {
    expect(textoManobra({ tipo: "roundabout", modificador: null, rua: null, saida: 2 }, t)).toBe(
      "Na rotatória, pegue a 2ª saída",
    );
    expect(textoManobra({ tipo: "turn", modificador: "uturn", rua: null, saida: null }, t)).toBe(
      "Faça o retorno",
    );
    expect(
      textoManobra({ tipo: "end of road", modificador: "right", rua: "Av. Sul", saida: null }, t),
    ).toBe("No fim da via, vire à direita na Av. Sul");
    expect(textoManobra({ tipo: "arrive", modificador: null, rua: null, saida: null }, t)).toBe(
      "Chegou ao destino",
    );
    expect(
      textoManobra({ tipo: "depart", modificador: null, rua: "Av. Central", saida: null }, t),
    ).toBe("Siga pela Av. Central");
  });

  it("distância falável: metros arredondados e quilômetros com vírgula", () => {
    expect(distanciaFalavel(85)).toBe("90 metros");
    expect(distanciaFalavel(312)).toBe("300 metros");
    expect(distanciaFalavel(1200)).toBe("1,2 quilômetros");
    expect(distanciaFalavel(1000)).toBe("1,0 quilômetro");
    expect(distanciaFalavel(12300)).toBe("12 quilômetros");
    expect(anuncioManobra(300, "Vire à direita", t)).toBe("Em 300 metros, Vire à direita");
    expect(anuncioManobra(20, "Vire à direita", t)).toBe("Vire à direita agora");
  });

  it("resumo curto: distância + duração", () => {
    expect(resumoRotaRuas({ distanciaM: 4200, duracaoS: 720 })).toBe("4,2 km · 12 min");
    expect(resumoRotaRuas({ distanciaM: 850, duracaoS: 90 })).toBe("850 m · 2 min");
  });
});

describe("Rota de ruas — parser do OSRM", () => {
  const FIXTURA = {
    code: "Ok",
    routes: [
      {
        distance: 1500,
        duration: 240,
        geometry: {
          coordinates: [
            [0, 0],
            [0.004, 0],
            [0.004, 0.004],
          ] as Array<[number, number]>,
        },
        legs: [
          {
            steps: [
              {
                distance: 500,
                name: "Rua A",
                maneuver: { type: "depart", location: [0, 0] as [number, number] },
              },
              {
                distance: 700,
                name: "Rua B",
                maneuver: {
                  type: "turn",
                  modifier: "right",
                  location: [0.004, 0] as [number, number],
                },
              },
              {
                distance: 300,
                name: "",
                maneuver: { type: "arrive", location: [0.004, 0.004] as [number, number] },
              },
            ],
          },
        ],
      },
    ],
  };

  it("extrai geometria, manobras e o nome da via seguinte", () => {
    const rota = parsearRotaOSRM(FIXTURA, "Casa", {
      nome: "Trabalho",
      lat: 0.004,
      lng: 0.004,
      perfil: "carro",
    });
    expect(rota).not.toBeNull();
    expect(rota!.geometria).toHaveLength(3);
    expect(rota!.distanciaM).toBe(1500);
    expect(rota!.duracaoS).toBe(240);
    expect(rota!.manobras).toHaveLength(3);
    // depart: a via é a que você já está (nome do próprio passo); o turn
    // pega a rua DEPOIS dele (passo seguinte sem nome → null).
    expect(rota!.manobras[0].rua).toBe("Rua A");
    expect(rota!.manobras[1].tipo).toBe("turn");
    expect(rota!.manobras[1].modificador).toBe("right");
    expect(rota!.manobras[1].rua).toBeNull();
    expect(rota!.manobras[2].tipo).toBe("arrive");
    // destino preservado para recálculo
    expect(rota!.destinoLat).toBe(0.004);
    expect(rota!.perfil).toBe("carro");
    // índices de vértice mapeados na geometria
    expect(rota!.manobras[0].indiceVertice).toBe(0);
    expect(rota!.manobras[2].indiceVertice).toBe(2);
  });

  it("respostas inválidas devolvem null", () => {
    expect(
      parsearRotaOSRM({ code: "NoRoute" }, "x", { nome: "x", lat: 0, lng: 0, perfil: "carro" }),
    ).toBeNull();
    expect(parsearRotaOSRM({}, "x", { nome: "x", lat: 0, lng: 0, perfil: "carro" })).toBeNull();
    expect(
      parsearRotaOSRM(
        { routes: [{ distance: 10, duration: 5, geometry: { coordinates: [[0, 0]] } }] } as never,
        "x",
        {
          nome: "x",
          lat: 0,
          lng: 0,
          perfil: "carro",
        },
      ),
    ).toBeNull();
  });
});

describe("Rota de ruas — FeatureCollections do mapa", () => {
  it("traçado = 1 LineString; manobras com cor e ângulo", () => {
    const rota = rotaSintetica();
    const linha = rotaRuasFC(rota);
    expect(linha.features).toHaveLength(1);
    expect(linha.features[0].geometry.type).toBe("LineString");

    const pontos = manobrasFC(rota);
    expect(pontos.features).toHaveLength(3);
    const turn = pontos.features[1];
    expect(turn.properties?.["cor"]).toBe("#FFC24D");
    expect(turn.properties?.["angulo"]).toBe(-90); // esquerda
    const chegada = pontos.features[2];
    expect(chegada.properties?.["cor"]).toBe("#4ADE80");
    expect(chegada.properties?.["angulo"]).toBeNull();

    expect(rotaRuasFC(null).features).toHaveLength(0);
  });
});

describe("Rota de ruas — navegação virada a virada", () => {
  const rota = rotaSintetica();

  it("no início: anuncia a primeira manobra a 500 m e mostra a instrução", () => {
    const res = avancarNavegacaoRuas({
      pos: posNaDistancia(30),
      rota,
      indice: 1,
      anunciados: {},
      t,
    });
    expect(res.status.indice).toBe(1);
    expect(res.status.instrucao).toBe("Vire à esquerda na Rua do Farol");
    expect(res.status.icone).toBe("esquerda");
    expect(res.status.distanciaProximaM).toBeGreaterThan(440);
    expect(res.status.distanciaProximaM).toBeLessThan(500);
    expect(res.status.chegou).toBe(false);
    expect(res.status.foraDaRota).toBe(false);
    // primeiro limiar atingido (470 m ≤ 1 km): fala o anúncio com a distância real
    expect(res.fala).toContain("Vire à esquerda na Rua do Farol");
    expect(res.fala).toMatch(/^Em \d+ metros/);
    expect(res.anunciados.km1).toBe(true);
  });

  it("limiares falam em sequência (1 km → 500 m) e não repetem", () => {
    const anunciados: AnunciosRuas = { km1: true };
    const res = avancarNavegacaoRuas({
      pos: posNaDistancia(60),
      rota,
      indice: 1,
      anunciados,
      t,
    });
    // km1 já falado; agora entra o limiar dos 500 m (com a distância real)
    expect(res.fala).toMatch(/^Em 4\d0 metros/);
    expect(res.anunciados.m500).toBe(true);
    const deNovo = avancarNavegacaoRuas({
      pos: posNaDistancia(60),
      rota,
      indice: res.indice,
      anunciados: res.anunciados,
      t,
    });
    expect(deNovo.fala).toBeNull();
  });

  it("ao passar da manobra, avança o alvo e reinicia os avisos", () => {
    const res = avancarNavegacaoRuas({
      pos: posNaDistancia(560),
      rota,
      indice: 1,
      anunciados: { km1: true, m500: true, m100: true },
      t,
    });
    expect(res.status.indice).toBe(2);
    expect(res.status.instrucao).toBe("Chegou ao destino");
    // avisos zerados: o limiar da nova manobra pode falar de novo
    expect(res.anunciados.m500).toBeUndefined();
    expect(res.status.distanciaRestanteM).toBeLessThan(450);
  });

  it("fora da rota: sinaliza e silencia os limiares até voltar ao traçado", () => {
    const desviado = { lat: posNaDistancia(400).lat, lng: LNG + mParaGraus(100) };
    const res = avancarNavegacaoRuas({
      pos: desviado,
      rota,
      indice: 1,
      anunciados: { km1: true },
      t,
    });
    expect(res.status.foraDaRota).toBe(true);
    expect(res.fala).toBe("Você saiu da rota");
    const deNovo = avancarNavegacaoRuas({
      pos: desviado,
      rota,
      indice: res.indice,
      anunciados: res.anunciados,
      t,
    });
    expect(deNovo.fala).toBeNull(); // já avisou, continua silencioso fora do traçado
    // de volta ao traçado: os limiares voltam a falar
    const voltou = avancarNavegacaoRuas({
      pos: posNaDistancia(430),
      rota,
      indice: deNovo.indice,
      anunciados: deNovo.anunciados,
      t,
    });
    expect(voltou.status.foraDaRota).toBe(false);
    expect(voltou.fala).toMatch(/^Em \d+ metros/);
  });

  it("chegada: dentro do raio final, avisa e encerra", () => {
    const res = avancarNavegacaoRuas({
      pos: posNaDistancia(985),
      rota,
      indice: 2,
      anunciados: {},
      t,
    });
    expect(res.status.chegou).toBe(true);
    expect(res.fala).toBe("Você chegou ao destino");
  });

  it("sem anúncio antes dos limiares (rota longa, 2 km até a manobra)", () => {
    const longa: RotaRuas = {
      ...rota,
      geometria: geometriaReta(3000, 100),
      manobras: [
        { ...rota.manobras[0], distanciaM: 2000, indiceVertice: 0 },
        { ...rota.manobras[1], distanciaM: 1000, indiceVertice: 20 },
        { ...rota.manobras[2], indiceVertice: 30 },
      ],
    };
    const res = avancarNavegacaoRuas({
      pos: posNaDistancia(50),
      rota: longa,
      indice: 1,
      anunciados: {},
      t,
    });
    expect(res.fala).toBeNull(); // 1950 m > 1000 m: nada a falar ainda
    const aKm1 = avancarNavegacaoRuas({
      pos: posNaDistancia(1050),
      rota: longa,
      indice: 1,
      anunciados: {},
      t,
    });
    expect(aKm1.fala).not.toBeNull();
    expect(aKm1.fala).toMatch(/^Em 950 metros/);
  });
});
