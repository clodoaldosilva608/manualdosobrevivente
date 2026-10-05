import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  CalendarClock,
  ImagePlus,
  Camera,
  X,
} from "lucide-react";
import { arquivoParaFoto, imagemPadraoDoItem } from "@/lib/item-imagem";
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
import { useI18n } from "@/lib/i18n";
import {
  resumoValidade,
  statusValidade,
  diasRestantes,
  rotuloValidade,
  corStatusValidade,
} from "@/lib/validade";

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
  const { t } = useI18n();
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

  /** Trava enquanto a foto escolhida está sendo comprimida. */
  const [fotoEmAndamento, setFotoEmAndamento] = useState(false);
  const inputGaleria = useRef<HTMLInputElement>(null);
  const inputCamera = useRef<HTMLInputElement>(null);

  /** Recebe a foto (galeria ou câmera), comprime e põe no rascunho do item. */
  const receberFoto = async (file: File | undefined | null) => {
    if (!file) return;
    setFotoEmAndamento(true);
    try {
      const foto = await arquivoParaFoto(file);
      setDraft((d) => ({ ...d, img: foto }));
      toast.success(t("Foto do item registrada"));
    } catch {
      toast.error(t("Não foi possível usar esta imagem"));
    } finally {
      setFotoEmAndamento(false);
    }
  };

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

  /* -------------------------- Lembretes de validade -------------------------- */

  const resumo = useMemo(
    () => resumoValidade(items, (id) => mochilas.find((m) => m.id === id)?.nome ?? null),
    [items, mochilas],
  );
  const alertasPorMochila = useMemo(() => {
    const mapa = new Map<string | null, { total: number; vencidos: number }>();
    for (const a of resumo.alertas) {
      const chave = a.mochila_id ?? null;
      const atual = mapa.get(chave) ?? { total: 0, vencidos: 0 };
      atual.total++;
      if (a.status === "vencido") atual.vencidos++;
      mapa.set(chave, atual);
    }
    return mapa;
  }, [resumo]);

  // Aviso único por visita: itens vencidos exigem rotação imediata.
  const avisouVencidos = useState({ atual: false })[0];
  useEffect(() => {
    if (avisouVencidos.atual || resumo.vencidos.length === 0) return;
    avisouVencidos.atual = true;
    toast.warning(t("{n} item(ns) vencido(s) na mochila", { n: resumo.vencidos.length }), {
      description: t("Veja os lembretes de validade e troque antes de viajar."),
    });
  }, [resumo, avisouVencidos, t]);

  /* ----------------------------- Itens ----------------------------- */

  const limparFormulario = () => {
    setDraft({ category: draft.category, quantity: 1, weight_g: 100, packed: false });
    setEditandoItemId(null);
    if (inputGaleria.current) inputGaleria.current.value = "";
    if (inputCamera.current) inputCamera.current.value = "";
  };

  const salvarItem = async () => {
    if (!draft.name?.trim()) {
      toast.error(t("Nome obrigatório"));
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
        img: draft.img ?? null,
        mochila_id: draft.mochila_id ?? original.mochila_id ?? null,
        updated_at: new Date().toISOString(),
        dirty: true,
      };
      await saveGear(proximo);
      setItems((x) => x.map((y) => (y.id === editandoItemId ? proximo : y)));
      toast.success(t("Item atualizado"));
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
        img: draft.img ?? null,
        mochila_id: abertaId && abertaId !== SEM_MOCHILA ? abertaId : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dirty: true,
      };
      await saveGear(item);
      setItems((x) => [...x, item]);
      toast.success(t("Adicionado à mochila"));
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
    if (!window.confirm(t("Remover este item?"))) return;
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
      toast.error(t("Nome obrigatório"));
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
      toast.success(t("Mochila atualizada"));
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
      toast.success(t("Mochila criada"));
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
    toast.success(t("Mochila excluída — os itens ficaram em SEM MOCHILA"));
  };

  const restaurarModelos = async () => {
    const criadas = await restaurarModelosApagados();
    await carregar();
    toast.success(
      criadas
        ? t("{n} modelo(s) restaurado(s)", { n: criadas })
        : t("Todos os modelos já estão na lista"),
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
        onFoto={receberFoto}
        fotoEmAndamento={fotoEmAndamento}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-8 md:p-8">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="mono flex min-w-0 items-start gap-2 text-xl font-bold tracking-wider text-tactical-orange sm:text-2xl md:text-3xl">
            <Backpack className="mt-0.5 h-6 w-6 shrink-0" />
            <span className="min-w-0 break-words">{t("MOCHILA DE EMERGÊNCIA")}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t(
              "Escolha uma mochila pronta (8h, 12h, 48h, 72h ou 300h) com os itens já definidos — ou crie a sua. Tudo pode ser editado: itens, descrições e pesos.",
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={restaurarModelos}
          className="glove-tap shrink-0 text-muted-foreground hover:text-foreground"
          title={t("Recria os modelos apagados")}
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">{t("Restaurar modelos")}</span>
        </Button>
      </header>

      {resumo.alertas.length > 0 && (
        <section
          data-test="lembretes-validade"
          className="mb-6 rounded-md border border-tactical-amber/40 bg-tactical-amber/5 p-4"
        >
          <h2 className="mono flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-tactical-amber">
            <CalendarClock className="h-4 w-4" />
            {t("Lembretes de validade")}
            <span className="rounded-full border border-tactical-amber/40 px-2 py-0.5 text-[10px]">
              {resumo.alertas.length}
            </span>
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {t(
              "Itens vencidos ou chegando ao prazo — troque, reabasteça e atualize a data antes de viajar.",
            )}
          </p>
          <ul className="mt-3 space-y-1">
            {resumo.alertas.map((a) => {
              const rot = rotuloValidade(a.status, a.dias);
              return (
                <li key={a.item_id}>
                  <button
                    type="button"
                    onClick={() => setAbertaId(a.mochila_id ?? SEM_MOCHILA)}
                    className="glove-tap flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                  >
                    <span
                      className={`mono shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${corStatusValidade(a.status)}`}
                    >
                      {t(rot.chave, rot.vars)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{a.nome}</span>
                    <span className="mono shrink-0 text-[10px] text-muted-foreground">
                      {a.mochila_nome ?? t("SEM MOCHILA")} · {formatDate(a.expires_at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {carregando ? (
        <p className="text-muted-foreground py-12 text-center text-sm">{t("Abrindo a mochila…")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mochilas.map((m) => (
            <CartaoMochila
              key={m.id}
              mochila={m}
              itens={items.filter((i) => i.mochila_id === m.id)}
              alertas={alertasPorMochila.get(m.id)}
              onAbrir={() => setAbertaId(m.id)}
              onEditar={() => abrirEditarMochila(m)}
            />
          ))}

          {itensSemMochila.length > 0 && (
            <CartaoMochila
              semMochila
              itens={itensSemMochila}
              alertas={alertasPorMochila.get(null)}
              onAbrir={() => setAbertaId(SEM_MOCHILA)}
            />
          )}

          <button
            type="button"
            onClick={abrirNovaMochila}
            className="glove-tap flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card/50 p-4 text-muted-foreground transition-colors hover:border-tactical-orange/60 hover:text-tactical-orange"
          >
            <Plus className="h-8 w-8" />
            <span className="mono text-xs font-bold uppercase tracking-widest">
              {t("Criar mochila")}
            </span>
            <span className="text-xs">{t("Monte uma do zero, do seu jeito")}</span>
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
  alertas,
}: {
  mochila?: LocalMochila;
  itens: LocalGearItem[];
  onAbrir: () => void;
  onEditar?: () => void;
  semMochila?: boolean;
  alertas?: { total: number; vencidos: number };
}) {
  const { t } = useI18n();
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
                {semMochila ? t("SEM MOCHILA") : mochila!.nome}
              </h3>
              {alertas && alertas.total > 0 && (
                <span
                  data-test="badge-validade"
                  className={`mono flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                    alertas.vencidos > 0
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-tactical-amber/40 bg-tactical-amber/10 text-tactical-amber"
                  }`}
                  title={t("Itens com validade vencida ou chegando")}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {alertas.total}
                </span>
              )}
              {mochila?.modelo && (
                <span className="mono rounded-full border border-tactical-orange/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-tactical-orange">
                  {t("modelo {n}", { n: mochila.modelo })}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {semMochila
                ? t(
                    "Itens avulsos que não estão em nenhuma mochila. Abra e mova cada um para onde quiser.",
                  )
                : mochila!.descricao}
            </p>
          </div>
          <ChevronRight className="text-muted-foreground mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-tactical-orange" />
        </div>

        <div className="mono mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{t("{n} itens", { n: itens.length })}</span>
          <span className="text-tactical-orange">
            {empacotados}/{itens.length} {t("empacotados")}
          </span>
          <span className={excedeu ? "text-destructive" : ""}>
            {formatKilograms(pesoG)}
            {mochila ? ` / ${formatKilograms(mochila.limite_g, 1)} ${t("limite")}` : ""}
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
            aria-label={t("Editar mochila")}
            title={t("Editar nome, descrição e limite de peso")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground/60 text-xs">{t("editar mochila")}</span>
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
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[calc(100dvh_-_2rem)] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl">
        <h3 className="mono mb-4 text-sm font-bold uppercase tracking-widest text-tactical-orange">
          {editando ? t("Editar mochila") : t("Criar mochila")}
        </h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{t("Nome")}</Label>
            <Input
              value={nome}
              onChange={(e) => onNome(e.target.value)}
              placeholder={t("Ex.: mochila do carro")}
            />
          </div>
          <div>
            <Label className="text-xs">{t("Descrição (para que serve)")}</Label>
            <textarea
              value={descricao}
              onChange={(e) => onDescricao(e.target.value)}
              placeholder={t("Ex.: kit que fica pronto no porta-malas para emergências na estrada")}
              className="bg-input w-full rounded-md border border-border p-2 text-sm"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">{t("Limite de peso (kg)")}</Label>
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
              {t("Salvar")}
            </Button>
            <Button variant="outline" onClick={onCancelar} className="glove-tap">
              {t("Cancelar")}
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
  onFoto,
  fotoEmAndamento,
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
  /** Recebe o arquivo de foto (galeria ou câmera) e registra no rascunho. */
  onFoto: (file: File | null | undefined) => void;
  fotoEmAndamento: boolean;
}) {
  const { t } = useI18n();
  const inputGaleria = useRef<HTMLInputElement>(null);
  const inputCamera = useRef<HTMLInputElement>(null);
  /** Lê o arquivo escolhido, registra e limpa o input (permite reenviar o mesmo). */
  const pegarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFoto(e.target.files?.[0]);
    e.target.value = "";
  };
  const totalG = itens.filter((i) => i.packed).reduce((s, i) => s + i.weight_g * i.quantity, 0);
  const empacotados = itens.filter((i) => i.packed).length;
  const excedeu = mochila ? totalG > mochila.limite_g : false;
  const resumoLocal = useMemo(() => resumoValidade(itens, () => null), [itens]);

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-8 md:p-8">
      <button
        type="button"
        onClick={voltar}
        className="glove-tap mono text-muted-foreground mb-4 flex items-center gap-1 text-xs uppercase tracking-widest hover:text-tactical-orange"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Todas as mochilas")}
      </button>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="mono min-w-0 text-xl font-bold tracking-wider text-tactical-orange sm:text-2xl">
            {mochila ? mochila.nome : t("ITENS SEM MOCHILA")}
          </h1>
          {mochila && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditarMochila(mochila)}
                className="glove-tap"
              >
                <Pencil className="h-4 w-4" /> {t("Editar mochila")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExcluirMochila(mochila)}
                className="glove-tap text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> {t("Excluir")}
              </Button>
            </div>
          )}
        </div>
        {(mochila?.descricao || !mochila) && (
          <p className="text-muted-foreground mt-1 text-sm">
            {mochila
              ? mochila.descricao
              : t(
                  "Itens avulsos. Use o formulário abaixo para movê-los a uma mochila ao editar cada item.",
                )}
          </p>
        )}
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div
          className={`rounded-md border p-3 ${excedeu ? "border-destructive bg-destructive/10" : "border-border bg-card"}`}
        >
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("Peso empacotado")}
          </div>
          <div
            className={`mono text-xl font-bold sm:text-2xl ${excedeu ? "text-destructive" : "text-tactical-orange"}`}
          >
            {formatKilograms(totalG)}
          </div>
          {mochila && (
            <div className="mono text-xs text-muted-foreground">
              {t("Limite {n}", { n: formatKilograms(mochila.limite_g, 1) })}
            </div>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("Empacotados")}
          </div>
          <div className="mono text-xl font-bold sm:text-2xl">
            {empacotados}/{itens.length}
          </div>
          <div className="mono text-xs text-muted-foreground">
            {t("{n} itens no total", { n: itens.length })}
          </div>
        </div>
        <div
          className={`rounded-md border p-3 ${resumoLocal.alertas.length > 0 ? "border-tactical-amber bg-tactical-amber/10" : "border-border bg-card"}`}
        >
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("Alertas de validade")}
          </div>
          <div className="mono flex items-center gap-2 text-xl font-bold sm:text-2xl">
            {resumoLocal.alertas.length}
            {resumoLocal.alertas.length > 0 && (
              <AlertTriangle className="text-tactical-amber h-5 w-5" />
            )}
          </div>
          {resumoLocal.vencidos.length > 0 && (
            <div className="mono text-xs text-destructive">
              {t("{n} vencido(s)", { n: resumoLocal.vencidos.length })}
            </div>
          )}
        </div>
      </div>

      {resumoLocal.alertas.length > 0 && (
        <section
          data-test="lembretes-validade-detalhe"
          className="mb-6 rounded-md border border-tactical-amber/40 bg-tactical-amber/5 p-4"
        >
          <h2 className="mono flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-tactical-amber">
            <CalendarClock className="h-4 w-4" /> {t("Lembretes de validade")}
          </h2>
          <ul className="mt-3 space-y-1">
            {resumoLocal.alertas.map((a) => {
              const rot = rotuloValidade(a.status, a.dias);
              return (
                <li key={a.item_id} className="flex items-center gap-2">
                  <span
                    className={`mono shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${corStatusValidade(a.status)}`}
                  >
                    {t(rot.chave, rot.vars)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{a.nome}</span>
                  <span className="mono shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(a.expires_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <h3 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          {editandoItemId ? t("Editar equipamento") : t("Adicionar equipamento")}
        </h3>
        <div className="grid gap-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-xs">{t("Nome")}</Label>
            <Input
              value={draft.name || ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t("Ex.: pederneira")}
            />
          </div>
          {/* Imagem do item: desenho padrão ou foto própria (galeria/câmera) */}
          <div className="md:col-span-5">
            <Label className="text-xs">{t("Imagem do item")}</Label>
            <div
              data-test="item-imagem-bloco"
              className="mt-1 flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/50 p-2.5"
            >
              <img
                data-test="item-imagem-preview"
                src={draft.img || imagemPadraoDoItem(draft.name || "", draft.category || "tools")}
                alt={t("Imagem do item")}
                className="h-14 w-14 shrink-0 rounded-md border border-border bg-background object-contain p-1"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  data-test="item-foto-galeria"
                  onClick={() => inputGaleria.current?.click()}
                  disabled={fotoEmAndamento}
                  className="glove-tap mono inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-foreground hover:border-tactical-orange/60 disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" /> {t("Enviar foto")}
                </button>
                <button
                  type="button"
                  data-test="item-foto-camera"
                  onClick={() => inputCamera.current?.click()}
                  disabled={fotoEmAndamento}
                  className="glove-tap mono inline-flex items-center gap-1.5 rounded border border-tactical-orange/60 px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-tactical-orange hover:bg-tactical-orange/10 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" /> {t("Tirar foto")}
                </button>
                {draft.img && (
                  <button
                    type="button"
                    data-test="item-foto-remover"
                    onClick={() => setDraft({ ...draft, img: null })}
                    className="glove-tap mono inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" /> {t("Remover foto")}
                  </button>
                )}
              </div>
              <p className="text-muted-foreground w-full text-[11px] leading-snug">
                {fotoEmAndamento
                  ? t("Comprimindo a foto…")
                  : t("Sem foto, o item usa o desenho padrão. Sua foto fica guardada no aparelho.")}
              </p>
              {/* Galerias ocultas: galeria e câmera do aparelho */}
              <input
                ref={inputGaleria}
                type="file"
                accept="image/*"
                className="hidden"
                data-test="item-input-galeria"
                onChange={pegarFoto}
              />
              <input
                ref={inputCamera}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                data-test="item-input-camera"
                onChange={pegarFoto}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">{t("Categoria")}</Label>
            <select
              className="bg-input h-10 w-full rounded-md border border-border px-2 text-sm"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.label)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">{t("Qtde")}</Label>
            <Input
              type="number"
              min={1}
              value={draft.quantity || 1}
              onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">{t("Peso (g)")}</Label>
            <Input
              type="number"
              min={0}
              value={draft.weight_g || 0}
              onChange={(e) => setDraft({ ...draft, weight_g: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">{t("Validade (opcional)")}</Label>
            <Input
              type="date"
              value={draft.expires_at || ""}
              onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
            />
          </div>
          {editandoItemId && (
            <div className="md:col-span-2">
              <Label className="text-xs">{t("Mover para mochila")}</Label>
              <select
                className="bg-input h-10 w-full rounded-md border border-border px-2 text-sm"
                value={draft.mochila_id || ""}
                onChange={(e) => setDraft({ ...draft, mochila_id: e.target.value || null })}
              >
                <option value="">— {t("Sem mochila")} —</option>
                {mochilas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-5">
            <Label className="text-xs">{t("Descrição (opcional)")}</Label>
            <Input
              value={draft.notes || ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder={t("Para que serve, dica de uso, observação…")}
            />
          </div>
          <div className="flex gap-2 md:col-span-5">
            <Button
              onClick={onSalvarItem}
              className="flex-1 bg-tactical-orange text-background glove-tap sm:flex-none sm:px-8"
            >
              <Plus className="mr-1 h-4 w-4" />
              {editandoItemId ? t("Salvar alterações") : t("Adicionar à mochila")}
            </Button>
            {editandoItemId && (
              <Button variant="outline" onClick={limparFormulario} className="glove-tap">
                {t("Cancelar")}
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
              <img
                data-test="item-imagem"
                src={i.img || imagemPadraoDoItem(i.name, i.category)}
                alt={i.name}
                className="h-11 w-11 shrink-0 rounded-md border border-border bg-background object-contain p-0.5"
              />
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
                <div className="mono text-muted-foreground text-xs flex flex-wrap items-center gap-1.5">
                  <span>
                    {t(CATEGORY_LABEL[i.category] ?? i.category)} · {i.quantity}× ·{" "}
                    {formatWeight(i.weight_g)}
                  </span>
                  {i.expires_at && <SeloValidade expiresAt={i.expires_at} comData />}
                </div>
                {i.notes && <div className="mt-1 text-xs text-muted-foreground/90">{i.notes}</div>}
              </div>
              <button
                onClick={() => onEditarItem(i)}
                className="tap-target text-muted-foreground hover:text-tactical-orange"
                aria-label={t("Editar item")}
                title={t("Editar item")}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onRemoverItem(i.id)}
                className="tap-target text-muted-foreground hover:text-destructive"
                aria-label={t("Remover")}
                title={t("Remover item")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {itens.length === 0 && (
          <li className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
            <PackageOpen className="h-8 w-8 opacity-50" />
            {t("Nenhum item ainda.")} {mochila ? t("Adicione o primeiro no formulário acima.") : ""}
          </li>
        )}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Selo de validade do item (usado na linha e nos lembretes)         */
/* ---------------------------------------------------------------- */

function SeloValidade({ expiresAt, comData = false }: { expiresAt: string; comData?: boolean }) {
  const { t } = useI18n();
  const status = statusValidade(expiresAt);
  if (!status) return null;
  const dias = diasRestantes(expiresAt);
  const rot = rotuloValidade(status, dias);
  return (
    <span
      data-test="selo-validade"
      className={`mono inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${corStatusValidade(status)}`}
    >
      {t(rot.chave, rot.vars)}
      {comData && (
        <span className="font-normal normal-case opacity-70">· {formatDate(expiresAt)}</span>
      )}
    </span>
  );
}
