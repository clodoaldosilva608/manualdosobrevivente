import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ErrorComponentProps,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { AppNav } from "@/components/AppNav";
import { AutoCloudSync } from "@/components/AutoCloudSync";
import { WelcomeOnboarding } from "@/components/WelcomeOnboarding";
import { SplashAbertura } from "@/components/SplashAbertura";
import { PortaoAuth } from "@/components/PortaoAuth";
import { registerServiceWorker, useNovaVersao } from "@/lib/pwa";
import { iniciarAutoBackup } from "@/lib/auto-backup";
import { ProvedorIdioma } from "@/lib/i18n";
import { SCRIPT_PRE_HIDRATACAO, aplicarVisaoNoturna } from "@/lib/visao-noturna";
import { getSetting } from "@/lib/db";
import { iniciarAnalytics, registrarPageview } from "@/lib/analytics";
import type { Preferences } from "@/hooks/usePreferences";
import { useRouterState } from "@tanstack/react-router";

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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const mensagem = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Sinal perdido</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mensagem}</p>
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
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Sobrevivência" },
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
        // Banner oficial do convite (1200×630) — WhatsApp, Telegram, X e
        // Facebook mostram esta imagem na prévia do link compartilhado.
        property: "og:image",
        content: "https://manual-do-sobrevivente.vercel.app/banner-convite.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Manual do Sobrevivente — mapa tático, bússola e SOS offline",
      },
      {
        name: "twitter:image",
        content: "https://manual-do-sobrevivente.vercel.app/banner-convite.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
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
        {/* Modo noturno antes da hidratação: quem já ligou a visão noturna
            não vê flash de tela clara ao reabrir o app. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PRE_HIDRATACAO }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Avisa que existe uma versão nova do app esperando e oferece aplicá-la na
 * hora — evita o aparelho continuar rodando JavaScript antigo com o PWA em
 * segundo plano.
 */
function AvisoNovaVersao() {
  const { disponivel, atualizar } = useNovaVersao();
  const mostrado = useRef(false);
  useEffect(() => {
    if (!disponivel || mostrado.current) return;
    mostrado.current = true;
    toast("Nova versão disponível", {
      description: "O Manual foi atualizado nos bastidores.",
      action: { label: "Atualizar agora", onClick: () => atualizar() },
      duration: Infinity,
    });
  }, [disponivel, atualizar]);
  return null;
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

/**
 * Sincroniza o modo noturno (visão vermelha) com as preferências do
 * aparelho — global, vale para todas as telas. Lê direto do banco local e
 * reage ao evento de dados locais (cada instância de usePreferences tem
 * estado próprio; o evento é o barramento compartilhado).
 */
function SincronizadorNoturno() {
  useEffect(() => {
    let alive = true;
    const aplicar = async () => {
      try {
        const v = await getSetting<Partial<Preferences>>("preferences");
        if (!alive) return;
        aplicarVisaoNoturna({
          ativa: v?.visaoNoturna ?? false,
          vermelho: v?.noturnoVermelho ?? 0.85,
          escurecer: v?.noturnoEscurecer ?? 0.2,
        });
      } catch {
        /* armazenamento indisponível */
      }
    };
    void aplicar();
    window.addEventListener("tactical-gis:local-data-changed", aplicar);
    return () => {
      alive = false;
      window.removeEventListener("tactical-gis:local-data-changed", aplicar);
    };
  }, []);
  return null;
}

/**
 * Manda um pageview a cada troca de rota quando a telemetria estiver ativa
 * (env de analytics definida). Sem env, é um no-op absoluto.
 */
function RastreadorRotas() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    registrarPageview(pathname);
  }, [pathname]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    registerServiceWorker();
    iniciarAutoBackup();
    iniciarAnalytics();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ProvedorIdioma>
        <SincronizadorNoturno />
        <AuthListener />
        <AvisoNovaVersao />
        <RastreadorRotas />
        <AutoCloudSync />
        <SplashAbertura />
        <PortaoAuth />
        <WelcomeOnboarding />
        <div className="flex min-h-screen flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pt-14">
          <main className="flex-1 relative">
            <Outlet />
          </main>
          <AppNav />
        </div>
        <Toaster theme="dark" position="top-center" richColors />
      </ProvedorIdioma>
    </QueryClientProvider>
  );
}
