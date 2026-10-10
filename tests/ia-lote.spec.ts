import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mensagemAmigavel, podeTentarCriar } from "@/lib/conta.functions";
import {
  classificarCape,
  fcTempestades,
  interpretarTempestades,
  rotuloCape,
  urlGradeTempestades,
} from "@/lib/clima-openmeteo";
import {
  CONFIG_PADRAO_IA,
  lerConfigIA,
  salvarConfigIA,
  PROMPT_PADRAO_ID,
  SKILL_PADRAO_ID,
} from "@/lib/assistente/config";

/* O ambiente é node: o localStorage é simulado em memória (padrão convite.spec). */
const LS_ORIGINAL = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const saco = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: {
    getItem: (k: string) => (saco.has(k) ? (saco.get(k) as string) : null),
    setItem: (k: string, v: string) => void saco.set(k, String(v)),
    removeItem: (k: string) => void saco.delete(k),
    clear: () => void saco.clear(),
    key: () => null,
    get length() {
      return saco.size;
    },
  },
});

beforeEach(() => {
  saco.clear();
});

afterEach(() => {
  if (LS_ORIGINAL) Object.defineProperty(globalThis, "localStorage", LS_ORIGINAL);
});

describe("conta — limite de criação por e-mail", () => {
  it("permite até 8 tentativas por janela e bloqueia a 9ª", () => {
    const agora = 1_000_000;
    for (let i = 0; i < 8; i++) {
      expect(podeTentarCriar("op@test.com", agora)).toBe(true);
    }
    expect(podeTentarCriar("op@test.com", agora + 1)).toBe(false);
  });

  it("libera nova janela após 1 hora e isola e-mails diferentes", () => {
    const agora = 2_000_000;
    for (let i = 0; i < 8; i++) podeTentarCriar("a@x.com", agora);
    expect(podeTentarCriar("a@x.com", agora + 60_000)).toBe(false);
    expect(podeTentarCriar("b@x.com", agora + 60_000)).toBe(true);
    expect(podeTentarCriar("a@x.com", agora + 3_600_000)).toBe(true);
  });

  it("recusa e-mail vazio", () => {
    expect(podeTentarCriar("   ")).toBe(false);
  });
});

describe("conta — mensagens amigáveis do GoTrue", () => {
  it("traduz 'already registered'", () => {
    const m = mensagemAmigavel("User already registered");
    expect(m).toContain("já tem conta");
  });

  it("traduz limite de taxa", () => {
    expect(mensagemAmigavel("Rate limit exceeded")).toContain("Muitas tentativas");
  });

  it("desconhecida passa sem mudança", () => {
    expect(mensagemAmigavel("Erro esquisito")).toBe("Erro esquisito");
  });
});

describe("tempestades — grade CAPE (Open-Meteo)", () => {
  it("URL pede cape + weather_code + precipitation para todos os pontos", () => {
    const url = urlGradeTempestades([
      [-8.0, -34.9],
      [-8.1, -34.95],
    ]);
    expect(url).toContain("current=cape,weather_code,precipitation");
    expect(url).toContain("latitude=-34.900,-34.950");
    expect(url).toContain("longitude=-8.000,-8.100");
  });

  it("interpreta resposta em array casando pelas coordenadas", () => {
    const leituras = interpretarTempestades(
      [
        {
          latitude: -8,
          longitude: -35,
          current: { cape: 1800, weather_code: 95, precipitation: 2.5 },
        },
        { latitude: -9, longitude: -36, current: { cape: 120, weather_code: 0 } },
      ],
      [
        [-35, -8],
        [-36, -9],
      ],
    );
    expect(leituras).toHaveLength(2);
    expect(leituras[0]).toMatchObject({ lng: -35, lat: -8, cape: 1800, codigo: 95 });
    expect(leituras[1]).toMatchObject({ cape: 120, precipitacao: 0 });
  });

  it("objeto único (uma coordenada) e pontos sem cape são descartados", () => {
    const unico = interpretarTempestades({ current: { cape: 3000 } }, [[-35, -8]]);
    expect(unico).toHaveLength(1);
    expect(unico[0].lng).toBe(-35);
    expect(interpretarTempestades([{ current: { weather_code: 3 } }], [[0, 0]])).toHaveLength(0);
    expect(interpretarTempestades(null, [])).toHaveLength(0);
  });

  it("classificação do CAPE segue a escala de tempo severo", () => {
    expect(classificarCape(400).cor).toBe("#64748B");
    expect(classificarCape(1200).cor).toBe("#A78BFA");
    expect(classificarCape(2600).cor).toBe("#EF4444");
    expect(classificarCape(4500).cor).toBe("#DC2626");
    expect(classificarCape(NaN).nivel).toBe("baixa");
  });

  it("FeatureCollection filtra abaixo de 600 J/kg e marca trovoada", () => {
    const fc = fcTempestades([
      { lng: -35, lat: -8, cape: 500, codigo: 0, precipitacao: 0 },
      { lng: -36, lat: -9, cape: 1900, codigo: 95, precipitacao: 1.25 },
    ]);
    expect(fc.features).toHaveLength(1);
    const p = fc.features[0].properties as Record<string, unknown>;
    expect(p.cape).toBe(1900);
    expect(p.trovoada).toBe(true);
    expect(p.precipitacao).toBe(1.3);
    expect(rotuloCape(1900)).toBe("1900 J/kg");
    expect(rotuloCape(NaN)).toBe("—");
  });
});

describe("IA — semente de prompt e skill pré-preenchidos", () => {
  it("aparelho novo nasce com 1 prompt e 1 skill padrão", () => {
    const cfg = lerConfigIA();
    expect(cfg.prompts).toHaveLength(1);
    expect(cfg.skills).toHaveLength(1);
    expect(cfg.prompts[0].id).toBe(PROMPT_PADRAO_ID);
    expect(cfg.skills[0].id).toBe(SKILL_PADRAO_ID);
    expect(cfg.prompts[0].texto.length).toBeGreaterThan(10);
    expect(cfg.sementesAplicadas).toBe(true);
  });

  it("remover o padrão fica removido (sementeira não reaparece)", () => {
    const cfg = lerConfigIA();
    salvarConfigIA({ ...cfg, prompts: [], skills: [] });
    const deNovo = lerConfigIA();
    expect(deNovo.prompts).toHaveLength(0);
    expect(deNovo.skills).toHaveLength(0);
    expect(deNovo.sementesAplicadas).toBe(true);
  });

  it("config antiga sem sementeira recebe os exemplos UMA vez, sem duplicar", () => {
    salvarConfigIA({ ...CONFIG_PADRAO_IA, personagemSlug: "prepper-urbano" });
    const primeira = lerConfigIA();
    expect(primeira.prompts).toHaveLength(1);
    expect(primeira.personagemSlug).toBe("prepper-urbano");
    const segunda = lerConfigIA();
    expect(segunda.prompts).toHaveLength(1);
    expect(segunda.skills).toHaveLength(1);
  });

  it("config quebrada no armazenamento não derruba a leitura", () => {
    saco.set("manual:ia-config", "{quebrado");
    const cfg = lerConfigIA();
    expect(cfg.prompts).toHaveLength(1);
    expect(cfg.skills).toHaveLength(1);
  });
});
