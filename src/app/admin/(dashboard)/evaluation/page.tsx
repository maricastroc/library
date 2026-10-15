import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { PageHead, SectionHead, Stamp } from "@/components/admin/Counter";
import { SearchComparison } from "@/components/admin/SearchComparison";
import { catalogChangesSince } from "@/lib/catalog/books";
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
    expects?: "abstain" | "limitation" | null;
    abstentionCorrect?: boolean;
    confidence: string;
    message: string | null;
    systems: Record<SystemName, Ranked[]>;
    grades: Record<string, number>;
    metrics: Record<SystemName, { ndcg5: number | null }>;
  }[];
};
type Query = Report["queries"][number];

const SYSTEMS: { key: SystemName; label: string; description: string }[] = [
  { key: "lexical", label: "Keywords", description: "FTS5/BM25 over title, author, genre, synopsis and note" },
  { key: "embedding", label: "Embeddings only", description: "closeness between the query and the synopsis" },
  { key: "full", label: "Shelf", description: "reads the request, then embeddings and reranking by attributes" },
];

const TYPES: Record<string, { label: string; gist: string }> = {
  emotional: { label: "Emotional", gist: "a mood or a feeling to find" },
  abstract: { label: "Abstract", gist: "an image or a sensation, not a subject" },
  author: { label: "Author", gist: "a writer or a book as the reference" },
  negative: { label: "With a “but”", gist: "something wanted and something to avoid" },
  ambiguous: { label: "Loose", gist: "one or two open words" },
  "no-match": { label: "Not a bookshop request", gist: "outside what the shop sells" },
  unanswerable: { label: "A judgement", gist: "asks for an opinion the catalogue cannot hold" },
};

const LEVEL = 0.05;
const formatScore = (value: number | null) => (value === null ? "—" : value.toFixed(2));
const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(2)}`;
const score = (query: Query, system: SystemName) => query.metrics[system].ndcg5 ?? 0;

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

function duel(queries: Query[], against: SystemName) {
  const marks = queries.map((query) => {
    const difference = score(query, "full") - score(query, against);
    return difference >= LEVEL ? "better" : difference <= -LEVEL ? "worse" : "level";
  });
  return {
    marks,
    better: marks.filter((mark) => mark === "better").length,
    level: marks.filter((mark) => mark === "level").length,
    worse: marks.filter((mark) => mark === "worse").length,
  };
}

function standing(result: { better: number; worse: number }): string {
  if (result.better - result.worse > 2 && result.better >= result.worse * 2) return "clearly ahead of";
  if (result.better - result.worse > 2) return "ahead of";
  if (result.worse - result.better > 2) return "behind";
  return "level with";
}

function Track({ values, label }: { values: Partial<Record<SystemName, number | null>>; label?: string }) {
  return (
    <span className="bench-track" aria-hidden title={label}>
      {SYSTEMS.map((system) => {
        const value = values[system.key];
        if (value === undefined || value === null) return null;
        return <span key={system.key} className="bench-dot" data-engine={system.key} style={{ "--at": value } as CSSProperties} />;
      })}
    </span>
  );
}

function Grade({ value }: { value: number }) {
  return (
    <span className="bench-grade" data-grade={value} aria-label={`graded ${value} of 2`}>
      <span />
      <span />
    </span>
  );
}

export default function EvaluationPage() {
  const report = loadReport();

  if (report === null) {
    return (
      <div className="counter-page">
        <PageHead
          folio="06 · the search bench"
          title={
            <>
              Does the shelf <em>find better</em>?
            </>
          }
          lede={<p>Try any query on the engines below. The fixed evaluation set has not been run on this computer yet.</p>}
        />
        <div className="blank">
          <p className="blank-line">No evaluation saved yet.</p>
          <p className="blank-hint">
            Run <code className="bench-code">npm run ai:eval -- --judge</code> in the terminal. It puts the same questions to the three engines and has a local model grade the answers.
          </p>
        </div>
        <TrySection />
      </div>
    );
  }

  const { summary } = report;
  const judge = summary.models.judge;
  const graded = report.queries.filter((query) => query.expects !== "abstain");
  const declined = report.queries.filter((query) => query.expects === "abstain");
  const versusKeywords = duel(graded, "lexical");
  const versusEmbeddings = duel(graded, "embedding");
  const changes = catalogChangesSince(summary.generatedAt);
  const run = new Date(summary.generatedAt);
  const runLabel = Number.isNaN(run.getTime())
    ? summary.generatedAt
    : `${run.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
  const typeOrder = [...new Set(report.queries.map((query) => query.type))];
  const perType = Object.keys(summary.byType).map((type) => graded.filter((query) => query.type === type).length).filter((count) => count > 0);
  const smallest = Math.min(...perType);
  const largest = Math.max(...perType);

  return (
    <div className="counter-page counter-page-wide">
      <PageHead
        folio="06 · the search bench"
        title={
          <>
            Does the shelf <em>find better</em>?
          </>
        }
        lede={
          <p>
            The same {report.queries.length} questions put to three engines, the answers graded one by one. It shows where reading the synopsis helps a reader, and where it gets in
            the way.
          </p>
        }
        actions={
          <a href="#bench-try" className="button button-outline">
            Try a query ↓
          </a>
        }
      />

      <aside className="bench-method" aria-labelledby="method-heading">
        <h2 id="method-heading" className="eyebrow bench-method-title">
          How to read these numbers
        </h2>
        {judge ? (
          <p>
            {graded.length} queries were graded 0, 1 or 2 by <span className="bench-model">{judge}</span>, another local model reading only title, author, genre and synopsis.
            It is an automatic judge, not a reader: take the numbers as a hint and read the lists. Each engine is scored on its first five books; 1.00 means the best order of
            the books any of the three engines found, not of the whole catalogue. An engine that returns nothing scores 0.
          </p>
        ) : (
          <p>This run had no relevance judge, so there are no grades: only the lists side by side.</p>
        )}
        <p className="eyebrow bench-method-run">
          run of {runLabel} · embeddings {summary.models.embeddings} · reading {summary.models.classifier}
          {judge ? ` · judge ${judge}` : ""}
        </p>
        {changes.added + changes.edited > 0 ? (
          <p className="slip bench-stale">
            The catalogue has changed since this run: {changes.added} {changes.added === 1 ? "book" : "books"} added and {changes.edited} edited. These numbers describe the
            shelf as it was then, and some titles below have since been renamed. To refresh, run <code className="bench-code">npm run ai:eval -- --judge</code>.
          </p>
        ) : null}
      </aside>

      {judge ? (
        <>
          <section aria-labelledby="engines-heading" className="counter-section">
            <SectionHead id="engines-heading" title={<>Three engines, <em>the same questions</em></>} aside={`${graded.length} graded queries`} />
            <table className="bench-engines">
              <thead>
                <tr>
                  <th scope="col">Engine</th>
                  <th scope="col" className="bench-col-score">
                    nDCG@5 <span className="bench-col-note">order of the first five</span>
                  </th>
                  <th scope="col" className="bench-col-scale hide-narrow">
                    <span className="bench-scale" aria-hidden>
                      <span>0</span>
                      <span>0.5</span>
                      <span>1</span>
                    </span>
                  </th>
                  <th scope="col" className="numeric">
                    P@5 <span className="bench-col-note">fit among five</span>
                  </th>
                  <th scope="col" className="numeric hide-narrow">
                    No results
                  </th>
                </tr>
              </thead>
              <tbody>
                {SYSTEMS.map((system) => {
                  const row = summary.overall[system.key];
                  return (
                    <tr key={system.key} data-engine={system.key}>
                      <th scope="row">
                        <span className="bench-engine">
                          <span aria-hidden className="bench-dot bench-dot-key" data-engine={system.key} />
                          {system.label}
                        </span>
                        <span className="bench-engine-note">{system.description}</span>
                      </th>
                      <td className="bench-score">{formatScore(row.ndcg5)}</td>
                      <td className="hide-narrow">
                        <Track values={{ [system.key]: row.ndcg5 }} />
                      </td>
                      <td className="numeric bench-p5">{formatScore(row.p5)}</td>
                      <td className="numeric hide-narrow">{row.emptyQueries}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="bench-duels">
              <p className="bench-verdict">
                Query by query, the shelf is <em>{standing(versusKeywords)} keywords</em> and <em>{standing(versusEmbeddings)} embeddings alone</em>.
              </p>
              {[
                { label: "against keywords", result: versusKeywords },
                { label: "against embeddings only", result: versusEmbeddings },
              ].map(({ label, result }) => (
                <div key={label} className="bench-duel">
                  <p className="bench-duel-label">
                    Shelf {label}
                    <span className="bench-duel-count">
                      better on {result.better} · level on {result.level} · worse on {result.worse}
                    </span>
                  </p>
                  <span className="bench-tally" aria-hidden>
                    {[...result.marks].sort((a, b) => ["better", "level", "worse"].indexOf(a) - ["better", "level", "worse"].indexOf(b)).map((mark, index) => (
                      <span key={index} data-mark={mark} />
                    ))}
                  </span>
                </div>
              ))}
              <p className="counter-field-hint">Each square is one graded query, by nDCG@5. Differences under {LEVEL.toFixed(2)} count as level.</p>
            </div>
          </section>

          <section aria-labelledby="types-heading" className="counter-section">
            <SectionHead id="types-heading" title={<>By kind of <em>question</em></>} aside="mean nDCG@5" />
            <div className="bench-legend" aria-hidden>
              {SYSTEMS.map((system) => (
                <span key={system.key}>
                  <span className="bench-dot bench-dot-key" data-engine={system.key} />
                  {system.label}
                </span>
              ))}
            </div>
            <ul className="bench-types">
              {Object.entries(summary.byType).map(([type, row]) => {
                const count = graded.filter((query) => query.type === type).length;
                const shelf = row.full ?? 0;
                const rivals = SYSTEMS.filter((system) => system.key !== "full").map((system) => ({ ...system, value: row[system.key] ?? 0 }));
                const ahead = rivals.find((rival) => rival.value - shelf >= LEVEL && rival.value === Math.max(...rivals.map((other) => other.value)));
                const leads = rivals.every((rival) => shelf - rival.value >= LEVEL);
                return (
                  <li key={type} className="bench-type" data-behind={ahead ? "" : undefined}>
                    <p className="bench-type-name">
                      {TYPES[type]?.label ?? type}
                      <span className="bench-type-gist">
                        {TYPES[type]?.gist ?? ""} · {count} {count === 1 ? "query" : "queries"}
                      </span>
                    </p>
                    <Track values={row} label={SYSTEMS.map((system) => `${system.label} ${formatScore(row[system.key])}`).join(", ")} />
                    <p className="bench-type-values">
                      {SYSTEMS.map((system) => (
                        <span key={system.key} data-engine={system.key}>
                          <span className="sr-only">{system.label} </span>
                          {formatScore(row[system.key])}
                        </span>
                      ))}
                    </p>
                    <p className="bench-type-remark">
                      {ahead ? (
                        <Stamp tone="vermilion">shelf behind {ahead.label.toLowerCase()}</Stamp>
                      ) : leads ? (
                        <Stamp tone="ink">shelf leads</Stamp>
                      ) : (
                        <Stamp tone="faint">no clear lead</Stamp>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="counter-field-hint bench-types-foot">
              With {smallest === largest ? smallest : `${smallest}–${largest}`} queries per kind, a single query moves a mean by up to {(1 / smallest).toFixed(2)}. Read a gap as a
              lead to follow up, not as a measurement.
            </p>
          </section>
        </>
      ) : null}

      <section aria-labelledby="restraint-heading" className="counter-section">
        <SectionHead id="restraint-heading" title={<>Knowing when <em>not to answer</em></>} aside="shelf only" />
        <div className="bench-restraint">
          {[
            { label: "Out of scope, declined or flagged as weak", done: summary.abstention.outOfScopeDeclined, total: summary.abstention.outOfScopeTotal },
            { label: "In scope, answered with confidence", done: summary.abstention.inScopeAnswered, total: summary.abstention.inScopeTotal },
          ].map((row) => (
            <div key={row.label} className="bench-restraint-row">
              <p className="bench-restraint-figure">
                {row.done}
                <span> of {row.total}</span>
              </p>
              <p className="bench-restraint-label">{row.label}</p>
              <span className="bench-pips" aria-hidden>
                {Array.from({ length: row.total }, (_, index) => (
                  <span key={index} data-on={index < row.done ? "" : undefined} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="queries-heading" className="counter-section">
        <SectionHead id="queries-heading" title={<>Query <em>by query</em></>} aside="open one to see the three lists" />
        {judge ? (
          <p className="bench-queries-head hide-narrow" aria-hidden>
            <span>The reader’s request</span>
            <span>Shelf’s confidence</span>
            <span>nDCG@5, 0 to 1</span>
            <span>Shelf − keywords</span>
          </p>
        ) : null}
        {typeOrder.map((type) => {
          const items = report.queries.filter((query) => query.type === type);
          return (
            <div key={type} className="bench-group">
              <h3 className="eyebrow bench-group-title">
                {TYPES[type]?.label ?? type}
                <span>{TYPES[type]?.gist}</span>
              </h3>
              <ul className="bench-queries">
                {items.map((query) => {
                  const isGraded = Object.keys(query.grades).length > 0;
                  const gain = score(query, "full") - score(query, "lexical");
                  return (
                    <li key={query.id}>
                      <details className="bench-query">
                        <summary>
                          <span className="bench-query-text">{query.query}</span>
                          <span className="bench-query-confidence">{query.confidence === "none" ? "declined" : `${confidenceLabel(query.confidence)} confidence`}</span>
                          {isGraded ? (
                            <>
                              <Track values={{ lexical: score(query, "lexical"), embedding: score(query, "embedding"), full: score(query, "full") }} />
                              <span className="bench-query-gain" data-sign={gain >= LEVEL ? "up" : gain <= -LEVEL ? "down" : "level"}>
                                <span className="sr-only">shelf against keywords </span>
                                {signed(gain)}
                              </span>
                            </>
                          ) : (
                            <span className="bench-query-ungraded">{query.expects === "abstain" ? (query.abstentionCorrect ? "the right call" : "should have declined") : "not graded"}</span>
                          )}
                        </summary>
                        <div className="bench-query-body">
                          {query.message ? <p className="slip bench-query-message">{query.message}</p> : null}
                          {query.expects === "limitation" ? (
                            <p className="counter-field-hint">
                              Here the shelf is expected to say what it cannot do{query.abstentionCorrect ? ", and it did" : ", and it did not"}. Returning nothing still scores 0 for the shelf.
                            </p>
                          ) : null}
                          <div className="bench-lists">
                            {SYSTEMS.map((system) => (
                              <div key={system.key}>
                                <p className="eyebrow bench-list-title">
                                  <span aria-hidden className="bench-dot bench-dot-key" data-engine={system.key} />
                                  {system.label}
                                  {isGraded ? <span className="bench-list-score">{formatScore(query.metrics[system.key].ndcg5)}</span> : null}
                                </p>
                                {query.systems[system.key].length === 0 ? (
                                  <p className="bench-list-none">no results</p>
                                ) : (
                                  <ol className="bench-list">
                                    {query.systems[system.key].map((entry) => (
                                      <li key={entry.id}>
                                        <span className="min-w-0">
                                          <span className="bench-list-book">{entry.title}</span>
                                          <span className="bench-list-author">{entry.author}</span>
                                        </span>
                                        {isGraded ? <Grade value={query.grades[String(entry.id)] ?? 0} /> : null}
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {declined.length > 0 && judge ? <p className="counter-field-hint">Out-of-scope queries are not graded: what matters there is whether the shelf declines.</p> : null}
      </section>

      <TrySection />
    </div>
  );
}

function TrySection() {
  return (
    <section id="bench-try" aria-labelledby="try-heading" className="counter-section bench-try">
      <SectionHead id="try-heading" title={<>Try a query <em>on the bench</em></>} aside="live, on this computer" />
      <SearchComparison />
    </section>
  );
}
