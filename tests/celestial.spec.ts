import { describe, expect, it } from "vitest";
import {
  CRUZEIRO_DO_SUL,
  POLARIS,
  getCelestial,
  posicaoEquatorialParaHorizontal,
} from "../src/lib/celestial";

/** Procura, ao longo de um dia, o instante de culminação (menor ângulo horário). */
function culminacao(
  raDeg: number,
  lat: number,
  lng: number,
  base: Date,
): { azimuth: number; altitude: number } {
  let melhor = { azimuth: 0, altitude: 0 };
  let menorHa = 999;
  for (let m = 0; m < 24 * 60; m += 2) {
    const d = new Date(base.getTime() + m * 60_000);
    const jd = d.getTime() / 86400000 + 2440587.5;
    const gmst = (((280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360) + 360) % 360;
    const ha = Math.abs((((gmst + lng - raDeg) % 360) + 360) % 360);
    const haCorrigido = Math.min(ha, 360 - ha);
    if (haCorrigido < menorHa) {
      menorHa = haCorrigido;
      melhor = posicaoEquatorialParaHorizontal(raDeg, CRUZEIRO_DO_SUL.decDeg, lat, lng, d);
    }
  }
  return melhor;
}

describe("posição real do Cruzeiro do Sul e astros de referência", () => {
  it("culmina ao sul com a altura esperada em São Paulo (hemisfério sul)", () => {
    const lat = -23.55;
    const lng = -46.63;
    const c = culminacao(CRUZEIRO_DO_SUL.raDeg, lat, lng, new Date("2026-04-10T00:00:00Z"));
    // Na culminação o astro cruza o meridiano: azimute 180° (sul verdadeiro).
    expect(c.azimuth).toBeGreaterThan(178.5);
    expect(c.azimuth).toBeLessThan(181.5);
    // Altura de culminação = 90° − |φ − δ| = 90 − |−23,55 + 60,15| ≈ 53,4°.
    expect(c.altitude).toBeGreaterThan(51.9);
    expect(c.altitude).toBeLessThan(54.9);
  });

  it("é circumpolar no sul extremo (lat −55°): nunca se põe", () => {
    for (let h = 0; h < 24; h++) {
      const d = new Date(`2026-04-10T${String(h).padStart(2, "0")}:00:00Z`);
      const p = posicaoEquatorialParaHorizontal(
        CRUZEIRO_DO_SUL.raDeg,
        CRUZEIRO_DO_SUL.decDeg,
        -55,
        -60,
        d,
      );
      expect(p.altitude, `hora ${h}`).toBeGreaterThan(0);
    }
  });

  it("nunca nasce no norte (lat +50°): sempre abaixo do horizonte", () => {
    for (let h = 0; h < 24; h++) {
      const d = new Date(`2026-04-10T${String(h).padStart(2, "0")}:00:00Z`);
      const p = posicaoEquatorialParaHorizontal(
        CRUZEIRO_DO_SUL.raDeg,
        CRUZEIRO_DO_SUL.decDeg,
        50,
        0,
        d,
      );
      expect(p.altitude, `hora ${h}`).toBeLessThan(0);
    }
  });

  it("Polaris fica sempre a ~0° de azimute no hemisfério norte", () => {
    for (let h = 0; h < 24; h++) {
      const d = new Date(`2026-04-10T${String(h).padStart(2, "0")}:00:00Z`);
      const p = posicaoEquatorialParaHorizontal(POLARIS.raDeg, POLARIS.decDeg, 20, -100, d);
      const desvio = Math.min(p.azimuth, 360 - p.azimuth);
      expect(desvio, `hora ${h}`).toBeLessThan(3);
    }
  });

  it("getCelestial devolve posição coerente para o Cruzeiro do Sul no hemisfério sul", () => {
    const c = getCelestial(-15.79, -47.88, new Date("2026-04-10T03:00:00Z"));
    expect(c.starName).toBe("Cruzeiro do Sul");
    expect(c.starAzimuth).toBeGreaterThanOrEqual(0);
    expect(c.starAzimuth).toBeLessThan(360);
    expect(c.starUp).toBe(c.starAltitude > 0);
    // Perto da meia-noite de abril o Cruzeiro está alto no céu do Brasil central.
    expect(c.starAltitude).toBeGreaterThan(20);
    // Sol e Lua continuam com azimutes válidos.
    expect(c.sunAzimuth).toBeGreaterThanOrEqual(0);
    expect(c.sunAzimuth).toBeLessThan(360);
    expect(c.moonAzimuth).toBeGreaterThanOrEqual(0);
    expect(c.moonAzimuth).toBeLessThan(360);
  });

  it("getCelestial usa Polaris no hemisfério norte, com azimute ~0°", () => {
    const c = getCelestial(40.71, -74.0, new Date("2026-04-10T03:00:00Z"));
    expect(c.starName).toContain("Polaris");
    const desvio = Math.min(c.starAzimuth, 360 - c.starAzimuth);
    expect(desvio).toBeLessThan(3);
    expect(c.starUp).toBe(true);
  });

  it("a posição da estrela muda ao longo da noite (gira com o tempo sideral)", () => {
    const inicio = posicaoEquatorialParaHorizontal(
      CRUZEIRO_DO_SUL.raDeg,
      CRUZEIRO_DO_SUL.decDeg,
      -15.79,
      -47.88,
      new Date("2026-04-10T00:00:00Z"),
    );
    const fim = posicaoEquatorialParaHorizontal(
      CRUZEIRO_DO_SUL.raDeg,
      CRUZEIRO_DO_SUL.decDeg,
      -15.79,
      -47.88,
      new Date("2026-04-10T11:00:00Z"),
    );
    // Separação angular entre as duas posições no céu (lei dos cossenos).
    const rad = Math.PI / 180;
    const cosSepara =
      Math.sin(inicio.altitude * rad) * Math.sin(fim.altitude * rad) +
      Math.cos(inicio.altitude * rad) *
        Math.cos(fim.altitude * rad) *
        Math.cos((inicio.azimuth - fim.azimuth) * rad);
    const separacao = Math.acos(Math.max(-1, Math.min(1, cosSepara))) / rad;
    // Em 11 h o céu gira ~131° de ângulo horário: o Cruzeiro atravessa o céu.
    expect(separacao).toBeGreaterThan(30);
  });
});
