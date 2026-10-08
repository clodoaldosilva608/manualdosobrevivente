import { describe, expect, it, vi } from "vitest";
import {
  ControladorRadar,
  ControladorRasterSimples,
  cardeal,
  interpretarIndice,
  rotuloQuadro,
  rotuloWMO,
  urlQuadro,
  urlTileOwm,
  urlZoomEarth,
} from "../src/lib/radar-clima";
import type { QuadroRadar } from "../src/lib/radar-clima";

describe("urlZoomEarth", () => {
  it("monta o deep link com a visão atual e os overlays do Manual (iguais ao Zoom Earth)", () => {
    const url = urlZoomEarth(-35.164266, -8.057354, 9.63);
    expect(url).toBe(
      "https://zoom.earth/maps/satellite/#view=-8.0574,-35.1643,9.63z/overlays=radar,wind,fires,temperatures,crosshair",
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

describe("urlTileOwm (OpenWeatherMap)", () => {
  it("monta o template wind_new com a chave na URL", () => {
    expect(urlTileOwm("vento", " abc123 ")).toBe(
      "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=abc123",
    );
  });

  it("monta o template temp_new para a temperatura", () => {
    expect(urlTileOwm("temperatura", "k9")).toBe(
      "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=k9",
    );
  });

  it("devolve vazio sem chave — a camada nem tenta ligar", () => {
    expect(urlTileOwm("vento", "")).toBe("");
    expect(urlTileOwm("vento", "   ")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Resistência a mapa destruído — regressão do crash
// "Cannot read properties of undefined (reading 'getLayer')" ao sair do mapa:
// o MapShell desmontava e os controladores tentavam tocar um mapa removido.
// ---------------------------------------------------------------------------

type MapaFalso = {
  getLayer: ReturnType<typeof vi.fn>;
  getSource: ReturnType<typeof vi.fn>;
  addSource: ReturnType<typeof vi.fn>;
  addLayer: ReturnType<typeof vi.fn>;
  removeLayer: ReturnType<typeof vi.fn>;
  removeSource: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
};

function mapaFalso(): MapaFalso {
  return {
    getLayer: vi.fn(() => undefined),
    getSource: vi.fn(() => undefined),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    once: vi.fn(),
  };
}

/** Dispara o evento "remove" que o controlador registrou no mapa. */
function destruirMapa(map: MapaFalso): void {
  const chamada = map.once.mock.calls.find(([tipo]) => tipo === "remove");
  if (!chamada) throw new Error('controlador não registrou listener "remove"');
  (chamada[1] as () => void)();
}

describe("ControladorRadar — sobrevive a map.remove()", () => {
  it("desativar após o mapa ser destruído não toca o mapa nem lança erro", () => {
    const map = mapaFalso();
    const ctl = new ControladorRadar(map as never);
    destruirMapa(map);
    expect(() => ctl.desativar()).not.toThrow();
    expect(map.getLayer).not.toHaveBeenCalled();
    expect(map.removeLayer).not.toHaveBeenCalled();
    expect(map.getSource).not.toHaveBeenCalled();
  });

  it("sincronizar após o mapa ser destruído é inofensivo", () => {
    const map = mapaFalso();
    const ctl = new ControladorRadar(map as never);
    destruirMapa(map);
    expect(() => ctl.sincronizar()).not.toThrow();
  });

  it("com mapa vivo, desativar remove a camada normalmente", () => {
    const map = mapaFalso();
    map.getLayer.mockReturnValue({}); // camada presente no estilo
    map.getSource.mockReturnValue({});
    const ctl = new ControladorRadar(map as never);
    ctl.desativar();
    expect(map.getLayer).toHaveBeenCalledWith("intel-radar");
    expect(map.removeLayer).toHaveBeenCalledWith("intel-radar");
    expect(map.removeSource).toHaveBeenCalledWith("intel-radar");
  });
});

describe("ControladorRasterSimples — sobrevive a map.remove()", () => {
  it("desativar após o mapa ser destruído não toca o mapa nem lança erro", () => {
    const map = mapaFalso();
    const ctl = new ControladorRasterSimples(map as never, "intel-vento");
    destruirMapa(map);
    expect(() => ctl.desativar()).not.toThrow();
    expect(map.getLayer).not.toHaveBeenCalled();
    expect(map.removeLayer).not.toHaveBeenCalled();
  });

  it("com mapa vivo, desativar remove a camada normalmente", () => {
    const map = mapaFalso();
    map.getLayer.mockReturnValue({}); // camada presente no estilo
    map.getSource.mockReturnValue({});
    const ctl = new ControladorRasterSimples(map as never, "intel-vento");
    ctl.desativar();
    expect(map.getLayer).toHaveBeenCalledWith("intel-vento");
    expect(map.removeLayer).toHaveBeenCalledWith("intel-vento");
    expect(map.removeSource).toHaveBeenCalledWith("intel-vento");
  });
});
