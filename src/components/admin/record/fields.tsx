"use client";

import { formatIsbn } from "@/lib/catalog/isbn";
import type { BookDetail } from "@/lib/catalog/types";
import { GENRES } from "@/lib/semantic/taxonomy";
import { Field } from "../FormParts";
import { RailedTextarea } from "../RailedTextarea";

export const RECORD_FORM = "record-form";

export const RECORD_FIELDS = ["title", "author", "genre", "isbn", "publisher", "year", "pages", "synopsis", "note", "price", "stock"] as const;
export type RecordField = (typeof RECORD_FIELDS)[number];
export type RecordValues = Record<RecordField, string>;

export const FIELD_NAMES: Record<RecordField, string> = {
  title: "title",
  author: "author",
  genre: "genre",
  isbn: "ISBN",
  publisher: "publisher",
  year: "year",
  pages: "pages",
  synopsis: "synopsis",
  note: "note",
  price: "price",
  stock: "stock",
};

export const READING_INPUTS: RecordField[] = ["title", "author", "genre", "synopsis"];

type Errors = Record<string, string>;

function priceValue(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

export function recordValues(book: BookDetail | null): RecordValues {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    genre: book?.genre ?? "",
    isbn: formatIsbn(book?.isbn ?? null) ?? "",
    publisher: book?.publisher ?? "",
    year: book?.year ? String(book.year) : "",
    pages: book?.pages ? String(book.pages) : "",
    synopsis: book?.synopsis ?? "",
    note: book?.note ?? "",
    price: priceValue(book?.priceCents),
    stock: book?.stock !== null && book?.stock !== undefined ? String(book.stock) : "",
  };
}

export function readRecord(data: FormData): RecordValues {
  const values = {} as RecordValues;
  for (const field of RECORD_FIELDS) values[field] = String(data.get(field) ?? "").replace(/\r\n/g, "\n");
  return values;
}

export function changedFields(values: RecordValues, baseline: RecordValues): RecordField[] {
  return RECORD_FIELDS.filter((field) => values[field].trim() !== baseline[field].trim());
}

function invalid(errors: Errors, name: string) {
  return { "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined };
}

export function BibliographicFields({ book, errors }: { book: BookDetail | null; errors: Errors }) {
  const genres = book?.genre && !GENRES.includes(book.genre as (typeof GENRES)[number]) ? [book.genre, ...GENRES] : [...GENRES];
  return (
    <div className="sheet-grid">
      <Field label="Title" name="title" error={errors.title} className="sheet-full">
        <input id="title" name="title" form={RECORD_FORM} className="field record-title-field" defaultValue={book?.title ?? ""} required maxLength={200} {...invalid(errors, "title")} />
      </Field>
      <Field label="Author" name="author" error={errors.author} className="sheet-wide">
        <input id="author" name="author" form={RECORD_FORM} className="field" defaultValue={book?.author ?? ""} required maxLength={160} {...invalid(errors, "author")} />
      </Field>
      <Field label="Genre" name="genre" className="sheet-narrow">
        <select id="genre" name="genre" form={RECORD_FORM} className="field" defaultValue={book?.genre ?? ""}>
          <option value="">No genre</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Publisher" name="publisher" className="sheet-wide">
        <input id="publisher" name="publisher" form={RECORD_FORM} className="field" defaultValue={book?.publisher ?? ""} maxLength={120} />
      </Field>
      <Field label="Year" name="year" error={errors.year} className="sheet-narrow">
        <input id="year" name="year" form={RECORD_FORM} className="field font-mono text-[0.95rem]" defaultValue={book?.year ?? ""} inputMode="numeric" {...invalid(errors, "year")} />
      </Field>
      <Field label="ISBN" name="isbn" error={errors.isbn} hint="10 or 13 digits. Leave it empty if you’re not sure." className="sheet-wide">
        <input id="isbn" name="isbn" form={RECORD_FORM} className="field font-mono text-[0.95rem]" defaultValue={formatIsbn(book?.isbn ?? null) ?? ""} inputMode="numeric" {...invalid(errors, "isbn")} />
      </Field>
      <Field label="Pages" name="pages" error={errors.pages} className="sheet-narrow">
        <input id="pages" name="pages" form={RECORD_FORM} className="field font-mono text-[0.95rem]" defaultValue={book?.pages ?? ""} inputMode="numeric" {...invalid(errors, "pages")} />
      </Field>
    </div>
  );
}

export function SynopsisField({ book, words }: { book: BookDetail | null; words: number }) {
  return (
    <div className="sheet-synopsis">
      <Field label="What the book is about" name="synopsis" hint="The text the AI reads to describe the book. Without it, searches by feeling won’t find the book.">
        <RailedTextarea id="synopsis" name="synopsis" form={RECORD_FORM} className="field record-synopsis" defaultValue={book?.synopsis ?? ""} maxLength={6000} />
      </Field>
      <p className="eyebrow sheet-synopsis-meta">
        <span>{words === 1 ? "1 word" : `${words.toLocaleString("en-GB")} words`}</span>
        {book?.synopsisSource ? (
          <span>
            source:{" "}
            {book.synopsisUrl ? (
              <a href={book.synopsisUrl} className="ink-link" target="_blank" rel="noreferrer">
                {book.synopsisSource}
              </a>
            ) : (
              book.synopsisSource
            )}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function NoteCard({ book, signature }: { book: BookDetail | null; signature: string }) {
  return (
    <div className="sheet-note">
      <div className="note-card">
        <label htmlFor="note" className="sr-only">
          Your note for this book
        </label>
        <RailedTextarea
          id="note"
          name="note"
          form={RECORD_FORM}
          className="handwriting note-card-field"
          rows={4}
          maxLength={280}
          defaultValue={book?.note ?? ""}
          placeholder="Write as if you were leaving a note beside the book…"
        />
        <p className="eyebrow note-card-sign">
          {book?.noteOrigin === "example" ? "sample note from the demo · rewrite it and it’s signed by you" : `— ${signature || "the bookseller"}`}
        </p>
      </div>
      <p className="counter-field-hint">A handwritten card beside the book and inside its jacket. Only people write notes: the AI never fills this in.</p>
    </div>
  );
}

export function ShelfFields({ book, errors }: { book: BookDetail | null; errors: Errors }) {
  return (
    <div className="sheet-grid sheet-grid-pair">
      <Field label="Price (R$)" name="price" error={errors.price} hint={book?.priceIsDemo ? "A demo price. Once you change it, it counts as the real one." : undefined}>
        <input id="price" name="price" form={RECORD_FORM} className="field font-mono text-[0.95rem]" defaultValue={priceValue(book?.priceCents)} inputMode="decimal" placeholder="49.90" {...invalid(errors, "price")} />
      </Field>
      <Field
        label="Copies in stock"
        name="stock"
        error={errors.stock}
        hint={book?.stockIsDemo ? "Demo stock. Once you change it, it counts as real." : "Zero shows the book as out of stock."}
      >
        <input id="stock" name="stock" form={RECORD_FORM} className="field font-mono text-[0.95rem]" defaultValue={book?.stock ?? ""} inputMode="numeric" {...invalid(errors, "stock")} />
      </Field>
    </div>
  );
}
