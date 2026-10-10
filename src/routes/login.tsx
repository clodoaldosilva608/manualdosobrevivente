import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FormularioLogin } from "@/components/FormularioLogin";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — TacticalGIS" },
      {
        name: "description",
        content: "Entre na sua conta para sincronizar seus dados de sobrevivência entre aparelhos.",
      },
      { property: "og:title", content: "Entrar — TacticalGIS" },
      {
        property: "og:description",
        content: "Acesse sua conta e mantenha seus dados táticos sincronizados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();

  // Operador já autenticado não precisa desta página — vai direto ao mapa.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/", replace: true });
    });
  }, [nav]);

  return (
    <div className="flex min-h-full items-center justify-center p-4 tactical-grid">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6">
        <FormularioLogin aoEntrar={() => nav({ to: "/" })} />
      </div>
    </div>
  );
}
