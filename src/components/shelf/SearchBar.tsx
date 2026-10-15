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
    <span className="flex flex-wrap items-baseline gap-x-2 xl:block">
      <span className="eyebrow text-ink-soft xl:block">{label}</span>
      <span className="italic leading-snug">{children}</span>
    </span>
  );
}

function Reading({ interpretation, declined }: { interpretation: Interpretation; declined: boolean }) {
  const entries: ReactNode[] = [];
  const { reference } = interpretation;
  if (reference?.inCatalog && reference.similar) {
    entries.push(
      <Entry key="ref" label="starting point">
        {reference.kind === "author" ? `the books by ${reference.label} in the collection` : reference.label}
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
  if (interpretation.unassessable.length > 0) {
    entries.push(
      <Entry key="unknown" label="I could not judge">
        {join(interpretation.unassessable)}
      </Entry>,
    );
  }
  if (entries.length === 0 && declined) return null;
  return (
    <div className="hero-margin-note">
      <p className="handwriting text-[1.45rem] text-ink-soft">how I read your request —</p>
      {entries.length === 0 ? (
        <p className="mt-2 italic leading-snug text-ink-soft">
          By its meaning, compared with each book’s synopsis and reading.
        </p>
      ) : (
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-2 xl:block xl:space-y-2.5">{entries}</p>
      )}
    </div>
  );
}

export function SearchBar({
  state,
  draft,
  onDraft,
  onSearch,
  onClear,
  still,
}: {
  state: SearchState;
  draft: string;
  onDraft: (draft: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  still?: ReactNode;
}) {
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const committed = state.status === "idle" ? "" : state.query;
  const [exampleIndex, setExampleIndex] = useState(0);
  const [slow, setSlow] = useState(false);

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
    <section aria-label="Search by intent" className="hero">
      <div className="min-w-0">
        <form role="search" onSubmit={submit} className="hero-form">
          <label htmlFor={inputId} className="hero-label">
            <span className="eyebrow text-ink-soft">Ask the bookshop, in your own words</span>
            <span className="hero-lead mt-3 block">I’m looking for</span>
          </label>
          <div className="hero-field">
            <div className="hero-grow" data-value={draft || `${EXAMPLES[exampleIndex]}…`}>
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
                onChange={(event) => onDraft(event.target.value.replace(/\n/g, " "))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                aria-describedby={statusId}
                placeholder={`${EXAMPLES[exampleIndex]}…`}
                className="hero-input"
              />
            </div>
            <div className="flex shrink-0 items-center gap-4 pb-1">
              {committed ? (
                <button
                  type="button"
                  onClick={() => {
                    onDraft("");
                    onClear();
                    inputRef.current?.focus();
                  }}
                  className="eyebrow -mx-2 inline-flex min-h-11 items-center px-3 text-ink underline decoration-ink/40 underline-offset-4 hover:text-vermilion hover:decoration-current"
                >
                  Clear
                </button>
              ) : null}
              <button type="submit" className="hero-submit" disabled={state.status === "loading"} aria-label="Search">
                <span aria-hidden>→</span>
              </button>
            </div>
            <svg aria-hidden className="hero-rule" viewBox="0 0 1000 10" preserveAspectRatio="none">
              <path d="M2 6 C 90 2.5, 210 8.5, 360 5 S 640 2.5, 790 6 S 940 7.5, 998 4.5" />
            </svg>
          </div>
          {still}
        </form>

        <div id={statusId} aria-live="polite" className="hero-status">
          {state.status === "loading" && slow ? <p className="italic text-ink-soft">Reading the collection…</p> : null}

          {state.status === "error" ? (
            <p className="text-vermilion">
              {state.message}{" "}
              <button type="button" className="ink-link" onClick={() => onSearch(state.query)}>
                Try again
              </button>
            </p>
          ) : null}

          {state.status === "done" ? (
            <div className="space-y-2">
              {state.response.message ? (
                <p className="max-w-[52rem] border-l-2 border-vermilion pl-3 text-ink">{state.response.message}</p>
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
      </div>

      <aside className="hero-margin" aria-live="polite">
        {state.status === "done" ? (
          <Reading interpretation={state.response.interpretation} declined={state.response.confidence === "none"} />
        ) : state.status === "idle" ? (
          <div className="hero-margin-note">
            <p className="handwriting text-[1.45rem] text-ink-soft">or borrow a request —</p>
            <ul className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 xl:block xl:space-y-1.5">
              {EXAMPLES.slice(0, 5).map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    className="margin-request"
                    onClick={() => {
                      onDraft(example);
                      onSearch(example);
                    }}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
