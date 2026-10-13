import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { SearchComparison } from "@/components/admin/SearchComparison";
import { confidenceLabel } from "@/lib/semantic/taxonomy";

export const metadata: Metadata = { title: "Search evaluation" };

type Ranked = { id: number; title: string; author: string };
type SystemName = "lexical" | "embedding" | "full";
type Report = {
  summary: {
    generatedAt: string;
    models: { embeddings: string; classifier: string; judge: string | null };
    overall: Record<SystemName, { p5: number | null; ndcg5: number | null; emptyQueries: number }>;
    byType: Record<string, Record<SystemName, number | null>>;
    abstention: { outOfScopeDeclined: number; outOfScopeTotal: number; inScopeAnswered: number; inScopeTotal: number };
  };
  queries: {
    id: string;
    type: string;
    query: string;
    confidence: string;
    message: string | null;
    systems: Record<SystemName, Ranked[]>;
    grades: Record<string, number>;
    metrics: Record<SystemName, { ndcg5: number | null }>;
  }[];
};

const SYSTEMS: { key: SystemName; label: string; description: string }[] = [
  { key: "lexical", label: "Keywords", description: "FTS5/BM25 over title, author, genre, synopsis and note" },
  { key: "embedding", label: "Embeddings only", description: "closeness between the query and the synopsis" },
  { key: "full", label: "Shelf", description: "reading of the request, embeddings and reranking by attributes" },
];

const TYPE_LABELS: Record<string, string> = {
  emotional: "emotional",
  abstract: "abstract",
  author: "author",
  negative: "negative",
  ambiguous: "ambiguous",
  "no-match": "no match",
};

const formatScore = (value: number | null) => (value === null ? "—" : value.toFixed(2));

function loadReport(): Report | null {
  const file = join(process.cwd(), "data", "eval", "results.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<Report>;
    return parsed.summary && parsed.queries ? (parsed as Report) : null;
  } catch {
    return null;
  }
}

export default function EvaluationPage() {
  const report = loadReport();
  const judged = Boolean(report?.summary.models.judge);
  return (
    <div className="max-w-6xl">
      <h1 className="display text-[2.6rem] leading-none">Search evaluation</h1>
      <p className="mt-3 max-w-[48rem] text-ink-soft">
        The shelf only earns trust if it finds books an ordinary search can’t. Here you can try any query on both
        engines and see the results for the fixed evaluation set.
      </p>

      <section aria-labelledby="live-comparison-heading" className="mt-8 border border-ink/30 bg-paper-light p-5">
        <h2 id="live-comparison-heading" className="sr-only">
          Live comparison
        </h2>
        <SearchComparison />
      </section>

      <section aria-labelledby="evaluation-set-heading" className="mt-14">
        <h2 id="evaluation-set-heading" className="display text-[1.8rem] leading-none">
          Evaluation set
        </h2>
        {report === null ? (
          <p className="mt-3 text-ink-soft">
            No results saved yet. Run <code className="font-mono text-[0.85rem]">npm run ai:eval -- --judge</code> in the terminal.
          </p>
        ) : (
          <>
            <p className="eyebrow mt-3 text-ink-soft">
              {report.queries.length} queries · generated on {report.summary.generatedAt.slice(0, 16).replace("T", " ")} · embeddings{" "}
              {report.summary.models.embeddings} · classifier {report.summary.models.classifier}
            </p>
            {judged ? (
              <p className="mt-3 max-w-[48rem] border-l-2 border-vermilion pl-3 text-[0.95rem]">
                The relevance grades (0, 1 or 2) were given by another local model, {report.summary.models.judge}, reading only title,
                author, genre and synopsis. It’s an automatic judge, not a human evaluation: treat the numbers as a hint and read the lists.
              </p>
            ) : (
              <p className="mt-3 text-ink-soft">This run had no relevance judge; just the lists side by side.</p>
            )}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left">
                <thead>
                  <tr className="eyebrow border-b border-ink text-ink-soft">
                    <th scope="col" className="py-2 pr-4 font-normal">Engine</th>
                    <th scope="col" className="py-2 pr-4 text-right font-normal">nDCG@5</th>
                    <th scope="col" className="py-2 pr-4 text-right font-normal">P@5</th>
                    <th scope="col" className="py-2 text-right font-normal">Queries with no results</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEMS.map((system) => (
                    <tr key={system.key} className="border-b border-ink/15 align-baseline">
                      <th scope="row" className="py-2.5 pr-4 font-normal">
                        <span className="font-label font-semibold">{system.label}</span>
                        <span className="block text-[0.85rem] text-ink-soft">{system.description}</span>
                      </th>
                      <td className="display py-2.5 pr-4 text-right text-[1.6rem]">{formatScore(report.summary.overall[system.key].ndcg5)}</td>
                      <td className="display py-2.5 pr-4 text-right text-[1.6rem]">{formatScore(report.summary.overall[system.key].p5)}</td>
                      <td className="py-2.5 text-right font-mono text-[0.9rem]">{report.summary.overall[system.key].emptyQueries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="eyebrow border-b border-ink pb-2 text-ink">nDCG@5 by query type</h3>
                <table className="w-full border-collapse text-left text-[0.95rem]">
                  <thead>
                    <tr className="eyebrow text-ink-soft">
                      <th scope="col" className="py-1.5 pr-3 font-normal">Type</th>
                      {SYSTEMS.map((system) => (
                        <th key={system.key} scope="col" className="py-1.5 pl-3 text-right font-normal">
                          {system.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.summary.byType).map(([type, row]) => (
                      <tr key={type} className="border-t border-ink/15">
                        <th scope="row" className="py-1.5 pr-3 font-label font-normal">{TYPE_LABELS[type] ?? type}</th>
                        {SYSTEMS.map((system) => (
                          <td key={system.key} className="py-1.5 pl-3 text-right font-mono text-[0.88rem]">
                            {formatScore(row[system.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="eyebrow border-b border-ink pb-2 text-ink">When there’s no answer</h3>
                <p className="mt-3 text-[0.98rem]">
                  Queries outside what the bookshop sells, declined or flagged as weak:{" "}
                  <strong>
                    {report.summary.abstention.outOfScopeDeclined} of {report.summary.abstention.outOfScopeTotal}
                  </strong>
                  .
                </p>
                <p className="mt-2 text-[0.98rem]">
                  Legitimate queries answered with confidence:{" "}
                  <strong>
                    {report.summary.abstention.inScopeAnswered} of {report.summary.abstention.inScopeTotal}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <h3 className="eyebrow mt-12 border-b border-ink pb-2 text-ink">Query by query</h3>
            <div className="divide-y divide-ink/20">
              {report.queries.map((item) => {
                const graded = Object.keys(item.grades).length > 0;
                return (
                  <details key={item.id} className="group py-3">
                    <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <span>
                        <span className="eyebrow mr-3 text-ink-soft">{TYPE_LABELS[item.type] ?? item.type}</span>
                        <span className="display-italic text-[1.2rem]">“{item.query}”</span>
                      </span>
                      <span className="eyebrow text-ink-soft">
                        {confidenceLabel(item.confidence)} confidence
                        {graded ? ` · nDCG ${formatScore(item.metrics.lexical.ndcg5)} → ${formatScore(item.metrics.full.ndcg5)}` : ""}
                      </span>
                    </summary>
                    {item.message ? <p className="mt-3 border-l-2 border-vermilion pl-3 text-[0.92rem]">{item.message}</p> : null}
                    <div className="mt-3 grid gap-6 md:grid-cols-3">
                      {SYSTEMS.map((system) => (
                        <div key={system.key}>
                          <p className="eyebrow text-ink-soft">{system.label}</p>
                          {item.systems[system.key].length === 0 ? (
                            <p className="mt-1 text-[0.9rem] text-ink-soft">no results</p>
                          ) : (
                            <ol className="mt-1 space-y-1 text-[0.92rem]">
                              {item.systems[system.key].map((entry) => (
                                <li key={entry.id} className="flex items-baseline justify-between gap-3">
                                  <span>
                                    {entry.title} <span className="italic text-ink-soft">— {entry.author}</span>
                                  </span>
                                  {graded ? <span className="font-mono text-[0.8rem]">{item.grades[String(entry.id)] ?? 0}</span> : null}
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
