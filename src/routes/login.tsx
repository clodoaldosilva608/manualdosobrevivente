import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha ao entrar com Google");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    nav({ to: "/" });
  };

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
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-2 text-xs text-muted-foreground mx-auto block w-fit mono">
            OU
          </span>
        </div>
        <Button onClick={google} disabled={busy} variant="secondary" className="w-full glove-tap">
          Continuar com Google
        </Button>
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
