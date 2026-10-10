/**
 * Formulário de autenticação do operador — compartilhado entre a rota /login
 * e o Portão de Autenticação que aparece depois do vídeo de abertura.
 *
 * Regras profissionais embutidas:
 *  • Cadastro pede o nome (vira nome de exibição no espelho do banco);
 *  • Se a confirmação de e-mail estiver ativa no projeto, o cadastro NÃO
 *    autentica na hora: o pai decide o próximo passo via `aoCadastrou(false)`
 *    (tela "confira seu e-mail");
 *  • Login por senha autentica imediatamente (`aoEntrar`);
 *  • Botão Google só aparece quando o provedor está ativo no painel
 *    (mesma sonda do comportamento anterior).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface FormularioLoginProps {
  /** Login concluído (sessão ativa). */
  aoEntrar?: () => void;
  /** Cadastro concluído — `comSessao` diz se autenticou na hora. */
  aoCadastrou?: (comSessao: boolean, email?: string) => void;
  /** E-mail inicial (quando o pai já o conhece). */
  emailInicial?: string;
}

export function FormularioLogin({
  aoEntrar,
  aoCadastrou,
  emailInicial = "",
}: FormularioLoginProps) {
  const { t } = useI18n();
  const [modo, setModo] = useState<"signin" | "signup">("signin");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(emailInicial);
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    try {
      if (modo === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        toast.success(t("Autenticado"));
        aoEntrar?.();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: nome.trim() ? { nome: nome.trim() } : undefined,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success(t("Conta criada"));
          aoCadastrou?.(true, email);
        } else {
          toast.success(t("Confira seu e-mail para confirmar a conta"));
          aoCadastrou?.(false, email);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na autenticação"));
    } finally {
      setOcupado(false);
    }
  };

  const google = async () => {
    setOcupado(true);
    // OAuth nativo do Supabase: o navegador é redirecionado ao provedor e volta
    // para redirectTo após a autenticação. Requer o provedor Google habilitado
    // no painel do Supabase (Authentication > Providers).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(t("Falha ao entrar com Google"));
      setOcupado(false);
    }
  };

  // O botão Google só existe quando o provedor está ativo no painel. Enquanto
  // o titular não habilita (external.google=false), o botão some em vez de
  // levar o operador a um erro 400 de redirect.
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
    <div className="w-full" data-test="formulario-login">
      <h1 className="mono text-tactical-orange text-2xl font-bold tracking-wider mb-1">
        TACTICAL/GIS
      </h1>
      <p className="text-sm text-muted-foreground mb-6 mono">
        {modo === "signin" ? t("// Autenticar operador") : t("// Criar conta de operador")}
      </p>
      <form onSubmit={enviar} className="space-y-3">
        {modo === "signup" && (
          <div>
            <Label className="text-xs">{t("Nome de exibição")}</Label>
            <Input
              type="text"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              data-test="login-nome"
            />
          </div>
        )}
        <div>
          <Label className="text-xs">{t("E-mail")}</Label>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-test="login-email"
          />
        </div>
        <div>
          <Label className="text-xs">{t("Senha")}</Label>
          <Input
            type="password"
            autoComplete={modo === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            data-test="login-senha"
          />
        </div>
        <Button
          type="submit"
          disabled={ocupado}
          data-test="login-enviar"
          className="w-full glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90"
        >
          {modo === "signin" ? t("Entrar") : t("Criar conta")}
        </Button>
      </form>
      {googleAtivo !== false && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-2 text-xs text-muted-foreground mx-auto block w-fit mono">
              {t("OU")}
            </span>
          </div>
          <Button
            onClick={google}
            disabled={ocupado}
            variant="secondary"
            data-test="login-google"
            className="w-full glove-tap"
          >
            {t("Continuar com Google")}
          </Button>
        </>
      )}
      <button
        onClick={() => setModo(modo === "signin" ? "signup" : "signin")}
        data-test="login-alternar"
        className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
      >
        {modo === "signin" ? t("Não tem conta? Cadastre-se") : t("Já tem conta? Entrar")}
      </button>
    </div>
  );
}
