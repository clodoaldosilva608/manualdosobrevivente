import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { AppNav } from "@/components/AppNav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold mono text-tactical-orange">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Setor não encontrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A rota que você procura está fora do mapa.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-tactical-orange px-4 py-2 text-sm font-medium text-background"
        >
          Voltar à base
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Sinal perdido</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-tactical-orange px-4 py-2 text-sm text-background"
        >
          Restabelecer
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#121212" },
      { title: "Mapa Tático — TacticalGIS" },
      {
        name: "description",
        content:
          "Mapa tático em tela cheia com MGRS, múltiplas camadas base, ferramentas de medição, waypoints e tiles offline.",
      },
      { property: "og:title", content: "Mapa Tático — TacticalGIS" },
      {
        property: "og:description",
        content:
          "Mapa tático em tela cheia com MGRS, múltiplas camadas base, ferramentas de medição, waypoints e tiles offline.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:title", content: "Mapa Tático — TacticalGIS" },
      {
        name: "twitter:description",
        content:
          "Mapa tático em tela cheia com MGRS, múltiplas camadas base, ferramentas de medição, waypoints e tiles offline.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/c7cdb4b1-efb3-45b4-8b83-bcb5897a78bc",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/c7cdb4b1-efb3-45b4-8b83-bcb5897a78bc",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthListener() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <div className="flex min-h-screen flex-col md:pt-14 pb-16 md:pb-0">
        <main className="flex-1 relative">
          <Outlet />
        </main>
        <AppNav />
      </div>
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
