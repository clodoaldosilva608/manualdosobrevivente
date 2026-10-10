import { Link, useRouterState } from "@tanstack/react-router";
import {
  Map,
  BookOpen,
  Backpack,
  Siren,
  Settings,
  UserRound,
  DownloadCloud,
  HeartHandshake,
  LayoutDashboard,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/hooks/usePreferences";

const items = [
  { to: "/", label: "Mapa", icon: Map },
  { to: "/manual", label: "Manual", icon: BookOpen },
  { to: "/inventory", label: "Mochila", icon: Backpack },
  { to: "/sos", label: "SOS", icon: Siren },
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/colaboradores", label: "Apoie", icon: HeartHandshake },
  { to: "/offline", label: "Offline", icon: DownloadCloud },
  { to: "/settings", label: "Ajustes", icon: Settings },
] as const;

export function AppNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const { prefs } = usePreferences();
  // Modo mapa limpo: sobre o mapa, a navegação some também — só o mapa à
  // vista. Fora do mapa (ou com elementos restaurados), a barra volta.
  if (prefs.telaLimpa && path === "/") return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 hud-panel border-t pb-[env(safe-area-inset-bottom)] md:top-0 md:bottom-auto md:pb-0 md:pt-[env(safe-area-inset-top)] md:border-t-0 md:border-b">
      <ul className="grid grid-cols-8 items-stretch md:flex md:justify-start md:gap-1 md:px-3">
        <li className="hidden md:flex items-center pr-3 mr-2 border-r border-border">
          <span className="mono text-tactical-orange text-sm font-bold tracking-wider">
            TACTICAL/GIS
          </span>
        </li>
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const Icon = it.icon;
          // SOS: botão de emergência em destaque — círculo vermelho elevado no
          // centro da barra (celular) e item sempre vermelho no desktop.
          if (it.to === "/sos") {
            return (
              <li key={it.to} className="relative min-w-0 md:flex-none">
                <Link
                  to={it.to}
                  title={t(it.label)}
                  aria-label={t(it.label)}
                  data-test="nav-sos"
                  className={`glove-tap absolute left-1/2 top-0 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-6 flex-col items-center justify-center gap-0.5 rounded-full border-2 bg-destructive text-white shadow-lg shadow-destructive/40 transition-transform active:scale-95 md:static md:h-auto md:w-auto md:translate-x-0 md:translate-y-0 md:flex-row md:gap-2 md:rounded-md md:border-0 md:bg-transparent md:px-4 md:py-2 md:shadow-none md:active:scale-100 ${
                    active
                      ? "border-white/40 ring-2 ring-destructive/40 md:text-destructive"
                      : "border-white/25 md:text-destructive"
                  }`}
                >
                  <Siren className="h-6 w-6 shrink-0 md:h-5 md:w-5" />
                  <span className="mono text-[10px] font-bold leading-none tracking-widest md:text-sm">
                    SOS
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={it.to} className="min-w-0 md:flex-none">
              <Link
                to={it.to}
                title={t(it.label)}
                aria-label={t(it.label)}
                className={`flex h-14 min-w-0 items-center justify-center px-1 md:glove-tap md:h-auto md:flex-row md:gap-2 md:px-4 md:py-2 mono text-[11px] md:text-sm uppercase tracking-wide transition-colors ${
                  active ? "text-tactical-orange" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="sr-only md:not-sr-only">{t(it.label)}</span>
              </Link>
            </li>
          );
        })}
        <li className="hidden min-w-0 md:ml-auto md:flex md:items-center">
          <Link
            to="/conta"
            title={t("Conta")}
            aria-label={t("Conta")}
            className="flex h-14 min-w-0 items-center justify-center px-1 text-muted-foreground hover:text-foreground mono text-[11px] uppercase md:glove-tap md:h-auto md:gap-2 md:px-3 md:text-sm"
          >
            <UserRound className="h-5 w-5" />
            <span className="hidden md:inline">{t("Conta")}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
