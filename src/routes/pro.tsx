import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BellRing,
  Check,
  CloudUpload,
  FolderDown,
  Infinity as InfinityIcon,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/hooks/usePreferences";
import { urlPro } from "@/lib/hub-links";
import { registrarEvento } from "@/lib/analytics";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Manual Pro — TacticalGIS" },
      {
        name: "description",
        content:
          "Plano do Manual Pro: alertas avançados, sincronização ilimitada, packs offline exclusivos e relatórios personalizados de prontidão.",
      },
      { property: "og:title", content: "Manual Pro — TacticalGIS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProPage,
});

interface LinhaBeneficio {
  icone: typeof BellRing;
  titulo: string;
  descricao: string;
}

const BENEFICIOS: LinhaBeneficio[] = [
  {
    icone: ShieldAlert,
    titulo: "Alertas meteorológicos avançados",
    descricao:
      "Vigilância contínua com aviso por notificação para ciclone, tempestade severa e enchente na sua região.",
  },
  {
    icone: CloudUpload,
    titulo: "Sincronização ilimitada",
    descricao:
      "Waypoints, mochilas, notas e prontidão em todos os seus aparelhos — sem limite de volume.",
  },
  {
    icone: FolderDown,
    titulo: "Packs offline exclusivos",
    descricao:
      "Bibliotecas de campo em português: primeiros socorros, plantas medicinais, guias por cenário.",
  },
  {
    icone: BellRing,
    titulo: "Relatório personalizado de prontidão",
    descricao:
      "Boletim semanal com o estado do seu kit, lacunas encontradas e prioridade de reposição.",
  },
];

function ProPage() {
  const { t } = useI18n();
  const { prefs } = usePreferences();

  function irParaLista() {
    registrarEvento("pro_lista_espera", { origem: "app" });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-6">
        <p className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
          {t("Assinatura")}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{t("Manual Pro")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "O plano recorrente do Manual: o que fica melhor para quem prepara em série, não só consulta. Protótipo público — a cobrança abre pelo Centro com PIX e cartão.",
          )}
        </p>
        {prefs.pro && (
          <p className="mono mt-3 inline-block rounded border border-tactical-orange/50 px-2 py-1 text-[10px] uppercase tracking-wider text-tactical-orange">
            {t("Assinatura ativa neste aparelho (estado local)")}
          </p>
        )}
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-md border border-border bg-card p-5">
          <h2 className="mono text-sm font-bold uppercase tracking-wider">{t("Gratuito")}</h2>
          <p className="mono mt-2 text-2xl font-bold">
            R$ 0
            <span className="text-xs font-normal text-muted-foreground"> / {t("para sempre")}</span>
          </p>
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            {[
              "Mapa tático completo com radar, ciclones e vento",
              "Mochilas, checklists e waypoints ilimitados no aparelho",
              "Manual de sobrevivência e teste de prontidão",
              "Backup em pasta própria do operador",
            ].map((linha) => (
              <li key={linha} className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tactical-orange" />
                {t(linha)}
              </li>
            ))}
          </ul>
        </article>

        <article
          className="relative rounded-md border border-tactical-orange/60 bg-card p-5"
          data-test="pro-plano"
        >
          <span className="mono absolute -top-2.5 right-4 rounded bg-tactical-orange px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
            {t("Em preparação")}
          </span>
          <h2 className="mono flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-tactical-orange">
            <InfinityIcon className="h-4 w-4" />
            {t("Manual Pro")}
          </h2>
          <p className="mono mt-2 text-2xl font-bold">
            R$ 14,90
            <span className="text-xs font-normal text-muted-foreground"> / {t("mês")}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("ou R$ 119,90/ano (2 meses de brinde)")}
          </p>
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className="flex gap-2">
                <b.icone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tactical-orange" />
                <span>
                  <span className="font-semibold text-foreground">{t(b.titulo)}</span> —{" "}
                  {t(b.descricao)}
                </span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-5 w-full" data-test="pro-cta">
            <a
              href={urlPro("pagina-pro")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={irParaLista}
            >
              {t("Entrar na lista de espera")}
            </a>
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {t(
              "Lista de espera no Centro de Sobrevivência — você recebe o aviso de abertura por e-mail.",
            )}
          </p>
        </article>
      </section>

      <footer className="mt-6 text-xs text-muted-foreground">
        {t(
          "Gratuito continua completo para o uso de campo. Pro sustenta o desenvolvimento e a infraestrutura do hub.",
        )}
      </footer>
      <div className="mt-3 flex gap-3 text-xs">
        <Link to="/perfil" className="text-tactical-orange hover:underline">
          {t("Perfil de prontidão")}
        </Link>
        <span>·</span>
        <Link to="/deposito" className="text-tactical-orange hover:underline">
          {t("Depósito de suprimentos")}
        </Link>
      </div>
    </div>
  );
}
