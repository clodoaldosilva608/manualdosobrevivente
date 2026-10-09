import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/hooks/usePreferences";
import {
  CONTEXTOS,
  itensPorContexto,
  urlDepositoNaLoja,
  urlItemNaLoja,
  type ContextoDeposito,
} from "@/lib/deposito";
import { registrarEvento } from "@/lib/analytics";

export const Route = createFileRoute("/deposito")({
  head: () => ({
    meta: [
      { title: "Depósito de Suprimentos — TacticalGIS" },
      {
        name: "description",
        content:
          "Catálogo curado de equipamentos de prontidão por contexto, com deep link para a loja do Centro de Sobrevivência.",
      },
      { property: "og:title", content: "Depósito de Suprimentos — TacticalGIS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DepositoPage,
});

function DepositoPage() {
  const { t } = useI18n();
  const { prefs, loaded } = usePreferences();
  const [contexto, setContexto] = useState<ContextoDeposito | "todos">("todos");

  const itens = useMemo(() => itensPorContexto(contexto), [contexto]);
  const perfilAtivo = loaded && prefs.perfil !== "nenhum" ? prefs.perfil : null;

  function abrirItem(busca: string, conteudo: string) {
    registrarEvento("saida_loja_centro", { busca, conteudo });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-5">
        <p className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
          {t("Hub de Sobrevivência")}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{t("Depósito de Suprimentos")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Catálogo curado do que realmente importa em cada contexto — o Manual não vende nada: cada item abre a busca equivalente na loja do Centro de Sobrevivência.",
          )}
        </p>
      </header>

      <section className="mb-5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            data-test="dep-todos"
            onClick={() => setContexto("todos")}
            className={`mono rounded border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors ${
              contexto === "todos"
                ? "border-tactical-orange bg-tactical-orange/10 text-tactical-orange"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("Todos")}
          </button>
          {CONTEXTOS.map((c) => (
            <button
              key={c.id}
              type="button"
              data-test={`dep-${c.id}`}
              onClick={() => setContexto(c.id)}
              className={`mono rounded border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors ${
                contexto === c.id
                  ? "border-tactical-orange bg-tactical-orange/10 text-tactical-orange"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(c.nome)}
            </button>
          ))}
        </div>
        {contexto !== "todos" && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t(CONTEXTOS.find((c) => c.id === contexto)?.descricao ?? "")}
          </p>
        )}
      </section>

      <section className="space-y-3" data-test="dep-lista">
        {itens.map((item) => {
          const recomendado = perfilAtivo !== null && item.perfis.includes(perfilAtivo);
          return (
            <article
              key={item.id}
              className={`rounded-md border bg-card p-4 ${
                recomendado ? "border-tactical-orange/50" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">{t(item.nome)}</h2>
                <div className="flex items-center gap-1.5">
                  {item.essencial ? (
                    <span className="mono rounded bg-tactical-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-tactical-orange">
                      {t("Essencial")}
                    </span>
                  ) : (
                    <span className="mono rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("Complemento")}
                    </span>
                  )}
                  {recomendado && (
                    <span
                      className="mono flex items-center gap-1 rounded bg-tactical-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-tactical-orange"
                      title={t("Recomendado para o seu perfil de prontidão")}
                    >
                      <Star className="h-2.5 w-2.5" />
                      {t("Seu perfil")}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(item.motivo)}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("Faixa de preço")} · {item.faixa}
                </span>
                <a
                  href={urlItemNaLoja(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => abrirItem(item.busca, `deposito:${item.id}`)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-tactical-orange px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {t("Ver na loja do Centro")}
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          {t("A vitrine completa, kits montados e afiliados ficam no Centro de Sobrevivência.")}
        </p>
        <Button asChild size="sm" variant="outline">
          <a
            href={urlDepositoNaLoja(contexto === "todos" ? undefined : contexto)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => abrirItem("vitrine", "deposito:vitrine")}
          >
            {t("Abrir a loja do Centro")}
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </a>
        </Button>
      </section>

      <footer className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link to="/perfil" className="text-tactical-orange hover:underline">
          {t("Ajustar meu perfil de prontidão")}
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/inventory" className="text-tactical-orange hover:underline">
          {t("Conferir mochila")}
        </Link>
      </footer>
    </div>
  );
}
