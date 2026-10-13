"use client";

import { formatPrice } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import type { ShelfGroup } from "@/lib/shelf/arrange";

function IndexRow({ book, result, onOpen }: { book: ShelfBook; result?: SearchResult; onOpen: (id: number) => void }) {
  const price = formatPrice(book.priceCents);
  return (
    <li className="break-inside-avoid border-b border-ink/15">
      <button
        type="button"
        onClick={() => onOpen(book.id)}
        className="group flex w-full items-baseline gap-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="display text-[1.08rem] leading-tight group-hover:text-vermilion">{book.title}</span>
          <span className="block text-[0.92rem] italic text-ink-soft">{book.author}</span>
          {result ? (
            <span className="mt-0.5 block font-label text-[0.8rem] text-ink">
              {result.reasons
                .slice(0, 3)
                .map((reason) => reason.label)
                .join(" · ")}
            </span>
          ) : null}
        </span>
        <span className="eyebrow shrink-0 text-ink-soft">
          {book.stock === 0 ? "out of stock" : (price ?? "no price")}
        </span>
      </button>
    </li>
  );
}

export function IndexList({
  groups,
  matches,
  results,
  byId,
  onOpen,
}: {
  groups: ShelfGroup[];
  matches: number[] | null;
  results: Map<number, SearchResult>;
  byId: Map<number, ShelfBook>;
  onOpen: (id: number) => void;
}) {
  const matchSet = new Set(matches ?? []);
  return (
    <div className="border-t-[3px] border-ink pt-6">
      {matches && matches.length > 0 ? (
        <section className="mb-10">
          <h2 className="eyebrow mb-2 text-vermilion">The shelf answered · {matches.length}</h2>
          <ol className="gap-x-12 sm:columns-2">
            {matches.map((id) => {
              const book = byId.get(id);
              return book ? <IndexRow key={id} book={book} result={results.get(id)} onOpen={onOpen} /> : null;
            })}
          </ol>
        </section>
      ) : null}
      <div className="gap-x-12 sm:columns-2 lg:columns-3">
        {groups.map((group) => {
          const books = group.books.filter((book) => !matchSet.has(book.id));
          if (books.length === 0) return null;
          return (
            <section key={group.id} className="mb-8 break-inside-avoid-column">
              <h2 className="eyebrow sticky top-0 border-b border-ink bg-paper py-1.5 text-ink">
                {group.label} · {books.length}
              </h2>
              <ol>
                {books.map((book) => (
                  <IndexRow key={book.id} book={book} onOpen={onOpen} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
