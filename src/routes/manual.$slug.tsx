import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, Check } from "lucide-react";
import { MANUAL, CATEGORY_LABELS } from "@/lib/manual-content";
import { getChecklist, setChecklist } from "@/lib/db";

export const Route = createFileRoute("/manual/$slug")({
  head: ({ params }) => {
    const entry = MANUAL.find((e) => e.slug === params.slug);
    const title = `${entry?.title ?? "Manual"} — TacticalGIS`;
    const description = entry?.summary ?? "Verbete do manual de sobrevivência offline.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: ({ params }) => {
    const entry = MANUAL.find((e) => e.slug === params.slug);
    if (!entry) throw notFound();
    return { slug: entry.slug };
  },
  component: Entry,
  notFoundComponent: () => (
    <div className="container max-w-3xl mx-auto p-8">
      <p className="mb-4">Verbete não encontrado.</p>
      <Link to="/manual" className="text-tactical-orange underline">
        Voltar ao manual
      </Link>
    </div>
  ),
});

function Entry() {
  const { slug } = Route.useParams();
  const entry = MANUAL.find((e) => e.slug === slug);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const list = entry?.checklist;
    if (!entry || !list) return;
    Promise.all(
      list.map(async (_item: string, i: number): Promise<[number, boolean]> => {
        try {
          const c = await getChecklist(`${entry.slug}/${i}`);
          return [i, c?.done ?? false];
        } catch {
          return [i, false];
        }
      }),
    ).then((pairs) => setChecks(Object.fromEntries(pairs.map(([i, v]) => [String(i), v]))));
  }, [entry]);

  if (!entry) {
    return (
      <div className="container max-w-3xl mx-auto p-8">
        <p>Verbete não encontrado.</p>
      </div>
    );
  }

  const toggle = async (i: number) => {
    const next = !checks[String(i)];
    setChecks((c) => ({ ...c, [String(i)]: next }));
    try {
      await setChecklist(`${entry.slug}/${i}`, next);
    } catch {
      /* armazenamento local indisponível */
    }
  };

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8">
      <Link
        to="/manual"
        className="inline-flex items-center text-sm text-muted-foreground mb-4 hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Manual
      </Link>

      <div className="mono text-[10px] uppercase tracking-widest text-tactical-orange mb-1">
        {CATEGORY_LABELS[entry.category]}
      </div>
      <h1 className="text-2xl md:text-3xl font-bold mb-2">{entry.title}</h1>
      <p className="text-muted-foreground mb-4">{entry.summary}</p>

      <img
        src={entry.image}
        alt={entry.imageAlt}
        width={1024}
        height={576}
        className="w-full rounded-md border border-border mb-6 object-cover"
      />

      <article className="prose prose-invert prose-headings:text-tactical-orange prose-strong:text-foreground max-w-none">
        <ReactMarkdown>{entry.body}</ReactMarkdown>
      </article>

      {entry.checklist && (
        <div className="mt-8 rounded-md border border-border p-4 bg-card">
          <h2 className="mono text-tactical-orange text-sm font-bold mb-3 tracking-widest">
            CHECKLIST DE CAMPO
          </h2>
          <ul className="space-y-2">
            {entry.checklist.map((item: string, i: number) => (
              <li key={item}>
                <button
                  onClick={() => toggle(i)}
                  className="flex items-center gap-3 w-full text-left glove-tap rounded-md hover:bg-secondary px-2"
                >
                  <span
                    className={`h-6 w-6 shrink-0 rounded border flex items-center justify-center ${
                      checks[String(i)]
                        ? "bg-tactical-orange border-tactical-orange"
                        : "border-border"
                    }`}
                  >
                    {checks[String(i)] && <Check className="h-4 w-4 text-background" />}
                  </span>
                  <span className={checks[String(i)] ? "line-through text-muted-foreground" : ""}>
                    {item}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
