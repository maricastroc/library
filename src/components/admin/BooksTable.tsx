"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { formatPrice, normalizeText } from "@/lib/catalog/text";
import type { BookDetail } from "@/lib/catalog/types";
import { ATMOSPHERE_BY_ID, atmosphereLabel, attributeLabel } from "@/lib/semantic/taxonomy";
import { KRAFT, spineIdentity } from "@/lib/shelf/identity";
import { Stamp } from "./Counter";

type Reading = "all" | "read" | "reviewed" | "unread";
type Note = "any" | "with" | "sample" | "without";
type Shelf = "any" | "out-of-stock" | "without-synopsis";
type Order = "title" | "author" | "price" | "stock" | "changed";

const READING: { key: Reading; label: string; test: (book: BookDetail) => boolean }[] = [
  { key: "all", label: "all", test: () => true },
  { key: "read", label: "read by the AI", test: (book) => book.semanticStatus === "ready" && book.semanticOrigin !== "bookseller" },
  { key: "reviewed", label: "reviewed by you", test: (book) => book.semanticOrigin === "bookseller" },
  { key: "unread", label: "not read yet", test: (book) => book.semanticStatus !== "ready" },
];

const NOTE: { key: Note; label: string; test: (book: BookDetail) => boolean }[] = [
  { key: "any", label: "any", test: () => true },
  { key: "with", label: "with a note", test: (book) => Boolean(book.note) },
  { key: "sample", label: "sample notes", test: (book) => book.noteOrigin === "example" },
  { key: "without", label: "without", test: (book) => !book.note },
];

const SHELF: { key: Shelf; label: string; test: (book: BookDetail) => boolean }[] = [
  { key: "any", label: "everything", test: () => true },
  { key: "out-of-stock", label: "out of stock", test: (book) => book.stock === 0 },
  { key: "without-synopsis", label: "no synopsis", test: (book) => !book.synopsis },
];

const ORDERS: { key: Order; label: string }[] = [
  { key: "title", label: "title" },
  { key: "author", label: "author" },
  { key: "price", label: "price" },
  { key: "stock", label: "stock" },
  { key: "changed", label: "last changed" },
];

const LEGACY: Record<string, { reading?: Reading; note?: Note; shelf?: Shelf }> = {
  "with-note": { note: "with" },
  "without-note": { note: "without" },
  "example-note": { note: "sample" },
  "without-synopsis": { shelf: "without-synopsis" },
  "out-of-stock": { shelf: "out-of-stock" },
  unread: { reading: "unread" },
  reviewed: { reading: "reviewed" },
};

const STATUS: Record<string, { label: string; tone: "kraft" | "hollow" | "vermilion" }> = {
  pending: { label: "in the queue", tone: "kraft" },
  processing: { label: "reading now", tone: "kraft" },
  insufficient: { label: "too little synopsis", tone: "hollow" },
  error: { label: "reading failed", tone: "vermilion" },
};

type Facets = { reading: Reading; note: Note; shelf: Shelf };

function passes(book: BookDetail, facets: Facets, except?: keyof Facets): boolean {
  return (
    (except === "reading" || READING.find((item) => item.key === facets.reading)!.test(book)) &&
    (except === "note" || NOTE.find((item) => item.key === facets.note)!.test(book)) &&
    (except === "shelf" || SHELF.find((item) => item.key === facets.shelf)!.test(book))
  );
}

function surname(author: string): string {
  const parts = author.trim().split(/\s+/);
  return normalizeText(`${parts.at(-1) ?? ""} ${parts.slice(0, -1).join(" ")}`);
}

function Facet<T extends string>({
  legend,
  options,
  value,
  counts,
  onChange,
}: {
  legend: string;
  options: { key: T; label: string }[];
  value: T;
  counts: Map<T, number>;
  onChange: (key: T) => void;
}) {
  return (
    <div role="group" aria-label={legend} className="facet">
      <span className="eyebrow facet-legend">{legend}</span>
      {options.map((option) => (
        <button key={option.key} type="button" className="facet-option" aria-pressed={value === option.key} onClick={() => onChange(option.key)}>
          {option.label}
          <span className="facet-option-count">{counts.get(option.key) ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

export function BooksTable({ books, initialFilter }: { books: BookDetail[]; initialFilter: string }) {
  const legacy = LEGACY[initialFilter] ?? {};
  const [query, setQuery] = useState("");
  const [reading, setReading] = useState<Reading>(legacy.reading ?? "all");
  const [note, setNote] = useState<Note>(legacy.note ?? "any");
  const [shelf, setShelf] = useState<Shelf>(legacy.shelf ?? "any");
  const [order, setOrder] = useState<Order>("title");
  const [open, setOpen] = useState<number | null>(null);

  const identities = useMemo(() => new Map(books.map((book) => [book.id, spineIdentity(book)])), [books]);

  const searched = useMemo(() => {
    const folded = normalizeText(query);
    if (folded.length === 0) return books;
    return books.filter((book) => normalizeText(`${book.title} ${book.author} ${book.isbn ?? ""} ${book.genre ?? ""}`).includes(folded));
  }, [books, query]);

  const facets: Facets = { reading, note, shelf };
  const counts = {
    reading: new Map(READING.map((item) => [item.key, searched.filter((book) => passes(book, facets, "reading") && item.test(book)).length])),
    note: new Map(NOTE.map((item) => [item.key, searched.filter((book) => passes(book, facets, "note") && item.test(book)).length])),
    shelf: new Map(SHELF.map((item) => [item.key, searched.filter((book) => passes(book, facets, "shelf") && item.test(book)).length])),
  };

  const visible = useMemo(() => {
    const list = searched.filter((book) => passes(book, { reading, note, shelf }));
    const byTitle = (a: BookDetail, b: BookDetail) => a.title.localeCompare(b.title, "en");
    const sorters: Record<Order, (a: BookDetail, b: BookDetail) => number> = {
      title: byTitle,
      author: (a, b) => surname(a.author).localeCompare(surname(b.author), "en") || byTitle(a, b),
      price: (a, b) => (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity) || byTitle(a, b),
      stock: (a, b) => (a.stock ?? Infinity) - (b.stock ?? Infinity) || byTitle(a, b),
      changed: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || byTitle(a, b),
    };
    return [...list].sort(sorters[order]);
  }, [searched, reading, note, shelf, order]);

  const filtered = reading !== "all" || note !== "any" || shelf !== "any" || query.length > 0;

  return (
    <div className="catalogue">
      <div className="catalogue-tools">
        <div className="catalogue-search">
          <label htmlFor="books-filter" className="eyebrow counter-field-label">
            Find a book
          </label>
          <input
            id="books-filter"
            type="search"
            className="catalogue-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="title, author, ISBN or genre"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="facets">
          <Facet legend="Reading" options={READING} value={reading} counts={counts.reading} onChange={setReading} />
          <Facet legend="Notes" options={NOTE} value={note} counts={counts.note} onChange={setNote} />
          <Facet legend="Shelf" options={SHELF} value={shelf} counts={counts.shelf} onChange={setShelf} />
        </div>
      </div>

      <div className="catalogue-bar">
        <p className="eyebrow" aria-live="polite">
          <span className="catalogue-tally">{visible.length}</span> of {books.length} {books.length === 1 ? "book" : "books"}
          {filtered ? (
            <button
              type="button"
              className="catalogue-reset"
              onClick={() => {
                setQuery("");
                setReading("all");
                setNote("any");
                setShelf("any");
              }}
            >
              clear filters
            </button>
          ) : null}
        </p>
        <div role="group" aria-label="Order" className="catalogue-order">
          <span className="eyebrow facet-legend">ordered by</span>
          {ORDERS.map((item) => (
            <button key={item.key} type="button" className="facet-option" aria-pressed={order === item.key} onClick={() => setOrder(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="catalogue-table">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Book</th>
              <th scope="col" className="hide-narrow">
                Form
              </th>
              <th scope="col" className="hide-small">
                Reading
              </th>
              <th scope="col" className="hide-narrow">
                Note
              </th>
              <th scope="col" className="numeric">
                Price
              </th>
              <th scope="col" className="numeric">
                Stock
              </th>
              <th scope="col">
                <span className="sr-only">More</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((book) => {
              const identity = identities.get(book.id);
              const status = STATUS[book.semanticStatus];
              const expanded = open === book.id;
              return (
                <Fragment key={book.id}>
                  <tr className="catalogue-row" data-open={expanded ? "true" : undefined}>
                    <th scope="row">
                      <span className="catalogue-book">
                        <span
                          aria-hidden
                          className="catalogue-spine"
                          style={{
                            background: book.semanticStatus === "ready" ? identity?.color : KRAFT,
                            height: `${Math.round(((identity?.height ?? 200) / 260) * 2.6 * 10) / 10}rem`,
                          }}
                        />
                        <span className="min-w-0">
                          <Link href={`/admin/books/${book.id}`} className="catalogue-title">
                            {book.title}
                          </Link>
                          <span className="catalogue-author">{book.author}</span>
                          {book.semanticStatus === "ready" ? (
                            <span aria-hidden className="catalogue-dots show-small">
                              {book.atmospheres.slice(0, 3).map((id) => (
                                <span key={id} style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                              ))}
                            </span>
                          ) : (
                            <span className="show-small">
                              <Stamp tone={status?.tone ?? "kraft"}>{status?.label ?? book.semanticStatus}</Stamp>
                            </span>
                          )}
                        </span>
                      </span>
                    </th>
                    <td className="hide-narrow">
                      <span className="catalogue-form">
                        {book.genre ?? "—"}
                        {book.year ? <span> · {book.year}</span> : null}
                      </span>
                    </td>
                    <td className="hide-small">
                      {book.semanticStatus === "ready" ? (
                        <span className="catalogue-reading">
                          <span aria-hidden className="catalogue-dots">
                            {book.atmospheres.slice(0, 3).map((id) => (
                              <span key={id} style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                            ))}
                          </span>
                          <span>{book.atmospheres.slice(0, 2).map(atmosphereLabel).join(", ")}</span>
                          {book.semanticOrigin === "bookseller" ? <Stamp tone="vermilion">reviewed</Stamp> : null}
                        </span>
                      ) : (
                        <Stamp tone={status?.tone ?? "kraft"}>{status?.label ?? book.semanticStatus}</Stamp>
                      )}
                    </td>
                    <td className="hide-narrow">
                      {book.note ? (
                        <span className="catalogue-note">
                          {book.noteOrigin === "example" ? <Stamp tone="faint">sample</Stamp> : null}
                          <span className="handwriting catalogue-note-text">{book.note}</span>
                        </span>
                      ) : (
                        <span className="catalogue-empty">—</span>
                      )}
                    </td>
                    <td className="numeric">
                      {formatPrice(book.priceCents) ?? "—"}
                      {book.priceIsDemo ? <span className="catalogue-demo">demo</span> : null}
                    </td>
                    <td className="numeric">{book.stock === 0 ? <span className="catalogue-out">out</span> : (book.stock ?? "—")}</td>
                    <td className="catalogue-more">
                      <button
                        type="button"
                        className="catalogue-peek"
                        aria-expanded={expanded}
                        aria-controls={`peek-${book.id}`}
                        aria-label={`${expanded ? "Hide" : "Show"} the details of ${book.title}`}
                        onClick={() => setOpen(expanded ? null : book.id)}
                      >
                        <span aria-hidden>{expanded ? "−" : "+"}</span>
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr id={`peek-${book.id}`} className="catalogue-peek-row">
                      <td colSpan={7}>
                        <div className="peek">
                          <div className="peek-block">
                            <p className="eyebrow peek-label">Synopsis</p>
                            {book.synopsis ? (
                              <p className="peek-synopsis">{book.synopsis}</p>
                            ) : (
                              <p className="peek-missing">No synopsis yet. Without one, the AI can’t read the book and searches by feeling won’t find it.</p>
                            )}
                            {book.synopsisSource ? <p className="eyebrow peek-source">{book.synopsisSource}</p> : null}
                          </div>
                          <div className="peek-block">
                            <p className="eyebrow peek-label">{book.semanticOrigin === "bookseller" ? "Your reading" : "The AI’s reading"}</p>
                            {book.portrait ? <p className="peek-portrait">{book.portrait}</p> : <p className="peek-missing">Not read yet.</p>}
                            {book.evidence[0] ? (
                              <p className="peek-evidence">
                                <span className="eyebrow">{attributeLabel(book.evidence[0].attribute)}</span> “{book.evidence[0].quote}”
                              </p>
                            ) : null}
                          </div>
                          <div className="peek-block">
                            <p className="eyebrow peek-label">Your note</p>
                            {book.note ? <p className="handwriting peek-note">{book.note}</p> : <p className="peek-missing">No note. Only you write these.</p>}
                            <p className="peek-links">
                              <Link href={`/admin/books/${book.id}`} className="button-quiet">
                                Edit this book →
                              </Link>
                              <a href={`/?book=${book.slug}`} className="button-quiet" target="_blank" rel="noreferrer">
                                See it in the shop ↗
                              </a>
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <div className="blank">
            <p className="blank-line">No book answers to {query ? `“${query}” with these filters` : "these filters"}.</p>
            <p className="blank-hint">Loosen a filter or search by another word from the title, the author or the ISBN.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
