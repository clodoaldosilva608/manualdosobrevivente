import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, CheckCircle2, Mountain, Trees, Waves, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { usePreferences, type PerfilProntidao } from "@/hooks/usePreferences";
import { LISTA_PERFIS, PERFIS, garantirMochilaDoPerfil, type Perfil } from "@/lib/perfil-wizard";
import { registrarEvento } from "@/lib/analytics";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil de prontidão — TacticalGIS" },
      {
        name: "description",
        content:
          "Wizard de perfil: mochila recomendada, tópicos do manual e foco do depósito para o seu contexto de vida.",
      },
      { property: "og:title", content: "Perfil de prontidão — TacticalGIS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PerfilPage,
});

const ICONES: Record<Perfil, LucideIcon> = {
  urbano: Building2,
  trilha: Mountain,
  litoral: Waves,
  rural: Trees,
};

function PerfilPage() {
  const { t } = useI18n();
  const { prefs, update } = usePreferences();
  const [etapa, setEtapa] = useState<"escolha" | "plano">("escolha");
  const [escolhido, setEscolhido] = useState<Perfil | null>(null);
  const [aplicando, setAplicando] = useState(false);

  const perfilAtual = prefs.perfil !== "nenhum" ? PERFIS[prefs.perfil] : null;

  async function confirmar() {
    if (!escolhido) return;
    setAplicando(true);
    registrarEvento("wizard_perfil", { perfil: escolhido });
    const nome = await garantirMochilaDoPerfil(escolhido);
    await update({ perfil: escolhido as PerfilProntidao, wizardPerfilFeito: true });
    setAplicando(false);
    toast.success(t("Perfil aplicado"), {
      description: nome
        ? t("Mochila recomendada garantida no inventário")
        : t("Recomendações guardadas no aparelho"),
    });
    setEtapa("escolha");
    setEscolhido(null);
  }

  const def = escolhido ? PERFIS[escolhido] : null;
  const IconeEscolhido = escolhido ? ICONES[escolhido] : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-6">
        <p className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
          {t("Wizard de prontidão")}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{t("Perfil de prontidão")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Responda em que contexto você vive e o aplicativo curadoria o resto: mochila recomendada, tópicos do manual e prioridades do Depósito de Suprimentos. Nada sai do aparelho.",
          )}
        </p>
      </header>

      {perfilAtual && (
        <section className="mb-6 rounded-md border border-tactical-orange/40 bg-card p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-tactical-orange" />
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-tactical-orange">
              {t("Perfil ativo")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-foreground">
            <span className="font-semibold">{t(perfilAtual.nome)}</span> · {t(perfilAtual.risco)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "A mochila recomendada deste perfil já está no inventário — confira e marque o que já reuniu.",
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/inventory">{t("Abrir mochila")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/deposito">{t("Depósito de suprimentos")}</Link>
            </Button>
          </div>
        </section>
      )}

      {etapa === "escolha" && (
        <section className="space-y-3">
          <h2 className="mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("Passo 1 de 2 — escolha o contexto")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {LISTA_PERFIS.map((id) => {
              const p = PERFIS[id];
              const Icone = ICONES[id];
              const ativo = prefs.perfil === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-test={`perfil-${id}`}
                  onClick={() => {
                    setEscolhido(id);
                    setEtapa("plano");
                  }}
                  className={`rounded-md border p-4 text-left transition-colors ${
                    ativo
                      ? "border-tactical-orange bg-card"
                      : "border-border bg-card hover:border-tactical-orange/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icone className="h-5 w-5 text-tactical-orange" />
                    <span className="mono text-sm font-bold uppercase tracking-wider">
                      {t(p.nome)}
                    </span>
                    {ativo && (
                      <span className="mono ml-auto text-[9px] uppercase tracking-wider text-tactical-orange">
                        {t("ativo")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {t(p.descricao)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {etapa === "plano" && def && IconeEscolhido && (
        <section className="space-y-4" data-test="perfil-plano">
          <h2 className="mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("Passo 2 de 2 — confirme o plano")}
          </h2>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <IconeEscolhido className="h-5 w-5 text-tactical-orange" />
              <span className="mono text-sm font-bold uppercase tracking-wider">{t(def.nome)}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(def.descricao)}</p>
            <p className="mt-3 text-xs">
              <span className="font-semibold text-foreground">{t("Mochila recomendada:")} </span>
              <span className="text-tactical-orange">{def.modeloMochila.toUpperCase()}</span>
              <span className="text-muted-foreground"> — {t(def.motivoMochila)}</span>
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("Tópicos do manual priorizados")}
            </h3>
            <ul className="mt-2 space-y-2">
              {def.topicos.map((top) => (
                <li key={top.slug} className="text-xs">
                  <Link
                    to="/manual/$slug"
                    params={{ slug: top.slug }}
                    className="font-semibold text-foreground underline-offset-2 hover:text-tactical-orange hover:underline"
                  >
                    {t(top.titulo)}
                  </Link>
                  <span className="text-muted-foreground"> — {t(top.porQue)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("Prioridades no Depósito de Suprimentos")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {def.prioridadeDeposito.map((ctx) => (
                <span
                  key={ctx}
                  className="mono rounded border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {t(ctx)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={confirmar} disabled={aplicando} data-test="perfil-confirmar">
              {aplicando ? t("Aplicando…") : t("Aplicar perfil")}
            </Button>
            <Button variant="outline" onClick={() => setEtapa("escolha")}>
              {t("Voltar")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
