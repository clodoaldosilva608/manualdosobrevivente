import { Link, useRouterState } from "@tanstack/react-router";
import {
  Map,
  BookOpen,
  Backpack,
  Siren,
  Settings,
  LogIn,
  DownloadCloud,
  LayoutDashboard,
} from "lucide-react";

const items = [
  { to: "/", label: "Mapa", icon: Map },
  { to: "/manual", label: "Manual", icon: BookOpen },
  { to: "/inventory", label: "Mochila", icon: Backpack },
  { to: "/sos", label: "SOS", icon: Siren },
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/offline", label: "Offline", icon: DownloadCloud },
  { to: "/settings", label: "Ajustes", icon: Settings },
] as const;

export function AppNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 hud-panel border-t pb-[env(safe-area-inset-bottom)] md:top-0 md:bottom-auto md:pb-0 md:pt-[env(safe-area-inset-top)] md:border-t-0 md:border-b">
      <ul className="grid grid-cols-7 items-stretch md:flex md:justify-start md:gap-1 md:px-3">
        <li className="hidden md:flex items-center pr-3 mr-2 border-r border-border">
          <span className="mono text-tactical-orange text-sm font-bold tracking-wider">
            TACTICAL/GIS
          </span>
        </li>
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to} className="min-w-0 md:flex-none">
              <Link
                to={it.to}
                title={it.label}
                aria-label={it.label}
                className={`flex h-14 min-w-0 items-center justify-center px-1 md:glove-tap md:h-auto md:flex-row md:gap-2 md:px-4 md:py-2 mono text-[11px] md:text-sm uppercase tracking-wide transition-colors ${
                  active ? "text-tactical-orange" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="sr-only md:not-sr-only">{it.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="hidden min-w-0 md:ml-auto md:flex md:items-center">
          <Link
            to="/login"
            title="Conta"
            aria-label="Conta"
            className="flex h-14 min-w-0 items-center justify-center px-1 text-muted-foreground hover:text-foreground mono text-[11px] uppercase md:glove-tap md:h-auto md:gap-2 md:px-3 md:text-sm"
          >
            <LogIn className="h-5 w-5" />
            <span className="hidden md:inline">Conta</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
