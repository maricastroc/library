"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResponse, SearchResult } from "@/lib/search/types";
import { SORT_OPTIONS, arrangeBooks, type AnswerSortKey, type SortKey } from "@/lib/shelf/arrange";
import { spineIdentity } from "@/lib/shelf/identity";
import type { ShopConfig } from "@/lib/shop/config";
import { Jacket, type Box, type JacketHandle } from "@/components/book/Jacket";
import { SearchBar, type SearchState } from "./SearchBar";
import { Masthead } from "./Masthead";
import { RunningHead } from "./RunningHead";
import { Gallery, type GalleryHandle } from "./Gallery";
import { StillLife } from "./StillLife";
import type { Density } from "@/lib/shelf/composition";
import { IndexList } from "./IndexList";
import { SortControls, type ViewMode } from "./SortControls";

export type ShowcaseLink = {
  slug: string;
  title: string;
  intro: string | null;
  count: number;
  bookIds: number[];
  background: string;
  ink: string;
  accent: string;
};

const SHOWCASE_SPINES = 12;
const SHOWCASE_TITLES = 6;

type ShelfExperienceProps = {
  books: ShelfBook[];
  shop: ShopConfig;
  showcases: ShowcaseLink[];
  initialQuery: string;
  initialSort: SortKey;
  initialSlug: string | null;
  density: Density;
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

export function ShelfExperience({ books, shop, showcases, initialQuery, initialSort, initialSlug, density, children }: ShelfExperienceProps) {
  const shelfRef = useRef<GalleryHandle>(null);
  const openBookRef = useRef<JacketHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const shelfTopRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const bySlug = useMemo(() => new Map(books.map((book) => [book.slug, book])), [books]);

  const [sort, setSort] = useState<SortKey>(initialSort);
  const [answerSort, setAnswerSort] = useState<AnswerSortKey>("relevance");
  const [view, setView] = useState<ViewMode>("display");
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
    setAnswerSort("relevance");
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
  const heard = useMemo(
    () => [...new Set([...(response?.interpretation.atmospheres ?? []), ...(response?.interpretation.inferredAtmospheres ?? [])])],
    [response],
  );
  const ranks = useMemo(() => new Map((matches ?? []).map((id, index) => [id, index + 1])), [matches]);
  const orderedMatches = useMemo(() => {
    if (!matches || answerSort === "relevance") return matches;
    const answered = matches.map((id) => byId.get(id)).filter((book): book is ShelfBook => Boolean(book));
    return arrangeBooks(answered, answerSort).flatMap((group) => group.books.map((book) => book.id));
  }, [matches, answerSort, byId]);
  const identities = useMemo(() => new Map(books.map((book) => [book.id, spineIdentity(book)])), [books]);
  const showcaseBooks = useMemo(
    () =>
      new Map(
        showcases.map((showcase) => [
          showcase.slug,
          showcase.bookIds
            .map((id) => byId.get(id))
            .filter((book): book is ShelfBook => Boolean(book))
            .map((book) => ({ book, identity: spineIdentity(book) })),
        ]),
      ),
    [showcases, byId],
  );

  const openBook = useCallback(
    (id: number) => {
      const book = byId.get(id);
      if (!book || openRef.current) return;
      const rect = shelfRef.current?.bookElement(id)?.getBoundingClientRect();
      writeUrl({ book: book.slug }, "push");
      setOpen({ id, origin: rect ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height } : null, pushed: true });
    },
    [byId],
  );

  const getOrigin = useCallback((): Box | null => {
    const current = openRef.current;
    if (!current) return null;
    const rect = shelfRef.current?.bookElement(current.id)?.getBoundingClientRect();
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
    requestAnimationFrame(() => shelfRef.current?.focusBook(current.id));
  }, []);

  const changeSort = useCallback((key: AnswerSortKey) => {
    setAnswerSort(key);
    if (key === "relevance") return;
    setSort(key);
    writeUrl({ sort: key === "atmosphere" ? null : key }, "replace");
  }, []);

  const searchFromHead = useCallback(
    (query: string) => {
      void runSearch(query);
      shelfTopRef.current?.scrollIntoView({ block: "start" });
    },
    [runSearch],
  );

  const backToTop = useCallback(() => window.scrollTo({ top: 0 }), []);

  const openBookData = open ? byId.get(open.id) : undefined;
  const openIdentity = useMemo(() => (openBookData ? spineIdentity(openBookData) : null), [openBookData]);
  const activeQuery = search.status === "done" ? search.query : null;
  const reading = search.status === "loading";

  return (
    <div className="page mx-auto w-full max-w-[1560px] px-4 sm:px-8 lg:px-12" data-opening={search.status === "idle" ? "full" : "fitted"}>
      <Masthead name={shop.name} tagline={shop.tagline} total={books.length} showcaseCount={showcases.length} />
      <RunningHead name={shop.name} state={search} watch={heroRef} onSearch={searchFromHead} onClear={clearSearch} onTop={backToTop} />

      <main className="page-main">
        <div ref={heroRef} className="page-hero pb-12 pt-12 sm:pb-16 sm:pt-20">
          <SearchBar state={search} onSearch={(query) => void runSearch(query)} onClear={clearSearch} />
        </div>

        <div ref={shelfTopRef} className="pb-5">
          <SortControls
            value={matches ? answerSort : sort}
            onChange={changeSort}
            searching={Boolean(matches)}
            view={view}
            onViewChange={setView}
          />
        </div>

        <div>
          <div key={view} className="view-enter mt-6">
            {view === "display" ? (
              <Gallery
                ref={shelfRef}
                books={books}
                groups={groups}
                arrangement={SORT_OPTIONS.find((option) => option.key === sort)?.label.toLowerCase() ?? sort}
                answers={orderedMatches}
                ranks={ranks}
                results={results}
                heard={heard}
                confidence={response?.confidence ?? null}
                level={answerSort !== "relevance"}
                density={density}
                staged
                reading={reading}
                openId={open?.id ?? null}
                shopName={shop.name}
                bookseller={shop.bookseller}
                onOpen={openBook}
              />
            ) : (
              <IndexList
                ref={shelfRef}
                groups={groups}
                matches={orderedMatches}
                ranks={ranks}
                results={results}
                byId={byId}
                identities={identities}
                arrangement={sort}
                shopName={shop.name}
                openId={open?.id ?? null}
                onOpen={openBook}
              />
            )}
          </div>

          {showcases.length > 0 ? (
            <section id="showcases" aria-labelledby="showcases-heading" className="mt-28 scroll-mt-8 border-t-[3px] border-ink pt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="showcases-heading" className="display text-[clamp(2.2rem,3.8vw,3.5rem)] leading-[0.96]">
                  House showcases
                </h2>
                <p className="eyebrow text-ink-soft">selections put together by the bookseller</p>
              </div>
              <ul className="mt-7 space-y-5">
                {showcases.map((showcase, position) => {
                  const selection = showcaseBooks.get(showcase.slug) ?? [];
                  const standing = selection.slice(0, SHOWCASE_SPINES);
                  const listed = selection.slice(0, SHOWCASE_TITLES);
                  return (
                    <li key={showcase.slug}>
                      <Link
                        href={`/showcase/${showcase.slug}`}
                        aria-label={`${showcase.title}, showcase with ${showcase.count} ${showcase.count === 1 ? "book" : "books"}`}
                        className="showcase-band"
                        data-flip={position % 2 === 1 ? "true" : undefined}
                        style={{ background: showcase.background, color: showcase.ink }}
                      >
                        <span className="showcase-band-text">
                          <span className="eyebrow opacity-75">
                            showcase · {showcase.count} {showcase.count === 1 ? "book" : "books"}
                          </span>
                          <span className="display-italic mt-4 block text-balance text-[clamp(2.5rem,5.4vw,5.25rem)] leading-[0.94]">
                            {showcase.title}
                          </span>
                          {showcase.intro ? (
                            <span className="mt-5 block max-w-[34rem] text-[1.05rem] leading-[1.5] opacity-85">{showcase.intro}</span>
                          ) : null}
                          <span className="showcase-band-cue eyebrow mt-7 inline-flex items-center gap-2" style={{ color: showcase.accent }}>
                            open the showcase <span aria-hidden>→</span>
                          </span>
                        </span>

                        {standing.length > 0 ? (
                          <span aria-hidden className="showcase-band-books">
                            <span className="showcase-band-row">
                              <StillLife books={standing.map(({ book }) => book)} identities={identities} width={420} shopName={shop.name} />
                            </span>
                            <span className="showcase-band-list">
                              {listed.map(({ book }, index) => (
                                <span key={book.id} className="flex items-baseline gap-3">
                                  <span className="eyebrow w-5 shrink-0 text-[9px]" style={{ color: showcase.accent }}>
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="display-italic line-clamp-2 text-[1.08rem] leading-tight">{book.title}</span>
                                    <span className="eyebrow block truncate text-[9px] opacity-70">{book.author}</span>
                                  </span>
                                </span>
                              ))}
                              {selection.length > listed.length ? (
                                <span className="eyebrow pl-8 text-[9px] opacity-70">and {selection.length - listed.length} more</span>
                              ) : null}
                            </span>
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </main>

      {children}

      {open && openBookData && openIdentity ? (
        <Jacket
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
