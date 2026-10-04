import { describe, expect, it } from "vitest";
import { chavesDoAmbiente } from "@/lib/intel.functions";

describe("chavesDoAmbiente (chaves de inteligência do servidor)", () => {
  it("extrai e normaliza as chaves presentes no ambiente", () => {
    const c = chavesDoAmbiente({
      AISSTREAM_API_KEY: "  b06828d807ae  ",
      FIRMS_MAP_KEY: " 2dae0ab3dac ",
    });
    expect(c).toEqual({ chaveAis: "b06828d807ae", firmsServidor: true });
  });

  it("reporta ausência das chaves sem lançar erro", () => {
    expect(chavesDoAmbiente({})).toEqual({ chaveAis: "", firmsServidor: false });
    expect(chavesDoAmbiente({ AISSTREAM_API_KEY: "", FIRMS_MAP_KEY: "" })).toEqual({
      chaveAis: "",
      firmsServidor: false,
    });
  });

  it("não confunde chaves de outras fontes", () => {
    const c = chavesDoAmbiente({ SUPABASE_URL: "https://x", CRON_SECRET: "s" });
    expect(c).toEqual({ chaveAis: "", firmsServidor: false });
  });
});
