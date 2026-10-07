import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHAVE_TEXTO_CONVITE,
  URL_APP,
  compartilharConvite,
  contagemConvites,
  conviteCompleto,
  textoConviteEm,
} from "@/lib/convite";
import { traduzir, type Idioma } from "@/lib/i18n";

const NAV_ORIGINAL = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const LS_ORIGINAL = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

// Armazenamento determinístico para o contador de convites.
const saco = new Map<string, string>();
const localStorageFalso = {
  getItem: (k: string) => (saco.has(k) ? (saco.get(k) as string) : null),
  setItem: (k: string, v: string) => void saco.set(k, String(v)),
  removeItem: (k: string) => void saco.delete(k),
  clear: () => void saco.clear(),
  key: () => null,
  get length() {
    return saco.size;
  },
};

function instalarNavigator(mock: Record<string, unknown>) {
  Object.defineProperty(globalThis, "navigator", {
    value: mock,
    configurable: true,
    writable: true,
  });
}

function instalarArmazenamento() {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageFalso,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  saco.clear();
  if (NAV_ORIGINAL) Object.defineProperty(globalThis, "navigator", NAV_ORIGINAL);
  if (LS_ORIGINAL) Object.defineProperty(globalThis, "localStorage", LS_ORIGINAL);
});

describe("convite", () => {
  it("monta o convite completo com o link canônico em linha própria", () => {
    const completo = conviteCompleto();
    expect(completo.endsWith(URL_APP)).toBe(true);
    expect(completo).toContain("MANUAL DO SOBREVIVENTE");
  });

  it("mensagem de convite traduzida nos cinco idiomas extra", () => {
    for (const idioma of ["es", "en", "ru", "zh", "ja"] as Idioma[]) {
      expect(textoConviteEm(idioma)).not.toBe(CHAVE_TEXTO_CONVITE);
    }
    expect(textoConviteEm("pt")).toBe(CHAVE_TEXTO_CONVITE);
    // A tradução substitui a chave no dicionário — t() nunca devolve texto vazio.
    expect(traduzir("en", "Convidar amigos")).toBe("Invite friends");
  });

  it("usa a folha nativa quando disponível e conta o convite", async () => {
    instalarArmazenamento();
    const share = vi.fn().mockResolvedValue(undefined);
    instalarNavigator({ share });
    await expect(compartilharConvite()).resolves.toBe("nativo");
    expect(share).toHaveBeenCalledWith({
      title: "Manual do Sobrevivente",
      text: expect.any(String),
      url: URL_APP,
    });
    expect(contagemConvites()).toBe(1);
  });

  it("copia para a área de transferência quando não há folha nativa", async () => {
    instalarArmazenamento();
    const writeText = vi.fn().mockResolvedValue(undefined);
    instalarNavigator({ clipboard: { writeText } });
    await expect(compartilharConvite()).resolves.toBe("copiado");
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(URL_APP));
    expect(contagemConvites()).toBe(1);
  });

  it("devolve 'cancelado' quando o operador fecha a folha sem enviar", async () => {
    instalarArmazenamento();
    const share = vi.fn().mockRejectedValue(new DOMException("fechou", "AbortError"));
    instalarNavigator({ share });
    await expect(compartilharConvite()).resolves.toBe("cancelado");
    expect(contagemConvites()).toBe(0);
  });

  it("devolve 'manual' sem folha e sem cópia possível", async () => {
    instalarArmazenamento();
    instalarNavigator({
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("permissão negada")) },
    });
    await expect(compartilharConvite()).resolves.toBe("manual");
    expect(contagemConvites()).toBe(0);
  });
});
