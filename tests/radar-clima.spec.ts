import { describe, expect, it } from "vitest";
import {
  cardeal,
  interpretarIndice,
  rotuloQuadro,
  rotuloWMO,
  urlQuadro,
  urlZoomEarth,
} from "../src/lib/radar-clima";
import type { QuadroRadar } from "../src/lib/radar-clima";

describe("urlZoomEarth", () => {
  it("monta o deep link com a visão atual e os overlays do Manual", () => {
    const url = urlZoomEarth(-35.164266, -8.057354, 9.63);
    expect(url).toBe(
      "https://zoom.earth/maps/satellite/#view=-8.0574,-35.1643,9.63z/overlays=radar,fires,crosshair",
    );
  });

  it("limita o zoom à faixa aceita pelo Zoom Earth (1–20)", () => {
    expect(urlZoomEarth(0, 0, 0.2)).toContain(",1.00z");
    expect(urlZoomEarth(0, 0, 30)).toContain(",20.00z");
  });

  it("arredonda coordenadas a 4 decimais e usa ponto decimal", () => {
    const url = urlZoomEarth(-47.8822, -15.79423456, 12);
    expect(url).toContain("-15.7942,-47.8822,12.00z");
  });
});

describe("interpretarIndice (RainViewer)", () => {
  const resposta = {
    host: "https://tilecache.rainviewer.com",
    radar: {
      past: [
        { time: 1000, path: "/v2/radar/past/a" },
        { time: 2000, path: "/v2/radar/past/b" },
        { time: 3000, path: "/v2/radar/past/c" },
      ],
      nowcast: [{ time: 4000, path: "/v2/radar/nowcast/d" }],
    },
  };

  it("mantém até MAX_PASSADOS quadros passados e a nowcast inteira", () => {
    const idx = interpretarIndice(resposta);
    expect(idx).not.toBeNull();
    expect(idx?.host).toBe("https://tilecache.rainviewer.com");
    expect(idx?.passados).toHaveLength(3);
    expect(idx?.previsoes).toHaveLength(1);
    expect(idx?.passados[0].caminho).toBe("/v2/radar/past/a");
  });

  it("descarta quadros sem tempo ou caminho", () => {
    const idx = interpretarIndice({
      host: "https://h",
      radar: {
        past: [{ time: 1000, path: "/a" }, { path: "/b" }, { time: 2000 }],
      },
    });
    expect(idx?.passados).toHaveLength(1);
    expect(idx?.previsoes).toHaveLength(0);
  });

  it("devolve null sem host ou sem quadros", () => {
    expect(interpretarIndice({})).toBeNull();
    expect(interpretarIndice({ host: "https://h", radar: { past: [] } })).toBeNull();
  });
});

describe("urlQuadro", () => {
  it("monta o template 256px, esquema 2, suave, com neve", () => {
    expect(urlQuadro("https://h", "/v2/radar/past/a")).toBe(
      "https://h/v2/radar/past/a/256/{z}/{x}/{y}/2/1_1.png",
    );
  });
});

describe("rotuloQuadro", () => {
  const agora = 1_700_000_000_000; // ms
  const min = (n: number): QuadroRadar => ({ tempo: agora / 1000 + n * 60, caminho: "/x" });

  it("rotula quadros passados com delta negativo", () => {
    expect(rotuloQuadro(min(-30).tempo, agora)).toBe("-30 min");
  });

  it("rotula o presente como AGORA (±2 min)", () => {
    expect(rotuloQuadro(min(0).tempo, agora)).toBe("AGORA");
    expect(rotuloQuadro(min(-1).tempo, agora)).toBe("AGORA");
  });

  it("rotula nowcast com delta positivo", () => {
    expect(rotuloQuadro(min(10).tempo, agora)).toBe("+10 min");
  });
});

describe("cardeal", () => {
  it("converte graus nos 8 setores em pt-BR (Leste=L, Oeste=O)", () => {
    expect(cardeal(0)).toBe("N");
    expect(cardeal(45)).toBe("NE");
    expect(cardeal(90)).toBe("L");
    expect(cardeal(135)).toBe("SE");
    expect(cardeal(180)).toBe("S");
    expect(cardeal(225)).toBe("SO");
    expect(cardeal(270)).toBe("O");
    expect(cardeal(315)).toBe("NO");
  });

  it("normaliza graus fora de [0,360) e ignora inválidos", () => {
    expect(cardeal(360)).toBe("N");
    expect(cardeal(-90)).toBe("O");
    expect(cardeal(405)).toBe("NE");
    expect(cardeal(NaN)).toBe("");
  });
});

describe("rotuloWMO", () => {
  it("mapeia os códigos comuns para rótulos pt-BR (chaves de tradução)", () => {
    expect(rotuloWMO(0)).toBe("Céu limpo");
    expect(rotuloWMO(1)).toBe("Predominantemente limpo");
    expect(rotuloWMO(2)).toBe("Parcialmente nublado");
    expect(rotuloWMO(3)).toBe("Encoberto");
    expect(rotuloWMO(45)).toBe("Neblina");
    expect(rotuloWMO(53)).toBe("Garoa");
    expect(rotuloWMO(61)).toBe("Chuva fraca");
    expect(rotuloWMO(63)).toBe("Chuva moderada");
    expect(rotuloWMO(65)).toBe("Chuva forte");
    expect(rotuloWMO(66)).toBe("Chuva congelante");
    expect(rotuloWMO(73)).toBe("Neve");
    expect(rotuloWMO(80)).toBe("Chuva fraca");
    expect(rotuloWMO(82)).toBe("Chuva forte");
    expect(rotuloWMO(95)).toBe("Trovoada");
    expect(rotuloWMO(99)).toBe("Trovoada com granizo");
  });

  it("tem fallback seguro para códigos desconhecidos", () => {
    expect(rotuloWMO(999)).toBe("Tempo indisponível");
    expect(rotuloWMO(NaN)).toBe("Tempo indisponível");
  });
});
