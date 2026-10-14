"use client";

import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { hashString } from "@/lib/catalog/text";
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

const PILE_MAX = 12;

type Props = { books: ShelfBook[]; shop: ShopConfig; initialQuery: string; initialSlug: string | null };

function piles<T>(items: T[], max: number): T[][] {
  const count = Math.max(1, Math.ceil(items.length / max));
  const size = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, index) => items.slice(index * size, (index + 1) * size)).filter((pile) => pile.length > 0);
}

function crownOf(books: ShelfBook[]): ShelfBook {
  return books.find((book) => book.note) ?? books[0];
}

function describe(book: ShelfBook, rank?: number) {
  const parts = [rank ? `Answer ${rank}:` : "", `${book.title}, by ${book.author}.`];
  if (book.atmospheres.length > 0) parts.push(`Read as ${book.atmospheres.map(atmosphereLabel).join(", ")}.`);
  return parts.filter(Boolean).join(" ");
}

function Slab({ book, identity, scale, rank, onOpen }: { book: ShelfBook; identity: SpineIdentity; scale: number; rank?: number; onOpen: (book: ShelfBook) => void }) {
  const seed = hashString(`slab-${book.id}`);
  const offset = ((seed % 21) - 10) * scale;
  const tilt = (((seed >> 5) % 9) - 4) * 0.12;
  const length = identity.height * scale;
  const thickness = Math.max(13, identity.width * scale);
  const up = identity.orientation === "up";
  const turn = up ? `translateX(${length}px) rotate(90deg)` : `translateY(${thickness}px) rotate(-90deg)`;
  return (
    <button
      type="button"
      data-book={book.id}
      className="slab"
      aria-label={describe(book, rank)}
      style={{ width: length, height: thickness, "--offset": `${offset}px`, "--tilt": `${tilt}deg`, viewTransitionName: `book-${book.id}` } as CSSProperties}
      onClick={() => onOpen(book)}
    >
      <span className="slab-turn" style={{ width: thickness, height: length, transform: turn }}>
        <SpineFace identity={{ ...identity, stack: null }} scale={scale} className="relative block h-full w-full overflow-hidden" />
      </span>
      {rank ? <span className="slab-rank">{rank}</span> : null}
    </button>
  );
}

function Crown({ book, identity, width, shopName, rank, onOpen }: { book: ShelfBook; identity: SpineIdentity; width: number; shopName: string; rank?: number; onOpen: (book: ShelfBook) => void }) {
  return (
    <button
      type="button"
      data-book={book.id}
      className="crown"
      aria-label={describe(book, rank)}
      style={{ width, height: width / 0.7, viewTransitionName: `book-${book.id}` } as CSSProperties}
      onClick={() => onOpen(book)}
    >
      <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} />
      {rank ? <span className="slab-rank" data-lead="true">{rank}</span> : null}
    </button>
  );
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

function Jacket({ book, identity, result, query, shop, onClose }: { book: ShelfBook; identity: SpineIdentity; result: SearchResult | null; query: string | null; shop: ShopConfig; onClose: () => void }) {
  const titleId = useId();
  const detailState = useBookDetail(book.slug);
  const detail = detailState.status === "ready" ? detailState.detail : null;
  return (
    <BookDialog labelledBy={titleId} className="jacket-dialog" onClose={onClose}>
      <div className="jacket-bar">
        <CloseButton onClose={onClose} label="Fold the jacket back" />
        <p className="eyebrow text-paper/70">the dust jacket, laid open</p>
      </div>
      <div className="jacket-scroll">
        <div className="jacket" style={{ "--spine": `${Math.max(34, identity.width * 1.5)}px` } as CSSProperties}>
          <section className="jacket-panel jacket-front" aria-label="Front cover">
            <CoverImage detail={detail} fallback={<Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shop.name} />} />
          </section>
          <section className="jacket-panel jacket-flap jacket-front-flap quiet-scroll" aria-label="Front flap">
            <TitleBlock book={book} titleId={titleId} compact />
            <WhyBlock result={result} query={query} detail={detail} />
            <SynopsisBlock state={detailState} />
          </section>
          <section className="jacket-panel jacket-back quiet-scroll" aria-label="Back cover">
            <ReadingBlock book={book} detail={detail} />
            <NoteBlock book={book} bookseller={shop.bookseller} />
          </section>
          <section className="jacket-panel jacket-flap jacket-back-flap quiet-scroll" aria-label="Back flap">
            <p className="eyebrow text-ink-soft">on this edition</p>
            <RecordBlock book={book} detail={detail} />
            <Reservation book={book} query={result ? query : null} />
          </section>
          <div aria-hidden className="jacket-panel jacket-spine">
            <SpineFace identity={identity} scale={1.5} className="relative block h-full w-full overflow-hidden" />
          </div>
        </div>
      </div>
    </BookDialog>
  );
}

export function TablePrototype({ books, shop, initialQuery, initialSlug }: Props) {
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
  const [lead, ...others] = answered;
  const answering = answered.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-8 lg:px-12 proto-table">
      <PrototypeHeader current="table" shopName={shop.name} />
      <PrototypeSearch search={search} />

      {answering && lead ? (
        <section aria-label="Laid out for your request" className="table-front">
          <div className="table-front-objects">
            <Crown book={lead} identity={identities.get(lead.id) as SpineIdentity} width={208} shopName={shop.name} rank={1} onOpen={opened.open} />
            {others.length > 0 ? (
              <div className="pile" onKeyDown={rove}>
                {others.map((book, index) => (
                  <Slab key={book.id} book={book} identity={identities.get(book.id) as SpineIdentity} scale={1.05} rank={index + 2} onOpen={opened.open} />
                ))}
              </div>
            ) : null}
          </div>
          <ol className="table-front-notes">
            {answered.map((book, index) => {
              const result = search.results.get(book.id);
              return (
                <li key={book.id}>
                  <button type="button" className="table-front-note" onClick={() => opened.open(book)}>
                    <span className="slab-rank !static">{index + 1}</span>
                    <span className="min-w-0">
                      <span className="display block text-[1.35rem] leading-[1.05]">{book.title}</span>
                      <span className="block text-[0.95rem] italic text-ink-soft">{book.author}</span>
                      <span className="mt-1 block font-label text-[0.8rem] leading-snug">{result?.reasons.filter((reason) => reason.kind !== "note").map((reason) => reason.label).slice(0, 2).join(" · ")}</span>
                      {index === 0 && result?.quote ? <span className="mt-2 block text-[1rem] italic leading-snug">“{result.quote}”</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className="mt-12 flex flex-wrap items-baseline justify-between gap-4">
        <SortWords value={sort} onChange={(key) => morph(() => setSort(key))} label={answering ? "The rest of the table, by" : "The table, arranged by"} />
        <p className="eyebrow text-ink-soft">{books.length - answered.length} books in piles · arrow keys move through them</p>
      </div>

      <div className="table-surface" data-dim={answering ? "true" : undefined} onKeyDown={rove}>
        {groups.map((group) => {
          const crown = crownOf(group.books);
          const [firstPile = [], ...laterPiles] = piles(
            group.books.filter((book) => book.id !== crown.id),
            PILE_MAX,
          );
          return (
            <section key={group.id} className="lot" aria-label={`${group.label}, ${group.books.length} books`}>
              <div className="lot-piles">
                <div className="pile">
                  <Crown book={crown} identity={identities.get(crown.id) as SpineIdentity} width={112} shopName={shop.name} onOpen={opened.open} />
                  {firstPile.map((book) => (
                    <Slab key={book.id} book={book} identity={identities.get(book.id) as SpineIdentity} scale={0.82} onOpen={opened.open} />
                  ))}
                </div>
                {laterPiles.map((pile, index) => (
                  <div key={index} className="pile">
                    {pile.map((book) => (
                      <Slab key={book.id} book={book} identity={identities.get(book.id) as SpineIdentity} scale={0.82} onOpen={opened.open} />
                    ))}
                  </div>
                ))}
              </div>
              <p className="tent-card">
                <span className="display-italic text-[1.2rem] leading-none">{group.label}</span>
                <span className="eyebrow text-[9px] text-ink-soft">{group.books.length}</span>
              </p>
            </section>
          );
        })}
      </div>

      {opened.book ? (
        <Jacket
          key={opened.book.id}
          book={opened.book}
          identity={identities.get(opened.book.id) as SpineIdentity}
          result={search.results.get(opened.book.id) ?? null}
          query={search.query}
          shop={shop}
          onClose={opened.close}
        />
      ) : null}
    </div>
  );
}
