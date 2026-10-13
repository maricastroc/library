"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice, normalizeText } from "@/lib/catalog/text";
import type { BookDetail } from "@/lib/catalog/types";
import { atmosphereLabel } from "@/lib/semantic/taxonomy";

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "with-note", label: "Com nota" },
  { key: "without-note", label: "Sem nota" },
  { key: "example-note", label: "Nota de exemplo" },
  { key: "without-synopsis", label: "Sem sinopse" },
  { key: "out-of-stock", label: "Esgotados" },
  { key: "unread", label: "Sem leitura da IA" },
  { key: "reviewed", label: "Revisados por mim" },
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
  pending: "na fila",
  processing: "lendo…",
  insufficient: "sinopse insuficiente",
  error: "erro na leitura",
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
            Procurar por título, autor ou ISBN
          </label>
          <input id="books-filter" className="field" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
        </div>
        <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-1">
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
        {visible.length} de {books.length} livros
      </p>
      <div className="mt-2 overflow-x-auto border-t-2 border-ink">
        <table className="w-full min-w-[46rem] border-collapse text-left text-[0.95rem]">
          <thead>
            <tr className="eyebrow border-b border-ink text-ink-soft">
              <th scope="col" className="py-2 pr-4 font-normal">Livro</th>
              <th scope="col" className="py-2 pr-4 font-normal">Gênero</th>
              <th scope="col" className="py-2 pr-4 font-normal">Leitura</th>
              <th scope="col" className="py-2 pr-4 font-normal">Nota</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Preço</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Estoque</th>
              <th scope="col" className="py-2 font-normal">
                <span className="sr-only">Ações</span>
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
                      {book.semanticOrigin === "bookseller" ? <span className="eyebrow ml-1.5 text-[8.5px] text-vermilion">revisado</span> : null}
                    </>
                  ) : (
                    <span className="text-ink-soft">{STATUS_LABEL[book.semanticStatus] ?? book.semanticStatus}</span>
                  )}
                </td>
                <td className="py-2 pr-4 font-label text-[0.85rem]">
                  {book.note ? (book.noteOrigin === "example" ? <span className="text-vermilion">de exemplo</span> : "sim") : <span className="text-ink-soft">—</span>}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-[0.82rem]">
                  {formatPrice(book.priceCents) ?? "—"}
                  {book.priceIsDemo ? <span className="block text-[8.5px] uppercase tracking-wider text-ink-soft">demo</span> : null}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-[0.82rem]">{book.stock ?? "—"}</td>
                <td className="py-2 text-right">
                  <Link href={`/admin/books/${book.id}`} className="eyebrow ink-link">
                    editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? <p className="py-10 text-center text-ink-soft">Nenhum livro corresponde a esse filtro.</p> : null}
      </div>
    </div>
  );
}
