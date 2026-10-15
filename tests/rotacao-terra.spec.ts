import { describe, expect, it } from "vitest";
import {
  DIA_SIDERAL_S,
  GRAUS_POR_SEGUNDO,
  longitudeSubsolar,
  normalizarLng,
} from "@/lib/rotacao-terra";

describe("rotação real da Terra", () => {
  it("a velocidade angular é 360° por dia sideral (~0,004178°/s)", () => {
    expect(DIA_SIDERAL_S).toBeCloseTo(86164.0905, 4);
    expect(GRAUS_POR_SEGUNDO).toBeGreaterThan(0.00417);
    expect(GRAUS_POR_SEGUNDO).toBeLessThan(0.00419);
  });

  it("normaliza longitudes para [-180, 180)", () => {
    expect(normalizarLng(0)).toBe(0);
    expect(normalizarLng(42)).toBe(42);
    expect(normalizarLng(180)).toBe(-180);
    expect(normalizarLng(-180)).toBe(-180);
    expect(normalizarLng(190)).toBe(-170);
    expect(normalizarLng(-190)).toBe(170);
    expect(normalizarLng(360 + 42)).toBe(42);
    expect(normalizarLng(-360 - 42)).toBe(-42);
    expect(normalizarLng(720.5)).toBe(0.5);
  });

  it("ao meio-dia UTC o Sol está a pino perto de Greenwich (±equação do tempo)", () => {
    // A equação do tempo nunca passa de ±14 min → |longitude| < 3,6°
    // em qualquer data; 15/01 (EoT ≈ -9 min) põe o pino em ~+2,3°.
    const meioDia = longitudeSubsolar(new Date("2025-01-15T12:00:00Z"));
    expect(Math.abs(meioDia)).toBeLessThan(4);
    const meioDiaJunho = longitudeSubsolar(new Date("2025-06-21T12:00:00Z"));
    expect(Math.abs(meioDiaJunho)).toBeLessThan(4);
  });

  it("à meia-noite UTC o Sol está a pino perto do antimeridiano", () => {
    const meiaNoite = longitudeSubsolar(new Date("2025-01-15T00:00:00Z"));
    const ateAntimeridiano = Math.min(Math.abs(meiaNoite - 180), Math.abs(meiaNoite + 180));
    expect(ateAntimeridiano).toBeLessThan(4);
  });

  it("o pino caminha para oeste: 6 horas depois está ~90° a oeste", () => {
    const aoMeioDia = longitudeSubsolar(new Date("2025-06-21T12:00:00Z"));
    const asDezoito = longitudeSubsolar(new Date("2025-06-21T18:00:00Z"));
    const delta = normalizarLng(asDezoito - aoMeioDia);
    expect(delta).toBeLessThan(-85);
    expect(delta).toBeGreaterThan(-95);
  });

  it("a rotação em 1 minuto de tempo real anda ~0,25°", () => {
    const passo = GRAUS_POR_SEGUNDO * 60;
    expect(passo).toBeGreaterThan(0.24);
    expect(passo).toBeLessThan(0.26);
  });
});
