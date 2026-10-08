import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHAVE_TEXTO_CONVITE,
  URL_APP,
  carregarBannerConvite,
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

describe("convite com banner", () => {
  const bannerFalso = new File([new Uint8Array([1, 2, 3])], "banner.png", { type: "image/png" });

  it("anexa o banner na folha nativa quando o aparelho aceita arquivos", async () => {
    instalarArmazenamento();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    instalarNavigator({ share, canShare });
    await expect(compartilharConvite({ banner: bannerFalso })).resolves.toBe("nativo");
    expect(canShare).toHaveBeenCalledWith({ files: [bannerFalso] });
    expect(share).toHaveBeenCalledWith({
      files: [bannerFalso],
      title: "Manual do Sobrevivente",
      text: expect.any(String),
      url: URL_APP,
    });
    expect(contagemConvites()).toBe(1);
  });

  it("cai para o convite em texto quando o aparelho recusa arquivos", async () => {
    instalarArmazenamento();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(false);
    instalarNavigator({ share, canShare });
    await expect(compartilharConvite({ banner: bannerFalso })).resolves.toBe("nativo");
    expect(share).toHaveBeenCalledWith({
      title: "Manual do Sobrevivente",
      text: expect.any(String),
      url: URL_APP,
    });
  });

  it("erro não-abortado no envio com banner cai para o texto, não para a cópia", async () => {
    instalarArmazenamento();
    let chamadas = 0;
    const share = vi.fn().mockImplementation(() => {
      chamadas += 1;
      return chamadas === 1
        ? Promise.reject(new TypeError("arquivo recusado"))
        : Promise.resolve(undefined);
    });
    instalarNavigator({ share, canShare: () => true });
    await expect(compartilharConvite({ banner: bannerFalso })).resolves.toBe("nativo");
    expect(chamadas).toBe(2);
    expect(contagemConvites()).toBe(1);
  });

  it("baixa o banner do próprio app como File (e devolve null sem rede)", async () => {
    const fetchOk = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob([new Uint8Array([9])], { type: "image/png" })),
    });
    vi.stubGlobal("fetch", fetchOk);
    const banner = await carregarBannerConvite();
    expect(fetchOk).toHaveBeenCalledWith("/banner-convite.png", { cache: "force-cache" });
    expect(banner?.type).toBe("image/png");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sem rede")));
    await expect(carregarBannerConvite()).resolves.toBeNull();
    vi.unstubAllGlobals();
  });
});
