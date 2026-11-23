/**
 * Modo visitante — a escolha por usar o app sem conta persiste no
 * localStorage e avisa a interface por evento (o Portão de Autenticação abre
 * e fecha com isso). Ambiente node: window/localStorage são esboçados.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAVE_VISITANTE,
  EVENTO_VISITANTE,
  definirModoVisitante,
  visitanteAtivo,
} from "@/lib/modo-visitante";

type Registro = Record<string, string>;

function esbocarStorage(inicial: Registro = {}) {
  const dados: Registro = { ...inicial };
  const storage = {
    getItem: (k: string) => (k in dados ? dados[k] : null),
    setItem: (k: string, v: string) => {
      dados[k] = v;
    },
    removeItem: (k: string) => {
      delete dados[k];
    },
  };
  const despachos: Array<{ type: string; detail?: unknown }> = [];
  const window = {
    localStorage: storage,
    dispatchEvent: (e: { type: string; detail?: unknown }) => {
      despachos.push({ type: e.type, detail: e.detail });
      return true;
    },
  };
  vi.stubGlobal("window", window);
  return { storage, despachos };
}

describe("modo visitante", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sem escolha anterior, visitante não está ativo", () => {
    esbocarStorage();
    expect(visitanteAtivo()).toBe(false);
  });

  it("sem window (SSR), consultas e gravações são seguras", () => {
    vi.stubGlobal("window", undefined);
    expect(visitanteAtivo()).toBe(false);
    expect(() => definirModoVisitante(true)).not.toThrow();
    expect(visitanteAtivo()).toBe(false);
  });

  it("ativar grava a chave e dispara o evento com detail true", () => {
    const { storage, despachos } = esbocarStorage();
    definirModoVisitante(true);
    expect(storage.getItem(CHAVE_VISITANTE)).toBe("1");
    expect(visitanteAtivo()).toBe(true);
    expect(despachos).toEqual([{ type: EVENTO_VISITANTE, detail: true }]);
  });

  it("desativar remove a chave e dispara o evento com detail false", () => {
    const { storage, despachos } = esbocarStorage({ [CHAVE_VISITANTE]: "1" });
    expect(visitanteAtivo()).toBe(true);
    definirModoVisitante(false);
    expect(storage.getItem(CHAVE_VISITANTE)).toBeNull();
    expect(visitanteAtivo()).toBe(false);
    expect(despachos).toEqual([{ type: EVENTO_VISITANTE, detail: false }]);
  });

  it("storage que lança erro não derruba a leitura nem a gravação", () => {
    const storage = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    expect(visitanteAtivo()).toBe(false);
    expect(() => definirModoVisitante(true)).not.toThrow();
    expect(visitanteAtivo()).toBe(false);
  });
});
