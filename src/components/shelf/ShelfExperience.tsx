"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResponse, SearchResult } from "@/lib/search/types";
import { SORT_OPTIONS, arrangeBooks, type SortKey } from "@/lib/shelf/arrange";
import { spineIdentity } from "@/lib/shelf/identity";
import type { ShopConfig } from "@/lib/shop/config";
import { OpenBook, type Box, type OpenBookHandle } from "@/components/book/OpenBook";
import { SearchBar, type SearchState } from "./SearchBar";
import { Masthead } from "./Masthead";
import { Shelf, type ShelfHandle } from "./Shelf";
import { IndexList } from "./IndexList";
import { SortControls, type ViewMode } from "./SortControls";

export type ShowcaseLink = { slug: string; title: string; intro: string | null; count: number; background: string; ink: string };

type ShelfExperienceProps = {
  books: ShelfBook[];
  shop: ShopConfig;
  showcases: ShowcaseLink[];
  initialQuery: string;
  initialSort: SortKey;
  initialSlug: string | null;
  children?: React.ReactNode;
};

type OpenBookState = { id: number; origin: Box | null; pushed: boolean };

function writeUrl(patch: { q?: string | null; sort?: SortKey | null; book?: string | null }, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "" || value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  const next = `${url.pathname}${url.search}`;
  if (mode === "push") window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}

export function ShelfExperience({ books, shop, showcases, initialQuery, initialSort, initialSlug, children }: ShelfExperienceProps) {
  const shelfRef = useRef<ShelfHandle>(null);
  const openBookRef = useRef<OpenBookHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const bySlug = useMemo(() => new Map(books.map((book) => [book.slug, book])), [books]);

  const [sort, setSort] = useState<SortKey>(initialSort);
  const [view, setView] = useState<ViewMode>("shelf");
  const [search, setSearch] = useState<SearchState>(
    initialQuery.length >= 2 ? { status: "loading", query: initialQuery, response: null } : { status: "idle" },
  );
  const [open, setOpen] = useState<OpenBookState | null>(() => {
    const book = initialSlug ? bySlug.get(initialSlug) : undefined;
    return book ? { id: book.id, origin: null, pushed: false } : null;
  });
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const runSearch = useCallback(async (raw: string, options: { updateUrl?: boolean } = {}) => {
    abortRef.current?.abort();
    const query = raw.replace(/\s+/g, " ").trim();
    if (query.length < 2) {
      setSearch({ status: "idle" });
      if (options.updateUrl !== false) writeUrl({ q: null }, "replace");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setSearch((current) => ({
      status: "loading",
      query,
      response: current.status === "done" ? current.response : current.status === "loading" ? current.response : null,
    }));
    if (options.updateUrl !== false) writeUrl({ q: query }, "replace");
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      const data = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The shelf couldn’t answer just now.");
      setSearch({ status: "done", query, response: data });
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearch({
        status: "error",
        query,
        message: error instanceof Error && error.message ? error.message : "The shelf couldn’t answer just now.",
      });
    }
  }, []);

  const clearSearch = useCallback(() => {
    abortRef.current?.abort();
    setSearch({ status: "idle" });
    writeUrl({ q: null }, "replace");
  }, []);

  useEffect(() => {
    if (initialQuery.length < 2) return;
    const timer = window.setTimeout(() => void runSearch(initialQuery, { updateUrl: false }), 0);
    return () => window.clearTimeout(timer);
  }, [initialQuery, runSearch]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get("book");
      const current = openRef.current;
      if (current && !slug) openBookRef.current?.close(true);
      else if (!current && slug) {
        const book = bySlug.get(slug);
        if (book) setOpen({ id: book.id, origin: null, pushed: false });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [bySlug]);

  const response = search.status === "done" ? search.response : search.status === "loading" ? search.response : null;
  const matches = useMemo(() => {
    const ids = response?.results.map((item) => item.id).filter((id) => byId.has(id)) ?? [];
    return ids.length > 0 ? ids : null;
  }, [response, byId]);
  const results = useMemo(() => {
    const map = new Map<number, SearchResult>();
    for (const item of response?.results ?? []) map.set(item.id, item);
    return map;
  }, [response]);
  const groups = useMemo(() => arrangeBooks(books, sort), [books, sort]);

  const openBook = useCallback(
    (id: number) => {
      const book = byId.get(id);
      if (!book || openRef.current) return;
      const rect = shelfRef.current?.spineElement(id)?.getBoundingClientRect();
      writeUrl({ book: book.slug }, "push");
      setOpen({ id, origin: rect ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height } : null, pushed: true });
    },
    [byId],
  );

  const getOrigin = useCallback((): Box | null => {
    const current = openRef.current;
    if (!current) return null;
    const rect = shelfRef.current?.spineElement(current.id)?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height } : null;
  }, []);

  const handleClosed = useCallback((fromHistory: boolean) => {
    const current = openRef.current;
    openRef.current = null;
    setOpen(null);
    if (!current) return;
    if (!fromHistory) {
      if (current.pushed) window.history.back();
      else writeUrl({ book: null }, "replace");
    }
    requestAnimationFrame(() => shelfRef.current?.focusSpine(current.id));
  }, []);

  const changeSort = useCallback((key: SortKey) => {
    setSort(key);
    writeUrl({ sort: key === "atmosphere" ? null : key }, "replace");
  }, []);

  const openBookData = open ? byId.get(open.id) : undefined;
  const openIdentity = useMemo(() => (openBookData ? spineIdentity(openBookData) : null), [openBookData]);
  const activeQuery = search.status === "done" ? search.query : null;
  const reading = search.status === "loading";

  return (
    <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-8 lg:px-12">
      <Masthead name={shop.name} tagline={shop.tagline} total={books.length} showcaseCount={showcases.length} />

      <main>
        <div className="pt-10 sm:pt-14">
          <SearchBar state={search} onSearch={(query) => void runSearch(query)} onClear={clearSearch} />
        </div>

        <div className="mt-8 sm:mt-10">
          <SortControls value={sort} onChange={changeSort} view={view} onViewChange={setView} />
        </div>

        <div className="mt-8">
          {view === "shelf" ? (
            <Shelf
              ref={shelfRef}
              books={books}
              groups={groups}
              arrangement={SORT_OPTIONS.find((option) => option.key === sort)?.label.toLowerCase() ?? sort}
              matches={matches}
              results={results}
              reading={reading}
              openId={open?.id ?? null}
              bookseller={shop.bookseller}
              onOpen={openBook}
            />
          ) : (
            <IndexList groups={groups} matches={matches} results={results} byId={byId} onOpen={openBook} />
          )}
        </div>

        {showcases.length > 0 ? (
          <section id="showcases" aria-labelledby="showcases-heading" className="mt-24 scroll-mt-8 border-t-[3px] border-ink pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="showcases-heading" className="display text-[2rem] leading-none">
                House showcases
              </h2>
              <p className="eyebrow text-ink-soft">selections put together by the bookseller</p>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {showcases.map((showcase) => (
                <li key={showcase.slug}>
                  <Link
                    href={`/showcase/${showcase.slug}`}
                    className="group flex min-h-[11rem] flex-col justify-between p-5 transition-transform duration-300 hover:-translate-y-1"
                    style={{ background: showcase.background, color: showcase.ink }}
                  >
                    <span className="eyebrow opacity-80">
                      showcase · {showcase.count} {showcase.count === 1 ? "book" : "books"}
                    </span>
                    <span>
                      <span className="display-italic block text-balance text-[1.9rem] leading-[1.02]">{showcase.title}</span>
                      {showcase.intro ? (
                        <span className="mt-2 line-clamp-2 text-[0.95rem] leading-snug opacity-85">{showcase.intro}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      {children}

      {open && openBookData && openIdentity ? (
        <OpenBook
          key={open.id}
          ref={openBookRef}
          book={openBookData}
          identity={openIdentity}
          shopName={shop.name}
          bookseller={shop.bookseller}
          result={results.get(open.id) ?? null}
          query={activeQuery}
          initialOrigin={open.origin}
          getOrigin={getOrigin}
          onClosed={handleClosed}
        />
      ) : null}
    </div>
  );
}
