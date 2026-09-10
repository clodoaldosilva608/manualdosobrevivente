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
    <nav className="fixed bottom-0 left-0 right-0 z-40 hud-panel border-t md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <ul className="flex items-stretch justify-around overflow-x-auto md:justify-start md:gap-1 md:px-3">
        <li className="hidden md:flex items-center pr-3 mr-2 border-r border-border">
          <span className="mono text-tactical-orange text-sm font-bold tracking-wider">
            TACTICAL/GIS
          </span>
        </li>
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1 md:flex-none">
              <Link
                to={it.to}
                className={`glove-tap flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 md:px-4 py-2 mono text-[11px] md:text-sm uppercase tracking-wide transition-colors ${
                  active ? "text-tactical-orange" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="md:ml-auto flex items-center">
          <Link
            to="/login"
            className="glove-tap flex items-center gap-2 px-3 text-muted-foreground hover:text-foreground mono text-[11px] md:text-sm uppercase"
          >
            <LogIn className="h-5 w-5" />
            <span className="hidden md:inline">Conta</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
