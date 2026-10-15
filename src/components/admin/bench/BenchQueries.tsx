"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { KINDS, LEVEL, RIVALS, SYSTEMS, filterHash, formatScore, isGraded, outcome, score, signed, type BenchFilter, type BenchQuery, type BenchShow, type Outcome } from "@/lib/search/bench";
import { confidenceLabel } from "@/lib/semantic/taxonomy";
import { EngineKey, Grade, Track } from "./BenchParts";

const SHOWS: { key: BenchShow; label: string }[] = [
  { key: "all", label: "all" },
  { key: "better", label: "shelf better" },
  { key: "level", label: "level" },
  { key: "worse", label: "shelf worse" },
  { key: "ungraded", label: "not graded" },
];

function parse(hash: string): BenchFilter {
  const [head, show, against, kind] = hash.replace(/^#/, "").split("/");
  if (head !== "queries") return { show: "all", against: "embedding", kind: null };
  return {
    show: SHOWS.some((item) => item.key === show) ? (show as BenchShow) : "all",
    against: RIVALS.some((item) => item.key === against) ? (against as BenchFilter["against"]) : "embedding",
    kind: kind && KINDS[kind] ? kind : null,
  };
}

const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};

function Facet<T extends string>({ legend, options, value, counts, onChange }: { legend: string; options: { key: T; label: string }[]; value: T; counts?: Map<T, number>; onChange: (key: T) => void }) {
  return (
    <div role="group" aria-label={legend} className="facet">
      <span className="eyebrow facet-legend">{legend}</span>
      {options.map((option) => (
        <button key={option.key} type="button" className="facet-option" aria-pressed={value === option.key} onClick={() => onChange(option.key)}>
          {option.label}
          {counts ? <span className="facet-option-count">{counts.get(option.key) ?? 0}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function BenchQueries({ queries, judged }: { queries: BenchQuery[]; judged: boolean }) {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  const filter = parse(hash);
  const { show, against, kind } = filter;
  const rival = RIVALS.find((item) => item.key === against)!;

  useEffect(() => {
    const reveal = () => {
      if (window.location.hash.startsWith("#queries/")) document.getElementById("queries")?.scrollIntoView({ block: "start" });
    };
    const onHash = (event: HashChangeEvent) => {
      if (event.isTrusted) reveal();
    };
    reveal();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const change = (next: Partial<BenchFilter>) => {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${filterHash({ ...filter, ...next })}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const inKind = useMemo(() => queries.filter((query) => !kind || query.type === kind), [queries, kind]);
  const counts = useMemo(() => {
    const graded = inKind.filter(isGraded);
    const map = new Map<BenchShow, number>([
      ["all", inKind.length],
      ["ungraded", inKind.length - graded.length],
    ]);
    for (const mark of ["better", "level", "worse"] as Outcome[]) map.set(mark, graded.filter((query) => outcome(query, against) === mark).length);
    return map;
  }, [inKind, against]);
  const visible = inKind.filter((query) => (show === "all" ? true : show === "ungraded" ? !isGraded(query) : isGraded(query) && outcome(query, against) === show));
  const kinds = [...new Set(queries.map((query) => query.type))];

  return (
    <div className="bench-explore">
      {judged ? (
        <div className="facets bench-facets">
          <Facet legend="Shelf against" options={RIVALS.map((item) => ({ key: item.key, label: item.label }))} value={against} onChange={(key) => change({ against: key })} />
          <Facet legend="Show" options={SHOWS} value={show} counts={counts} onChange={(key) => change({ show: key })} />
        </div>
      ) : null}
      <p className="bench-explore-status" aria-live="polite">
        {visible.length === queries.length ? `${queries.length} queries` : `${visible.length} of ${queries.length} queries`}
        {kind ? (
          <>
            {" "}
            · only {KINDS[kind]?.label.toLowerCase() ?? kind} requests{" "}
            <button type="button" className="bench-explore-clear" onClick={() => change({ kind: null })}>
              show every kind
            </button>
          </>
        ) : null}
      </p>

      {judged && visible.length > 0 ? (
        <p className="bench-queries-head" aria-hidden>
          <span>The reader’s request</span>
          <span>Shelf’s confidence</span>
          <span>nDCG@5, 0 to 1</span>
          <span>Shelf − {rival.short}</span>
        </p>
      ) : null}

      {visible.length === 0 ? <p className="bench-explore-none">No query here{show === "worse" ? ": the shelf is never worse in this group." : "."}</p> : null}

      {kinds.map((type) => {
        const items = visible.filter((query) => query.type === type);
        if (items.length === 0) return null;
        return (
          <div key={type} className="bench-group">
            <h3 className="eyebrow bench-group-title">
              {KINDS[type]?.label ?? type}
              <span>{KINDS[type]?.gist}</span>
            </h3>
            <ul className="bench-queries">
              {items.map((query) => {
                const graded = Object.keys(query.grades).length > 0;
                const gain = score(query, "full") - score(query, against);
                return (
                  <li key={query.id}>
                    <details className="bench-query">
                      <summary>
                        <span className="bench-query-text">{query.query}</span>
                        <span className="bench-query-confidence">{query.confidence === "none" ? "declined" : `${confidenceLabel(query.confidence)} confidence`}</span>
                        {graded ? (
                          <>
                            <Track values={{ lexical: score(query, "lexical"), embedding: score(query, "embedding"), full: score(query, "full") }} against={against} />
                            <span className="bench-query-gain" data-sign={gain >= LEVEL ? "up" : gain <= -LEVEL ? "down" : "level"}>
                              <span className="sr-only">
                                shelf {outcome(query, against) === "level" ? "level with" : `${outcome(query, against)} than`} {rival.label},{" "}
                              </span>
                              <span aria-hidden className="bench-query-mark" data-mark={outcome(query, against)} />
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
                                <EngineKey engine={system.key} />
                                {system.label}
                                {graded ? <span className="bench-list-score">{formatScore(query.metrics[system.key].ndcg5)}</span> : null}
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
                                      {graded ? <Grade value={query.grades[String(entry.id)] ?? 0} /> : null}
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
    </div>
  );
}
