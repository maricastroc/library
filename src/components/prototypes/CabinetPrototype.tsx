"use client";

import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import { atmosphereLabel } from "@/lib/semantic/taxonomy";
import { arrangeBooks, type SortKey } from "@/lib/shelf/arrange";
import { spineIdentity, type SpineIdentity } from "@/lib/shelf/identity";
import type { ShopConfig } from "@/lib/shop/config";
import { Cover } from "@/components/book/Cover";
import { NoteBlock, ReadingBlock, RecordBlock, SynopsisBlock, TitleBlock, WhyBlock } from "@/components/book/BookBlocks";
import { Reservation } from "@/components/book/Reservation";
import { SpineFace } from "@/components/shelf/SpineFace";
import { BookDialog, CloseButton, CoverImage, PrototypeHeader, PrototypeSearch, SortWords, morph, useBookDetail, useOpenBook, usePrototypeSearch } from "./shared";

type Props = { books: ShelfBook[]; shop: ShopConfig; initialQuery: string; initialSlug: string | null };

const COLUMNS = 12;
const RUN = 6;
const STACK = 4;

export function spanFor(count: number): number {
  if (count <= 3) return 2;
  if (count <= 8) return 3;
  if (count <= 15) return 4;
  if (count <= 26) return 6;
  return 8;
}

export function packRows(counts: number[], columns = COLUMNS): number[] {
  const spans = counts.map((count) => Math.min(columns, spanFor(count)));
  let used = 0;
  spans.forEach((span, index) => {
    if (used + span > columns) {
      spans[index - 1] += columns - used;
      used = 0;
    }
    used += span;
  });
  if (spans.length > 0 && used < columns) spans[spans.length - 1] += columns - used;
  return spans;
}

type Piece = { kind: "stand"; book: ShelfBook; lean: boolean } | { kind: "stack"; books: ShelfBook[] };

export function arrangeNiche(books: ShelfBook[]): Piece[] {
  const lying = books.filter((book) => (book.pages ?? 240) <= 170 || book.genre === "Poetry");
  const standing = books.filter((book) => !lying.includes(book));
  const stacks: ShelfBook[][] = [];
  for (let index = 0; index < lying.length; index += STACK) stacks.push(lying.slice(index, index + STACK));
  const pieces: Piece[] = [];
  for (let index = 0; index < standing.length; index += RUN) {
    const run = standing.slice(index, index + RUN);
    run.forEach((book, position) => pieces.push({ kind: "stand", book, lean: position === run.length - 1 && run.length > 1 }));
    const stack = stacks.shift();
    if (stack) pieces.push({ kind: "stack", books: stack });
  }
  for (const stack of stacks) pieces.push({ kind: "stack", books: stack });
  return pieces;
}

function crownOf(books: ShelfBook[]): ShelfBook {
  return books.find((book) => book.note) ?? books[0];
}

function describe(book: ShelfBook, rank?: number) {
  const parts = [rank ? `Answer ${rank}:` : "", `${book.title}, by ${book.author}.`];
  if (book.atmospheres.length > 0) parts.push(`Read as ${book.atmospheres.map(atmosphereLabel).join(", ")}.`);
  return parts.filter(Boolean).join(" ");
}

function rove(event: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const all = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-book]")];
  const index = all.indexOf(document.activeElement as HTMLButtonElement);
  if (index === -1) return;
  event.preventDefault();
  const next =
    event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : event.key === "ArrowDown" || event.key === "ArrowRight" ? Math.min(all.length - 1, index + 1) : Math.max(0, index - 1);
  all[next]?.focus();
}

function Standing({ book, identity, scale, lean, rank, onOpen }: { book: ShelfBook; identity: SpineIdentity; scale: number; lean?: boolean; rank?: number; onOpen: (book: ShelfBook) => void }) {
  return (
    <button
      type="button"
      data-book={book.id}
      className="cab-stand"
      data-lean={lean ? "true" : undefined}
      aria-label={describe(book, rank)}
      style={{ width: Math.max(18, identity.width * scale), height: identity.height * scale, viewTransitionName: `book-${book.id}` } as CSSProperties}
      onClick={() => onOpen(book)}
    >
      <SpineFace identity={identity} scale={scale} className="relative block h-full w-full overflow-hidden" />
    </button>
  );
}

function Lying({ book, identity, scale, onOpen }: { book: ShelfBook; identity: SpineIdentity; scale: number; onOpen: (book: ShelfBook) => void }) {
  const length = identity.height * scale;
  const thickness = Math.max(12, identity.width * scale);
  const up = identity.orientation === "up";
  return (
    <button
      type="button"
      data-book={book.id}
      className="cab-lying"
      aria-label={describe(book)}
      style={{ width: length, height: thickness, viewTransitionName: `book-${book.id}` } as CSSProperties}
      onClick={() => onOpen(book)}
    >
      <span className="slab-turn" style={{ width: thickness, height: length, transform: up ? `translateX(${length}px) rotate(90deg)` : `translateY(${thickness}px) rotate(-90deg)` }}>
        <SpineFace identity={{ ...identity, stack: null }} scale={scale} className="relative block h-full w-full overflow-hidden" />
      </span>
    </button>
  );
}

function Easel({ book, identity, width, shopName, rank, onOpen }: { book: ShelfBook; identity: SpineIdentity; width: number; shopName: string; rank?: number; onOpen: (book: ShelfBook) => void }) {
  return (
    <span className="cab-easel">
      <button
        type="button"
        data-book={book.id}
        className="cab-face"
        aria-label={describe(book, rank)}
        style={{ width, height: width / 0.7, viewTransitionName: `book-${book.id}` } as CSSProperties}
        onClick={() => onOpen(book)}
      >
        <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} />
      </button>
      <span aria-hidden className="cab-easel-stand" />
    </span>
  );
}

function Label({ rank, book, result }: { rank: number; book: ShelfBook; result: SearchResult | undefined }) {
  const reason = result?.reasons.find((item) => item.kind !== "note")?.label;
  return (
    <span className="cab-label">
      <span className="eyebrow text-vermilion">no. {rank}</span>
      <span className="display mt-0.5 block text-[1rem] leading-[1.08]">{book.title}</span>
      <span className="block text-[0.82rem] italic leading-tight text-ink-soft">{book.author}</span>
      {reason ? <span className="mt-1 block font-label text-[0.72rem] leading-snug">{reason}</span> : null}
    </span>
  );
}

function Triptych({ book, identity, result, query, shop, onClose }: { book: ShelfBook; identity: SpineIdentity; result: SearchResult | null; query: string | null; shop: ShopConfig; onClose: () => void }) {
  const titleId = useId();
  const detailState = useBookDetail(book.slug);
  const detail = detailState.status === "ready" ? detailState.detail : null;
  return (
    <BookDialog labelledBy={titleId} className="triptych-dialog" onClose={onClose}>
      <div className="jacket-bar text-paper">
        <CloseButton onClose={onClose} label="Close the panels" />
        <p className="eyebrow text-paper/70">a folding display, opened</p>
      </div>
      <div className="triptych-scroll">
        <div className="triptych">
          <section className="triptych-center" aria-label="The book">
            <div className="triptych-stage">
              <div className="triptych-cover">
                <CoverImage detail={detail} fallback={<Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shop.name} />} />
              </div>
              <span aria-hidden className="cab-easel-stand triptych-stand" />
            </div>
            <TitleBlock book={book} titleId={titleId} compact />
            <NoteBlock book={book} bookseller={shop.bookseller} />
          </section>
          <section className="triptych-wing triptych-left quiet-scroll" aria-label="How it reads">
            <WhyBlock result={result} query={query} detail={detail} />
            <ReadingBlock book={book} detail={detail} />
          </section>
          <section className="triptych-wing triptych-right quiet-scroll" aria-label="Synopsis and record">
            <SynopsisBlock state={detailState} />
            <Reservation book={book} query={result ? query : null} />
            <RecordBlock book={book} detail={detail} />
          </section>
        </div>
      </div>
    </BookDialog>
  );
}

function Niche({ label, count, span, children, window = false }: { label: string; count: number; span: number; children: ReactNode; window?: boolean }) {
  return (
    <section className="cab-niche" data-window={window ? "true" : undefined} style={{ gridColumn: `span ${span}` }} aria-label={`${label}, ${count} ${count === 1 ? "book" : "books"}`}>
      <p className="cab-plate">
        <span>{label}</span>
        <span className="opacity-70">{count}</span>
      </p>
      <div className="cab-contents">{children}</div>
    </section>
  );
}

export function CabinetPrototype({ books, shop, initialQuery, initialSlug }: Props) {
  const [sort, setSort] = useState<SortKey>("atmosphere");
  const search = usePrototypeSearch(initialQuery);
  const opened = useOpenBook(books, initialSlug);
  const identities = useMemo(() => new Map(books.map((book) => [book.id, spineIdentity(book)])), [books]);
  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const answered = useMemo(() => search.matches.map((id) => byId.get(id)).filter((book): book is ShelfBook => Boolean(book)), [search.matches, byId]);
  const answerSet = useMemo(() => new Set(answered.map((book) => book.id)), [answered]);
  const groups = useMemo(
    () => arrangeBooks(books, sort).map((group) => ({ ...group, books: group.books.filter((book) => !answerSet.has(book.id)) })).filter((group) => group.books.length > 0),
    [books, sort, answerSet],
  );
  const spans = useMemo(() => packRows(groups.map((group) => group.books.length)), [groups]);
  const identity = (book: ShelfBook) => identities.get(book.id) as SpineIdentity;

  return (
    <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-8 lg:px-12">
      <PrototypeHeader current="cabinet" shopName={shop.name} />
      <PrototypeSearch search={search} />

      {answered.length > 0 ? (
        <div className="cab-window-wrap">
          <Niche label="In the window, for your request" count={answered.length} span={COLUMNS} window>
            <div className="cab-window" onKeyDown={rove}>
              {answered.map((book, index) => {
                const rank = index + 1;
                const result = search.results.get(book.id);
                return (
                  <figure key={book.id} className="cab-exhibit" data-rank={rank}>
                    {rank <= 3 ? (
                      <Easel book={book} identity={identity(book)} width={rank === 1 ? 200 : 132} shopName={shop.name} rank={rank} onOpen={opened.open} />
                    ) : (
                      <Standing book={book} identity={identity(book)} scale={1} lean={rank === answered.length && answered.length > 4} rank={rank} onOpen={opened.open} />
                    )}
                    <figcaption>
                      <Label rank={rank} book={book} result={result} />
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </Niche>
        </div>
      ) : null}

      <div className="mt-12 flex flex-wrap items-baseline justify-between gap-4">
        <SortWords value={sort} onChange={(key) => morph(() => setSort(key))} label={answered.length > 0 ? "The rest of the cabinet, by" : "The cabinet, arranged by"} />
        <p className="eyebrow text-ink-soft">one book faces out in each niche · short books lie flat · the last of each row leans</p>
      </div>

      <div className="cab-case" data-dim={answered.length > 0 ? "true" : undefined} onKeyDown={rove}>
        {groups.map((group, index) => {
          const crown = crownOf(group.books);
          const pieces = arrangeNiche(group.books.filter((book) => book.id !== crown.id));
          return (
            <Niche key={group.id} label={group.label} count={group.books.length} span={spans[index]}>
              <Easel book={crown} identity={identity(crown)} width={104} shopName={shop.name} onOpen={opened.open} />
              {pieces.map((piece) =>
                piece.kind === "stand" ? (
                  <Standing key={piece.book.id} book={piece.book} identity={identity(piece.book)} scale={0.74} lean={piece.lean} onOpen={opened.open} />
                ) : (
                  <span key={piece.books[0].id} className="cab-stack">
                    {piece.books.map((book) => (
                      <Lying key={book.id} book={book} identity={identity(book)} scale={0.62} onOpen={opened.open} />
                    ))}
                  </span>
                ),
              )}
            </Niche>
          );
        })}
      </div>

      {opened.book ? (
        <Triptych
          key={opened.book.id}
          book={opened.book}
          identity={identity(opened.book)}
          result={search.results.get(opened.book.id) ?? null}
          query={search.query}
          shop={shop}
          onClose={opened.close}
        />
      ) : null}
    </div>
  );
}
