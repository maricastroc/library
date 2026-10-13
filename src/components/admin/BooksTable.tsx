"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice, normalizeText } from "@/lib/catalog/text";
import type { BookDetail } from "@/lib/catalog/types";
import { atmosphereLabel } from "@/lib/semantic/taxonomy";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "with-note", label: "With note" },
  { key: "without-note", label: "Without note" },
  { key: "example-note", label: "Sample note" },
  { key: "without-synopsis", label: "Without synopsis" },
  { key: "out-of-stock", label: "Out of stock" },
  { key: "unread", label: "Without AI reading" },
  { key: "reviewed", label: "Reviewed by me" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matches(book: BookDetail, filter: FilterKey): boolean {
  switch (filter) {
    case "with-note":
      return Boolean(book.note);
    case "without-note":
      return !book.note;
    case "example-note":
      return book.noteOrigin === "example";
    case "without-synopsis":
      return !book.synopsis;
    case "out-of-stock":
      return book.stock === 0;
    case "unread":
      return book.semanticStatus !== "ready";
    case "reviewed":
      return book.semanticOrigin === "bookseller";
    default:
      return true;
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: "queued",
  processing: "reading…",
  insufficient: "insufficient synopsis",
  error: "reading error",
};

export function BooksTable({ books, initialFilter }: { books: BookDetail[]; initialFilter: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>(FILTERS.some((item) => item.key === initialFilter) ? (initialFilter as FilterKey) : "all");

  const visible = useMemo(() => {
    const folded = normalizeText(query);
    return books.filter(
      (book) =>
        matches(book, filter) &&
        (folded.length === 0 || normalizeText(`${book.title} ${book.author} ${book.isbn ?? ""} ${book.genre ?? ""}`).includes(folded)),
    );
  }, [books, query, filter]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="books-filter" className="eyebrow text-ink-soft">
            Search by title, author or ISBN
          </label>
          <input id="books-filter" className="field" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
        </div>
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={`eyebrow border px-2.5 py-1.5 ${filter === item.key ? "border-ink bg-ink text-paper" : "border-ink/40 text-ink hover:border-ink"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="eyebrow mt-4 text-ink-soft" aria-live="polite">
        {visible.length} of {books.length} {books.length === 1 ? "book" : "books"}
      </p>
      <div className="mt-2 overflow-x-auto border-t-2 border-ink">
        <table className="w-full min-w-[46rem] border-collapse text-left text-[0.95rem]">
          <thead>
            <tr className="eyebrow border-b border-ink text-ink-soft">
              <th scope="col" className="py-2 pr-4 font-normal">Book</th>
              <th scope="col" className="py-2 pr-4 font-normal">Genre</th>
              <th scope="col" className="py-2 pr-4 font-normal">Reading</th>
              <th scope="col" className="py-2 pr-4 font-normal">Note</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Price</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Stock</th>
              <th scope="col" className="py-2 font-normal">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((book) => (
              <tr key={book.id} className="border-b border-ink/15 align-baseline hover:bg-paper-light">
                <th scope="row" className="py-2 pr-4 font-normal">
                  <Link href={`/admin/books/${book.id}`} className="display text-[1.05rem] leading-tight hover:text-vermilion">
                    {book.title}
                  </Link>
                  <span className="block text-[0.88rem] italic text-ink-soft">{book.author}</span>
                </th>
                <td className="py-2 pr-4 font-label text-[0.85rem]">{book.genre ?? "—"}</td>
                <td className="py-2 pr-4 font-label text-[0.85rem]">
                  {book.semanticStatus === "ready" ? (
                    <>
                      {book.atmospheres.slice(0, 2).map(atmosphereLabel).join(", ")}
                      {book.semanticOrigin === "bookseller" ? <span className="eyebrow ml-1.5 text-[8.5px] text-vermilion">reviewed</span> : null}
                    </>
                  ) : (
                    <span className="text-ink-soft">{STATUS_LABEL[book.semanticStatus] ?? book.semanticStatus}</span>
                  )}
                </td>
                <td className="py-2 pr-4 font-label text-[0.85rem]">
                  {book.note ? (book.noteOrigin === "example" ? <span className="text-vermilion">sample</span> : "yes") : <span className="text-ink-soft">—</span>}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-[0.82rem]">
                  {formatPrice(book.priceCents) ?? "—"}
                  {book.priceIsDemo ? <span className="block text-[8.5px] uppercase tracking-wider text-ink-soft">demo</span> : null}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-[0.82rem]">{book.stock ?? "—"}</td>
                <td className="py-2 text-right">
                  <Link href={`/admin/books/${book.id}`} className="eyebrow ink-link">
                    edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? <p className="py-10 text-center text-ink-soft">No book matches this filter.</p> : null}
      </div>
    </div>
  );
}
