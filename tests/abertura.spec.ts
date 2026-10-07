import { afterEach, describe, expect, it } from "vitest";
import { CHAVE_ABERTURA, decidirAbertura, registrarAberturaVista } from "@/lib/abertura";

const SACO = new Map<string, string>();

afterEach(() => {
  SACO.clear();
});

function globals(extras: Record<string, unknown> = {}) {
  return {
    sessionStorage: {
      getItem: (k: string) => (SACO.has(k) ? (SACO.get(k) as string) : null),
    },
    ...extras,
  } as Parameters<typeof decidirAbertura>[0];
}

describe("abertura", () => {
  it("mostra a abertura na primeira sessão", () => {
    expect(decidirAbertura(globals())).toBe(true);
  });

  it("não repete dentro da mesma sessão", () => {
    SACO.set(CHAVE_ABERTURA, "1");
    expect(decidirAbertura(globals())).toBe(false);
  });

  it("respeita prefers-reduced-motion", () => {
    expect(
      decidirAbertura(
        globals({
          matchMedia: (q: string) => ({ matches: q.includes("reduced-motion") }),
        }),
      ),
    ).toBe(false);
  });

  it("respeita economia de dados (Save-Data)", () => {
    expect(decidirAbertura(globals({ navigator: { connection: { saveData: true } } }))).toBe(false);
  });

  it("se auto-pula sob automação (webdriver), mas cede à escotilha E2E", () => {
    expect(decidirAbertura(globals({ navigator: { webdriver: true } }))).toBe(false);
    expect(
      decidirAbertura(globals({ navigator: { webdriver: true }, __ABERTURA_SEMPRE__: true })),
    ).toBe(true);
  });

  it("marca a sessão ao registrar a abertura vista", () => {
    // Ambientes sem sessionStorage não podem quebrar o registro.
    expect(() => registrarAberturaVista()).not.toThrow();
    const falso = {
      setItem: (k: string, v: string) => void SACO.set(k, v),
    };
    Object.defineProperty(globalThis, "sessionStorage", {
      value: falso,
      configurable: true,
      writable: true,
    });
    try {
      registrarAberturaVista();
      expect(SACO.get(CHAVE_ABERTURA)).toBe("1");
    } finally {
      Object.defineProperty(globalThis, "sessionStorage", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
  });
});
