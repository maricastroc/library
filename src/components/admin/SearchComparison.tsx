"use client";

import { useState, type FormEvent } from "react";
import { atmosphereLabel, confidenceLabel } from "@/lib/semantic/taxonomy";
import type { Interpretation } from "@/lib/search/types";

type Item = { id: number; slug: string; title: string; author: string; reasons?: string[] };
type Result = {
  query: string;
  lexical: Item[];
  semantic: { confidence: string; message: string | null; interpretation: Interpretation; tookMs: number; results: Item[] } | null;
  error?: string;
};

export function SearchComparison() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; result: Result | null; message: string | null }>({
    status: "idle",
    result: null,
    message: null,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setState({ status: "loading", result: state.result, message: null });
    try {
      const response = await fetch(`/api/admin/compare?n=8&q=${encodeURIComponent(query.trim())}`);
      const data = (await response.json()) as Result & { error?: string };
      if (!response.ok) {
        setState({ status: "error", result: null, message: data.error ?? "Comparison failed." });
        return;
      }
      setState({ status: "done", result: data, message: null });
    } catch {
      setState({ status: "error", result: null, message: "Connection failed." });
    }
  };

  const result = state.result;
  const lexicalIds = new Set(result?.lexical.map((item) => item.id));
  const semanticIds = new Set(result?.semantic?.results.map((item) => item.id));
  const reading = result?.semantic
    ? [...result.semantic.interpretation.atmospheres, ...result.semantic.interpretation.inferredAtmospheres].map(atmosphereLabel)
    : [];
  const avoids = result?.semantic ? result.semantic.interpretation.avoidAtmospheres.map(atmosphereLabel) : [];

  return (
    <div className="bench-live">
      <form onSubmit={submit} className="bench-ask">
        <label htmlFor="compare-query" className="eyebrow counter-field-label">
          A reader’s request, in their words
        </label>
        <div className="bench-ask-row">
          <input
            id="compare-query"
            className="field bench-ask-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="a book to read on a sleepless night"
            autoComplete="off"
          />
          <button type="submit" className="button" disabled={state.status === "loading" || query.trim().length < 2}>
            {state.status === "loading" ? "Comparing…" : "Compare"}
          </button>
        </div>
      </form>
      <div aria-live="polite" aria-busy={state.status === "loading"}>
        {state.message ? (
          <p role="alert" className="slip slip-enter" data-tone="error">
            {state.message}
          </p>
        ) : null}
        {result ? (
          <div className="bench-columns" data-loading={state.status === "loading" ? "" : undefined}>
            <section aria-labelledby="live-keywords" className="bench-column">
              <h3 id="live-keywords" className="eyebrow bench-column-title">
                <span aria-hidden className="bench-dot bench-dot-key" data-engine="lexical" />
                Keywords <span className="bench-column-note">FTS5 / BM25</span>
              </h3>
              {result.lexical.length === 0 ? (
                <p className="bench-list-none">No book contains those words.</p>
              ) : (
                <ol className="bench-hits">
                  {result.lexical.map((item, index) => (
                    <li key={item.id} className="bench-hit">
                      <span className="bench-hit-rank">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="bench-list-book">{item.title}</span>
                        <span className="bench-list-author">{item.author}</span>
                        {semanticIds.has(item.id) ? null : <span className="bench-hit-only">only here</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section aria-labelledby="live-shelf" className="bench-column">
              <h3 id="live-shelf" className="eyebrow bench-column-title">
                <span aria-hidden className="bench-dot bench-dot-key" data-engine="full" />
                Shelf
                {result.semantic ? (
                  <span className="bench-column-note">
                    {confidenceLabel(result.semantic.confidence)} confidence · {result.semantic.tookMs} ms
                  </span>
                ) : null}
              </h3>
              {result.semantic === null ? (
                <p className="slip" data-tone="error">
                  {result.error ?? "The local AI is not answering."}
                </p>
              ) : (
                <>
                  {reading.length + avoids.length > 0 ? (
                    <p className="bench-reading">
                      Read as <em>{reading.join(", ") || "—"}</em>
                      {avoids.length > 0 ? (
                        <>
                          {" "}
                          · avoiding <em>{avoids.join(", ")}</em>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {result.semantic.message ? <p className="slip">{result.semantic.message}</p> : null}
                  {result.semantic.results.length === 0 ? null : (
                    <ol className="bench-hits">
                      {result.semantic.results.map((item, index) => (
                        <li key={item.id} className="bench-hit">
                          <span className="bench-hit-rank">{index + 1}</span>
                          <span className="min-w-0">
                            <span className="bench-list-book">{item.title}</span>
                            <span className="bench-list-author">{item.author}</span>
                            {item.reasons && item.reasons.length > 0 ? <span className="bench-hit-reason">{item.reasons.slice(0, 2).join(" · ")}</span> : null}
                            {lexicalIds.has(item.id) ? null : <span className="bench-hit-only" data-tone="shelf">keywords miss it</span>}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </section>
          </div>
        ) : state.status === "loading" ? (
          <p className="bench-waiting">Asking both engines…</p>
        ) : null}
      </div>
    </div>
  );
}
