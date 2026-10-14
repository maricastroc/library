"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import type { SearchState } from "./SearchBar";
import { Wordmark } from "./Masthead";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function statusLine(state: SearchState): string | null {
  if (state.status === "loading") return "reading the collection…";
  if (state.status === "error") return "the bookshop could not answer";
  if (state.status !== "done") return null;
  const count = state.response.results.length;
  if (count === 0) return "nothing highlighted";
  return `${count} ${count === 1 ? "book" : "books"} highlighted`;
}

export function RunningHead({
  name,
  state,
  watch,
  onSearch,
  onClear,
  onTop,
}: {
  name: string;
  state: SearchState;
  watch: RefObject<HTMLElement | null>;
  onSearch: (query: string) => void;
  onClear: () => void;
  onTop: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState(false);
  const committed = state.status === "idle" ? "" : state.query;
  const [draft, setDraft] = useState(committed);
  const [syncedQuery, setSyncedQuery] = useState(committed);

  if (committed !== syncedQuery) {
    setSyncedQuery(committed);
    setDraft(committed);
  }

  useEffect(() => {
    const target = watch.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector("dialog[open]")) return;
      const field = shown ? inputRef.current : watch.current?.querySelector("textarea");
      if (!field) return;
      event.preventDefault();
      field.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shown, watch]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (value.length < 2) {
      onClear();
      return;
    }
    inputRef.current?.blur();
    onSearch(value);
  };

  const status = statusLine(state);

  return (
    <div className="running-head" data-shown={shown ? "true" : undefined} inert={!shown}>
      <div className="mx-auto flex h-full w-full max-w-[1560px] items-center gap-5 px-4 sm:gap-8 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={onTop}
          aria-label={`${name}, back to the top`}
          className="hidden shrink-0 cursor-pointer text-[1.3rem] transition-colors hover:text-vermilion sm:block"
        >
          <Wordmark name={name} />
        </button>

        <form role="search" aria-label="Ask the bookshop" onSubmit={submit} className="running-head-field">
          <label htmlFor={inputId} className="eyebrow sr-only shrink-0 text-ink-soft md:not-sr-only">
            I’m looking for
          </label>
          <span className="running-head-line">
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={240}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") event.currentTarget.blur();
              }}
              placeholder="a feeling, a theme, a pace…"
              className="running-head-input"
            />
            {draft ? null : (
              <kbd aria-hidden className="running-head-key">
                /
              </kbd>
            )}
            <svg aria-hidden className="running-head-rule" viewBox="0 0 1000 10" preserveAspectRatio="none">
              <path d="M2 6 C 90 2.5, 210 8.5, 360 5 S 640 2.5, 790 6 S 940 7.5, 998 4.5" />
            </svg>
          </span>
          <button type="submit" className="hero-submit running-head-submit" disabled={state.status === "loading"} aria-label="Search">
            <span aria-hidden>→</span>
          </button>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          {status ? (
            <p aria-live="polite" className="eyebrow hidden text-ink-soft lg:block">
              {status}
            </p>
          ) : null}
          {committed ? (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                onClear();
              }}
              className="eyebrow -mx-2 inline-flex min-h-11 cursor-pointer items-center px-2 text-ink underline decoration-ink/40 underline-offset-4 hover:text-vermilion hover:decoration-current"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
