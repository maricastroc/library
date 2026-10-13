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
    setState({ status: "loading", result: null, message: null });
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

  return (
    <div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="compare-query" className="eyebrow text-ink-soft">
            Try a query on both engines
          </label>
          <input id="compare-query" className="field display-italic text-[1.4rem]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="a book to read on a sleepless night" autoComplete="off" />
        </div>
        <button type="submit" className="button" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Comparing…" : "Compare"}
        </button>
      </form>
      <div aria-live="polite">
        {state.message ? (
          <p role="alert" className="mt-3 text-vermilion">
            {state.message}
          </p>
        ) : null}
        {result ? (
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <section aria-label="Keyword search">
              <h3 className="eyebrow border-b border-ink pb-2 text-ink">Keyword search · FTS5/BM25</h3>
              {result.lexical.length === 0 ? (
                <p className="py-4 text-ink-soft">No book contains those words.</p>
              ) : (
                <ol className="divide-y divide-ink/15">
                  {result.lexical.map((item, index) => (
                    <li key={item.id} className="flex gap-3 py-2">
                      <span className="eyebrow w-5 pt-1 text-ink-soft">{index + 1}</span>
                      <span>
                        <span className="font-label font-semibold">{item.title}</span>
                        <span className="block text-[0.88rem] italic text-ink-soft">{item.author}</span>
                        {semanticIds.has(item.id) ? null : <span className="eyebrow text-[8.5px] text-ink-soft">only shows up here</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section aria-label="Semantic search">
              <h3 className="eyebrow border-b border-ink pb-2 text-ink">
                Semantic search{result.semantic ? ` · ${confidenceLabel(result.semantic.confidence)} confidence · ${result.semantic.tookMs} ms` : ""}
              </h3>
              {result.semantic === null ? (
                <p className="py-4 text-vermilion">{result.error ?? "AI unavailable."}</p>
              ) : (
                <>
                  {result.semantic.interpretation.atmospheres.length + result.semantic.interpretation.inferredAtmospheres.length + result.semantic.interpretation.avoidAtmospheres.length > 0 ? (
                    <p className="pt-2 text-[0.88rem] text-ink-soft">
                      Reading of the request:{" "}
                      {[...result.semantic.interpretation.atmospheres, ...result.semantic.interpretation.inferredAtmospheres].map(atmosphereLabel).join(", ") || "—"}
                      {result.semantic.interpretation.avoidAtmospheres.length > 0
                        ? `; avoids ${result.semantic.interpretation.avoidAtmospheres.map(atmosphereLabel).join(", ")}`
                        : ""}
                    </p>
                  ) : null}
                  {result.semantic.message ? <p className="mt-2 border-l-2 border-vermilion pl-3 text-[0.92rem]">{result.semantic.message}</p> : null}
                  <ol className="divide-y divide-ink/15">
                    {result.semantic.results.map((item, index) => (
                      <li key={item.id} className="flex gap-3 py-2">
                        <span className="eyebrow w-5 pt-1 text-ink-soft">{index + 1}</span>
                        <span>
                          <span className="font-label font-semibold">{item.title}</span>
                          <span className="block text-[0.88rem] italic text-ink-soft">{item.author}</span>
                          <span className="block text-[0.82rem] text-ink-soft">{item.reasons?.slice(0, 2).join(" · ")}</span>
                          {lexicalIds.has(item.id) ? null : <span className="eyebrow text-[8.5px] text-vermilion">keyword search doesn’t find it</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
