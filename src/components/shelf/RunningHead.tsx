"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { SearchState } from "./SearchBar";

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

function moveFocus(from: HTMLInputElement | HTMLTextAreaElement, to: HTMLInputElement | HTMLTextAreaElement | null | undefined) {
  if (!to) return;
  const caret = from.selectionStart ?? from.value.length;
  to.focus({ preventScroll: true });
  const position = Math.min(caret, to.value.length);
  to.setSelectionRange(position, position);
}

export function RunningHead({
  name,
  state,
  draft,
  onDraft,
  watch,
  arrangement,
  onSearch,
  onClear,
  onTop,
}: {
  name: string;
  state: SearchState;
  draft: string;
  onDraft: (draft: string) => void;
  watch: RefObject<HTMLElement | null>;
  arrangement: string;
  onSearch: (query: string) => void;
  onClear: () => void;
  onTop: () => void;
}) {
  const inputId = useId();
  const headRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const committed = state.status === "idle" ? "" : state.query;

  useEffect(() => {
    const hero = watch.current;
    const field = hero?.querySelector<HTMLElement>(".hero-field");
    const head = headRef.current;
    if (!field || !head) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = !entry.isIntersecting && entry.boundingClientRect.top < head.offsetHeight;
        const heroInput = field.querySelector("textarea");
        const active = document.activeElement;
        if (next) {
          flushSync(() => setShown(true));
          if (heroInput && active === heroInput) moveFocus(heroInput, inputRef.current);
        } else {
          hero?.toggleAttribute("inert", false);
          if (inputRef.current && active === inputRef.current) moveFocus(inputRef.current, heroInput);
          setShown(false);
        }
      },
      { rootMargin: `-${head.offsetHeight}px 0px 0px 0px` },
    );
    const syncHero = () => {
      if (!hero) return;
      const gone = hero.getBoundingClientRect().bottom <= head.offsetHeight + 16;
      if (gone && hero.contains(document.activeElement)) return;
      hero.toggleAttribute("inert", gone);
    };
    observer.observe(field);
    syncHero();
    window.addEventListener("scroll", syncHero, { passive: true });
    window.addEventListener("resize", syncHero);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncHero);
      window.removeEventListener("resize", syncHero);
      hero?.toggleAttribute("inert", false);
    };
  }, [watch]);

  useEffect(() => {
    if (!shown) return;
    const line = () => {
      const head = headRef.current?.offsetHeight ?? 0;
      return head + (window.innerHeight - head) * 0.3;
    };
    const update = () => {
      const marks = Array.from(document.querySelectorAll<HTMLElement>("[data-running-title]"));
      const current = marks.filter((mark) => mark.getBoundingClientRect().top <= line()).at(-1);
      setSection(current?.dataset.runningTitle ?? null);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [shown]);

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
    if (window.matchMedia("(pointer: coarse)").matches) inputRef.current?.blur();
    onSearch(value);
  };

  const status = statusLine(state);
  const title = section === "the collection" ? `the collection, by ${arrangement}` : section;
  const ready = draft.trim().length >= 2 && draft.trim() !== committed;

  return (
    <div ref={headRef} className="running-head" data-shown={shown ? "true" : undefined} inert={!shown}>
      <div className="running-head-inner">
        <button type="button" onClick={onTop} aria-label={`${name}, back to the top`} className="running-head-name">
          {name}
        </button>

        <form role="search" aria-label="Ask the bookshop" onSubmit={submit} className="running-head-field">
          <label htmlFor={inputId} className="eyebrow running-head-label">
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
              onChange={(event) => onDraft(event.target.value)}
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
          <button type="submit" className="running-head-submit" data-ready={ready ? "true" : undefined} disabled={state.status === "loading"} aria-label="Search">
            <span aria-hidden>→</span>
          </button>
        </form>

        <div className="running-head-folio">
          {status ? (
            <p aria-live="polite" className="eyebrow running-head-status">
              {status}
            </p>
          ) : title ? (
            <p key={title} className="eyebrow running-head-title">
              {title}
            </p>
          ) : null}
          {committed ? (
            <button
              type="button"
              onClick={() => {
                onDraft("");
                onClear();
              }}
              className="eyebrow running-head-clear"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
