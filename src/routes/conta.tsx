import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CloudUpload,
  KeyRound,
  LogOut,
  ShieldCheck,
  Trash2,
  User,
  UserRoundCheck,
} from "lucide-react";
import {
  apagarConta,
  atualizarPerfil,
  alterarSenha,
  criarConta,
  entrar,
  sair,
  contaAtiva,
  contaRegistrada,
  ErroConta,
  type ContaLocal,
} from "@/lib/conta";
import { formatDateTime } from "@/lib/format";
import { EscolherAvatar } from "@/components/EscolherAvatar";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/conta")({
  head: () => ({
    meta: [
      { title: "Conta do operador — TacticalGIS" },
      {
        name: "description",
        content:
          "Crie sua conta local do Manual do Sobrevivente: fica guardada neste aparelho e estará pronta para sincronizar com a nuvem quando o banco de dados estiver ativado.",
      },
      { property: "og:title", content: "Conta do operador — TacticalGIS" },
      {
        property: "og:description",
        content: "Conta local do aparelho, pronta para a futura sincronização com a nuvem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Conta,
});

type Estado = "carregando" | "sem-conta" | "aguardando-sessao" | "autenticada";

function Conta() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [conta, setConta] = useState<ContaLocal | null>(null);
  const [registrada, setRegistrada] = useState<ContaLocal | null>(null);

  const recarregar = async () => {
    const [ativa, reg] = await Promise.all([contaAtiva(), contaRegistrada()]);
    setRegistrada(reg);
    setConta(ativa);
    setEstado(ativa ? "autenticada" : reg ? "aguardando-sessao" : "sem-conta");
  };

  useEffect(() => {
    void recarregar().catch(() => setEstado("sem-conta"));
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4 pb-10 md:p-8">
      <header className="space-y-1">
        <h1 className="mono text-tactical-orange text-2xl font-bold tracking-wider md:text-3xl">
          CONTA DO OPERADOR
        </h1>
        <p className="text-sm text-muted-foreground">
          Guardada neste aparelho, funciona offline e estará pronta para a nuvem.
        </p>
      </header>

      {estado === "carregando" && (
        <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          Verificando aparelho…
        </div>
      )}

      {estado === "sem-conta" && <FormularioCriar onCriada={() => void recarregar()} />}

      {estado === "aguardando-sessao" && registrada && (
        <FormularioEntrar
          registrada={registrada}
          onEntrou={() => void recarregar()}
          onApagada={() => void recarregar()}
        />
      )}

      {estado === "autenticada" && conta && (
        <Perfil
          conta={conta}
          onSair={async () => {
            await sair();
            toast.success("Sessão encerrada — a conta continua neste aparelho");
            await recarregar();
          }}
          onApagada={async () => {
            await recarregar();
            toast.success("Conta apagada deste aparelho");
          }}
        />
      )}

      <div className="rounded-md border border-border bg-card p-4 space-y-2">
        <div className="mono flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
          <CloudUpload className="h-3.5 w-3.5" /> Sobre a sincronização futura
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Hoje seus dados vivem somente neste aparelho (offline-first). Quando o aplicativo ganhar
          banco de dados, esta conta será vinculada ao seu perfil na nuvem pelo mesmo e-mail e
          waypoints, mochila e checklists passarão a sincronizar entre aparelhos — sem você perder
          nada do que já está guardado aqui.
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Já usa a sincronização experimental com Supabase?{" "}
          <Link to="/login" className="text-tactical-orange underline">
            Entre pela conta de nuvem
          </Link>{" "}
          em Ajustes › Nuvem.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FormularioCriar({ onCriada }: { onCriada: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) {
      toast.error("As senhas não coincidem");
      return;
    }
    setOcupado(true);
    try {
      await criarConta({ nome, email, senha });
      toast.success("Conta criada neste aparelho", {
        description: "A partir de agora você pode editar seu perfil e entrar a qualquer momento.",
      });
      onCriada();
    } catch (err) {
      toast.error(err instanceof ErroConta ? err.message : "Não foi possível criar a conta");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <form
      onSubmit={enviar}
      className="space-y-3 rounded-md border border-border bg-card p-4"
      data-test="conta-form-criar"
    >
      <div className="mono flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
        <User className="h-3.5 w-3.5" /> Criar conta local
      </div>
      <div className="space-y-1">
        <Label htmlFor="conta-nome">Nome do operador</Label>
        <Input
          id="conta-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="ex.: Clodoaldo"
          autoComplete="name"
          required
          minLength={2}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="conta-email">E-mail</Label>
        <Input
          id="conta-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          required
        />
        <p className="text-[10px] text-muted-foreground">
          Será o vínculo da sua conta com a futura sincronização na nuvem.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="conta-senha">Senha</Label>
          <Input
            id="conta-senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            minLength={4}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="conta-senha2">Confirmar senha</Label>
          <Input
            id="conta-senha2"
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password"
            minLength={4}
            required
          />
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        A senha fica guardada apenas como hash PBKDF2 dentro do próprio aparelho — nem o aplicativo
        consegue lê-la. Não há servidor envolvido.
      </p>
      <Button
        type="submit"
        disabled={ocupado}
        className="glove-tap w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
      >
        <UserRoundCheck className="h-4 w-4" /> Criar conta
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function FormularioEntrar({
  registrada,
  onEntrou,
  onApagada,
}: {
  registrada: ContaLocal;
  onEntrou: () => void;
  onApagada: () => void;
}) {
  const [email, setEmail] = useState(registrada.email);
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    try {
      const conta = await entrar({ email, senha });
      toast.success(`Bem-vindo de volta, ${conta.nome}`);
      onEntrou();
    } catch (err) {
      toast.error(err instanceof ErroConta ? err.message : "Não foi possível entrar");
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async () => {
    if (!senha) {
      toast.error("Digite a senha para confirmar a exclusão");
      return;
    }
    if (
      !window.confirm(
        `Apagar a conta de ${registrada.nome} deste aparelho? Os waypoints, a mochila e os checklists continuam salvos.`,
      )
    )
      return;
    setOcupado(true);
    try {
      await apagarConta(senha);
      toast.success("Conta apagada deste aparelho");
      onApagada();
    } catch (err) {
      toast.error(err instanceof ErroConta ? err.message : "Não foi possível apagar a conta");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <form
      onSubmit={enviar}
      className="space-y-3 rounded-md border border-border bg-card p-4"
      data-test="conta-form-entrar"
    >
      <div className="mono flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
        <ShieldCheck className="h-3.5 w-3.5" /> Entrar na conta local
      </div>
      <p className="text-xs text-muted-foreground">
        Existe uma conta registrada neste aparelho{" "}
        <span className="mono text-foreground">{registrada.email}</span>. A sessão foi encerrada —
        entre para editar o perfil.
      </p>
      <div className="space-y-1">
        <Label htmlFor="conta-entrar-email">E-mail</Label>
        <Input
          id="conta-entrar-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="conta-entrar-senha">Senha</Label>
        <Input
          id="conta-entrar-senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={ocupado}
        className="glove-tap w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
      >
        <UserRoundCheck className="h-4 w-4" /> Entrar
      </Button>
      <button
        type="button"
        onClick={() => void excluir()}
        disabled={ocupado}
        className="mono w-full pt-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground underline decoration-dotted hover:text-destructive"
        data-test="conta-excluir-sem-sessao"
      >
        Esqueceu a senha? Apague a conta (exige a senha) e crie outra
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function Perfil({
  conta,
  onSair,
  onApagada,
}: {
  conta: ContaLocal;
  onSair: () => Promise<void>;
  onApagada: () => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(conta.nome);
  const [email, setEmail] = useState(conta.email);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaExcluir, setSenhaExcluir] = useState("");
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const salvarPerfil = async () => {
    setOcupado(true);
    try {
      await atualizarPerfil({ nome, email });
      toast.success("Perfil atualizado");
      setEditando(false);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof ErroConta ? err.message : "Não foi possível salvar o perfil");
    } finally {
      setOcupado(false);
    }
  };

  const trocarSenha = async () => {
    setOcupado(true);
    try {
      await alterarSenha(senhaAtual, senhaNova);
      toast.success("Senha alterada");
      setSenhaAtual("");
      setSenhaNova("");
    } catch (err) {
      toast.error(err instanceof ErroConta ? err.message : "Não foi possível trocar a senha");
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async () => {
    setOcupado(true);
    try {
      await apagarConta(senhaExcluir);
      await onApagada();
    } catch (err) {
      toast.error(err instanceof ErroConta ? err.message : "Não foi possível apagar a conta");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-4" data-test="conta-perfil">
      <div
        className="space-y-3 rounded-md border border-border bg-card p-4"
        data-test="conta-cartao"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="mono truncate text-lg font-bold" data-test="conta-nome">
              {conta.nome}
            </p>
            <p className="mono truncate text-xs text-muted-foreground" data-test="conta-email">
              {conta.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="glove-tap shrink-0"
            onClick={() => setEditando((v) => !v)}
          >
            {editando ? "Fechar" : "Editar"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <div>
            <p className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Conta desde
            </p>
            <p className="mono text-[11px]">
              {formatDateTime(new Date(conta.criada_em).getTime())}
            </p>
          </div>
          <div>
            <p className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Último acesso
            </p>
            <p className="mono text-[11px]">
              {formatDateTime(new Date(conta.ultimo_acesso).getTime())}
            </p>
          </div>
        </div>

        {editando && (
          <div className="space-y-3 border-t border-border pt-3" data-test="conta-editar">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="conta-editar-nome">Nome</Label>
                <Input
                  id="conta-editar-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="conta-editar-email">E-mail</Label>
                <Input
                  id="conta-editar-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => void salvarPerfil()}
              disabled={ocupado}
              className="glove-tap w-full"
            >
              Salvar perfil
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="mono flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
          <KeyRound className="h-3.5 w-3.5" /> Trocar senha
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="conta-senha-atual">Senha atual</Label>
            <Input
              id="conta-senha-atual"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conta-senha-nova">Nova senha</Label>
            <Input
              id="conta-senha-nova"
              type="password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => void trocarSenha()}
          disabled={ocupado || !senhaAtual || !senhaNova}
          className="glove-tap w-full"
        >
          Atualizar senha
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="secondary"
          onClick={() => void onSair()}
          className="glove-tap w-full"
          data-test="conta-sair"
        >
          <LogOut className="h-4 w-4" /> Sair da sessão
        </Button>
        <Button
          variant="destructive"
          onClick={() => setConfirmarExcluir((v) => !v)}
          className="glove-tap w-full"
          data-test="conta-excluir"
        >
          <Trash2 className="h-4 w-4" /> Excluir conta
        </Button>
      </div>

      {confirmarExcluir && (
        <div
          className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-test="conta-excluir-confirmar"
        >
          <p className="text-xs leading-relaxed">
            Digite a senha para apagar a conta deste aparelho. Seus waypoints, mochila e checklists
            continuam salvos — só o cadastro é removido.
          </p>
          <Input
            type="password"
            value={senhaExcluir}
            onChange={(e) => setSenhaExcluir(e.target.value)}
            placeholder="Senha da conta"
            autoComplete="current-password"
          />
          <Button
            variant="destructive"
            onClick={() => void excluir()}
            disabled={ocupado || !senhaExcluir}
            className="glove-tap w-full"
          >
            Confirmar exclusão
          </Button>
        </div>
      )}

      <PerfilNuvem />
    </div>
  );
}

/**
 * Perfil na nuvem (Supabase): avatar com personagens do elenco ou foto
 * própria — a mesma escolha oferecida no cadastro. Sem sessão, mostra o
 * convite para entrar.
 */
function PerfilNuvem() {
  const { t } = useI18n();
  const [expandido, setExpandido] = useState(false);
  return (
    <div
      className="space-y-3 rounded-md border border-border bg-card p-4"
      data-test="conta-perfil-nuvem"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mono flex items-center gap-2 text-sm font-bold text-tactical-orange">
            <CloudUpload className="h-4 w-4" /> {t("Perfil na nuvem")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Personagem e foto que representam você entre os aparelhos.")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="glove-tap shrink-0"
          onClick={() => setExpandido((v) => !v)}
          data-test="conta-avatar-abrir"
        >
          {expandido ? t("Fechar") : t("Personalizar")}
        </Button>
      </div>
      {expandido && <EscolherAvatar compacto permitirPular={false} onConcluir={() => undefined} />}
    </div>
  );
}
