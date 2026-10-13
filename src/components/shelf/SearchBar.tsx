"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Interpretation, SearchResponse } from "@/lib/search/types";
import { atmosphereLabel } from "@/lib/semantic/taxonomy";

export type SearchState =
  | { status: "idle" }
  | { status: "loading"; query: string; response: SearchResponse | null }
  | { status: "done"; query: string; response: SearchResponse }
  | { status: "error"; query: string; message: string };

export const EXAMPLES = [
  "something melancholic, but comforting",
  "a book about loneliness, but not a depressing one",
  "something that feels like a rainy afternoon",
  "for those who liked Clarice Lispector",
  "a short story that keeps me thinking for days",
  "a delicate novel, but not a predictable one",
];

function join(items: string[], conjunction = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

function Entry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="eyebrow text-ink-soft">{label}</span>
      <span className="italic">{children}</span>
    </span>
  );
}

function Reading({ interpretation }: { interpretation: Interpretation }) {
  const entries: ReactNode[] = [];
  const { reference } = interpretation;
  if (reference?.inCatalog && reference.similar) {
    entries.push(
      <Entry key="ref" label="starting point">
        {reference.kind === "author" ? `the books by ${reference.label} on the shelf` : reference.label}
      </Entry>,
    );
  } else if (reference?.inCatalog) {
    entries.push(
      <Entry key="ref" label={reference.kind === "author" ? "author" : "book"}>
        {reference.label}
      </Entry>,
    );
  }
  if (interpretation.atmospheres.length > 0) {
    entries.push(
      <Entry key="atm" label="atmosphere">
        {join(interpretation.atmospheres.map(atmosphereLabel))}
      </Entry>,
    );
  }
  if (interpretation.inferredAtmospheres.length > 0) {
    entries.push(
      <Entry key="inf" label={interpretation.atmospheres.length > 0 ? "it also sounded" : "it sounded"}>
        {join(interpretation.inferredAtmospheres.map(atmosphereLabel))}
      </Entry>,
    );
  }
  if (interpretation.avoidAtmospheres.length > 0) {
    entries.push(
      <Entry key="avoid" label="I set aside">
        anything {join(interpretation.avoidAtmospheres.map(atmosphereLabel), "or")}
      </Entry>,
    );
  }
  if (interpretation.pace) {
    entries.push(
      <Entry key="pace" label="pace">
        {interpretation.pace === "slow" ? "unhurried" : "brisk"}
      </Entry>,
    );
  }
  if (interpretation.length) {
    entries.push(
      <Entry key="len" label="length">
        {interpretation.length === "short" ? "few pages" : "many pages"}
      </Entry>,
    );
  }
  if (interpretation.era) {
    entries.push(
      <Entry key="era" label="era">
        {interpretation.era === "classic" ? "classics" : "contemporary"}
      </Entry>,
    );
  }
  if (interpretation.genres.length > 0) {
    entries.push(
      <Entry key="gen" label="form">
        {join(interpretation.genres.map((genre) => genre.toLowerCase()))}
      </Entry>,
    );
  }
  if (entries.length === 0) {
    return <p className="italic text-ink-soft">I searched for the meaning of what you wrote, comparing it with each book’s synopsis and reading.</p>;
  }
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      <span className="eyebrow text-ink">How I read your request</span>
      {entries}
    </p>
  );
}

export function SearchBar({
  state,
  onSearch,
  onClear,
}: {
  state: SearchState;
  onSearch: (query: string) => void;
  onClear: () => void;
}) {
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const committed = state.status === "idle" ? "" : state.query;
  const [draft, setDraft] = useState(committed);
  const [syncedQuery, setSyncedQuery] = useState(committed);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  if (committed !== syncedQuery) {
    setSyncedQuery(committed);
    setDraft(committed);
  }

  useEffect(() => {
    if (draft.length > 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setExampleIndex((index) => (index + 1) % EXAMPLES.length), 3800);
    return () => window.clearInterval(timer);
  }, [draft.length]);

  useEffect(() => {
    if (state.status !== "loading") return;
    const timer = window.setTimeout(() => setSlow(true), 220);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [state.status]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = draft.trim();
    if (value.length < 2) {
      onClear();
      return;
    }
    onSearch(value);
  };

  const response = state.status === "done" ? state.response : state.status === "loading" ? state.response : null;
  const count = response?.results.length ?? 0;

  return (
    <section aria-label="Search by intent">
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={inputId} className="eyebrow text-ink-soft">
          Ask the shelf — in your own words
        </label>
        <div className="mt-1 flex items-end gap-3 border-b-2 border-ink focus-within:border-vermilion">
          <textarea
            ref={inputRef}
            id={inputId}
            rows={1}
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={240}
            value={draft}
            onChange={(event) => setDraft(event.target.value.replace(/\n/g, " "))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            aria-describedby={statusId}
            placeholder={`${EXAMPLES[exampleIndex]}…`}
            className="display-italic block min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2 text-[clamp(1.45rem,4.4vw,3.35rem)] leading-[1.12] text-ink placeholder:text-ink-soft/85 focus:outline-none"
          />
          {committed ? (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                onClear();
                inputRef.current?.focus();
              }}
              className="eyebrow mb-3 shrink-0 text-ink-soft hover:text-vermilion"
            >
              Clear
            </button>
          ) : null}
          <button type="submit" className="button mb-2 shrink-0" disabled={state.status === "loading"}>
            Search
          </button>
        </div>
      </form>

      <div id={statusId} aria-live="polite" className="mt-3 min-h-[3.25rem] text-[0.98rem] leading-snug">
        {state.status === "idle" ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="eyebrow text-ink-soft">Try</span>
            {EXAMPLES.slice(0, 5).map((example) => (
              <button
                key={example}
                type="button"
                className="ink-link text-left italic text-ink"
                onClick={() => {
                  setDraft(example);
                  onSearch(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>
        ) : null}

        {state.status === "loading" && slow ? <p className="italic text-ink-soft">Reading the shelf…</p> : null}

        {state.status === "error" ? (
          <p className="text-vermilion">
            {state.message}{" "}
            <button type="button" className="ink-link" onClick={() => onSearch(state.query)}>
              Try again
            </button>
          </p>
        ) : null}

        {state.status === "done" ? (
          <div className="space-y-1.5">
            <Reading interpretation={state.response.interpretation} />
            {state.response.message ? (
              <p className="max-w-[62rem] border-l-2 border-vermilion pl-3 text-ink">{state.response.message}</p>
            ) : null}
            <p className="eyebrow text-ink-soft">
              {count === 0
                ? "no books highlighted"
                : `${count} ${count === 1 ? "book highlighted" : "books highlighted"}`}
              {" · "}
              {state.response.fallback === "lexical"
                ? "keyword search (AI unavailable)"
                : `local semantic search · ${state.response.engine.embedModel} · ${state.response.engine.tookMs} ms`}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
