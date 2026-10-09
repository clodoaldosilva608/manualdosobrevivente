import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Autenticado");
        nav({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Confira seu e-mail para confirmar a conta");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    // OAuth nativo do Supabase: o navegador é redirecionado ao provedor e volta
    // para redirectTo após a autenticação. Requer o provedor Google habilitado
    // no painel do Supabase (Authentication > Providers).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Falha ao entrar com Google");
      setBusy(false);
    }
  };

  // Cap. 2 do Kit: o botão Google só existe quando o provedor está ativo no
  // painel. Enquanto o titular não habilita (external.google=false), o botão
  // some em vez de levar o operador a um erro 400 de redirect.
  const [googleAtivo, setGoogleAtivo] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
        const chave = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
        if (!url || !chave) return; // sem env não há como consultar: mantém botão
        const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: chave } });
        if (!r.ok) return;
        const s = (await r.json()) as { external?: { google?: boolean } };
        if (vivo) setGoogleAtivo(!!s?.external?.google);
      } catch {
        /* consulta é best-effort — falha mantém o comportamento atual */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center p-4 tactical-grid">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6">
        <h1 className="mono text-tactical-orange text-2xl font-bold tracking-wider mb-1">
          TACTICAL/GIS
        </h1>
        <p className="text-sm text-muted-foreground mb-6 mono">
          {mode === "signin" ? "// Autenticar operador" : "// Criar conta de operador"}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Senha</Label>
            <Input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90"
          >
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        {googleAtivo !== false && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-2 text-xs text-muted-foreground mx-auto block w-fit mono">
                OU
              </span>
            </div>
            <Button
              onClick={google}
              disabled={busy}
              variant="secondary"
              className="w-full glove-tap"
            >
              Continuar com Google
            </Button>
          </>
        )}
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
