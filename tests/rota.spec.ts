import { describe, expect, it } from "vitest";
import {
  andandoEmCirculos,
  comprimentoTrilhaM,
  contraRumo,
  deslocamentoLiquidoM,
  desvioTransversalM,
  deltaRumo,
  etaTexto,
  statusNavegacao,
  type RotaSalva,
} from "../src/lib/rota";

/** Converte deslocamento em metros para graus de latitude (aprox). */
const mParaGraus = (m: number) => m / 111_320;

const CENTRO = { lat: -15.7942, lng: -47.8822 }; // Brasília

const rotaRetilinha = (distM: number): RotaSalva => ({
  id: "r1",
  nome: "Rota de teste",
  criada_em: "2026-01-01T00:00:00.000Z",
  pontos: [
    { lat: CENTRO.lat, lng: CENTRO.lng, nome: "Base" },
    { lat: CENTRO.lat + mParaGraus(distM), lng: CENTRO.lng, nome: "Norte" },
  ],
});

describe("Guia de Rota — matemática de navegação", () => {
  it("contra-rumo soma/subtrai 180° corretamente", () => {
    expect(contraRumo(70)).toBe(250);
    expect(contraRumo(210)).toBe(30);
    expect(contraRumo(0)).toBe(180);
    expect(contraRumo(180)).toBe(0);
    expect(contraRumo(350)).toBe(170);
  });

  it("deltaRumo devolve a diferença com sinal (−180..180)", () => {
    expect(deltaRumo(90, 70)).toBe(20);
    expect(deltaRumo(10, 350)).toBe(20);
    expect(deltaRumo(350, 10)).toBe(-20);
    expect(deltaRumo(0, 0)).toBe(0);
  });

  it("desvio transversal: na perna → ~0 m; a 100 m de lado → ~100 m", () => {
    const a = { lat: CENTRO.lat, lng: CENTRO.lng };
    const b = { lat: CENTRO.lat + mParaGraus(1000), lng: CENTRO.lng };
    const naPerna = { lat: CENTRO.lat + mParaGraus(400), lng: CENTRO.lng };
    const deLado = { lat: CENTRO.lat + mParaGraus(400), lng: CENTRO.lng + mParaGraus(100) };
    expect(desvioTransversalM(naPerna, a, b)).toBeLessThan(1);
    expect(desvioTransversalM(deLado, a, b)).toBeGreaterThan(95);
    expect(desvioTransversalM(deLado, a, b)).toBeLessThan(105);
  });

  it("statusNavegacao: distância, rumo e chegada no raio", () => {
    const rota = rotaRetilinha(1000);
    const pos = { lat: CENTRO.lat + mParaGraus(990), lng: CENTRO.lng };
    const st = statusNavegacao({ pos, rota, indice: 1, rumoOperador: 0 });
    expect(st.distanciaM).toBeGreaterThan(5);
    expect(st.distanciaM).toBeLessThan(25);
    expect(st.chegou).toBe(true);
    expect(st.foraDaRota).toBe(false);
    expect(Math.abs(st.rumoAlvo)).toBeLessThanOrEqual(1);
  });

  it("statusNavegacao: fora da rota quando desvia além da tolerância", () => {
    const rota = rotaRetilinha(1000);
    const pos = {
      lat: CENTRO.lat + mParaGraus(500),
      lng: CENTRO.lng + mParaGraus(150), // 150 m de lado
    };
    const st = statusNavegacao({ pos, rota, indice: 1, rumoOperador: 0 });
    expect(st.foraDaRota).toBe(true);
    expect(st.desvioM).toBeGreaterThan(140);
    expect(st.rumoDeVolta).not.toBeNull();
  });

  it("fora da rota não dispara na primeira perna (sem ponto anterior)", () => {
    const rota = rotaRetilinha(1000);
    const pos = { lat: CENTRO.lat + mParaGraus(10), lng: CENTRO.lng + mParaGraus(150) };
    const st = statusNavegacao({ pos, rota, indice: 0, rumoOperador: null });
    expect(st.foraDaRota).toBe(false);
  });

  it("comprimento e deslocamento líquido da trilha", () => {
    const pontos: Array<[number, number]> = [
      [CENTRO.lng, CENTRO.lat],
      [CENTRO.lng, CENTRO.lat + mParaGraus(100)],
      [CENTRO.lng, CENTRO.lat + mParaGraus(200)],
    ];
    expect(comprimentoTrilhaM(pontos)).toBeGreaterThan(195);
    expect(comprimentoTrilhaM(pontos)).toBeLessThan(205);
    expect(deslocamentoLiquidoM(pontos)).toBeGreaterThan(195);
  });

  it("detecta andar em círculos: muito percorrido, pouco deslocamento", () => {
    // Círculo de ~250 m de raio em torno do centro: volta completa ≈ 1,6 km.
    const raioM = 250;
    const raioGraus = mParaGraus(raioM);
    const pontos: Array<[number, number]> = [];
    for (let a = 0; a <= 360; a += 10) {
      const rad = (a * Math.PI) / 180;
      pontos.push([CENTRO.lng + Math.sin(rad) * raioGraus, CENTRO.lat + Math.cos(rad) * raioGraus]);
    }
    expect(andandoEmCirculos(pontos)).toBe(true);

    // Linha reta de 1 km: deslocamento ≈ percorrido → não é círculo.
    const reta: Array<[number, number]> = [
      [CENTRO.lng, CENTRO.lat],
      [CENTRO.lng, CENTRO.lat + mParaGraus(1000)],
    ];
    expect(andandoEmCirculos(reta)).toBe(false);

    // Percorrido curto (< 400 m): nunca acusa.
    expect(
      andandoEmCirculos([
        [CENTRO.lng, CENTRO.lat],
        [CENTRO.lng, CENTRO.lat],
      ]),
    ).toBe(false);
  });

  it("etaTexto formata ETA com velocidade plausível", () => {
    expect(etaTexto(600, 1.4)).toBe("7 min"); // 1,4 m/s ≈ ritmo de caminhada
    expect(etaTexto(100, 1.4)).toBe("1 min");
    expect(etaTexto(10000, 1.4)).toBe("1h 59min");
    expect(etaTexto(600, 0.1)).toBeNull(); // parado/quase
    expect(etaTexto(600, null)).toBeNull();
  });
});
