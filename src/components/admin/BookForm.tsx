"use client";

import { useActionState } from "react";
import { saveBook } from "@/app/admin/actions";
import { formatIsbn } from "@/lib/catalog/isbn";
import type { BookDetail } from "@/lib/catalog/types";
import { GENRES } from "@/lib/semantic/taxonomy";
import { Field, SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

function priceValue(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
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
        <Field label="Título" name="title" error={errors.title}>
          <input id="title" name="title" className="field" defaultValue={book?.title ?? ""} required maxLength={200} {...invalid("title")} />
        </Field>
        <Field label="Autor(a)" name="author" error={errors.author}>
          <input id="author" name="author" className="field" defaultValue={book?.author ?? ""} required maxLength={160} {...invalid("author")} />
        </Field>
        <Field label="ISBN" name="isbn" error={errors.isbn} hint="10 ou 13 dígitos. Deixe vazio se não tiver certeza.">
          <input id="isbn" name="isbn" className="field font-mono text-[0.95rem]" defaultValue={formatIsbn(book?.isbn ?? null) ?? ""} inputMode="numeric" {...invalid("isbn")} />
        </Field>
        <Field label="Gênero" name="genre">
          <select id="genre" name="genre" className="field" defaultValue={book?.genre ?? ""}>
            <option value="">Sem gênero</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Editora" name="publisher">
          <input id="publisher" name="publisher" className="field" defaultValue={book?.publisher ?? ""} maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Ano" name="year" error={errors.year}>
            <input id="year" name="year" className="field" defaultValue={book?.year ?? ""} inputMode="numeric" {...invalid("year")} />
          </Field>
          <Field label="Páginas" name="pages" error={errors.pages}>
            <input id="pages" name="pages" className="field" defaultValue={book?.pages ?? ""} inputMode="numeric" {...invalid("pages")} />
          </Field>
        </div>
        <Field
          label="Preço (R$)"
          name="price"
          error={errors.price}
          hint={book?.priceIsDemo ? "Valor demonstrativo. Ao alterar, passa a valer como preço real." : undefined}
        >
          <input id="price" name="price" className="field" defaultValue={priceValue(book?.priceCents)} inputMode="decimal" placeholder="49,90" {...invalid("price")} />
        </Field>
        <Field
          label="Exemplares em estoque"
          name="stock"
          error={errors.stock}
          hint={book?.stockIsDemo ? "Estoque demonstrativo. Ao alterar, passa a valer como real." : "Zero mostra o livro como esgotado."}
        >
          <input id="stock" name="stock" className="field" defaultValue={book?.stock ?? ""} inputMode="numeric" {...invalid("stock")} />
        </Field>
      </div>

      <Field label="Sinopse" name="synopsis" hint="É este texto que a IA lê para descrever o livro. Sem sinopse, a busca por intenção não o encontra.">
        <textarea id="synopsis" name="synopsis" className="field min-h-[11rem] leading-relaxed" defaultValue={book?.synopsis ?? ""} maxLength={6000} />
      </Field>

      <div className="ruled bg-[#fbf7ea] px-5 pb-4 pt-4 shadow-[0_14px_22px_-18px_rgb(28_26_23/0.5)]">
        <label htmlFor="note" className="eyebrow text-ink-soft">
          Sua nota para este livro
        </label>
        <textarea
          id="note"
          name="note"
          className="handwriting mt-1 block w-full resize-none border-0 bg-transparent text-[1.55rem] text-ink placeholder:text-ink-soft/85 focus:outline-none"
          style={{ lineHeight: "1.55em" }}
          rows={3}
          maxLength={280}
          defaultValue={book?.note ?? ""}
          placeholder="Escreva como se deixasse um bilhete na prateleira…"
        />
        <p className="eyebrow mt-1 text-[9px] text-ink-soft">
          {book?.noteOrigin === "example"
            ? "Esta é uma nota de exemplo da demonstração. Ao reescrever, ela passa a ser assinada por você."
            : "Aparece na estante como plaquinha e dentro do livro. Só gente escreve notas: a IA nunca preenche este campo."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{book ? "Salvar livro" : "Cadastrar livro"}</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
