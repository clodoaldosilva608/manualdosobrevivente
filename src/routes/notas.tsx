import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MapPin, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  deleteNota,
  listNotas,
  listWaypoints,
  saveNota,
  type LocalNota,
  type LocalWaypoint,
} from "@/lib/db";
import { formatDateTime, formatDecimalDegrees } from "@/lib/format";

export const Route = createFileRoute("/notas")({
  head: () => ({
    meta: [
      { title: "Notas de campo — TacticalGIS" },
      {
        name: "description",
        content:
          "Anotações rápidas do operador, salvadas no aparelho, incluídas no backup e amarráveis a waypoints do mapa tático.",
      },
      { property: "og:title", content: "Notas de campo — TacticalGIS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NotasPage,
});

/** Rascunho do editor — vazio cria nota nova. */
interface Rascunho {
  id: string | null;
  titulo: string;
  conteudo: string;
  etiquetas: string;
  waypointId: string;
}

const RASCUNHO_VAZIO: Rascunho = {
  id: null,
  titulo: "",
  conteudo: "",
  etiquetas: "",
  waypointId: "",
};

function NotasPage() {
  const { t } = useI18n();
  const [notas, setNotas] = useState<LocalNota[]>([]);
  const [waypoints, setWaypoints] = useState<LocalWaypoint[]>([]);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [ns, wps] = await Promise.all([listNotas(), listWaypoints()]);
      setNotas(ns);
      setWaypoints(wps);
    } catch {
      /* armazenamento indisponível (SSR) — a tela segue vazia */
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar() {
    if (!rascunho || !rascunho.titulo.trim()) {
      toast.error(t("Dê um título à nota"));
      return;
    }
    setSalvando(true);
    const agora = new Date().toISOString();
    const anterior = rascunho.id ? notas.find((n) => n.id === rascunho.id) : null;
    const wp = waypoints.find((w) => w.id === rascunho.waypointId) ?? null;
    const nota: LocalNota = {
      id: rascunho.id ?? crypto.randomUUID(),
      user_id: null,
      titulo: rascunho.titulo.trim(),
      conteudo: rascunho.conteudo.trim(),
      etiquetas: rascunho.etiquetas
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .slice(0, 8),
      waypoint: wp
        ? { id: wp.id, titulo: wp.title, latitude: wp.latitude, longitude: wp.longitude }
        : null,
      criada_em: anterior?.criada_em ?? agora,
      atualizada_em: agora,
    };
    try {
      await saveNota(nota);
      toast.success(rascunho.id ? t("Nota atualizada") : t("Nota guardada no aparelho"));
      setRascunho(null);
      await carregar();
    } catch {
      toast.error(t("Não foi possível guardar a nota"));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(nota: LocalNota) {
    if (!window.confirm(t("Apagar esta nota definitivamente?"))) return;
    try {
      await deleteNota(nota.id);
      toast.success(t("Nota apagada"));
      await carregar();
    } catch {
      toast.error(t("Não foi possível apagar a nota"));
    }
  }

  function editar(nota: LocalNota) {
    setRascunho({
      id: nota.id,
      titulo: nota.titulo,
      conteudo: nota.conteudo,
      etiquetas: nota.etiquetas.join(", "),
      waypointId: nota.waypoint?.id ?? "",
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
            {t("Diário do operador")}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{t("Notas de campo")}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t(
              "Anotações rápidas salvas no aparelho, incluídas no backup da pasta e amarráveis a waypoints do mapa.",
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => setRascunho({ ...RASCUNHO_VAZIO })} data-test="nota-nova">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("Nova nota")}
        </Button>
      </header>

      {rascunho && (
        <section
          className="mb-6 space-y-3 rounded-md border border-tactical-orange/50 bg-card p-4"
          data-test="nota-editor"
        >
          <div className="flex items-center justify-between">
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-tactical-orange">
              {rascunho.id ? t("Editar nota") : t("Nova nota")}
            </h2>
            <button
              type="button"
              aria-label={t("Fechar editor")}
              onClick={() => setRascunho(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            value={rascunho.titulo}
            onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })}
            placeholder={t("Título da nota")}
            maxLength={120}
          />
          <Textarea
            value={rascunho.conteudo}
            onChange={(e) => setRascunho({ ...rascunho, conteudo: e.target.value })}
            placeholder={t("O que aconteceu, o que você viu, o que precisa fazer…")}
            rows={5}
          />
          <Input
            value={rascunho.etiquetas}
            onChange={(e) => setRascunho({ ...rascunho, etiquetas: e.target.value })}
            placeholder={t("Etiquetas separadas por vírgula (água, campo, kit)")}
          />
          <select
            value={rascunho.waypointId}
            onChange={(e) => setRascunho({ ...rascunho, waypointId: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label={t("Amarrar a um waypoint (opcional)")}
          >
            <option value="">{t("Amarrar a um waypoint (opcional)")}</option>
            {waypoints.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} · {formatDecimalDegrees(w.latitude)}, {formatDecimalDegrees(w.longitude)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={salvar} disabled={salvando} data-test="nota-salvar">
              {salvando ? t("Guardando…") : t("Guardar")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRascunho(null)}>
              {t("Cancelar")}
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3" data-test="nota-lista">
        {notas.length === 0 && !rascunho && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t(
              "Nenhuma nota ainda. Registre o que você aprende em cada saída — é assim que a prontidão vira experiência.",
            )}
          </p>
        )}
        {notas.map((nota) => (
          <article key={nota.id} className="rounded-md border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">{nota.titulo}</h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={t("Editar nota")}
                  onClick={() => editar(nota)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("Apagar nota")}
                  onClick={() => excluir(nota)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {nota.conteudo && (
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {nota.conteudo}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {nota.waypoint && (
                <span className="mono flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3 text-tactical-orange" />
                  {nota.waypoint.titulo}
                </span>
              )}
              {nota.etiquetas.map((e) => (
                <span
                  key={e}
                  className="mono rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  #{e}
                </span>
              ))}
              <span className="mono ml-auto text-[10px] text-muted-foreground">
                {formatDateTime(new Date(nota.atualizada_em))}
              </span>
            </div>
          </article>
        ))}
      </section>

      <footer className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <NotebookPen className="h-3.5 w-3.5" />
        {t(
          "As notas entram no backup automático da pasta do operador (Ajustes → Pasta de backup).",
        )}
      </footer>
    </div>
  );
}
