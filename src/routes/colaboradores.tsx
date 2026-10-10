import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Landmark, ShieldCheck, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatMoeda, formatDateTime } from "@/lib/format";
import { listarApoiadores, type Apoiador } from "@/lib/apoiadores";
import {
  listarParceirosPublicos,
  listarRedline,
  perfilAtual,
  somarRedline,
  type ContribuicaoRedline,
  type Parceiro,
  type PerfilManual,
} from "@/lib/colaboracao";

export const Route = createFileRoute("/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores — Manual do Sobrevivente" },
      {
        name: "description",
        content:
          "O Manual do Sobrevivente é gratuito e se mantém com contribuições voluntárias de qualquer valor. Conheça quem já colaborou e apoie o projeto.",
      },
      { property: "og:title", content: "Colaboradores — Manual do Sobrevivente" },
      {
        property: "og:description",
        content:
          "Aplicação gratuita, mantida pela comunidade. Qualquer valor ajuda a manter o projeto no ar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Colaboradores,
});

function Colaboradores() {
  const { t } = useI18n();
  const [redline, setRedline] = useState<ContribuicaoRedline[] | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [perfil, setPerfil] = useState<PerfilManual | null>(null);
  const [apoiadores, setApoiadores] = useState<Apoiador[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [linha, marcas, sessao, mural] = await Promise.all([
          listarRedline(),
          listarParceirosPublicos().catch(() => [] as Parceiro[]),
          perfilAtual().catch(() => null),
          listarApoiadores().catch(() => [] as Apoiador[]),
        ]);
        setRedline(linha);
        setParceiros(marcas);
        setPerfil(sessao);
        setApoiadores(mural);
      } catch {
        setRedline([]);
      }
    })();
  }, []);

  const total = redline ? somarRedline(redline) : 0;
  const carregando = redline === null;
  const textoRedline =
    (redline ?? [])
      .map((item) => `◆ ${item.nome_exibicao} — ${formatMoeda(Number(item.valor))}`)
      .join("      ") + "      ";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 pb-10 md:p-8" data-test="colaboradores">
      {/* Redline: perfis dos colaboradores aprovados, em movimento contínuo */}
      <div
        className="redline-pausa-hover overflow-hidden rounded-md border border-destructive/60 bg-destructive/95"
        data-test="colaboradores-redline"
      >
        <div className="flex items-center gap-2 px-3 pt-2">
          <span className="mono text-[10px] font-bold uppercase tracking-widest text-white/90">
            {t("Redline de colaboradores")}
          </span>
          <span className="mono ml-auto hidden text-[10px] text-white/70 sm:inline">
            {t("Agradecemos a cada um que mantém este projeto no ar")}
          </span>
        </div>
        <div className="flex items-center overflow-hidden py-2">
          {carregando ? (
            <span className="mono px-3 text-xs text-white/80">{t("Consultando redline…")}</span>
          ) : redline.length === 0 ? (
            <span className="mono px-3 text-xs text-white/80">
              {t("Redline vazia — seja o primeiro colaborador do Manual")}
            </span>
          ) : (
            <>
              <div className="flex w-max items-center">
                <span
                  className="redline-track mono whitespace-pre text-[11px] font-bold text-white"
                  data-test="colaboradores-redline-texto"
                >
                  {textoRedline}
                </span>
                <span
                  className="redline-track mono whitespace-pre text-[11px] font-bold text-white"
                  aria-hidden
                >
                  {textoRedline}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <header className="space-y-1">
        <h1 className="mono text-tactical-orange text-2xl font-bold tracking-wider md:text-3xl">
          {t("APOIE O MANUAL")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "O Manual do Sobrevivente é e sempre será gratuito. As contribuições voluntárias pagam hospedagem, mapas, satélite e o desenvolvimento contínuo do projeto.",
          )}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <CartaoKpi
          icone={<Landmark className="h-4 w-4" />}
          rotulo={t("Arrecadado")}
          valor={carregando ? "—" : formatMoeda(total)}
          teste="colaboradores-total"
        />
        <CartaoKpi
          icone={<Users className="h-4 w-4" />}
          rotulo={t("Colaboradores")}
          valor={carregando ? "—" : String(redline.length)}
        />
        <CartaoKpi
          icone={<ShieldCheck className="h-4 w-4" />}
          rotulo={t("Modelo")}
          valor={t("100% gratuito")}
        />
      </div>

      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <p className="text-sm leading-relaxed">
          {t(
            "Não existe versão paga, plano bloqueado nem recurso escondido atrás de assinatura: tudo que o Manual oferece está disponível para qualquer operador. O projeto vive de tecnologia que custa dinheiro — servidores, imagens de satélite, mapas offline e desenvolvimento contínuo — e é a colaboração voluntária de quem usa que paga essa conta.",
          )}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(
            "Sua contribuição pode ser de qualquer valor, uma única vez ou sempre que puder. Quem colabora entra para a redline acima, com o nome exibido para toda a comunidade.",
          )}
        </p>
        <Button
          asChild
          size="lg"
          className="glove-tap w-full bg-tactical-orange text-background hover:bg-tactical-orange/90 sm:w-auto"
          data-test="colaboradores-cta"
        >
          <Link to="/apoiar">
            <HeartHandshake className="h-5 w-5" /> {t("Seja um colaborador")}
          </Link>
        </Button>
        <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {perfil
            ? t("Sessão ativa — você será levado à página de apoio")
            : t("Você precisará entrar na sua conta para colaborar")}
        </p>
      </div>

      {/* Mural dos apoiadores — ordem do mural, NUNCA alfabética */}
      <div
        className="space-y-3 rounded-md border border-border bg-card p-4"
        data-test="colaboradores-apoiadores"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="mono text-tactical-orange text-[11px] font-bold uppercase tracking-widest">
            {t("Mural dos apoiadores")}
          </p>
          <span className="mono text-[10px] text-muted-foreground">
            {t("{n} apoiadores", { n: apoiadores.length })} · {t("ordem de chegada")}
          </span>
        </div>
        {apoiadores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("O mural está sendo montado — volte em instantes.")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {apoiadores.map((apoiador) => (
              <span
                key={apoiador.id}
                title={apoiador.cidade ?? undefined}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px]"
              >
                <span className="text-tactical-orange mr-1">◆</span>
                {apoiador.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {parceiros.length > 0 && (
        <div
          className="space-y-3 rounded-md border border-border bg-card p-4"
          data-test="colaboradores-parceiros"
        >
          <p className="mono text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
            {t("Parceiros do projeto")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {parceiros.slice(0, 8).map((parceiro) => (
              <span
                key={parceiro.id}
                className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
              >
                {parceiro.nome}
              </span>
            ))}
          </div>
          <Link
            to="/parceiros"
            className="text-tactical-orange text-sm underline decoration-dotted"
          >
            {t("Ver todos os parceiros →")}
          </Link>
        </div>
      )}
    </div>
  );
}

function CartaoKpi({
  icone,
  rotulo,
  valor,
  teste,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  teste?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3" data-test={teste}>
      <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="text-tactical-orange">{icone}</span>
        {rotulo}
      </div>
      <p className="mono mt-1 truncate text-lg font-bold">{valor}</p>
    </div>
  );
}
