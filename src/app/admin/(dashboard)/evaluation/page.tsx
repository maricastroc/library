import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { PageHead, SectionHead, Stamp } from "@/components/admin/Counter";
import { SearchComparison } from "@/components/admin/SearchComparison";
import { EngineKey, Tally, Track } from "@/components/admin/bench/BenchParts";
import { BenchQueries } from "@/components/admin/bench/BenchQueries";
import { catalogChangesSince } from "@/lib/catalog/books";
import { KINDS, LEVEL, SYSTEMS, duel, filterHash, formatScore, isGraded, kindStanding, kindsPhrase, signed, standing, type BenchReport, type Rival } from "@/lib/search/bench";

export const metadata: Metadata = { title: "Search evaluation" };

const ALONE: Record<Rival, string> = { lexical: "keywords", embedding: "embeddings alone" };

function loadReport(): BenchReport | null {
  const file = join(process.cwd(), "data", "eval", "results.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<BenchReport>;
    return parsed.summary && parsed.queries ? (parsed as BenchReport) : null;
  } catch {
    return null;
  }
}

function Head({ count }: { count?: number }) {
  return (
    <PageHead
      folio="07 · the search bench"
      title={
        <>
          Does the shelf <em>find better</em>?
        </>
      }
      lede={
        count ? (
          <p>The same {count} requests put to three engines, and every answer graded.</p>
        ) : (
          <p>Try any query on the engines below. The fixed evaluation set has not been run on this computer yet.</p>
        )
      }
      actions={
        count ? (
          <a href="#bench-try" className="button button-outline">
            Try a query ↓
          </a>
        ) : null
      }
    />
  );
}

export default function EvaluationPage() {
  const report = loadReport();

  if (report === null) {
    return (
      <div className="counter-page">
        <Head />
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
  const graded = report.queries.filter(isGraded);
  const declined = report.queries.length - graded.length;
  const versusKeywords = duel(graded, "lexical");
  const versusEmbeddings = duel(graded, "embedding");
  const changes = catalogChangesSince(summary.generatedAt);
  const run = new Date(summary.generatedAt);
  const runLabel = Number.isNaN(run.getTime())
    ? summary.generatedAt
    : `${run.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
  const kindCount = new Set(report.queries.map((query) => query.type)).size;

  const swing = graded.length > 0 ? 1 / graded.length : 0;
  const closeGap = Math.abs((summary.overall.full.ndcg5 ?? 0) - (summary.overall.embedding.ndcg5 ?? 0));

  const kinds = Object.entries(summary.byType).map(([type, row]) => {
    const queries = graded.filter((query) => query.type === type);
    return { type, row, count: queries.length, ...kindStanding(row), tally: duel(queries, "embedding") };
  });
  const perKind = kinds.map((kind) => kind.count).filter((count) => count > 0);
  const smallest = Math.min(...perKind);
  const largest = Math.max(...perKind);
  const leading = kinds.filter((kind) => kind.leads).map((kind) => kind.type);
  const trailing = (["embedding", "lexical"] as Rival[])
    .map((rival) => ({ rival, types: kinds.filter((kind) => kind.behind === rival).map((kind) => kind.type) }))
    .filter((group) => group.types.length > 0);
  const close = kinds.filter((kind) => !kind.leads && !kind.behind).map((kind) => kind.type);

  return (
    <div className="counter-page counter-page-wide">
      <Head count={report.queries.length} />

      {changes.added + changes.edited > 0 ? (
        <p className="slip bench-stale">
          <strong>Run of {runLabel}.</strong> The catalogue has changed since: {changes.added} {changes.added === 1 ? "book" : "books"} added and {changes.edited} edited, so these
          numbers describe the shelf as it was then and some titles below have been renamed. To refresh, run <code className="bench-code">npm run ai:eval -- --judge</code>.
        </p>
      ) : null}

      {judge ? (
        <section aria-labelledby="summary-heading" className="bench-summary">
          <h2 id="summary-heading" className="sr-only">
            The result
          </h2>
          <p className="bench-verdict">
            The shelf is <em>{standing(versusKeywords)} keywords</em> and <em>{standing(versusEmbeddings)} embeddings alone</em>.
          </p>

          <table className="bench-engines">
            <caption className="sr-only">Mean scores of the three engines over {graded.length} graded queries</caption>
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
                        <EngineKey engine={system.key} />
                        {system.label}
                      </span>
                      <span className="bench-engine-note">{system.gist}</span>
                    </th>
                    <td className="bench-score">{formatScore(row.ndcg5)}</td>
                    <td className="hide-narrow">
                      <Track values={{ [system.key]: row.ndcg5 }} />
                    </td>
                    <td className="numeric bench-p5">{formatScore(row.p5)}</td>
                    <td className="numeric bench-empty hide-narrow">{row.emptyQueries}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="bench-duels">
            {[
              { rival: "lexical" as Rival, label: "keywords", result: versusKeywords },
              { rival: "embedding" as Rival, label: "embeddings only", result: versusEmbeddings },
            ].map(({ rival, label, result }) => (
              <div key={rival} className="bench-duel">
                <p className="bench-duel-label">
                  Shelf against {label}
                  <span className="bench-duel-count">
                    <a href={filterHash({ show: "better", against: rival })}>better on {result.better}</a> ·{" "}
                    <a href={filterHash({ show: "level", against: rival })}>level on {result.level}</a> ·{" "}
                    <a href={filterHash({ show: "worse", against: rival })} data-tone={result.worse > 0 ? "worse" : undefined}>
                      worse on {result.worse}
                    </a>
                  </span>
                </p>
                <Tally marks={result.marks} />
              </div>
            ))}
            <p className="bench-tally-key" aria-hidden>
              <span data-mark="better" /> better <span data-mark="level" /> level, within {LEVEL.toFixed(2)} <span data-mark="worse" /> worse · one square per graded query
            </p>
          </div>

          <p className="bench-caveat">
            Graded by <span className="bench-model">{judge}</span>, a local model, not a reader, over {graded.length} queries. One query can move a mean by up to {swing.toFixed(2)}
            {closeGap < swing ? <>, more than the {closeGap.toFixed(2)} between the shelf and embeddings alone: read those two as level</> : null}.
          </p>
        </section>
      ) : (
        <p className="slip bench-stale">This run had no relevance judge, so there are no grades: only the lists side by side.</p>
      )}

      <details className="bench-about">
        <summary>
          <span className="eyebrow">How these numbers were made</span>
          <span className="bench-about-gist">the questions, the judge, the two scores and their limits</span>
        </summary>
        <dl className="bench-about-list">
          <div>
            <dt>The questions</dt>
            <dd>
              {report.queries.length} requests in {kindCount} kinds. {graded.length} are graded; the other {declined} are outside what a bookshop can answer, and there only whether
              the shelf declines them is checked.
            </dd>
          </div>
          <div>
            <dt>The judge</dt>
            <dd>
              {judge ? (
                <>
                  The first five books of each engine, pooled, were graded 0, 1 or 2 by <span className="bench-model">{judge}</span>, another local model, which sees only each
                  book’s title, author, genre, pages, year and synopsis. It is an automatic judge: take the numbers as a hint and read the lists.
                </>
              ) : (
                "This run had no judge."
              )}
            </dd>
          </div>
          <div>
            <dt>nDCG@5</dt>
            <dd>How well an engine orders its first five books, from 0 to 1. 1.00 is the best order of the books any of the three engines found, not of the whole catalogue.</dd>
          </div>
          <div>
            <dt>P@5</dt>
            <dd>The share of the first five that the judge found fitting (graded 1 or 2). An engine that returns nothing scores 0 on both.</dd>
          </div>
          <div>
            <dt>Better, level, worse</dt>
            <dd>Compared query by query on nDCG@5. A difference under {LEVEL.toFixed(2)}, before rounding, counts as level, so two rows showing −0.05 can fall on either side.</dd>
          </div>
          <div>
            <dt>How far they go</dt>
            <dd>
              With {graded.length} graded queries, one query moves an overall mean by up to {swing.toFixed(2)}; with {smallest === largest ? smallest : `${smallest} to ${largest}`} per
              kind, a kind’s mean by up to {(1 / smallest).toFixed(2)}. There is no test of significance here.
            </dd>
          </div>
          <div>
            <dt>The engines</dt>
            <dd>
              <ul className="bench-about-engines">
                {SYSTEMS.map((system) => (
                  <li key={system.key}>
                    <EngineKey engine={system.key} /> <strong>{system.label}</strong>: {system.description}.
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>The run</dt>
            <dd className="bench-about-run">
              {runLabel} · embeddings {summary.models.embeddings} · reading {summary.models.classifier}
              {judge ? ` · judge ${judge}` : ""}
            </dd>
          </div>
        </dl>
      </details>

      {judge ? (
        <section aria-labelledby="types-heading" className="counter-section">
          <SectionHead id="types-heading" title={<>By kind of <em>question</em></>} aside="mean nDCG@5 · shelf against embeddings only" />
          <p className="bench-kinds-lead">
            {leading.length > 0 ? <>The shelf leads on {kindsPhrase(leading)}</> : <>The shelf leads on no kind of request</>}
            {trailing.map((group) => (
              <span key={group.rival}>
                {" "}
                and <em>falls behind {ALONE[group.rival]}</em> on {kindsPhrase(group.types)}
              </span>
            ))}
            .{close.length > 0 ? <> On {kindsPhrase(close)}, it stays within {LEVEL.toFixed(2)} of the better of the other two.</> : null}
          </p>
          <div className="bench-legend" aria-hidden>
            {SYSTEMS.map((system) => (
              <span key={system.key}>
                <EngineKey engine={system.key} />
                {system.label}
              </span>
            ))}
            <span>
              <span className="bench-legend-span" data-tone="ahead" />
              <span className="bench-legend-span" data-tone="behind" />
              gap between shelf and embeddings only
            </span>
          </div>
          <p className="bench-types-head" aria-hidden>
            <span>Kind</span>
            <span>0 to 1</span>
            <span className="bench-types-head-values">
              <span>Keyw.</span>
              <span>Emb.</span>
              <span>Shelf</span>
            </span>
            <span>Shelf − emb.</span>
            <span>Query by query</span>
          </p>
          <ul className="bench-types">
            {kinds.map(({ type, row, count, leads, behind, tally }) => {
              const gap = (row.full ?? 0) - (row.embedding ?? 0);
              return (
                <li key={type} className="bench-type" data-behind={behind ? "" : undefined}>
                  <div className="bench-type-name">
                    <p>
                      {KINDS[type]?.label ?? type}
                      <span className="bench-type-gist">
                        {KINDS[type]?.gist ?? ""} · {count} {count === 1 ? "query" : "queries"}
                      </span>
                    </p>
                    {behind ? <Stamp tone="vermilion">behind {ALONE[behind]}</Stamp> : leads ? <Stamp tone="ink">shelf leads</Stamp> : null}
                  </div>
                  <Track values={row} against="embedding" label={SYSTEMS.map((system) => `${system.label} ${formatScore(row[system.key])}`).join(", ")} />
                  <p className="bench-type-values">
                    {SYSTEMS.map((system) => (
                      <span key={system.key} data-engine={system.key}>
                        <EngineKey engine={system.key} />
                        <span className="sr-only">{system.label} </span>
                        {formatScore(row[system.key])}
                      </span>
                    ))}
                  </p>
                  <p className="bench-type-gap" data-sign={gap >= LEVEL ? "up" : gap <= -LEVEL ? "down" : "level"}>
                    <span className="sr-only">shelf against embeddings only </span>
                    <span aria-hidden className="bench-type-gap-label">
                      shelf − emb.{" "}
                    </span>
                    {signed(gap)}
                  </p>
                  <a className="bench-type-tally" href={filterHash({ against: "embedding", kind: type })}>
                    <Tally marks={tally.marks} size="small" />
                    <span>
                      {tally.better} better · {tally.level} level · {tally.worse} worse
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="counter-field-hint bench-types-foot">
            {smallest === largest ? smallest : `${smallest} to ${largest}`} queries per kind: one query moves a kind’s mean by up to {(1 / smallest).toFixed(2)}. Read a gap as a lead
            to follow up, not as a measurement.
          </p>
        </section>
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

      <section id="queries" aria-labelledby="queries-heading" className="counter-section bench-explore-section">
        <SectionHead id="queries-heading" title={<>Query <em>by query</em></>} aside="open one to see the three lists" />
        <BenchQueries queries={report.queries} judged={Boolean(judge)} />
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
