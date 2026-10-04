import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Backpack,
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listGear,
  saveGear,
  deleteGear,
  listMochilas,
  saveMochila,
  deleteMochila,
  type LocalGearItem,
  type LocalMochila,
} from "@/lib/db";
import { garantirModelosCriados, restaurarModelosApagados } from "@/lib/mochilas-modelo";
import { toast } from "sonner";
import { formatDate, formatKilograms, formatWeight } from "@/lib/format";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Mochila de Emergência — TacticalGIS" },
      {
        name: "description",
        content:
          "Mochilas de emergência prontas (8h, 12h, 48h, 72h e 300h) ou as suas próprias, com controle de equipamentos, peso e validade.",
      },
      { property: "og:title", content: "Mochila de Emergência — TacticalGIS" },
      {
        property: "og:description",
        content:
          "Mochilas de emergência prontas ou personalizadas, com controle de equipamentos, peso e validade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inventory,
});

const CATEGORIES = [
  { id: "tools", label: "Ferramentas" },
  { id: "nutrition", label: "Alimentação" },
  { id: "hydration", label: "Hidratação" },
  { id: "medical", label: "Médico" },
  { id: "warmth", label: "Aquecimento" },
  { id: "shelter", label: "Abrigo" },
  { id: "luz", label: "Luz e energia" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "navegacao", label: "Navegação e documentos" },
  { id: "higiene", label: "Higiene e saúde" },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);

/** Identificador da visualização de itens que não pertencem a nenhuma mochila. */
const SEM_MOCHILA = "__sem";

function Inventory() {
  const [mochilas, setMochilas] = useState<LocalMochila[]>([]);
  const [items, setItems] = useState<LocalGearItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abertaId, setAbertaId] = useState<string | null>(null);

  // Formulário de mochila (criar/editar)
  const [formMochilaAberto, setFormMochilaAberto] = useState(false);
  const [editandoMochila, setEditandoMochila] = useState<LocalMochila | null>(null);
  const [nomeMochila, setNomeMochila] = useState("");
  const [descMochila, setDescMochila] = useState("");
  const [limiteMochila, setLimiteMochila] = useState(10);

  // Formulário de item (adicionar/editar)
  const [draft, setDraft] = useState<Partial<LocalGearItem>>({
    category: "tools",
    quantity: 1,
    weight_g: 100,
    packed: false,
  });
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);

  const carregar = async () => {
    const [ms, is] = await Promise.all([listMochilas(), listGear()]);
    setMochilas(ms);
    setItems(is);
    setCarregando(false);
  };

  useEffect(() => {
    garantirModelosCriados()
      .then(carregar)
      .catch(() => setCarregando(false));
  }, []);

  const mochilaAberta = mochilas.find((m) => m.id === abertaId) ?? null;
  const itensDaAberta = useMemo(
    () =>
      items.filter((i) => (abertaId === SEM_MOCHILA ? !i.mochila_id : i.mochila_id === abertaId)),
    [items, abertaId],
  );
  const itensSemMochila = useMemo(() => items.filter((i) => !i.mochila_id), [items]);

  /* ----------------------------- Itens ----------------------------- */

  const limparFormulario = () => {
    setDraft({ category: draft.category, quantity: 1, weight_g: 100, packed: false });
    setEditandoItemId(null);
  };

  const salvarItem = async () => {
    if (!draft.name?.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    if (editandoItemId) {
      const original = items.find((i) => i.id === editandoItemId);
      if (!original) return;
      const proximo: LocalGearItem = {
        ...original,
        name: draft.name!.trim(),
        category: draft.category || "tools",
        quantity: Number(draft.quantity) || 1,
        weight_g: Number(draft.weight_g) || 0,
        notes: draft.notes?.trim() || null,
        expires_at: draft.expires_at || null,
        mochila_id: draft.mochila_id ?? original.mochila_id ?? null,
        updated_at: new Date().toISOString(),
        dirty: true,
      };
      await saveGear(proximo);
      setItems((x) => x.map((y) => (y.id === editandoItemId ? proximo : y)));
      toast.success("Item atualizado");
    } else {
      const item: LocalGearItem = {
        id: crypto.randomUUID(),
        user_id: null,
        name: draft.name!.trim(),
        category: draft.category || "tools",
        quantity: Number(draft.quantity) || 1,
        weight_g: Number(draft.weight_g) || 0,
        notes: draft.notes?.trim() || null,
        expires_at: draft.expires_at || null,
        packed: false,
        mochila_id: abertaId && abertaId !== SEM_MOCHILA ? abertaId : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dirty: true,
      };
      await saveGear(item);
      setItems((x) => [...x, item]);
      toast.success("Adicionado à mochila");
    }
    limparFormulario();
  };

  const editarItem = (i: LocalGearItem) => {
    setEditandoItemId(i.id);
    setDraft({ ...i });
  };

  const togglePacked = async (i: LocalGearItem) => {
    const next = { ...i, packed: !i.packed, updated_at: new Date().toISOString(), dirty: true };
    await saveGear(next);
    setItems((x) => x.map((y) => (y.id === i.id ? next : y)));
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remover este item?")) return;
    await deleteGear(id);
    setItems((x) => x.filter((y) => y.id !== id));
  };

  /* ---------------------------- Mochilas ---------------------------- */

  const abrirNovaMochila = () => {
    setEditandoMochila(null);
    setNomeMochila("");
    setDescMochila("");
    setLimiteMochila(10);
    setFormMochilaAberto(true);
  };

  const abrirEditarMochila = (m: LocalMochila) => {
    setEditandoMochila(m);
    setNomeMochila(m.nome);
    setDescMochila(m.descricao);
    setLimiteMochila(Math.round(m.limite_g / 1000));
    setFormMochilaAberto(true);
  };

  const salvarMochila = async () => {
    const nome = nomeMochila.trim();
    if (!nome) {
      toast.error("Nome obrigatório");
      return;
    }
    const agora = new Date().toISOString();
    if (editandoMochila) {
      const proxima: LocalMochila = {
        ...editandoMochila,
        nome,
        descricao: descMochila.trim(),
        limite_g: Math.max(0, Math.round((Number(limiteMochila) || 0) * 1000)),
        atualizada_em: agora,
      };
      await saveMochila(proxima);
      setMochilas((x) => x.map((m) => (m.id === proxima.id ? proxima : m)));
      toast.success("Mochila atualizada");
    } else {
      const nova: LocalMochila = {
        id: crypto.randomUUID(),
        nome,
        descricao: descMochila.trim(),
        limite_g: Math.max(0, Math.round((Number(limiteMochila) || 0) * 1000)),
        modelo: null,
        criada_em: agora,
        atualizada_em: agora,
      };
      await saveMochila(nova);
      setMochilas((x) => [...x, nova]);
      toast.success("Mochila criada");
      setAbertaId(nova.id);
    }
    setFormMochilaAberto(false);
    setEditandoMochila(null);
  };

  const excluirMochila = async (m: LocalMochila) => {
    const qtd = items.filter((i) => i.mochila_id === m.id).length;
    const aviso = qtd
      ? `Excluir a mochila “${m.nome}”? Os ${qtd} itens dela ficam guardados em “SEM MOCHILA” e podem ser movidos depois.`
      : `Excluir a mochila “${m.nome}”?`;
    if (!window.confirm(aviso)) return;
    await deleteMochila(m.id);
    for (const i of items.filter((x) => x.mochila_id === m.id)) {
      await saveGear({ ...i, mochila_id: null, updated_at: new Date().toISOString(), dirty: true });
    }
    setMochilas((x) => x.filter((y) => y.id !== m.id));
    setItems((x) => x.map((y) => (y.mochila_id === m.id ? { ...y, mochila_id: null } : y)));
    if (abertaId === m.id) setAbertaId(null);
    toast.success("Mochila excluída — os itens ficaram em SEM MOCHILA");
  };

  const restaurarModelos = async () => {
    const criadas = await restaurarModelosApagados();
    await carregar();
    toast.success(
      criadas ? `${criadas} modelo(s) restaurado(s)` : "Todos os modelos já estão na lista",
    );
  };

  /* ---------------------------- Render ---------------------------- */

  if (abertaId && (mochilaAberta || abertaId === SEM_MOCHILA)) {
    return (
      <DetalheMochila
        mochila={mochilaAberta}
        itens={itensDaAberta}
        mochilas={mochilas}
        voltar={() => setAbertaId(null)}
        onEditarMochila={abrirEditarMochila}
        onExcluirMochila={excluirMochila}
        draft={draft}
        setDraft={setDraft}
        editandoItemId={editandoItemId}
        limparFormulario={limparFormulario}
        onSalvarItem={salvarItem}
        onEditarItem={editarItem}
        onTogglePacked={togglePacked}
        onRemoverItem={remove}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-8 md:p-8">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="mono flex min-w-0 items-start gap-2 text-xl font-bold tracking-wider text-tactical-orange sm:text-2xl md:text-3xl">
            <Backpack className="mt-0.5 h-6 w-6 shrink-0" />
            <span className="min-w-0 break-words">MOCHILA DE EMERGÊNCIA</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Escolha uma mochila pronta (8h, 12h, 48h, 72h ou 300h) com os itens já definidos — ou
            crie a sua. Tudo pode ser editado: itens, descrições e pesos.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={restaurarModelos}
          className="glove-tap shrink-0 text-muted-foreground hover:text-foreground"
          title="Recria os modelos apagados"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Restaurar modelos</span>
        </Button>
      </header>

      {carregando ? (
        <p className="text-muted-foreground py-12 text-center text-sm">Abrindo a mochila…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mochilas.map((m) => (
            <CartaoMochila
              key={m.id}
              mochila={m}
              itens={items.filter((i) => i.mochila_id === m.id)}
              onAbrir={() => setAbertaId(m.id)}
              onEditar={() => abrirEditarMochila(m)}
            />
          ))}

          {itensSemMochila.length > 0 && (
            <CartaoMochila
              semMochila
              itens={itensSemMochila}
              onAbrir={() => setAbertaId(SEM_MOCHILA)}
            />
          )}

          <button
            type="button"
            onClick={abrirNovaMochila}
            className="glove-tap flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card/50 p-4 text-muted-foreground transition-colors hover:border-tactical-orange/60 hover:text-tactical-orange"
          >
            <Plus className="h-8 w-8" />
            <span className="mono text-xs font-bold uppercase tracking-widest">Criar mochila</span>
            <span className="text-xs">Monte uma do zero, do seu jeito</span>
          </button>
        </div>
      )}

      {formMochilaAberto && (
        <FormMochila
          editando={editandoMochila}
          nome={nomeMochila}
          descricao={descMochila}
          limite={limiteMochila}
          onNome={setNomeMochila}
          onDescricao={setDescMochila}
          onLimite={setLimiteMochila}
          onSalvar={salvarMochila}
          onCancelar={() => {
            setFormMochilaAberto(false);
            setEditandoMochila(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Cartão de mochila (lista)                                         */
/* ---------------------------------------------------------------- */

function CartaoMochila({
  mochila,
  itens,
  onAbrir,
  onEditar,
  semMochila = false,
}: {
  mochila?: LocalMochila;
  itens: LocalGearItem[];
  onAbrir: () => void;
  onEditar?: () => void;
  semMochila?: boolean;
}) {
  const empacotados = itens.filter((i) => i.packed).length;
  const pesoG = itens.filter((i) => i.packed).reduce((s, i) => s + i.weight_g * i.quantity, 0);
  const pct = itens.length ? Math.round((empacotados / itens.length) * 100) : 0;
  const excedeu = mochila ? pesoG > mochila.limite_g : false;

  return (
    <div className="group relative flex flex-col rounded-md border border-border bg-card p-4 transition-colors hover:border-tactical-orange/50">
      <button type="button" onClick={onAbrir} className="flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mono truncate text-base font-bold tracking-wider text-tactical-orange">
                {semMochila ? "SEM MOCHILA" : mochila!.nome}
              </h3>
              {mochila?.modelo && (
                <span className="mono rounded-full border border-tactical-orange/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-tactical-orange">
                  modelo {mochila.modelo}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {semMochila
                ? "Itens avulsos que não estão em nenhuma mochila. Abra e mova cada um para onde quiser."
                : mochila!.descricao}
            </p>
          </div>
          <ChevronRight className="text-muted-foreground mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-tactical-orange" />
        </div>

        <div className="mono mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{itens.length} itens</span>
          <span className="text-tactical-orange">
            {empacotados}/{itens.length} empacotados
          </span>
          <span className={excedeu ? "text-destructive" : ""}>
            {formatKilograms(pesoG)}
            {mochila ? ` / ${formatKilograms(mochila.limite_g, 1)} limite` : ""}
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
          <div
            className={`h-full rounded-full transition-all ${excedeu ? "bg-destructive" : "bg-tactical-orange"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      {!semMochila && onEditar && (
        <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={onEditar}
            className="glove-tap text-muted-foreground hover:text-tactical-orange"
            aria-label="Editar mochila"
            title="Editar nome, descrição e limite de peso"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground/60 text-xs">editar mochila</span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Formulário de mochila (criar/editar)                              */
/* ---------------------------------------------------------------- */

function FormMochila({
  editando,
  nome,
  descricao,
  limite,
  onNome,
  onDescricao,
  onLimite,
  onSalvar,
  onCancelar,
}: {
  editando: LocalMochila | null;
  nome: string;
  descricao: string;
  limite: number;
  onNome: (v: string) => void;
  onDescricao: (v: string) => void;
  onLimite: (v: number) => void;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[calc(100dvh_-_2rem)] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl">
        <h3 className="mono mb-4 text-sm font-bold uppercase tracking-widest text-tactical-orange">
          {editando ? "Editar mochila" : "Criar mochila"}
        </h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input
              value={nome}
              onChange={(e) => onNome(e.target.value)}
              placeholder="Ex.: mochila do carro"
            />
          </div>
          <div>
            <Label className="text-xs">Descrição (para que serve)</Label>
            <textarea
              value={descricao}
              onChange={(e) => onDescricao(e.target.value)}
              placeholder="Ex.: kit que fica pronto no porta-malas para emergências na estrada"
              className="bg-input w-full rounded-md border border-border p-2 text-sm"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Limite de peso (kg)</Label>
            <Input
              type="number"
              min={0}
              value={limite}
              onChange={(e) => onLimite(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={onSalvar}
              className="flex-1 bg-tactical-orange text-background glove-tap"
            >
              Salvar
            </Button>
            <Button variant="outline" onClick={onCancelar} className="glove-tap">
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Detalhe da mochila (itens)                                        */
/* ---------------------------------------------------------------- */

function DetalheMochila({
  mochila,
  itens,
  mochilas,
  voltar,
  onEditarMochila,
  onExcluirMochila,
  draft,
  setDraft,
  editandoItemId,
  limparFormulario,
  onSalvarItem,
  onEditarItem,
  onTogglePacked,
  onRemoverItem,
}: {
  mochila: LocalMochila | null;
  itens: LocalGearItem[];
  mochilas: LocalMochila[];
  voltar: () => void;
  onEditarMochila: (m: LocalMochila) => void;
  onExcluirMochila: (m: LocalMochila) => void;
  draft: Partial<LocalGearItem>;
  setDraft: (d: Partial<LocalGearItem>) => void;
  editandoItemId: string | null;
  limparFormulario: () => void;
  onSalvarItem: () => void;
  onEditarItem: (i: LocalGearItem) => void;
  onTogglePacked: (i: LocalGearItem) => void;
  onRemoverItem: (id: string) => void;
}) {
  const totalG = itens.filter((i) => i.packed).reduce((s, i) => s + i.weight_g * i.quantity, 0);
  const empacotados = itens.filter((i) => i.packed).length;
  const excedeu = mochila ? totalG > mochila.limite_g : false;
  const expirando = useMemo(
    () =>
      itens.filter((i) => {
        if (!i.expires_at) return false;
        return new Date(i.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30;
      }).length,
    [itens],
  );

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-8 md:p-8">
      <button
        type="button"
        onClick={voltar}
        className="glove-tap mono text-muted-foreground mb-4 flex items-center gap-1 text-xs uppercase tracking-widest hover:text-tactical-orange"
      >
        <ArrowLeft className="h-4 w-4" /> Todas as mochilas
      </button>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="mono min-w-0 text-xl font-bold tracking-wider text-tactical-orange sm:text-2xl">
            {mochila ? mochila.nome : "ITENS SEM MOCHILA"}
          </h1>
          {mochila && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditarMochila(mochila)}
                className="glove-tap"
              >
                <Pencil className="h-4 w-4" /> Editar mochila
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExcluirMochila(mochila)}
                className="glove-tap text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </div>
          )}
        </div>
        {(mochila?.descricao || !mochila) && (
          <p className="text-muted-foreground mt-1 text-sm">
            {mochila
              ? mochila.descricao
              : "Itens avulsos. Use o formulário abaixo para movê-los a uma mochila ao editar cada item."}
          </p>
        )}
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div
          className={`rounded-md border p-3 ${excedeu ? "border-destructive bg-destructive/10" : "border-border bg-card"}`}
        >
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Peso empacotado
          </div>
          <div
            className={`mono text-xl font-bold sm:text-2xl ${excedeu ? "text-destructive" : "text-tactical-orange"}`}
          >
            {formatKilograms(totalG)}
          </div>
          {mochila && (
            <div className="mono text-xs text-muted-foreground">
              Limite {formatKilograms(mochila.limite_g, 1)}
            </div>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Empacotados
          </div>
          <div className="mono text-xl font-bold sm:text-2xl">
            {empacotados}/{itens.length}
          </div>
          <div className="mono text-xs text-muted-foreground">{itens.length} itens no total</div>
        </div>
        <div
          className={`rounded-md border p-3 ${expirando ? "border-tactical-amber bg-tactical-amber/10" : "border-border bg-card"}`}
        >
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Vencendo (30d)
          </div>
          <div className="mono flex items-center gap-2 text-xl font-bold sm:text-2xl">
            {expirando}
            {expirando > 0 && <AlertTriangle className="text-tactical-amber h-5 w-5" />}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <h3 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          {editandoItemId ? "Editar equipamento" : "Adicionar equipamento"}
        </h3>
        <div className="grid gap-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-xs">Nome</Label>
            <Input
              value={draft.name || ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ex.: pederneira"
            />
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <select
              className="bg-input h-10 w-full rounded-md border border-border px-2 text-sm"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Qtde</Label>
            <Input
              type="number"
              min={1}
              value={draft.quantity || 1}
              onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Peso (g)</Label>
            <Input
              type="number"
              min={0}
              value={draft.weight_g || 0}
              onChange={(e) => setDraft({ ...draft, weight_g: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Validade (opcional)</Label>
            <Input
              type="date"
              value={draft.expires_at || ""}
              onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
            />
          </div>
          {editandoItemId && (
            <div className="md:col-span-2">
              <Label className="text-xs">Mover para mochila</Label>
              <select
                className="bg-input h-10 w-full rounded-md border border-border px-2 text-sm"
                value={draft.mochila_id || ""}
                onChange={(e) => setDraft({ ...draft, mochila_id: e.target.value || null })}
              >
                <option value="">— Sem mochila —</option>
                {mochilas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-5">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input
              value={draft.notes || ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Para que serve, dica de uso, observação…"
            />
          </div>
          <div className="flex gap-2 md:col-span-5">
            <Button
              onClick={onSalvarItem}
              className="flex-1 bg-tactical-orange text-background glove-tap sm:flex-none sm:px-8"
            >
              <Plus className="mr-1 h-4 w-4" />
              {editandoItemId ? "Salvar alterações" : "Adicionar à mochila"}
            </Button>
            {editandoItemId && (
              <Button variant="outline" onClick={limparFormulario} className="glove-tap">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {itens.map((i) => (
          <li
            key={i.id}
            className={`rounded-md border p-3 ${
              editandoItemId === i.id
                ? "border-tactical-orange/60 bg-card"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={i.packed}
                onChange={() => onTogglePacked(i)}
                className="accent-tactical-orange h-5 w-5"
              />
              <div className="min-w-0 flex-1">
                <div
                  className={`font-semibold truncate ${i.packed ? "text-muted-foreground line-through" : ""}`}
                >
                  {i.name}
                </div>
                <div className="mono text-muted-foreground text-xs">
                  {CATEGORY_LABEL[i.category] ?? i.category} · {i.quantity}× ·{" "}
                  {formatWeight(i.weight_g)}
                  {i.expires_at && ` · val ${formatDate(i.expires_at)}`}
                </div>
                {i.notes && <div className="mt-1 text-xs text-muted-foreground/90">{i.notes}</div>}
              </div>
              <button
                onClick={() => onEditarItem(i)}
                className="tap-target text-muted-foreground hover:text-tactical-orange"
                aria-label="Editar item"
                title="Editar item"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onRemoverItem(i.id)}
                className="tap-target text-muted-foreground hover:text-destructive"
                aria-label="Remover"
                title="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {itens.length === 0 && (
          <li className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
            <PackageOpen className="h-8 w-8 opacity-50" />
            Nenhum item ainda. {mochila ? "Adicione o primeiro no formulário acima." : ""}
          </li>
        )}
      </ul>
    </div>
  );
}
