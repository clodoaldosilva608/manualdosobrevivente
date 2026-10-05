import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { MANUAL, MANUAL_BY_CATEGORY, CATEGORY_LABELS } from "@/lib/manual-content";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/manual/")({
  head: () => ({
    meta: [
      { title: "Manual de Sobrevivência — TacticalGIS" },
      {
        name: "description",
        content:
          "Base de conhecimento offline: primeiros socorros, fogo, purificação de água, abrigo, nós e navegação terrestre.",
      },
      { property: "og:title", content: "Manual de Sobrevivência — TacticalGIS" },
      {
        property: "og:description",
        content: "Guias de campo com checklists, avisos de segurança e fotos ilustrativas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManualIndex,
});

function ManualIndex() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const fuse = useMemo(
    () => new Fuse(MANUAL, { keys: ["title", "summary", "body"], threshold: 0.4 }),
    [],
  );
  const results = q.trim() ? fuse.search(q).map((r) => r.item) : MANUAL;

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-8 md:p-8">
      <header className="mb-6">
        <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider">
          {t("MANUAL DE SOBREVIVÊNCIA")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("Referência de campo pronta para uso offline. Funciona sem sinal.")}
        </p>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Buscar técnicas, condições, equipamentos...")}
          className="pl-10 glove-tap"
        />
      </div>

      {q.trim() ? (
        <ul className="space-y-2">
          {results.map((e) => (
            <EntryRow key={e.slug} entry={e} />
          ))}
          {results.length === 0 && (
            <li className="text-muted-foreground text-sm">{t("Nenhum resultado.")}</li>
          )}
        </ul>
      ) : (
        Object.entries(MANUAL_BY_CATEGORY).map(([cat, items]) => (
          <section key={cat} className="mb-8">
            <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {t(CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS])}
            </h2>
            <ul className="space-y-2">
              {items.map((e) => (
                <EntryRow key={e.slug} entry={e} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: (typeof MANUAL)[number] }) {
  return (
    <li>
      <Link
        to="/manual/$slug"
        params={{ slug: entry.slug }}
        className="flex gap-3 rounded-md border border-border hover:border-tactical-orange/60 bg-card p-3 transition-colors"
      >
        <img
          src={entry.image}
          alt={entry.imageAlt}
          loading="lazy"
          className="h-20 w-16 shrink-0 rounded object-cover border border-border"
        />
        <div className="min-w-0">
          <div className="break-words font-semibold">{entry.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{entry.summary}</div>
        </div>
      </Link>
    </li>
  );
}
