import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  Loader2,
  Medal,
  Megaphone,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
  VenetianMask,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatMoeda, formatDateTime } from "@/lib/format";
import {
  papelAtual,
  type ConfigPix,
  type Contribuicao,
  type Parceiro,
  type PerfilManual,
} from "@/lib/colaboracao";
import {
  enviarImagemPersonagem,
  excluirPersonagem,
  listarPersonagensAdmin,
  salvarPersonagem,
  type Personagem,
} from "@/lib/personagens";
import {
  apagarPerfilAdmin,
  atualizarPerfilAdmin,
  decidirContribuicao,
  excluirContribuicao,
  excluirParceiro,
  lerEstatisticas,
  listarContribuicoesAdmin,
  listarParceirosAdmin,
  listarPerfisAdmin,
  salvarConfigPix,
  salvarParceiro,
  type Estatisticas,
} from "@/lib/admin";
import { lerConfigPix, assinarNovasContribuicoes } from "@/lib/colaboracao";
import { montarPixCopiaECola } from "@/lib/pix.brcode";
import {
  atualizarApoiador,
  criarApoiador,
  excluirApoiador,
  listarApoiadoresAdmin,
  type Apoiador,
} from "@/lib/apoiadores";
import {
  atualizarConhecimento,
  criarConhecimento,
  excluirConhecimento,
  listarConhecimentoAdmin,
  type EntradaConhecimento,
} from "@/lib/ia-conhecimento";
import { lerConfigPopups, type ConfigPopups } from "@/lib/popups";

/** Painel administrativo do Centro (outra aplicação do ecossistema). */
const CENTRO_ADMIN_URL = "https://centrodesobrevivencia.vercel.app/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — Manual do Sobrevivente" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Admin,
});

type Secao =
  | "visao"
  | "colaboracoes"
  | "usuarios"
  | "parceiros"
  | "personagens"
  | "apoiadores"
  | "ia"
  | "config";

const SECOES: { id: Secao; rotulo: string; icone: typeof LayoutDashboard }[] = [
  { id: "visao", rotulo: "Visão geral", icone: LayoutDashboard },
  { id: "colaboracoes", rotulo: "Colaborações", icone: HeartHandshake },
  { id: "usuarios", rotulo: "Usuários", icone: Users },
  { id: "apoiadores", rotulo: "Apoiadores", icone: Medal },
  { id: "parceiros", rotulo: "Parceiros", icone: Handshake },
  { id: "personagens", rotulo: "Personagens", icone: VenetianMask },
  { id: "ia", rotulo: "IA · Conhecimento", icone: Bot },
  { id: "config", rotulo: "Configurações", icone: Settings },
];

type Acesso = "carregando" | "restrito" | "autorizado";

function Admin() {
  const { t } = useI18n();
  const [acesso, setAcesso] = useState<Acesso>("carregando");
  const [secao, setSecao] = useState<Secao>("visao");
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);

  const recarregarEstatisticas = useCallback(() => {
    void lerEstatisticas()
      .then(setEstatisticas)
      .catch(() => setEstatisticas(null));
  }, []);

  useEffect(() => {
    let desassinar: (() => void) | null = null;
    void (async () => {
      try {
        const papel = await papelAtual();
        if (papel !== "admin") {
          setAcesso("restrito");
          return;
        }
        setAcesso("autorizado");
        recarregarEstatisticas();
        // Notificação ao vivo: toda contribuição nova dispara aviso imediato.
        desassinar = assinarNovasContribuicoes((mensagem) => {
          toast.success(t("Nova contribuição recebida"), { description: mensagem });
          recarregarEstatisticas();
        });
      } catch {
        setAcesso("restrito");
      }
    })();
    return () => desassinar?.();
  }, [t, recarregarEstatisticas]);

  if (acesso === "carregando") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="mono flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> {t("Verificando credenciais…")}
        </div>
      </div>
    );
  }

  if (acesso === "restrito") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center p-4">
        <div
          className="w-full space-y-3 rounded-md border border-destructive/50 bg-destructive/5 p-6 text-center"
          data-test="admin-restrito"
        >
          <ShieldAlert className="text-destructive mx-auto h-10 w-10" />
          <h1 className="mono text-xl font-bold tracking-wider">{t("ACESSO RESTRITO")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Este painel é exclusivo da administração do projeto. Entre com a conta autorizada para gerenciar colaborações, usuários e parceiros.",
            )}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">{t("Entrar com a conta autorizada")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 pb-10 md:p-8" data-test="admin-painel">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="mono text-tactical-orange text-xl font-bold tracking-wider md:text-2xl">
            {t("PAINEL ADMINISTRATIVO")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("Gestão do Manual — o ecossistema inteiro a um comando de distância")}
          </p>
        </div>
        {/* Alternador de aplicações: mesmo operador, dois apps, zero acoplamento */}
        <div
          className="ml-auto flex items-center gap-1 rounded-md border border-border bg-card p-1"
          data-test="admin-alternador"
        >
          <span className="mono bg-tactical-orange rounded px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-background">
            {t("Manual")}
          </span>
          <a
            href={CENTRO_ADMIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mono flex items-center gap-1 rounded px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            title={t("Abrir o painel do Centro em nova aba")}
          >
            {t("Centro")} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto pb-1">
        {SECOES.map((item) => {
          const Icone = item.icone;
          const ativo = secao === item.id;
          const selo =
            item.id === "colaboracoes" && (estatisticas?.contribuicoesPendentes ?? 0) > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSecao(item.id)}
              className={`glove-tap mono flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                ativo
                  ? "border-tactical-orange/60 bg-tactical-orange/10 text-tactical-orange"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
              data-test={`admin-secao-${item.id}`}
            >
              <Icone className="h-4 w-4" />
              {t(item.rotulo)}
              {selo && (
                <span className="rounded-full bg-destructive px-1.5 text-[10px] text-white">
                  {estatisticas?.contribuicoesPendentes}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {secao === "visao" && <SecaoVisao estatisticas={estatisticas} />}
      {secao === "colaboracoes" && <SecaoColaboracoes />}
      {secao === "usuarios" && <SecaoUsuarios />}
      {secao === "parceiros" && <SecaoParceiros />}
      {secao === "personagens" && <SecaoPersonagens />}
      {secao === "apoiadores" && <SecaoApoiadores />}
      {secao === "ia" && <SecaoIA />}
      {secao === "config" && <SecaoConfig />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visão geral                                                        */
/* ------------------------------------------------------------------ */

function SecaoVisao({ estatisticas }: { estatisticas: Estatisticas | null }) {
  const { t } = useI18n();
  if (!estatisticas) {
    return (
      <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
        {t("Carregando indicadores…")}
      </p>
    );
  }
  return (
    <div className="space-y-4" data-test="admin-visao">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <CartaoKpi rotulo={t("Usuários")} valor={String(estatisticas.usuarios)} />
        <CartaoKpi
          rotulo={t("Pendentes")}
          valor={String(estatisticas.contribuicoesPendentes)}
          destaque={estatisticas.contribuicoesPendentes > 0}
        />
        <CartaoKpi rotulo={t("Arrecadado")} valor={formatMoeda(estatisticas.totalAprovado)} />
        <CartaoKpi
          rotulo={t("Parceiros ativos")}
          valor={`${estatisticas.parceirosAtivos}/${estatisticas.parceirosTotal}`}
        />
        <CartaoKpi rotulo={t("Personagens")} valor={String(estatisticas.personagens)} />
        <CartaoKpi rotulo={t("Apoiadores")} valor={String(estatisticas.apoiadores)} />
        <CartaoKpi rotulo={t("Conhecimento IA")} valor={String(estatisticas.iaConhecimento)} />
        <CartaoKpi
          rotulo={t("Contas bloqueadas")}
          valor={String(estatisticas.bloqueados)}
          destaque={estatisticas.bloqueados > 0}
        />
      </div>
      <div className="rounded-md border border-border bg-card p-4">
        <p className="mono text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
          {t("Como o funil funciona")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t(
            "O operador colabora em /colaboradores/apoiar e a contribuição cai aqui como pendente. Ao aprovar, o perfil entra automaticamente na redline pública. Tudo em tempo real, sem recarregar a página.",
          )}
        </p>
      </div>
    </div>
  );
}

function CartaoKpi({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        destaque ? "border-destructive/60 bg-destructive/5" : "border-border bg-card"
      }`}
    >
      <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{rotulo}</p>
      <p className="mono mt-1 truncate text-xl font-bold">{valor}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colaborações — fila de aprovação                                   */
/* ------------------------------------------------------------------ */

type Filtro = "todas" | Contribuicao["status"];

function SecaoColaboracoes() {
  const { t } = useI18n();
  const [filtro, setFiltro] = useState<Filtro>("pendente");
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Contribuicao[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setItens(await listarContribuicoesAdmin(filtro, busca));
    } catch {
      setItens([]);
    }
  }, [filtro, busca]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Realtime: nova contribuição chega sem apertar nada
  useEffect(() => {
    const desassinar = assinarNovasContribuicoes(() => void recarregar());
    return () => desassinar();
  }, [recarregar]);

  const decidir = async (item: Contribuicao, decisao: "aprovada" | "rejeitada") => {
    setOcupado(item.id);
    try {
      await decidirContribuicao(item.id, decisao);
      toast.success(
        decisao === "aprovada"
          ? t("Aprovada — perfil entra na redline")
          : t("Contribuição rejeitada"),
      );
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(null);
    }
  };

  const excluir = async (item: Contribuicao) => {
    if (!window.confirm(t("Excluir esta contribuição? A ação é definitiva."))) return;
    setOcupado(item.id);
    try {
      await excluirContribuicao(item.id);
      toast.success(t("Contribuição excluída"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(null);
    }
  };

  const filtros: { id: Filtro; rotulo: string }[] = [
    { id: "pendente", rotulo: "Pendentes" },
    { id: "aprovada", rotulo: "Aprovadas" },
    { id: "rejeitada", rotulo: "Rejeitadas" },
    { id: "todas", rotulo: "Todas" },
  ];

  return (
    <div className="space-y-3" data-test="admin-colaboracoes">
      <div className="flex flex-wrap items-center gap-2">
        {filtros.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filtro === f.id ? "default" : "outline"}
            className={`glove-tap ${filtro === f.id ? "bg-tactical-orange text-background" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {t(f.rotulo)}
          </Button>
        ))}
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por nome…")}
            className="pl-8"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => void recarregar()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {itens === null ? (
        <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("Carregando contribuições…")}
        </p>
      ) : itens.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          {t("Nada por aqui com esse filtro.")}
        </p>
      ) : (
        itens.map((item) => (
          <div
            key={item.id}
            className="space-y-2 rounded-md border border-border bg-card p-3"
            data-test="admin-colaboracao"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono font-bold">{item.nome_exibicao}</span>
              <Badge
                variant={
                  item.status === "aprovada"
                    ? "default"
                    : item.status === "rejeitada"
                      ? "destructive"
                      : "secondary"
                }
                className="mono text-[10px] uppercase"
              >
                {item.status === "aprovada"
                  ? t("Aprovada")
                  : item.status === "rejeitada"
                    ? t("Rejeitada")
                    : t("Pendente")}
              </Badge>
              <span className="mono text-tactical-orange ml-auto text-lg font-bold">
                {formatMoeda(Number(item.valor))}
              </span>
            </div>
            <p className="mono text-[11px] text-muted-foreground">
              {item.email} · {formatDateTime(new Date(item.created_at).getTime())}
              {item.approved_at
                ? ` · ${t("aprovada em")} ${formatDateTime(new Date(item.approved_at).getTime())}`
                : ""}
            </p>
            {item.mensagem && (
              <p className="border-l-2 border-border pl-2 text-sm italic text-muted-foreground">
                “{item.mensagem}”
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {item.status !== "aprovada" && (
                <Button
                  size="sm"
                  className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90"
                  disabled={ocupado === item.id}
                  onClick={() => void decidir(item, "aprovada")}
                  data-test="admin-aprovar"
                >
                  <CheckCircle2 className="h-4 w-4" /> {t("Aprovar")}
                </Button>
              )}
              {item.status !== "rejeitada" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="glove-tap"
                  disabled={ocupado === item.id}
                  onClick={() => void decidir(item, "rejeitada")}
                >
                  <XCircle className="h-4 w-4" /> {t("Rejeitar")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="glove-tap text-destructive hover:text-destructive"
                disabled={ocupado === item.id}
                onClick={() => void excluir(item)}
              >
                <Trash2 className="h-4 w-4" /> {t("Excluir")}
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Usuários                                                           */
/* ------------------------------------------------------------------ */

function SecaoUsuarios() {
  const { t } = useI18n();
  const [busca, setBusca] = useState("");
  const [perfis, setPerfis] = useState<PerfilManual[] | null>(null);
  const [editando, setEditando] = useState<PerfilManual | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setPerfis(await listarPerfisAdmin(busca));
    } catch {
      setPerfis([]);
    }
  }, [busca]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const trocarPapel = async (perfil: PerfilManual, papel: string) => {
    try {
      await atualizarPerfilAdmin(perfil.id, { papel });
      toast.success(papel === "admin" ? t("Perfil promovido a admin") : t("Papel atualizado"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
      await recarregar();
    }
  };

  /** Bloqueia/desbloqueia o perfil no espelho (marcador administrativo). */
  const trocarBloqueio = async (perfil: PerfilManual, bloqueado: boolean) => {
    try {
      await atualizarPerfilAdmin(perfil.id, { bloqueado });
      toast.success(bloqueado ? t("Perfil bloqueado") : t("Perfil desbloqueado"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
      await recarregar();
    }
  };

  const apagar = async (perfil: PerfilManual) => {
    if (
      !window.confirm(
        t("Remover o perfil de {nome} do painel? A conta de acesso continua existindo.", {
          nome: perfil.nome_exibicao ?? perfil.email,
        }),
      )
    )
      return;
    try {
      await apagarPerfilAdmin(perfil.id);
      toast.success(t("Perfil removido"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  return (
    <div className="space-y-3" data-test="admin-usuarios">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por nome ou e-mail…")}
            className="pl-8"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => void recarregar()} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {perfis === null ? (
        <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("Carregando contas…")}
        </p>
      ) : (
        perfis.map((perfil) => (
          <div
            key={perfil.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
            data-test="admin-usuario"
          >
            {perfil.avatar_url ? (
              <img
                src={perfil.avatar_url}
                alt={perfil.nome_exibicao ?? perfil.email}
                className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="mono flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs">
                {(perfil.nome_exibicao ?? perfil.email).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="mono truncate font-bold">
                {perfil.nome_exibicao ?? perfil.email}
                {perfil.papel === "admin" && (
                  <Badge className="mono ml-2 text-[10px] uppercase">{t("Admin")}</Badge>
                )}
                {perfil.bloqueado && (
                  <Badge variant="destructive" className="mono ml-2 text-[10px] uppercase">
                    {t("Bloqueado")}
                  </Badge>
                )}
              </p>
              <p className="mono truncate text-[11px] text-muted-foreground">
                {perfil.email} · {t("conta desde")}{" "}
                {formatDateTime(new Date(perfil.created_at).getTime())}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="mono text-[10px] uppercase text-muted-foreground">
                {perfil.bloqueado ? t("Bloqueado") : t("Ativo")}
              </span>
              <Switch
                checked={!!perfil.bloqueado}
                onCheckedChange={(v) => void trocarBloqueio(perfil, v)}
                aria-label={t("Bloquear conta no painel")}
              />
            </div>
            <select
              value={perfil.papel}
              onChange={(e) => void trocarPapel(perfil, e.target.value)}
              className="mono rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              aria-label={t("Papel do operador")}
            >
              <option value="usuario">{t("Usuário")}</option>
              <option value="admin">{t("Administrador")}</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="glove-tap"
              onClick={() => setEditando(perfil)}
            >
              <Pencil className="h-4 w-4" /> {t("Editar")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="glove-tap text-destructive hover:text-destructive"
              onClick={() => void apagar(perfil)}
            >
              <Trash2 className="h-4 w-4" /> {t("Remover")}
            </Button>
          </div>
        ))
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          {editando && (
            <FormularioEditarPerfil
              perfil={editando}
              onSalvo={async () => {
                setEditando(null);
                await recarregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormularioEditarPerfil({
  perfil,
  onSalvo,
}: {
  perfil: PerfilManual;
  onSalvo: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [nome, setNome] = useState(perfil.nome_exibicao ?? "");
  const [avatar, setAvatar] = useState(perfil.avatar_url ?? "");
  const [ocupado, setOcupado] = useState(false);

  const salvar = async () => {
    setOcupado(true);
    try {
      await atualizarPerfilAdmin(perfil.id, { nome_exibicao: nome, avatar_url: avatar });
      toast.success(t("Perfil atualizado"));
      await onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle className="mono">{t("Editar perfil")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-1">
        <Label htmlFor="perfil-nome">{t("Nome de exibição")}</Label>
        <Input id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="perfil-avatar">{t("URL do avatar")}</Label>
        <Input id="perfil-avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
      </div>
      <DialogFooter>
        <Button onClick={() => void salvar()} disabled={ocupado} className="w-full">
          {ocupado ? t("Salvando…") : t("Salvar alterações")}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Parceiros — CRUD completo                                          */
/* ------------------------------------------------------------------ */

const PARCEIRO_VAZIO: Parceiro = {
  id: "",
  nome: "",
  descricao: null,
  logo_url: null,
  link: null,
  nivel: "apoiador",
  ordem: 0,
  ativo: true,
  created_at: "",
};

function SecaoParceiros() {
  const { t } = useI18n();
  const [itens, setItens] = useState<Parceiro[] | null>(null);
  const [editando, setEditando] = useState<Parceiro | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setItens(await listarParceirosAdmin());
    } catch {
      setItens([]);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const alternarAtivo = async (parceiro: Parceiro) => {
    try {
      await salvarParceiro({ ...parceiro, ativo: !parceiro.ativo });
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  const excluir = async (parceiro: Parceiro) => {
    if (!window.confirm(t("Excluir o parceiro {nome}?", { nome: parceiro.nome }))) return;
    try {
      await excluirParceiro(parceiro.id);
      toast.success(t("Parceiro excluído"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  return (
    <div className="space-y-3" data-test="admin-parceiros">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {t("Parceiros ativos aparecem em /parceiros e na faixa da página de colaboradores.")}
        </p>
        <Button
          className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90 ml-auto"
          size="sm"
          onClick={() => setEditando({ ...PARCEIRO_VAZIO })}
          data-test="admin-parceiro-novo"
        >
          {t("Novo parceiro")}
        </Button>
      </div>

      {itens === null ? (
        <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("Carregando parceiros…")}
        </p>
      ) : itens.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          {t("Nenhum parceiro cadastrado ainda.")}
        </p>
      ) : (
        itens.map((parceiro) => (
          <div
            key={parceiro.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
            data-test="admin-parceiro"
          >
            {parceiro.logo_url ? (
              <img
                src={parceiro.logo_url}
                alt={parceiro.nome}
                className="h-10 w-10 rounded border border-border bg-white object-contain p-0.5"
              />
            ) : (
              <div className="mono flex h-10 w-10 items-center justify-center rounded border border-border bg-background text-xs">
                {parceiro.nome.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="mono truncate font-bold">
                {parceiro.nome}
                <span className="text-muted-foreground"> · {t(parceiro.nivel)}</span>
              </p>
              <p className="mono truncate text-[11px] text-muted-foreground">
                {parceiro.link ?? t("sem link")} · {t("ordem")} {parceiro.ordem}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] uppercase text-muted-foreground">
                {parceiro.ativo ? t("Ativo") : t("Inativo")}
              </span>
              <Switch
                checked={parceiro.ativo}
                onCheckedChange={() => void alternarAtivo(parceiro)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="glove-tap"
              onClick={() => setEditando(parceiro)}
            >
              <Pencil className="h-4 w-4" /> {t("Editar")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="glove-tap text-destructive hover:text-destructive"
              onClick={() => void excluir(parceiro)}
            >
              <Trash2 className="h-4 w-4" /> {t("Excluir")}
            </Button>
          </div>
        ))
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {editando && (
            <FormularioParceiro
              parceiro={editando}
              onSalvo={async () => {
                setEditando(null);
                await recarregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormularioParceiro({
  parceiro,
  onSalvo,
}: {
  parceiro: Parceiro;
  onSalvo: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [nome, setNome] = useState(parceiro.nome);
  const [descricao, setDescricao] = useState(parceiro.descricao ?? "");
  const [logo, setLogo] = useState(parceiro.logo_url ?? "");
  const [link, setLink] = useState(parceiro.link ?? "");
  const [nivel, setNivel] = useState<Parceiro["nivel"]>(parceiro.nivel);
  const [ordem, setOrdem] = useState(String(parceiro.ordem));
  const [ativo, setAtivo] = useState(parceiro.ativo);
  const [ocupado, setOcupado] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) {
      toast.error(t("Informe o nome do parceiro"));
      return;
    }
    setOcupado(true);
    try {
      await salvarParceiro({
        ...parceiro,
        nome,
        descricao,
        logo_url: logo,
        link,
        nivel,
        ordem: Number(ordem) || 0,
        ativo,
      });
      toast.success(t("Parceiro salvo"));
      await onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle className="mono">
          {parceiro.id ? t("Editar parceiro") : t("Novo parceiro")}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="parceiro-nome">{t("Nome da marca")}</Label>
          <Input id="parceiro-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="parceiro-nivel">{t("Nível de patrocínio")}</Label>
          <select
            id="parceiro-nivel"
            value={nivel}
            onChange={(e) => setNivel(e.target.value as Parceiro["nivel"])}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="ouro">{t("ouro")}</option>
            <option value="prata">{t("prata")}</option>
            <option value="bronze">{t("bronze")}</option>
            <option value="apoiador">{t("apoiador")}</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="parceiro-descricao">{t("Descrição")}</Label>
          <Input
            id="parceiro-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={t("Uma linha sobre a marca")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="parceiro-logo">{t("URL do logo")}</Label>
          <Input id="parceiro-logo" value={logo} onChange={(e) => setLogo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="parceiro-link">{t("Link do parceiro")}</Label>
          <Input
            id="parceiro-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="parceiro-ordem">{t("Ordem de exibição")}</Label>
          <Input
            id="parceiro-ordem"
            inputMode="numeric"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={ativo} onCheckedChange={setAtivo} id="parceiro-ativo" />
          <Label htmlFor="parceiro-ativo">{t("Ativo (visível no app)")}</Label>
        </div>
      </div>
      {logo && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <img
            src={logo}
            alt={t("Prévia do logo")}
            className="h-10 w-10 rounded border border-border bg-white object-contain p-0.5"
          />
          <span className="mono text-[10px] text-muted-foreground">{t("Prévia do logo")}</span>
        </div>
      )}
      <DialogFooter>
        <Button
          onClick={() => void salvar()}
          disabled={ocupado}
          className="w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
        >
          {ocupado ? t("Salvando…") : t("Salvar parceiro")}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Personagens — elenco de avatares escolhíveis no cadastro           */
/* ------------------------------------------------------------------ */

const PERSONAGEM_VAZIO: Personagem = {
  id: "",
  nome: "",
  descricao: null,
  url_imagem: null,
  ativo: true,
  ordem: 0,
  created_at: "",
};

function SecaoPersonagens() {
  const { t } = useI18n();
  const [itens, setItens] = useState<Personagem[] | null>(null);
  const [editando, setEditando] = useState<Personagem | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setItens(await listarPersonagensAdmin());
    } catch {
      setItens([]);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const alternarAtivo = async (personagem: Personagem) => {
    try {
      await salvarPersonagem({ ...personagem, ativo: !personagem.ativo });
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  const excluir = async (personagem: Personagem) => {
    if (!window.confirm(t("Excluir o personagem {nome}?", { nome: personagem.nome }))) return;
    try {
      await excluirPersonagem(personagem.id);
      toast.success(t("Personagem excluído"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  return (
    <div className="space-y-3" data-test="admin-personagens">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {t(
            "Personagens ativos aparecem na escolha de avatar ao criar conta e em Conta › Perfil na nuvem. Você pode enviar uma imagem ou colar uma URL.",
          )}
        </p>
        <Button
          className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90 ml-auto"
          size="sm"
          onClick={() => setEditando({ ...PERSONAGEM_VAZIO })}
          data-test="admin-personagem-novo"
        >
          {t("Novo personagem")}
        </Button>
      </div>

      {itens === null ? (
        <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("Carregando personagens…")}
        </p>
      ) : itens.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          {t("Nenhum personagem cadastrado ainda — o elenco começa aqui.")}
        </p>
      ) : (
        itens.map((personagem) => (
          <div
            key={personagem.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
            data-test="admin-personagem"
          >
            {personagem.url_imagem ? (
              <img
                src={personagem.url_imagem}
                alt={personagem.nome}
                className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="mono flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs">
                {personagem.nome.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="mono truncate font-bold">{personagem.nome}</p>
              <p className="mono truncate text-[11px] text-muted-foreground">
                {personagem.descricao ?? t("sem descrição")} · {t("ordem")} {personagem.ordem}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] uppercase text-muted-foreground">
                {personagem.ativo ? t("Ativo") : t("Inativo")}
              </span>
              <Switch
                checked={personagem.ativo}
                onCheckedChange={() => void alternarAtivo(personagem)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="glove-tap"
              onClick={() => setEditando(personagem)}
            >
              <Pencil className="h-4 w-4" /> {t("Editar")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="glove-tap text-destructive hover:text-destructive"
              onClick={() => void excluir(personagem)}
            >
              <Trash2 className="h-4 w-4" /> {t("Excluir")}
            </Button>
          </div>
        ))
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {editando && (
            <FormularioPersonagem
              personagem={editando}
              onSalvo={async () => {
                setEditando(null);
                await recarregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormularioPersonagem({
  personagem,
  onSalvo,
}: {
  personagem: Personagem;
  onSalvo: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [nome, setNome] = useState(personagem.nome);
  const [descricao, setDescricao] = useState(personagem.descricao ?? "");
  const [urlImagem, setUrlImagem] = useState(personagem.url_imagem ?? "");
  const [ordem, setOrdem] = useState(String(personagem.ordem));
  const [ativo, setAtivo] = useState(personagem.ativo);
  const [ocupado, setOcupado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const salvar = async () => {
    if (!nome.trim()) {
      toast.error(t("Informe o nome do personagem"));
      return;
    }
    setOcupado(true);
    try {
      await salvarPersonagem({
        ...personagem,
        nome,
        descricao,
        url_imagem: urlImagem,
        ordem: Number(ordem) || 0,
        ativo,
      });
      toast.success(t("Personagem salvo"));
      await onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(false);
    }
  };

  const enviarImagem = async (arquivo: File) => {
    setEnviando(true);
    try {
      const url = await enviarImagemPersonagem(arquivo);
      setUrlImagem(url);
      toast.success(t("Imagem enviada"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha ao enviar a imagem"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle className="mono">
          {personagem.id ? t("Editar personagem") : t("Novo personagem")}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="personagem-nome">{t("Nome")}</Label>
          <Input id="personagem-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="personagem-ordem">{t("Ordem de exibição")}</Label>
          <Input
            id="personagem-ordem"
            inputMode="numeric"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="personagem-descricao">{t("Descrição (opcional)")}</Label>
          <Input
            id="personagem-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={t("Ex.: Guia da floresta")}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="personagem-url">{t("Imagem (URL ou upload)")}</Label>
          <div className="flex gap-2">
            <Input
              id="personagem-url"
              value={urlImagem}
              onChange={(e) => setUrlImagem(e.target.value)}
              placeholder="https://…"
            />
            <Button
              type="button"
              variant="outline"
              className="glove-tap shrink-0"
              disabled={enviando}
              onClick={() => arquivoRef.current?.click()}
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t("Enviar")}
            </Button>
            <input
              ref={arquivoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) void enviarImagem(arquivo);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <div className="flex items-end gap-2 pb-1 sm:col-span-2">
          <Switch checked={ativo} onCheckedChange={setAtivo} id="personagem-ativo" />
          <Label htmlFor="personagem-ativo">{t("Ativo (aparece no cadastro)")}</Label>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
        {urlImagem ? (
          <img
            src={urlImagem}
            alt={t("Prévia do personagem")}
            className="h-14 w-14 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="mono flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">
            {t("sem imagem")}
          </div>
        )}
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("Prévia do avatar")}
        </span>
      </div>
      <DialogFooter>
        <Button
          onClick={() => void salvar()}
          disabled={ocupado}
          className="w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
        >
          {ocupado ? t("Salvando…") : t("Salvar personagem")}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Apoiadores — mural da comunidade (78 nomes semeados, ordem livre)  */
/* ------------------------------------------------------------------ */

const APOIADOR_VAZIO: Apoiador = {
  id: "",
  nome: "",
  cidade: null,
  nivel: "apoiador",
  ativo: true,
  ordem: 0,
  created_at: "",
};

function SecaoApoiadores() {
  const { t } = useI18n();
  const [itens, setItens] = useState<Apoiador[] | null>(null);
  const [editando, setEditando] = useState<Apoiador | null>(null);
  const [busca, setBusca] = useState("");

  const recarregar = useCallback(async () => {
    try {
      setItens(await listarApoiadoresAdmin());
    } catch {
      setItens([]);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const alternarAtivo = async (apoiador: Apoiador) => {
    try {
      await atualizarApoiador(apoiador.id, { ativo: !apoiador.ativo });
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  const excluir = async (apoiador: Apoiador) => {
    if (!window.confirm(t("Remover {nome} do mural?", { nome: apoiador.nome }))) return;
    try {
      await excluirApoiador(apoiador.id);
      toast.success(t("Apoiador removido"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  const visiveis = (itens ?? []).filter((a) =>
    busca.trim() ? a.nome.toLowerCase().includes(busca.trim().toLowerCase()) : true,
  );

  return (
    <div className="space-y-3" data-test="admin-apoiadores">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {t(
            "Mural público em /colaboradores. A ordem é a da coluna Ordem — nunca alfabética. A semente já vem com 78 apoiadores.",
          )}
        </p>
        <Button
          className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90 ml-auto"
          size="sm"
          onClick={() => setEditando({ ...APOIADOR_VAZIO })}
          data-test="admin-apoiador-novo"
        >
          {t("Novo apoiador")}
        </Button>
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar por nome…")}
          className="pl-8"
        />
      </div>

      {itens === null ? (
        <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("Carregando apoiadores…")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {visiveis.map((apoiador) => (
            <div
              key={apoiador.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
              data-test="admin-apoiador"
            >
              <span className="mono w-8 shrink-0 text-[10px] text-muted-foreground">
                #{apoiador.ordem}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{apoiador.nome}</span>
              <span className="text-muted-foreground truncate text-[11px]">
                {apoiador.cidade ?? "—"}
              </span>
              <span
                className={`mono rounded px-1.5 text-[10px] font-bold ${
                  apoiador.ativo
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {apoiador.ativo ? t("Ativo") : t("Inativo")}
              </span>
              <Switch
                checked={apoiador.ativo}
                onCheckedChange={() => void alternarAtivo(apoiador)}
                aria-label={t("Ativo")}
              />
              <Button
                variant="ghost"
                size="sm"
                className="glove-tap"
                onClick={() => setEditando(apoiador)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="glove-tap text-destructive hover:text-destructive"
                onClick={() => void excluir(apoiador)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          {editando && (
            <FormularioApoiador
              apoiador={editando}
              onSalvo={async () => {
                setEditando(null);
                await recarregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormularioApoiador({
  apoiador,
  onSalvo,
}: {
  apoiador: Apoiador;
  onSalvo: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [nome, setNome] = useState(apoiador.nome);
  const [cidade, setCidade] = useState(apoiador.cidade ?? "");
  const [ordem, setOrdem] = useState(String(apoiador.ordem));
  const [ativo, setAtivo] = useState(apoiador.ativo);
  const [ocupado, setOcupado] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) {
      toast.error(t("Informe o nome do apoiador"));
      return;
    }
    setOcupado(true);
    try {
      if (apoiador.id) {
        await atualizarApoiador(apoiador.id, {
          nome: nome.trim(),
          cidade: cidade.trim() || null,
          ordem: Number(ordem) || 0,
          ativo,
        });
      } else {
        await criarApoiador({
          nome: nome.trim(),
          cidade: cidade.trim() || null,
          ordem: Number(ordem) || 0,
          ativo,
        });
      }
      toast.success(t("Apoiador salvo"));
      await onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle className="mono">
          {apoiador.id ? t("Editar apoiador") : t("Novo apoiador")}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="apoiador-nome">{t("Nome")}</Label>
          <Input
            id="apoiador-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("ex.: Maria do Socorro")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="apoiador-cidade">{t("Cidade (opcional)")}</Label>
          <Input
            id="apoiador-cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder={t("ex.: Recife")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="apoiador-ordem">{t("Ordem no mural")}</Label>
          <Input
            id="apoiador-ordem"
            inputMode="numeric"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={ativo} onCheckedChange={setAtivo} id="apoiador-ativo" />
          <Label htmlFor="apoiador-ativo">{t("Ativo (visível no mural)")}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => void salvar()}
          disabled={ocupado}
          className="w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
        >
          {ocupado ? t("Salvando…") : t("Salvar apoiador")}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* IA · Conhecimento — base global curada pelo admin                  */
/* ------------------------------------------------------------------ */

function SecaoIA() {
  const { t } = useI18n();
  const [itens, setItens] = useState<EntradaConhecimento[] | null>(null);
  const [editando, setEditando] = useState<EntradaConhecimento | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setItens(await listarConhecimentoAdmin());
    } catch {
      setItens([]);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const alternarAtivo = async (item: EntradaConhecimento) => {
    try {
      await atualizarConhecimento(item.id, { ativo: !item.ativo });
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  const excluir = async (item: EntradaConhecimento) => {
    if (!window.confirm(t("Excluir este conhecimento da IA?"))) return;
    try {
      await excluirConhecimento(item.id);
      toast.success(t("Conhecimento excluído"));
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    }
  };

  return (
    <div className="space-y-3" data-test="admin-ia">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {t(
            "Conhecimento que TODOS os assistentes IA dos operadores usam antes de responder. Escreva perguntas prováveis, palavras-chave separadas por vírgula e a resposta prática. Mudanças valem para todos em poucos minutos.",
          )}
        </p>
        <Button
          className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90 ml-auto"
          size="sm"
          onClick={() =>
            setEditando({
              id: "",
              pergunta: "",
              palavras_chave: "",
              resposta: "",
              ativo: true,
              ordem: (itens?.length ?? 0) + 1,
              created_at: "",
            })
          }
          data-test="admin-ia-novo"
        >
          {t("Novo conhecimento")}
        </Button>
      </div>

      {itens === null ? (
        <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("Carregando conhecimento…")}
        </p>
      ) : itens.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          {t("Nenhum conhecimento cadastrado — a IA usa apenas a base local do aparelho.")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {itens.map((item) => (
            <div
              key={item.id}
              className="rounded-md border border-border bg-card px-3 py-2"
              data-test="admin-ia-item"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono text-[10px] text-muted-foreground">#{item.ordem}</span>
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{item.pergunta}</p>
                <span
                  className={`mono rounded px-1.5 text-[10px] font-bold ${
                    item.ativo
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.ativo ? t("Ativo") : t("Inativo")}
                </span>
                <Switch
                  checked={item.ativo}
                  onCheckedChange={() => void alternarAtivo(item)}
                  aria-label={t("Ativo")}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="glove-tap"
                  onClick={() => setEditando(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="glove-tap text-destructive hover:text-destructive"
                  onClick={() => void excluir(item)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-snug">
                {item.resposta}
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {editando && (
            <FormularioIA
              item={editando}
              onSalvo={async () => {
                setEditando(null);
                await recarregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormularioIA({
  item,
  onSalvo,
}: {
  item: EntradaConhecimento;
  onSalvo: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [pergunta, setPergunta] = useState(item.pergunta);
  const [palavras, setPalavras] = useState(item.palavras_chave);
  const [resposta, setResposta] = useState(item.resposta);
  const [ordem, setOrdem] = useState(String(item.ordem));
  const [ativo, setAtivo] = useState(item.ativo);
  const [ocupado, setOcupado] = useState(false);

  const salvar = async () => {
    if (pergunta.trim().length < 4 || resposta.trim().length < 10) {
      toast.error(t("Preencha a pergunta e a resposta (mínimo 10 caracteres)"));
      return;
    }
    setOcupado(true);
    try {
      if (item.id) {
        await atualizarConhecimento(item.id, {
          pergunta: pergunta.trim(),
          palavras_chave: palavras.trim(),
          resposta: resposta.trim(),
          ordem: Number(ordem) || 0,
          ativo,
        });
      } else {
        await criarConhecimento({
          pergunta: pergunta.trim(),
          palavras_chave: palavras.trim(),
          resposta: resposta.trim(),
          ordem: Number(ordem) || 0,
          ativo,
        });
      }
      toast.success(t("Conhecimento salvo"));
      await onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle className="mono">
          {item.id ? t("Editar conhecimento") : t("Novo conhecimento")}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-1">
        <Label htmlFor="ia-pergunta">{t("Pergunta provável")}</Label>
        <Input
          id="ia-pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder={t("ex.: Como purificar água de rio?")}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ia-palavras">{t("Palavras-chave (separadas por vírgula)")}</Label>
        <Input
          id="ia-palavras"
          value={palavras}
          onChange={(e) => setPalavras(e.target.value)}
          placeholder="agua,purificar,fervura,cloro"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ia-resposta">{t("Resposta")}</Label>
        <textarea
          id="ia-resposta"
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={5}
          className="bg-input text-foreground w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder={t("Resposta prática e direta — é isso que os operadores vão ler.")}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ia-ordem">{t("Ordem")}</Label>
          <Input
            id="ia-ordem"
            inputMode="numeric"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={ativo} onCheckedChange={setAtivo} id="ia-ativo" />
          <Label htmlFor="ia-ativo">{t("Ativo (entregue aos apps)")}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => void salvar()}
          disabled={ocupado}
          className="w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
        >
          {ocupado ? t("Salvando…") : t("Salvar conhecimento")}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Configurações — PIX                                                */
/* ------------------------------------------------------------------ */

function SecaoConfig() {
  const { t } = useI18n();
  const [config, setConfig] = useState<ConfigPix | null>(null);
  const [chave, setChave] = useState("");
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [cidade, setCidade] = useState("");
  const [valores, setValores] = useState("10, 25, 50");
  const [mensagem, setMensagem] = useState("");
  const [qr, setQr] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const cfg = await lerConfigPix();
        if (cfg) {
          setChave(cfg.chave);
          setNomeRecebedor(cfg.nome_recebedor);
          setCidade(cfg.cidade);
          setValores(cfg.valores_sugeridos.join(", "));
          setMensagem(cfg.mensagem_apoio);
        }
        setConfig(cfg);
      } catch {
        toast.error(t("Falha ao carregar as configurações"));
      }
    })();
  }, [t]);

  const payload = useMemo(
    () =>
      montarPixCopiaECola({
        chave,
        nomeRecebedor,
        cidade,
        valor: 25,
      }),
    [chave, nomeRecebedor, cidade],
  );

  useEffect(() => {
    let vivo = true;
    if (!payload) {
      setQr("");
      return;
    }
    void QRCode.toDataURL(payload, {
      margin: 1,
      width: 240,
      color: { dark: "#111111", light: "#ffffff" },
    }).then((dataUrl) => vivo && setQr(dataUrl));
    return () => {
      vivo = false;
    };
  }, [payload]);

  const salvar = async () => {
    const sugeridos = valores
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v) && v > 0);
    setOcupado(true);
    try {
      await salvarConfigPix({
        chave: chave.trim(),
        nome_recebedor: nomeRecebedor.trim(),
        cidade: cidade.trim(),
        valores_sugeridos: sugeridos,
        mensagem_apoio: mensagem.trim(),
      });
      toast.success(t("Configuração PIX salva"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-4" data-test="admin-config">
      <BlocoPopups />
      <p className="text-sm text-muted-foreground">
        {t(
          "Estes dados geram o QR Code e o código copia e cola da página de apoio. Use a chave aleatória, celular, e-mail ou CNPJ do seu banco.",
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="pix-chave">{t("Chave PIX")}</Label>
          <Input
            id="pix-chave"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pix-nome">{t("Nome do recebedor")}</Label>
          <Input
            id="pix-nome"
            value={nomeRecebedor}
            onChange={(e) => setNomeRecebedor(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pix-cidade">{t("Cidade do recebedor")}</Label>
          <Input id="pix-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pix-valores">{t("Valores sugeridos (R$)")}</Label>
          <Input id="pix-valores" value={valores} onChange={(e) => setValores(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pix-mensagem">{t("Mensagem de apoio (opcional)")}</Label>
          <Input id="pix-mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-card p-4">
        {qr ? (
          <img
            src={qr}
            alt={t("Prévia do QR Code PIX")}
            className="h-28 w-28 rounded border border-border bg-white p-1"
          />
        ) : (
          <div className="mono flex h-28 w-28 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
            {t("Preencha a chave")}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("Prévia do copia e cola")}
          </p>
          <p className="mono mt-1 break-all text-[11px] text-muted-foreground">
            {payload || t("—")}
          </p>
        </div>
      </div>

      <Button
        onClick={() => void salvar()}
        disabled={ocupado}
        className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90"
        data-test="admin-config-salvar"
      >
        {ocupado ? t("Salvando…") : t("Salvar configuração")}
      </Button>

      <div className="rounded-md border border-border bg-card p-4">
        <p className="mono text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
          {t("Ecossistema")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t(
            "A loja, os cursos e o catálogo do Centro são gerenciados no painel daquela aplicação — cada projeto mantém seu código separado, com o mesmo login e o mesmo banco de dados.",
          )}
        </p>
        <a
          href={CENTRO_ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mono mt-3 inline-flex items-center gap-1 text-tactical-orange text-sm underline decoration-dotted"
        >
          {t("Abrir painel do Centro")} <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pop-ups de crescimento — redes sociais, apoiar e compartilhar      */
/* ------------------------------------------------------------------ */

function BlocoPopups() {
  const { t } = useI18n();
  const [config, setConfig] = useState<ConfigPopups | null>(null);
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [telegram, setTelegram] = useState("");
  const [intervalo, setIntervalo] = useState("8");
  const [primeiro, setPrimeiro] = useState("2");
  const [ativo, setAtivo] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void lerConfigPopups().then((cfg) => {
      setConfig(cfg);
      setInstagram(cfg.instagram_url);
      setYoutube(cfg.youtube_url);
      setTelegram(cfg.telegram_url);
      setIntervalo(String(cfg.intervalo_minutos));
      setPrimeiro(String(cfg.primeiro_minutos));
      setAtivo(cfg.ativo);
    });
  }, []);

  const salvar = async () => {
    setOcupado(true);
    try {
      const resposta = await supabaseAdminUpsert("popups", {
        ativo,
        instagram_url: instagram.trim(),
        youtube_url: youtube.trim(),
        telegram_url: telegram.trim(),
        intervalo_minutos: Math.max(1, Number(intervalo) || 8),
        primeiro_minutos: Math.max(1, Number(primeiro) || 2),
      });
      if (resposta.error) throw resposta.error;
      toast.success(t("Pop-ups salvos — valem a partir do próximo carregamento do mapa"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha na operação"));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section
      className="space-y-3 rounded-md border border-border bg-card p-4"
      data-test="admin-popups"
    >
      <header className="flex items-center gap-2">
        <Megaphone className="text-tactical-orange h-4 w-4" />
        <h2 className="mono text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
          {t("Pop-ups no mapa (crescimento)")}
        </h2>
      </header>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {t(
          "Três cartões aparecem no dashboard do mapa, um por vez: seguir nas redes, apoiar e compartilhar. Cole os links das suas redes — o cartão de redes só aparece quando existe pelo menos um link.",
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="popup-instagram">Instagram</Label>
          <Input
            id="popup-instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="popup-youtube">YouTube</Label>
          <Input
            id="popup-youtube"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtube.com/@…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="popup-telegram">Telegram</Label>
          <Input
            id="popup-telegram"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="https://t.me/…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="popup-primeiro">{t("Primeiro cartão (min)")}</Label>
          <Input
            id="popup-primeiro"
            inputMode="numeric"
            value={primeiro}
            onChange={(e) => setPrimeiro(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="popup-intervalo">{t("Intervalo entre cartões (min)")}</Label>
          <Input
            id="popup-intervalo"
            inputMode="numeric"
            value={intervalo}
            onChange={(e) => setIntervalo(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={ativo} onCheckedChange={setAtivo} id="popup-ativo" />
          <Label htmlFor="popup-ativo">{t("Pop-ups ativos")}</Label>
        </div>
      </div>
      <Button
        onClick={() => void salvar()}
        disabled={ocupado || config === null}
        className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90"
        data-test="admin-popups-salvar"
      >
        {ocupado ? t("Salvando…") : t("Salvar pop-ups")}
      </Button>
    </section>
  );
}

/** Upsert da chave de configuração (admin escreve via RLS). */
function supabaseAdminUpsert(
  chave: string,
  valor: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  return (async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase
      .from("manual_configuracoes")
      .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: "chave" });
    return { error: error ? { message: error.message } : null };
  })();
}
