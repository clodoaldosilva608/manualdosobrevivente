/**
 * Portão de Autenticação — logo após o vídeo de abertura, o aplicativo só
 * abre para operadores autenticados: quem não tem conta cria a sua na hora.
 *
 * Regras profissionais embutidas:
 *  • Não bloqueia nada enquanto a sessão é verificada (o splash de abertura
 *    cobre o arranque; quando não há vídeo, o portão assume com seu próprio
 *    estado de verificação);
 *  • Cadastro com confirmação de e-mail ativa no projeto: mostra a etapa
 *    "confira seu e-mail" com reenvio — nunca deixa o operador sem caminho;
 *  • Cadastro autenticado na hora: vai direto à escolha de personagem/foto;
 *  • Reabre automaticamente em SIGNED_OUT e libera em SIGNED_IN;
 *  • Pode ser desligado para desenvolvimento/testes com VITE_PORTAO_AUTH=0
 *    (nunca definido em produção);
 *  • A rota /login permanece acessível sem portão (página própria).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { FormularioLogin } from "@/components/FormularioLogin";
import { EscolherAvatar } from "@/components/EscolherAvatar";

type EstadoPortao = "verificando" | "liberado" | "preso";
type EtapaPortao = "credenciais" | "verificar-email" | "avatar";

/** Ref simples que acompanha o valor atual sem refazer listeners. */
function useValorAtual<T>(valor: T) {
  const ref = useRef(valor);
  ref.current = valor;
  return ref;
}

export function PortaoAuth() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [estado, setEstado] = useState<EstadoPortao>("verificando");
  const [etapa, setEtapa] = useState<EtapaPortao>("credenciais");
  const [emailPendente, setEmailPendente] = useState("");
  const [reenviando, setReenviando] = useState(false);

  // Verdade lida dentro do listener do Supabase (sem recriar a assinatura).
  const cadastroRecente = useValorAtual(false);

  useEffect(() => {
    // Chave de desenvolvimento/testes: sem a variável, o portão está ativo.
    if (import.meta.env["VITE_PORTAO_AUTH"] === "0") {
      setEstado("liberado");
      return;
    }
    let vivo = true;
    const avaliar = (autenticado: boolean) => {
      if (!vivo) return;
      setEstado(autenticado ? "liberado" : "preso");
    };
    void supabase.auth.getSession().then(({ data }) => avaliar(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "SIGNED_IN") {
        if (vivo && cadastroRecente.current) {
          // Cadastro acabou de autenticar: oferece a escolha de personagem
          // antes de liberar o mapa (uma única vez por cadastro).
          setEtapa("avatar");
          setEstado("preso");
        } else {
          avaliar(true);
        }
      } else if (evento === "SIGNED_OUT") {
        cadastroRecente.current = false;
        setEtapa("credenciais");
        setEmailPendente("");
        avaliar(false);
      } else if (evento === "INITIAL_SESSION") {
        avaliar(!!sessao);
      } else if (evento === "PASSWORD_RECOVERY") {
        avaliar(true);
      }
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [cadastroRecente]);

  const aoEntrar = useCallback(() => setEstado("liberado"), []);

  const aoCadastrou = useCallback(
    (comSessao: boolean, email?: string) => {
      cadastroRecente.current = true;
      if (comSessao) {
        setEtapa("avatar");
        setEstado("preso");
      } else {
        if (email) setEmailPendente(email);
        setEtapa("verificar-email");
      }
    },
    [cadastroRecente],
  );

  const reenviar = async () => {
    if (!emailPendente) return;
    setReenviando(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailPendente,
      });
      if (error) throw error;
      toast.success(t("E-mail de confirmação reenviado"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha ao reenviar o e-mail"));
    } finally {
      setReenviando(false);
    }
  };

  const conferirAgora = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      cadastroRecente.current = true;
      setEtapa("avatar");
    } else {
      toast.info(t("Ainda não confirmado"), {
        description: t("Abra o link que enviamos ao seu e-mail e tente novamente."),
      });
    }
  };

  if (estado !== "preso") return null;
  // A página de login tem vida própria — o portão não precisa cobri-la.
  if (pathname === "/login") return null;

  return (
    <div
      data-test="portao-auth"
      className="tactical-grid fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-background p-4"
    >
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6">
        {etapa === "credenciais" && (
          <>
            <p className="mono mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("Acesso do operador — identifique-se para entrar no mapa")}
            </p>
            <FormularioLogin
              aoEntrar={aoEntrar}
              aoCadastrou={aoCadastrou}
              emailInicial={emailPendente}
            />
            <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3" />
              {t("Sua conta sincroniza mochila, notas e rotas entre aparelhos.")}
            </p>
          </>
        )}

        {etapa === "verificar-email" && (
          <div className="space-y-4 text-center" data-test="portao-verificar-email">
            <MailCheck className="text-tactical-orange mx-auto h-12 w-12" />
            <h1 className="mono text-xl font-bold tracking-wider">{t("Confira seu e-mail")}</h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta e voltar ao aplicativo.",
              )}
            </p>
            {emailPendente && (
              <p className="mono truncate text-xs text-tactical-orange">{emailPendente}</p>
            )}
            <Button
              variant="outline"
              className="glove-tap w-full"
              disabled={reenviando}
              onClick={() => void reenviar()}
            >
              {reenviando ? t("Reenviando…") : t("Reenviar e-mail")}
            </Button>
            <Button
              className="glove-tap w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
              onClick={() => void conferirAgora()}
            >
              {t("Já confirmei")}
            </Button>
          </div>
        )}

        {etapa === "avatar" && (
          <div data-test="portao-avatar">
            <EscolherAvatar permitirPular onConcluir={() => setEstado("liberado")} />
          </div>
        )}
      </div>
    </div>
  );
}
