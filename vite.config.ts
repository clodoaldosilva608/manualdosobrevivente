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
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

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
      ...(command === "build" ? [nitro({ preset: process.env.NITRO_PRESET || "vercel" })] : []),
    ],
  };
});
