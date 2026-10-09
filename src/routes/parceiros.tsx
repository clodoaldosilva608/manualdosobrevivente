import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Handshake, ImageOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { listarParceirosPublicos, type Parceiro } from "@/lib/colaboracao";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: "Parceiros — Manual do Sobrevivente" },
      {
        name: "description",
        content:
          "Marcas e projetos que patrocinam o ecossistema Sobrevivência: conheça os parceiros do Manual do Sobrevivente e do Centro de Sobrevivência.",
      },
      { property: "og:title", content: "Parceiros — Manual do Sobrevivente" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Parceiros,
});

const ROTULO_NIVEL: Record<Parceiro["nivel"], string> = {
  ouro: "Patrocínio ouro",
  prata: "Patrocínio prata",
  bronze: "Patrocínio bronze",
  apoiador: "Apoiador",
};

function Parceiros() {
  const { t } = useI18n();
  const [parceiros, setParceiros] = useState<Parceiro[] | null>(null);

  useEffect(() => {
    void listarParceirosPublicos()
      .then(setParceiros)
      .catch(() => setParceiros([]));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 pb-10 md:p-8" data-test="parceiros">
      <header className="space-y-1">
        <h1 className="mono text-tactical-orange text-2xl font-bold tracking-wider md:text-3xl">
          {t("PARCEIROS DO ECOSSISTEMA")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Marcas e projetos que acreditam na missão de manter conhecimento de sobrevivência gratuito e acessível. Quer aparecer aqui? Fale com a administração do projeto.",
          )}
        </p>
      </header>

      {parceiros === null ? (
        <p className="mono rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("Consultando parceiros…")}
        </p>
      ) : parceiros.length === 0 ? (
        <div
          className="space-y-3 rounded-md border border-dashed border-border bg-card p-6 text-center"
          data-test="parceiros-vazio"
        >
          <Handshake className="text-tactical-orange mx-auto h-8 w-8" />
          <p className="text-sm text-muted-foreground">
            {t(
              "Ainda não temos parceiros anunciados. O espaço está aberto para marcas que queiram apoiar o projeto.",
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-test="parceiros-grid">
          {parceiros.map((parceiro) => (
            <CartaoParceiro
              key={parceiro.id}
              parceiro={parceiro}
              rotuloNivel={t(ROTULO_NIVEL[parceiro.nivel])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoParceiro({ parceiro, rotuloNivel }: { parceiro: Parceiro; rotuloNivel: string }) {
  const { t } = useI18n();
  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-border bg-card p-4"
      data-test="parceiro-card"
    >
      <div className="flex items-center gap-3">
        {parceiro.logo_url ? (
          <img
            src={parceiro.logo_url}
            alt={parceiro.nome}
            className="h-12 w-12 shrink-0 rounded-md border border-border bg-white object-contain p-1"
          />
        ) : (
          <div className="mono flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            <ImageOff className="text-muted-foreground h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="mono truncate font-bold">{parceiro.nome}</p>
          <Badge variant="secondary" className="mono mt-1 text-[10px]">
            {rotuloNivel}
          </Badge>
        </div>
      </div>
      {parceiro.descricao && (
        <p className="text-sm leading-relaxed text-muted-foreground">{parceiro.descricao}</p>
      )}
      {parceiro.link && (
        <Button asChild variant="outline" size="sm" className="glove-tap mt-auto self-start">
          <a href={parceiro.link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> {t("Visitar parceiro")}
          </a>
        </Button>
      )}
    </div>
  );
}
