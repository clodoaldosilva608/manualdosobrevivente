import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, Check } from "lucide-react";
import { MANUAL } from "@/lib/manual-content";
import { getChecklist, setChecklist } from "@/lib/db";

export const Route = createFileRoute("/manual/$slug")({
  head: ({ params }) => {
    const entry = MANUAL.find((e) => e.slug === params.slug);
    return {
      meta: [
        { title: `${entry?.title ?? "Manual"} — TacticalGIS` },
        { name: "description", content: entry?.summary ?? "" },
      ],
    };
  },
  loader: ({ params }) => {
    const entry = MANUAL.find((e) => e.slug === params.slug);
    if (!entry) throw notFound();
    return { entry };
  },
  component: Entry,
  notFoundComponent: () => <div className="p-8">Verbete não encontrado.</div>,
});

function Entry() {
  const { entry } = Route.useLoaderData();
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!entry.checklist) return;
    Promise.all(
      entry.checklist.map(async (_: string, i: number) => {
        const c = await getChecklist(`${entry.slug}/${i}`);
        return [i, c?.done ?? false] as const;
      }),
    ).then((pairs) => setChecks(Object.fromEntries(pairs.map(([i, v]) => [String(i), v]))));
  }, [entry]);

  const toggle = async (i: number) => {
    const next = !checks[String(i)];
    setChecks((c) => ({ ...c, [String(i)]: next }));
    await setChecklist(`${entry.slug}/${i}`, next);
  };

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8">
      <Link
        to="/manual"
        className="inline-flex items-center text-sm text-muted-foreground mb-4 hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Manual
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold mb-2">{entry.title}</h1>
      <p className="text-muted-foreground mb-6">{entry.summary}</p>

      <article className="prose prose-invert prose-headings:text-tactical-orange prose-strong:text-foreground max-w-none">
        <ReactMarkdown>{entry.body}</ReactMarkdown>
      </article>

      {entry.checklist && (
        <div className="mt-8 rounded-md border border-border p-4 bg-card">
          <h3 className="mono text-tactical-orange text-sm font-bold mb-3 tracking-widest">
            CHECKLIST DE CAMPO
          </h3>
          <ul className="space-y-2">
            {entry.checklist.map((item: string, i: number) => (
              <li key={i}>
                <button
                  onClick={() => toggle(i)}
                  className="flex items-center gap-3 w-full text-left glove-tap rounded-md hover:bg-secondary px-2"
                >
                  <span
                    className={`h-6 w-6 rounded border flex items-center justify-center ${
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
