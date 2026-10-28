// Configuração Vite padrão do projeto (independente de plataforma).
//
// Stack de build:
//   - TanStack Start (SSR) com entry de servidor customizado em src/server.ts
//   - Tailwind CSS 4 via plugin oficial
//   - React 19 via @vitejs/plugin-react
//   - Nitro com preset cloudflare-module no build (deploy para Cloudflare Workers)
//
// Ordem dos plugins importa: tsConfigPaths antes do tanstackStart garante que o
// alias "@" resolva corretamente nas server functions.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// O MapLibre 6 (ESM) cria o Web Worker a partir de um ARQUIVO IRMÃO do bundle:
// new URL("./maplibre-gl-worker.mjs", import.meta.url) + "?v=<versão>". No dev
// o irmão existe dentro de node_modules e tudo funciona; no build de produção
// o Vite empacota o módulo principal (ex.: /assets/maplibre-gl-XXXX.js) e
// NUNCA emite o irmão — o navegador pede /assets/maplibre-gl-worker.mjs, o
// servidor devolve o fallback HTML do SPA (404) e o Worker não sobe: sem
// decodificação de tiles, o Globo fica só com o fundo do estilo ("Worker
// failed to load" no console, esfera bege sem continentes). O plugin abaixo
// emite o worker do pacote INSTALADO (mesma versão do código empacotado) na
// pasta de assets do build de cliente, onde o runtime espera encontrá-lo.
function emitirWorkerMaplibre(): Plugin {
  return {
    name: "emitir-worker-maplibre",
    apply: "build",
    generateBundle() {
      const ambiente = (this as unknown as { environment?: { name?: string } }).environment;
      if (ambiente && ambiente.name !== "client") return;
      const require = createRequire(import.meta.url);
      const origem = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
      this.emitFile({
        type: "asset",
        // O irmão do bundle vive no assetsDir (padrão "assets") — o mesmo
        // diretório onde o Vite escreve /assets/maplibre-gl-XXXX.js.
        fileName: "assets/maplibre-gl-worker.mjs",
        source: readFileSync(origem),
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // Injeta todas as variáveis VITE_* do .env como import.meta.env.* em tempo de build.
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
    plugins: [
      emitirWorkerMaplibre(),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Redireciona o entry do servidor SSR para src/server.ts (wrapper de erros).
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      viteReact(),
      // Build de deploy apenas no comando build. Preset padrão: Vercel.
      // Para outro alvo, defina NITRO_PRESET (ex.: NITRO_PRESET=cloudflare-module).
      ...(command === "build"
        ? [
            nitro({
              preset: process.env.NITRO_PRESET || "vercel",
              // Fontes lentas (GDELT, TLE) precisam de mais que os 10 s
              // padrão do serverless — a função única do nitro roda até 60 s
              // (teto do plano Hobby). Válido só no preset vercel.
              ...(process.env.NITRO_PRESET ? {} : { vercel: { functions: { maxDuration: 60 } } }),
            }),
          ]
        : []),
    ],
  };
});
