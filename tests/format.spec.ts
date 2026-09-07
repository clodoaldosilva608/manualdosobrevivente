import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDegrees,
  formatDistance,
  formatKilograms,
  formatNumber,
  formatSignedDegrees,
  formatWeight,
  formatAreaAll,
  formatDuration,
} from "../src/lib/format";

describe("formatação pt-BR", () => {
  it("números usam vírgula decimal e ponto de milhar", () => {
    expect(formatNumber(1234.5, 1)).toBe("1.234,5");
  });

  it("distâncias alternam entre metros e quilômetros", () => {
    expect(formatDistance(875)).toBe("875,0 m");
    expect(formatDistance(12340)).toBe("12,34 km");
  });

  it("pesos alternam entre gramas e quilos", () => {
    expect(formatWeight(850)).toBe("850 g");
    expect(formatWeight(12345)).toBe("12,35 kg");
    expect(formatKilograms(12000)).toBe("12,00 kg");
  });

  it("ângulos e declinação", () => {
    expect(formatDegrees(127.4)).toBe("127°");
    expect(formatSignedDegrees(-21.34)).toBe("-21,3°");
    expect(formatSignedDegrees(3)).toBe("+3,0°");
  });

  it("áreas em m², hectares e acres", () => {
    const a = formatAreaAll(12345);
    expect(a.m2).toBe("12.345,0 m²");
    expect(a.ha).toBe("1,235 ha");
  });

  it("datas no formato brasileiro", () => {
    expect(formatDate("2026-09-07T12:00:00Z")).toBe("07/09/2026");
    expect(formatDate("valor inválido")).toBe("—");
  });

  it("durações legíveis", () => {
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(3900)).toBe("1 h 05 min");
  });
});
