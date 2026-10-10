/**
 * Escolha de avatar — personagem do catálogo (admin › Personagens) ou foto
 * própria do operador. Usado no Portão de Autenticação (logo após criar
 * conta) e na página /conta › Perfil na nuvem.
 *
 * Sem sessão Supabase, mostra apenas o convite para entrar — nunca quebra.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { perfilAtual, type PerfilManual } from "@/lib/colaboracao";
import {
  definirMeuAvatar,
  enviarFotoPerfil,
  listarPersonagensPublicos,
  type Personagem,
} from "@/lib/personagens";

interface EscolherAvatarProps {
  /** Concluído (avatar salvo ou operador optou por seguir sem avatar). */
  onConcluir?: () => void;
  /** Mostra o botão "agora não" (padrão: verdadeiro na conta, falso no cadastro). */
  permitirPular?: boolean;
  /** Variante compacta para embutir em páginas (sem cabeçalho próprio). */
  compacto?: boolean;
}

export function EscolherAvatar({
  onConcluir,
  permitirPular = true,
  compacto = false,
}: EscolherAvatarProps) {
  const { t } = useI18n();
  const [sessao, setSessao] = useState<"verificando" | "sem-sessao" | "ativa">("verificando");
  const [perfil, setPerfil] = useState<PerfilManual | null>(null);
  const [personagens, setPersonagens] = useState<Personagem[]>([]);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!vivo) return;
        if (!data?.user) {
          setSessao("sem-sessao");
          return;
        }
        setSessao("ativa");
        const p = await perfilAtual();
        if (!vivo) return;
        setPerfil(p);
        setEscolhido(p?.avatar_url ?? null);
        const lista = await listarPersonagensPublicos();
        if (vivo) setPersonagens(lista);
      } catch {
        if (vivo) setPersonagens([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const salvar = useCallback(
    async (url: string | null) => {
      setOcupado(true);
      try {
        await definirMeuAvatar(url);
        setEscolhido(url);
        toast.success(t("Avatar atualizado"));
        onConcluir?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("Falha ao salvar o avatar"));
      } finally {
        setOcupado(false);
      }
    },
    [t, onConcluir],
  );

  const enviarFoto = async (arquivo: File) => {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;
    setOcupado(true);
    try {
      const url = await enviarFotoPerfil(uid, arquivo);
      await salvar(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha ao enviar a foto"));
      setOcupado(false);
    }
  };

  if (sessao === "verificando") {
    return (
      <div className="mono flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Verificando sessão…")}
      </div>
    );
  }

  if (sessao === "sem-sessao") {
    return (
      <p className="text-sm text-muted-foreground" data-test="avatar-sem-sessao">
        {t("Entre na sua conta para escolher um personagem e personalizar o perfil.")}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-test="escolher-avatar">
      {!compacto && (
        <div>
          <h2 className="mono text-lg font-bold tracking-wider text-tactical-orange">
            {t("Escolha seu personagem")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Esse avatar representa você no Manual. Escolha um personagem do elenco ou use a sua própria foto.",
            )}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-background">
          {escolhido ? (
            <img src={escolhido} alt={t("Avatar atual")} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserRound className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="mono truncate text-sm font-bold">
            {perfil?.nome_exibicao ?? perfil?.email ?? "—"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="glove-tap mt-1"
            disabled={ocupado}
            onClick={() => arquivoRef.current?.click()}
            data-test="avatar-enviar-foto"
          >
            <Camera className="h-4 w-4" /> {t("Usar minha foto")}
          </Button>
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void enviarFoto(arquivo);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {personagens.length > 0 ? (
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-6"
          role="listbox"
          aria-label={t("Personagens disponíveis")}
        >
          {personagens.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={escolhido === p.url_imagem}
              disabled={ocupado}
              title={p.nome}
              data-test="avatar-personagem"
              onClick={() => void salvar(p.url_imagem)}
              className={`glove-tap relative aspect-square overflow-hidden rounded-md border transition-colors ${
                escolhido === p.url_imagem
                  ? "border-tactical-orange ring-2 ring-tactical-orange/40"
                  : "border-border hover:border-tactical-orange/60"
              }`}
            >
              {p.url_imagem ? (
                <img src={p.url_imagem} alt={p.nome} className="h-full w-full object-cover" />
              ) : (
                <div className="mono flex h-full w-full items-center justify-center text-xs">
                  {p.nome.slice(0, 2).toUpperCase()}
                </div>
              )}
              {escolhido === p.url_imagem && (
                <span className="absolute right-1 top-1 rounded-full bg-tactical-orange p-0.5 text-background">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-card p-3 text-center text-xs text-muted-foreground">
          {t("O elenco de personagens está sendo montado — por enquanto, use a sua própria foto.")}
        </p>
      )}

      {permitirPular && (
        <Button
          type="button"
          variant="ghost"
          className="glove-tap w-full"
          disabled={ocupado}
          onClick={onConcluir}
          data-test="avatar-pular"
        >
          {t("Agora não")}
        </Button>
      )}
    </div>
  );
}
