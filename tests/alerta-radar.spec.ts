import { describe, expect, it } from "vitest";
import {
  avaliarProximidade,
  contarAmeacas,
  horaRelativa,
  type AlertaProximidade,
} from "../src/lib/alerta-radar";
import type { IntelAlerta, IntelSnapshot } from "../src/lib/intel.types";

const REF = { lng: -46.63, lat: -23.55 }; // São Paulo
const AGORA = Date.parse("2026-04-10T12:00:00Z");

function snapshot(par: Partial<IntelSnapshot>): IntelSnapshot {
  return {
    sismos: [],
    eventos: [],
    incendios: [],
    incendiosDisponivel: true,
    climaEspacial: null,
    atualizadoEm: AGORA,
    falhas: [],
    ...par,
  };
}

const EM_OSP = { lng: -46.63, lat: -23.55 }; // 0 km
const EM_VICINHO = { lng: -46.36, lat: -23.55 }; // ~28 km
const EM_SOROCABA = { lng: -47.45, lat: -23.5 }; // ~69 km
const EM_INTERIOR = { lng: -45.0, lat: -23.3 }; // ~170 km

describe("radar de proximidade — MODO ALERTA", () => {
  it("foco de calor a 0 km é crítico e a ~70 km sai do radar", () => {
    const s = snapshot({
      incendios: [
        {
          id: "f1",
          lng: EM_OSP.lng,
          lat: EM_OSP.lat,
          hora: "2026-04-10T11:00:00Z",
          confianca: "h",
        },
        {
          id: "f2",
          lng: EM_SOROCABA.lng,
          lat: EM_SOROCABA.lat,
          hora: "2026-04-10T11:00:00Z",
          confianca: "l",
        },
      ],
    });
    const itens = avaliarProximidade(s, null, REF);
    const f1 = itens.find((i) => i.id === "firms:f1");
    expect(f1?.nivel).toBe("critico");
    expect(f1?.distanciaKm).toBeLessThan(1);
    expect(itens.find((i) => i.id === "firms:f2")).toBeUndefined();
  });

  it("foco entre 15 e 50 km é atenção", () => {
    const s = snapshot({
      incendios: [
        {
          id: "g1",
          lng: EM_VICINHO.lng,
          lat: EM_VICINHO.lat,
          hora: "2026-04-10T11:30:00Z",
          confianca: "m",
        },
      ],
    });
    const [unico] = avaliarProximidade(s, null, REF);
    expect(unico.nivel).toBe("atencao");
    expect(unico.distanciaKm ?? 0).toBeGreaterThan(15);
    expect(unico.distanciaKm ?? 99).toBeLessThan(50);
  });

  it("sismo M5,8 a ~360 km é crítico; M4,2 a ~13 km é atenção", () => {
    const s = snapshot({
      sismos: [
        {
          id: "s1",
          lng: EM_INTERIOR.lng,
          lat: EM_INTERIOR.lat,
          mag: 5.8,
          profundidade: 30,
          lugar: "costa do RJ",
          hora: AGORA - 40 * 60_000,
          url: "https://earthquake.usgs.gov/s1",
          tsunami: false,
        },
        {
          id: "s2",
          lng: EM_VICINHO.lng,
          lat: EM_VICINHO.lat,
          mag: 4.2,
          profundidade: 10,
          lugar: "Grande SP",
          hora: AGORA - 90_000,
          url: "",
          tsunami: false,
        },
      ],
    });
    const itens = avaliarProximidade(s, null, REF);
    expect(itens.find((i) => i.id === "usgs:s1")?.nivel).toBe("critico");
    expect(itens.find((i) => i.id === "usgs:s2")?.nivel).toBe("atencao");
  });

  it("sismo fraco (M3) e longe (M4 a 900 km) não entram", () => {
    const s = snapshot({
      sismos: [
        {
          id: "s3",
          lng: EM_OSP.lng,
          lat: EM_OSP.lat,
          mag: 3.2,
          profundidade: 5,
          lugar: "SP",
          hora: AGORA,
          url: "",
          tsunami: false,
        },
        {
          id: "s4",
          lng: -60,
          lat: -10,
          mag: 4.6,
          profundidade: 20,
          lugar: "AM",
          hora: AGORA,
          url: "",
          tsunami: false,
        },
      ],
    });
    expect(avaliarProximidade(s, null, REF)).toHaveLength(0);
  });

  it("sismo com tsunami sobe para crítico", () => {
    const s = snapshot({
      sismos: [
        {
          id: "s5",
          lng: EM_INTERIOR.lng,
          lat: EM_INTERIOR.lat,
          mag: 4.9,
          profundidade: 15,
          lugar: "Atlântico Sul",
          hora: AGORA,
          url: "",
          tsunami: true,
        },
      ],
    });
    expect(avaliarProximidade(s, null, REF)[0].nivel).toBe("critico");
  });

  it("GDACS vermelho a 360 km é crítico e verde longe sai; verde a 100 km fica", () => {
    const gd: IntelAlerta[] = [
      {
        id: "g1",
        tipoId: "EQ",
        tipo: "Terremoto",
        nome: "M 6.2",
        pais: "Brasil",
        nivel: "Red",
        lng: EM_INTERIOR.lng,
        lat: EM_INTERIOR.lat,
        inicio: "2026-04-10T10:00:00Z",
        url: "https://gdacs.org/g1",
      },
      {
        id: "g2",
        tipoId: "TC",
        tipo: "Ciclone tropical",
        nome: "POLO",
        pais: "Brasil",
        nivel: "Green",
        lng: -75,
        lat: -8,
        inicio: "2026-04-09T00:00:00Z",
        url: "",
      },
      {
        id: "g3",
        tipoId: "WF",
        tipo: "Incêndio florestal",
        nome: "",
        pais: "Brasil",
        nivel: "Green",
        lng: EM_SOROCABA.lng,
        lat: EM_SOROCABA.lat,
        inicio: "2026-04-10T09:00:00Z",
        url: "",
      },
    ];
    const itens = avaliarProximidade(null, gd, REF);
    const g1 = itens.find((i) => i.id === "gdacs:g1");
    const g2 = itens.find((i) => i.id === "gdacs:g2");
    const g3 = itens.find((i) => i.id === "gdacs:g3");
    expect(g1?.nivel).toBe("critico");
    expect(g2).toBeUndefined();
    expect(g3?.nivel).toBe("informativo");
  });

  it("evento EONET a 0 km entra como atenção; clima espacial em tempestade entra sem distância", () => {
    const s = snapshot({
      eventos: [
        {
          id: "e1",
          titulo: "Tempestade tropical X",
          categoriaId: "severeStorm",
          categoria: "Tempestade severa",
          lng: EM_OSP.lng,
          lat: EM_OSP.lat,
          hora: AGORA,
          url: "https://eonet.org/e1",
        },
      ],
      climaEspacial: {
        kp: 7.3,
        classificacao: "Tempestade G3",
        nivel: "tempestade",
        medidoEm: "2026-04-10T09:00:00Z",
      },
    });
    const itens = avaliarProximidade(s, null, REF);
    const e1 = itens.find((i) => i.id === "eonet:e1");
    const kp = itens.find((i) => i.id === "noaa:kp");
    expect(e1?.nivel).toBe("atencao");
    expect(kp?.nivel).toBe("informativo");
    expect(kp?.distanciaKm).toBeNull();
    expect(contarAmeacas(itens)).toBe(1); // kp é informativo, não conta
  });

  it("ordena por urgência (crítico primeiro) e depois por distância", () => {
    const s = snapshot({
      incendios: [
        {
          id: "a",
          lng: EM_VICINHO.lng,
          lat: EM_VICINHO.lat,
          hora: "2026-04-10T11:00:00Z",
          confianca: "h",
        },
      ],
      sismos: [
        {
          id: "b",
          lng: EM_INTERIOR.lng,
          lat: EM_INTERIOR.lat,
          mag: 5.9,
          profundidade: 20,
          lugar: "RJ",
          hora: AGORA,
          url: "",
          tsunami: false,
        },
      ],
    });
    const gd: IntelAlerta[] = [
      {
        id: "c",
        tipoId: "TC",
        tipo: "Ciclone",
        nome: "",
        pais: "Brasil",
        nivel: "Red",
        lng: EM_OSP.lng,
        lat: EM_OSP.lat,
        inicio: "2026-04-10T08:00:00Z",
        url: "",
      },
    ];
    const itens = avaliarProximidade(s, gd, REF);
    expect(itens[0].id).toBe("gdacs:c"); // crítico a 0 km
    const niveis = itens.map((i: AlertaProximidade) => i.nivel);
    const rank = { critico: 0, atencao: 1, informativo: 2 } as const;
    expect([...niveis].sort((x, y) => rank[x] - rank[y])).toEqual(niveis);
  });

  it("sem referência, o radar fica vazio (ameaça global só com ponto)", () => {
    const s = snapshot({
      climaEspacial: {
        kp: 8,
        classificacao: "Tempestade G4",
        nivel: "tempestade",
        medidoEm: "2026-04-10T09:00:00Z",
      },
    });
    expect(avaliarProximidade(s, null, null)).toHaveLength(0);
  });

  it("cap por fonte: no máximo 5 focos listados", () => {
    const focos = Array.from({ length: 9 }, (_, i) => ({
      id: `f${i}`,
      lng: EM_OSP.lng + i * 0.05, // todos < 50 km (0,05° ≈ 5,5 km por passo)
      lat: EM_OSP.lat,
      hora: "2026-04-10T11:00:00Z",
      confianca: "h",
    }));
    const itens = avaliarProximidade(snapshot({ incendios: focos }), null, REF);
    expect(itens.filter((i) => i.fonte === "NASA FIRMS")).toHaveLength(5);
  });

  it("horaRelativa: agora, minutos, horas e dias", () => {
    expect(horaRelativa(AGORA - 30_000, AGORA)).toBe("agora");
    expect(horaRelativa(AGORA - 5 * 60_000, AGORA)).toBe("há 5 min");
    expect(horaRelativa(AGORA - 3 * 3_600_000, AGORA)).toBe("há 3 h");
    expect(horaRelativa(AGORA - 3 * 86_400_000, AGORA)).toBe("há 3 dias");
    expect(horaRelativa(null, AGORA)).toBeNull();
  });
});
