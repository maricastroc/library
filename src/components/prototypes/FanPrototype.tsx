"use client";

import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { formatIsbn } from "@/lib/catalog/isbn";
import { formatPrice } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import { ATMOSPHERE_BY_ID, DENSITY_LEVELS, PACE_LEVELS, atmosphereLabel } from "@/lib/semantic/taxonomy";
import { arrangeBooks, type SortKey } from "@/lib/shelf/arrange";
import { spineIdentity, type SpineIdentity } from "@/lib/shelf/identity";
import type { ShopConfig } from "@/lib/shop/config";
import { Cover } from "@/components/book/Cover";
import { NoteBlock, ReadingBlock, SynopsisBlock, WhyBlock } from "@/components/book/BookBlocks";
import { Reservation } from "@/components/book/Reservation";
import { BookDialog, CloseButton, CoverImage, PrototypeHeader, PrototypeSearch, SortWords, morph, useBookDetail, useOpenBook, usePrototypeSearch } from "./shared";

type Props = { books: ShelfBook[]; shop: ShopConfig; initialQuery: string; initialSlug: string | null };

const RADIANS = Math.PI / 180;

export function fanAngles(count: number, active: number | null, options: { step?: number; spread?: number; reveal?: number } = {}): number[] {
  const step = count > 1 ? Math.min(options.step ?? 6.5, (options.spread ?? 64) / (count - 1)) : 0;
  const start = (-step * (count - 1)) / 2;
  const push = Math.max(0, (options.reveal ?? 15) - step);
  return Array.from({ length: count }, (_, index) => {
    const base = start + index * step;
    if (active === null || index === active) return base;
    return base + (index > active ? push : -push);
  });
}

function fanBox(count: number, width: number, pivot: number, options: { step?: number; spread?: number; reveal?: number } = {}) {
  const height = width / 0.7;
  const extremes = fanAngles(count, null, options);
  const reach = Math.max(Math.abs(extremes[0] ?? 0), Math.abs(extremes[extremes.length - 1] ?? 0)) + Math.max(0, (options.reveal ?? 15) - 2);
  const radius = pivot * height;
  return {
    width: Math.ceil(2 * radius * Math.sin(reach * RADIANS) + width + 12),
    height: Math.ceil(height + radius * (1 - Math.cos(reach * RADIANS)) + 16),
  };
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

function Fan({
  books,
  identities,
  width,
  pivot,
  shopName,
  ranks,
  order,
  options,
  onOpen,
}: {
  books: ShelfBook[];
  identities: Map<number, SpineIdentity>;
  width: number;
  pivot: number;
  shopName: string;
  ranks?: Map<number, number>;
  order?: number[];
  options?: { step?: number; spread?: number; reveal?: number };
  onOpen: (book: ShelfBook) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const angles = fanAngles(books.length, active, options);
  const box = fanBox(books.length, width, pivot, options);
  const height = width / 0.7;
  return (
    <div className="fan" style={{ width: box.width, height: box.height }} onPointerLeave={() => setActive(null)} onKeyDown={rove}>
      {books.map((book, index) => {
        const rank = ranks?.get(book.id);
        const lifted = active === index;
        return (
          <button
            key={book.id}
            type="button"
            data-book={book.id}
            className="fan-card"
            data-active={lifted ? "true" : undefined}
            data-lead={rank === 1 ? "true" : undefined}
            aria-label={describe(book, rank)}
            style={
              {
                width,
                height,
                left: (box.width - width) / 2,
                top: box.height - height - 8,
                zIndex: order ? order.length - order.indexOf(book.id) : index + 1,
                "--angle": `${angles[index]}deg`,
                "--pivot": `${pivot * 100}%`,
                "--strip": (identities.get(book.id) as SpineIdentity).color,
                "--strip-ink": (identities.get(book.id) as SpineIdentity).ink,
                viewTransitionName: `book-${book.id}`,
              } as CSSProperties
            }
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setActive(index);
            }}
            onFocus={() => setActive(index)}
            onClick={() => onOpen(book)}
          >
            <Cover title={book.title} author={book.author} genre={book.genre} identity={identities.get(book.id) as SpineIdentity} shopName={shopName} />
            <span aria-hidden className="fan-index">
              {rank ? <span className="fan-rank">{rank}</span> : null}
              <span className="fan-index-title">{book.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CatalogueCard({ book, identity, result, query, shop, onClose }: { book: ShelfBook; identity: SpineIdentity; result: SearchResult | null; query: string | null; shop: ShopConfig; onClose: () => void }) {
  const titleId = useId();
  const detailState = useBookDetail(book.slug);
  const detail = detailState.status === "ready" ? detailState.detail : null;
  const price = formatPrice(book.priceCents);
  const pace = PACE_LEVELS.find((level) => level.value === book.pace)?.label;
  const density = DENSITY_LEVELS.find((level) => level.value === book.density)?.label;
  const fields: [string, string | null][] = [
    ["accession no.", String(book.id).padStart(5, "0")],
    ["author", book.author],
    ["form", book.genre],
    ["first published", book.year ? String(book.year) : null],
    ["extent", book.pages ? `${book.pages} pages` : null],
    ["publisher", detail?.publisher ?? null],
    ["isbn", detail?.isbn ? (formatIsbn(detail.isbn) ?? detail.isbn) : null],
    ["pace", pace ?? null],
    ["density", density ?? null],
    ["in stock", book.stock === null ? null : book.stock === 0 ? "none at the moment" : `${book.stock}${book.stockIsDemo ? " (demo)" : ""}`],
    ["price", price ? `${price}${book.priceIsDemo ? " (demo)" : ""}` : null],
  ];
  return (
    <BookDialog labelledBy={titleId} className="card-dialog" onClose={onClose}>
      <div className="jacket-bar text-paper">
        <CloseButton onClose={onClose} label="Return the card to the drawer" />
        <p className="eyebrow text-paper/70">{shop.name} · catalogue record</p>
      </div>
      <div className="card-scroll">
        <article className="catalogue-card">
          <div className="catalogue-figure">
            <span aria-hidden className="catalogue-clip" />
            <CoverImage detail={detail} fallback={<Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shop.name} />} />
            {book.atmospheres.length > 0 ? (
              <ul className="catalogue-stamps" aria-label="Atmosphere">
                {book.atmospheres.map((id) => (
                  <li key={id} style={{ "--stamp": ATMOSPHERE_BY_ID[id].color } as CSSProperties}>
                    {ATMOSPHERE_BY_ID[id].label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="catalogue-record">
            <p className="catalogue-head">
              <span>{book.genre ?? "book"}</span>
              <span>{book.atmospheres[0] ? atmosphereLabel(book.atmospheres[0]) : "not yet read"}</span>
            </p>
            <h2 id={titleId} className="catalogue-title">
              {book.title}
            </h2>
            <dl className="catalogue-fields">
              {fields
                .filter((field): field is [string, string] => Boolean(field[1]))
                .map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            <WhyBlock result={result} query={query} detail={detail} />
            <NoteBlock book={book} bookseller={shop.bookseller} />
            <ReadingBlock book={book} detail={detail} />
            <SynopsisBlock state={detailState} dropCap={false} />
            <Reservation book={book} query={result ? query : null} />
            <span aria-hidden className="catalogue-hole" />
          </div>
        </article>
      </div>
    </BookDialog>
  );
}

export function FanPrototype({ books, shop, initialQuery, initialSlug }: Props) {
  const [sort, setSort] = useState<SortKey>("atmosphere");
  const search = usePrototypeSearch(initialQuery);
  const opened = useOpenBook(books, initialSlug);
  const identities = useMemo(() => new Map(books.map((book) => [book.id, spineIdentity(book)])), [books]);
  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const answered = useMemo(() => search.matches.map((id) => byId.get(id)).filter((book): book is ShelfBook => Boolean(book)), [search.matches, byId]);
  const answerSet = useMemo(() => new Set(answered.map((book) => book.id)), [answered]);
  const ranks = useMemo(() => new Map(answered.map((book, index) => [book.id, index + 1])), [answered]);
  const centred = useMemo(() => {
    const order: ShelfBook[] = [];
    answered.forEach((book, index) => (index % 2 === 0 ? order.push(book) : order.unshift(book)));
    return order;
  }, [answered]);
  const groups = useMemo(
    () => arrangeBooks(books, sort).map((group) => ({ ...group, books: group.books.filter((book) => !answerSet.has(book.id)) })).filter((group) => group.books.length > 0),
    [books, sort, answerSet],
  );

  return (
    <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-8 lg:px-12">
      <PrototypeHeader current="fan" shopName={shop.name} />
      <PrototypeSearch search={search} />

      {answered.length > 0 ? (
        <section aria-label="Fanned out for your request" className="fan-answer">
          <Fan
            books={centred}
            identities={identities}
            width={176}
            pivot={2.4}
            shopName={shop.name}
            ranks={ranks}
            order={answered.map((book) => book.id)}
            options={{ step: 11, spread: 60, reveal: 18 }}
            onOpen={opened.open}
          />
          <ol className="fan-answer-notes">
            {answered.map((book, index) => {
              const result = search.results.get(book.id);
              return (
                <li key={book.id}>
                  <button type="button" onClick={() => opened.open(book)} className="fan-answer-note">
                    <span className="fan-rank !static">{index + 1}</span>
                    <span className="min-w-0">
                      <span className="display block text-[1.2rem] leading-[1.05]">{book.title}</span>
                      <span className="block text-[0.9rem] italic text-ink-soft">{book.author}</span>
                      <span className="mt-1 block font-label text-[0.76rem] leading-snug">
                        {result?.reasons.filter((reason) => reason.kind !== "note").map((reason) => reason.label).slice(0, 2).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className="mt-12 flex flex-wrap items-baseline justify-between gap-4">
        <SortWords value={sort} onChange={(key) => morph(() => setSort(key))} label={answered.length > 0 ? "The other hands, by" : "The hands, dealt by"} />
        <p className="eyebrow text-ink-soft">point at a fan to spread it · arrow keys deal through the cards</p>
      </div>

      <div className="fan-table" data-dim={answered.length > 0 ? "true" : undefined}>
        {groups.map((group) => (
          <section key={group.id} className="fan-group" aria-label={`${group.label}, ${group.books.length} books`}>
            <Fan books={group.books} identities={identities} width={104} pivot={1.9} shopName={shop.name} options={{ step: 6, spread: 50, reveal: 14 }} onOpen={opened.open} />
            <p className="fan-label">
              <span className="display-italic text-[1.25rem] leading-none">{group.label}</span>
              <span className="eyebrow text-[9px] text-ink-soft">{group.books.length}</span>
            </p>
          </section>
        ))}
      </div>

      {opened.book ? (
        <CatalogueCard
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
