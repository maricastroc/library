"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { BookDetail, ShelfBook } from "@/lib/catalog/types";
import type { SearchResponse, SearchResult } from "@/lib/search/types";
import { SORT_OPTIONS, type SortKey } from "@/lib/shelf/arrange";
import type { DetailState } from "@/components/book/BookBlocks";
import { Wordmark } from "@/components/shelf/Masthead";
import { SearchBar, type SearchState } from "@/components/shelf/SearchBar";

export const PROTOTYPES = [
  { slug: "table", name: "The table", note: "piles and face-out covers" },
  { slug: "cabinet", name: "The cabinet", note: "niches with mixed postures" },
  { slug: "fan", name: "The fan", note: "covers fanned, partly revealed" },
] as const;

export const FIVE_ANSWERS = "something melancholic, but comforting";

function writeParam(key: string, value: string | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  const next = `${url.pathname}${url.search}`;
  if (mode === "push") window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}

export function usePrototypeSearch(initialQuery: string) {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<SearchState>(initialQuery.length >= 2 ? { status: "loading", query: initialQuery, response: null } : { status: "idle" });

  const run = useCallback(async (raw: string) => {
    abortRef.current?.abort();
    const query = raw.replace(/\s+/g, " ").trim();
    if (query.length < 2) {
      setState({ status: "idle" });
      writeParam("q", null, "replace");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setState((current) => ({ status: "loading", query, response: current.status === "done" ? current.response : null }));
    writeParam("q", query, "replace");
    try {
      const response = await fetch(`/api/search?limit=5&q=${encodeURIComponent(query)}`, { signal: controller.signal });
      const data = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The shelf couldn’t answer just now.");
      morph(() => setState({ status: "done", query, response: data }));
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ status: "error", query, message: error instanceof Error ? error.message : "The shelf couldn’t answer just now." });
    }
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    morph(() => setState({ status: "idle" }));
    writeParam("q", null, "replace");
  }, []);

  useEffect(() => {
    if (initialQuery.length < 2) return;
    const timer = window.setTimeout(() => void run(initialQuery), 0);
    return () => window.clearTimeout(timer);
  }, [initialQuery, run]);

  const response = state.status === "done" ? state.response : state.status === "loading" ? state.response : null;
  const matches = useMemo(() => response?.results.map((item) => item.id) ?? [], [response]);
  const results = useMemo(() => new Map<number, SearchResult>((response?.results ?? []).map((item) => [item.id, item])), [response]);
  return { state, run, clear, response, matches, results, query: state.status === "done" ? state.query : null };
}

export function useOpenBook(books: ShelfBook[], initialSlug: string | null) {
  const bySlug = useMemo(() => new Map(books.map((book) => [book.slug, book])), [books]);
  const [openSlug, setOpenSlug] = useState<string | null>(initialSlug && bySlug.has(initialSlug) ? initialSlug : null);

  useEffect(() => {
    const onPop = () => setOpenSlug(new URLSearchParams(window.location.search).get("book"));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = useCallback((book: ShelfBook) => {
    writeParam("book", book.slug, new URLSearchParams(window.location.search).get("book") ? "replace" : "push");
    setOpenSlug(book.slug);
  }, []);

  const close = useCallback(() => {
    writeParam("book", null, "replace");
    setOpenSlug(null);
  }, []);

  return { book: openSlug ? (bySlug.get(openSlug) ?? null) : null, open, close };
}

export function useBookDetail(slug: string | null): DetailState {
  const [state, setState] = useState<{ slug: string | null; detail: DetailState }>({ slug: null, detail: { status: "loading" } });
  if (state.slug !== slug) setState({ slug, detail: { status: "loading" } });

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    fetch(`/api/books/${slug}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<BookDetail>) : Promise.reject(new Error(String(response.status)))))
      .then((detail) => setState({ slug, detail: { status: "ready", detail } }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ slug, detail: { status: "error", message: "Couldn’t load this book’s details." } });
      });
    return () => controller.abort();
  }, [slug]);

  return state.detail;
}

export function PrototypeHeader({ current, shopName }: { current: (typeof PROTOTYPES)[number]["slug"]; shopName: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-6 sm:pt-8">
      <div className="flex items-end gap-5">
        <Link href="/prototypes" aria-label="All prototypes" className="text-[1.9rem]">
          <Wordmark name={shopName} />
        </Link>
        <p className="eyebrow max-w-[18rem] pb-1 text-ink-soft">prototype · not the live shop</p>
      </div>
      <nav aria-label="Prototypes" className="eyebrow flex flex-wrap items-center gap-5 pb-1">
        {PROTOTYPES.map((prototype, index) => (
          <Link
            key={prototype.slug}
            href={`/prototypes/${prototype.slug}`}
            aria-current={prototype.slug === current ? "page" : undefined}
            className={prototype.slug === current ? "text-vermilion" : "ink-link"}
          >
            {index + 1}. {prototype.name}
          </Link>
        ))}
        <Link className="ink-link text-ink-soft" href="/">
          live shelf
        </Link>
      </nav>
    </header>
  );
}

export function PrototypeSearch({ search }: { search: ReturnType<typeof usePrototypeSearch> }) {
  return (
    <div className="pt-10 sm:pt-14">
      <SearchBar state={search.state} onSearch={(query) => void search.run(query)} onClear={search.clear} />
      {search.state.status === "idle" ? (
        <p className="eyebrow mt-4 text-ink-soft">
          <button type="button" className="ink-link text-ink" onClick={() => void search.run(FIVE_ANSWERS)}>
            try a request with five answers
          </button>
        </p>
      ) : null}
    </div>
  );
}

export function SortWords({ value, onChange, label }: { value: SortKey; onChange: (key: SortKey) => void; label: string }) {
  const current = SORT_OPTIONS.find((option) => option.key === value);
  return (
    <fieldset className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
      <legend className="eyebrow float-left mr-4 pt-[0.55rem] text-ink-soft">{label}</legend>
      <div className="flex flex-wrap items-baseline gap-x-1">
        {SORT_OPTIONS.map((option) => (
          <label key={option.key} className="sort-word has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-vermilion" data-selected={option.key === value ? "true" : undefined}>
            <input type="radio" name="prototype-sort" value={option.key} checked={option.key === value} onChange={() => onChange(option.key)} className="sr-only" />
            <span>{option.label.toLowerCase()}</span>
          </label>
        ))}
      </div>
      <p className="handwriting hidden text-[1.3rem] text-ink-soft md:block">{current?.hint}</p>
    </fieldset>
  );
}

export function morph(update: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (document as Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> } })
    .startViewTransition;
  if (!start || reduced || document.visibilityState !== "visible") {
    update();
    return;
  }
  const transition = start.call(document, () => flushSync(update));
  transition.ready.catch(() => undefined);
  transition.finished.catch(() => undefined);
}

export function BookDialog({ labelledBy, className, onClose, children }: { labelledBy: string; className: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`proto-dialog ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function CloseButton({ onClose, label = "Put it back" }: { onClose: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClose} className="eyebrow inline-flex min-h-11 items-center gap-2 hover:text-vermilion">
      <span aria-hidden className="text-[1.1rem] leading-none">
        ←
      </span>
      {label}
      <kbd className="ml-1 hidden border border-current/40 px-1.5 py-0.5 text-[9px] sm:inline">Esc</kbd>
    </button>
  );
}

export function CoverImage({ detail, fallback, className = "" }: { detail: BookDetail | null; fallback: ReactNode; className?: string }) {
  const [state, setState] = useState<{ url: string | null; status: "loaded" | "failed" | "waiting" }>({ url: null, status: "waiting" });
  const url = detail?.coverUrl ?? null;
  const status = state.url === url ? state.status : "waiting";
  return (
    <div className={`proto-cover ${className}`}>
      {fallback}
      {url && status !== "failed" ? (
        <img
          src={`${url}?default=false`}
          alt={`Cover of an edition of ${detail?.title ?? "this book"}`}
          decoding="async"
          data-loaded={status === "loaded" ? "true" : undefined}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setState({ url, status: naturalWidth > 8 && naturalHeight > 8 ? "loaded" : "failed" });
          }}
          onError={() => setState({ url, status: "failed" })}
        />
      ) : null}
    </div>
  );
}
