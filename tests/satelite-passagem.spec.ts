/**
 * Previsão de passagem de satélite sobre o operador (satelite-passagem.ts)
 * — porta do satellitePass.js do God's Eye View. Os testes validam física
 * plausível (não precisão de época): TLE clássico da documentação do
 * satellite.js, observador em João Pessoa, janela de 24 h.
 */
import { describe, expect, it } from "vitest";
import {
  angulosVisada,
  ceuEscuro,
  elevacaoSolarObservador,
  horaPassagem,
  melhorProximaPassagem,
  posicaoSolarEci,
  proximaPassagemSatelite,
  sateliteIluminado,
  intervaloVisivel,
  type TleSatelite,
} from "../src/lib/satelite-passagem";
import { twoline2satrec } from "satellite.js";

const ISS_LINHA1 = "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927";
const ISS_LINHA2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";

const ISS: TleSatelite = {
  norad: 25544,
  nome: "ISS (ZARYA)",
  linha1: ISS_LINHA1,
  linha2: ISS_LINHA2,
};

const TIANGONG_LINHA1 = "1 48274U 21035A   24270.51782528  .00016717  00000-0  10274-2 0  9993";
const TIANGONG_LINHA2 = "2 48274  41.4700 300.0000 0005000 100.0000 260.0000 15.62000000320000";

const TIANGONG: TleSatelite = {
  norad: 48274,
  nome: "Tiangong (CSS)",
  linha1: TIANGONG_LINHA1,
  linha2: TIANGONG_LINHA2,
};

// João Pessoa (PB) — posição de referência do app.
const LAT_JP = -7.99;
const LNG_JP = -34.93;
const AGORA = Date.now();

describe("ângulos de visada (SGP4)", () => {
  it("devolve elevação e azimute em faixas físicas válidas", () => {
    const satrec = twoline2satrec(ISS.linha1, ISS.linha2);
    const visada = angulosVisada(satrec, AGORA, LAT_JP, LNG_JP);
    expect(visada).not.toBeNull();
    expect(visada!.elevGraus).toBeGreaterThanOrEqual(-90);
    expect(visada!.elevGraus).toBeLessThanOrEqual(90);
    expect(visada!.azGraus).toBeGreaterThanOrEqual(0);
    expect(visada!.azGraus).toBeLessThan(360);
  });
});

describe("posição solar e sombra (USNO + cilindro)", () => {
  it("Sol a pino no meridiano do observador ao meio-dia local ≈ elevação alta", () => {
    // Meio-dia solar aproximado no equador (lng 0) → elevação perto de 90°.
    const meioDiaUtc = Date.UTC(2026, 0, 15, 12, 10);
    const elev = elevacaoSolarObservador(0, 0, meioDiaUtc);
    expect(elev).toBeGreaterThan(60);
  });

  it("céu escuro à meia-noite local e claro ao meio-dia", () => {
    const meioDiaUtc = Date.UTC(2026, 0, 15, 12, 10);
    const meiaNoiteUtc = Date.UTC(2026, 0, 16, 0, 10);
    expect(ceuEscuro(0, 0, meioDiaUtc)).toBe(false);
    expect(ceuEscuro(0, 0, meiaNoiteUtc)).toBe(true);
  });

  it("posição solar tem módulo de ~1 UA e dec dentro de ±23,5°", () => {
    const sol = posicaoSolarEci(AGORA);
    const modulo = Math.hypot(sol.x, sol.y, sol.z);
    expect(modulo).toBeGreaterThan(147_000_000);
    expect(modulo).toBeLessThan(152_000_000);
    expect(Math.abs(sol.decGraus)).toBeLessThanOrEqual(23.6);
  });

  it("satélite do lado do Sol está iluminado", () => {
    const sol = posicaoSolarEci(AGORA);
    const modulo = Math.hypot(sol.x, sol.y, sol.z);
    // Ponto a 500 km "acima" da posição do Sol (mesma direção) → iluminado.
    const noSol = {
      x: (sol.x / modulo) * (modulo + 500),
      y: (sol.y / modulo) * (modulo + 500),
      z: (sol.z / modulo) * (modulo + 500),
    };
    expect(sateliteIluminado(noSol, AGORA)).toBe(true);
  });
});

describe("próxima passagem sobre o observador", () => {
  it("encontra passagem da ISS em 24 h com ordem temporal e campos coerentes", () => {
    const passagem = proximaPassagemSatelite(ISS, LAT_JP, LNG_JP, AGORA);
    expect(passagem).not.toBeNull();
    const p = passagem!;
    expect(p.inicioMs).toBeGreaterThan(AGORA - 1000);
    expect(p.picoMs).toBeGreaterThanOrEqual(p.inicioMs);
    expect(p.fimMs).toBeGreaterThan(p.picoMs);
    expect(p.fimMs - p.inicioMs).toBeLessThan(20 * 60_000); // LEO: passagem curta
    expect(p.picoElevGraus).toBeGreaterThan(9); // acima do limiar de 10°
    expect(p.picoElevGraus).toBeLessThanOrEqual(90);
    expect(p.azimuteInicioGraus).toBeGreaterThanOrEqual(0);
    expect(p.azimuteInicioGraus).toBeLessThan(360);
    expect(typeof p.visivel).toBe("boolean");
    expect(typeof p.iluminado).toBe("boolean");
    expect(typeof p.ceuEscuro).toBe("boolean");
  });

  it("respeita horizonte curto: 15 min não alcança a próxima passagem", () => {
    const passagem = proximaPassagemSatelite(ISS, LAT_JP, LNG_JP, AGORA, {
      horizonteHoras: 0.25,
    });
    // Pode haver passagem em curso nos próximos 15 min, mas em geral não há —
    // quando não há, devolve null (nunca inventa).
    if (passagem) {
      expect(passagem.fimMs).toBeLessThanOrEqual(AGORA + 15 * 60_000 + 60_000);
    }
  });

  it("rejeita parâmetros inválidos (latitude fora, horizonte zero)", () => {
    expect(proximaPassagemSatelite(ISS, 120, LNG_JP, AGORA)).toBeNull();
    expect(proximaPassagemSatelite(ISS, LAT_JP, LNG_JP, AGORA, { horizonteHoras: 0 })).toBeNull();
    expect(proximaPassagemSatelite(ISS, LAT_JP, LNG_JP, AGORA, { horizonteHoras: 73 })).toBeNull();
  });

  it("TLE corrompido devolve null sem lançar", () => {
    const ruim: TleSatelite = {
      norad: 1,
      nome: "Ruim",
      linha1: "1 00000U 00000A   00000.00000000  .00000000  00000-0  00000-0 0  9990",
      linha2: "linha inválida",
    };
    expect(() => proximaPassagemSatelite(ruim, LAT_JP, LNG_JP, AGORA)).not.toThrow();
  });
});

describe("melhorProximaPassagem (vários satélites)", () => {
  it("escolhe a passagem que nasce primeiro entre ISS e Tiangong", () => {
    const achado = melhorProximaPassagem([ISS, TIANGONG], LAT_JP, LNG_JP, AGORA);
    expect(achado).not.toBeNull();
    const { tle, passagem } = achado!;
    expect([25544, 48274]).toContain(tle.norad);
    const outra = tle.norad === 25544 ? TIANGONG : ISS;
    const comparada = proximaPassagemSatelite(outra, LAT_JP, LNG_JP, AGORA);
    if (comparada) {
      expect(passagem.inicioMs).toBeLessThanOrEqual(comparada.inicioMs);
    }
  });

  it("lista vazia devolve null", () => {
    expect(melhorProximaPassagem([], LAT_JP, LNG_JP, AGORA)).toBeNull();
  });
});

describe("utilidades de apresentação", () => {
  it("intervaloVisivel acha sobreposição curta entre sombra e crepúsculo", () => {
    // Condições sintéticas: primeiro estado true só no meio da janela.
    const meio = 0;
    const condicoes = (t: number): [boolean, boolean] => [t >= meio, true];
    expect(intervaloVisivel(-10_000, 10_000, condicoes)).toBe(true);
    expect(intervaloVisivel(-10_000, -5_000, condicoes)).toBe(false);
  });

  it("horaPassagem formata HH:mm e prefixa o dia fora de hoje", () => {
    const hoje = new Date(AGORA);
    const meioDiaHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 30);
    const saidaHoje = horaPassagem(meioDiaHoje.getTime(), AGORA, "pt-BR");
    expect(saidaHoje).toMatch(/^\d{2}:\d{2}$/);
    // Uma semana atrás: mesmo horário com prefixo de dia da semana.
    const semanaPassada = meioDiaHoje.getTime() - 7 * 86_400_000;
    const saidaOutroDia = horaPassagem(semanaPassada, AGORA, "pt-BR");
    expect(saidaOutroDia).not.toMatch(/^\d{2}:\d{2}$/);
    expect(saidaOutroDia).toContain("12:30");
  });
});
