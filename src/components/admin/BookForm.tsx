"use client";

import { useActionState } from "react";
import { saveBook } from "@/app/admin/actions";
import { formatIsbn } from "@/lib/catalog/isbn";
import type { BookDetail } from "@/lib/catalog/types";
import { GENRES } from "@/lib/semantic/taxonomy";
import { Field, SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

function priceValue(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

export function BookForm({ book }: { book: BookDetail | null }) {
  const [state, action] = useActionState(saveBook, INITIAL_FORM_STATE);
  const errors = state.fields ?? {};
  const genres = book?.genre && !GENRES.includes(book.genre as (typeof GENRES)[number]) ? [book.genre, ...GENRES] : [...GENRES];
  const invalid = (name: string) => ({ "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined });

  return (
    <form action={action} className="space-y-6" noValidate>
      {book ? <input type="hidden" name="id" value={book.id} /> : null}
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <Field label="Title" name="title" error={errors.title}>
          <input id="title" name="title" className="field" defaultValue={book?.title ?? ""} required maxLength={200} {...invalid("title")} />
        </Field>
        <Field label="Author" name="author" error={errors.author}>
          <input id="author" name="author" className="field" defaultValue={book?.author ?? ""} required maxLength={160} {...invalid("author")} />
        </Field>
        <Field label="ISBN" name="isbn" error={errors.isbn} hint="10 or 13 digits. Leave it empty if you’re not sure.">
          <input id="isbn" name="isbn" className="field font-mono text-[0.95rem]" defaultValue={formatIsbn(book?.isbn ?? null) ?? ""} inputMode="numeric" {...invalid("isbn")} />
        </Field>
        <Field label="Genre" name="genre">
          <select id="genre" name="genre" className="field" defaultValue={book?.genre ?? ""}>
            <option value="">No genre</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Publisher" name="publisher">
          <input id="publisher" name="publisher" className="field" defaultValue={book?.publisher ?? ""} maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Year" name="year" error={errors.year}>
            <input id="year" name="year" className="field" defaultValue={book?.year ?? ""} inputMode="numeric" {...invalid("year")} />
          </Field>
          <Field label="Pages" name="pages" error={errors.pages}>
            <input id="pages" name="pages" className="field" defaultValue={book?.pages ?? ""} inputMode="numeric" {...invalid("pages")} />
          </Field>
        </div>
        <Field
          label="Price (R$)"
          name="price"
          error={errors.price}
          hint={book?.priceIsDemo ? "Demo price. Once you change it, it counts as the real price." : undefined}
        >
          <input id="price" name="price" className="field" defaultValue={priceValue(book?.priceCents)} inputMode="decimal" placeholder="49.90" {...invalid("price")} />
        </Field>
        <Field
          label="Copies in stock"
          name="stock"
          error={errors.stock}
          hint={book?.stockIsDemo ? "Demo stock. Once you change it, it counts as real." : "Zero shows the book as out of stock."}
        >
          <input id="stock" name="stock" className="field" defaultValue={book?.stock ?? ""} inputMode="numeric" {...invalid("stock")} />
        </Field>
      </div>

      <Field label="Synopsis" name="synopsis" hint="This is the text the AI reads to describe the book. Without a synopsis, search by intent won’t find it.">
        <textarea id="synopsis" name="synopsis" className="field min-h-[11rem] leading-relaxed" defaultValue={book?.synopsis ?? ""} maxLength={6000} />
      </Field>

      <div className="ruled bg-[#fbf7ea] px-5 pb-4 pt-4 shadow-[0_14px_22px_-18px_rgb(28_26_23/0.5)]">
        <label htmlFor="note" className="eyebrow text-ink-soft">
          Your note for this book
        </label>
        <textarea
          id="note"
          name="note"
          className="handwriting mt-1 block w-full resize-none border-0 bg-transparent text-[1.55rem] text-ink placeholder:text-ink-soft/85 focus:outline-none"
          style={{ lineHeight: "1.55em" }}
          rows={3}
          maxLength={280}
          defaultValue={book?.note ?? ""}
          placeholder="Write as if you were leaving a note beside the book…"
        />
        <p className="eyebrow mt-1 text-[9px] text-ink-soft">
          {book?.noteOrigin === "example"
            ? "This is a sample note from the demo. Once you rewrite it, it’s signed by you."
            : "Appears as a handwritten card beside the book and inside its jacket. Only people write notes: the AI never fills in this field."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{book ? "Save book" : "Add book"}</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
