import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reclassifyBook, removeBook } from "@/app/admin/actions";
import { ClassificationForm } from "@/components/admin/ClassificationForm";
import { ConfirmRemoval } from "@/components/admin/ConfirmRemoval";
import { BookForm } from "@/components/admin/BookForm";
import { getBookById } from "@/lib/catalog/books";
import { attributeLabel, confidenceLabel } from "@/lib/semantic/taxonomy";

export const metadata: Metadata = { title: "Editar livro" };

export default async function EditBookPage({ params, searchParams }: PageProps<"/admin/books/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const book = getBookById(Number(id));
  if (!book) notFound();

  const statusText: Record<string, string> = {
    pending: "Este livro está na fila para a IA ler a sinopse.",
    processing: "A IA está lendo a sinopse agora.",
    insufficient: book.semanticError ?? "A sinopse não é suficiente para uma classificação responsável.",
    error: `A leitura falhou: ${book.semanticError ?? "erro desconhecido"}.`,
  };

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/books" className="eyebrow ink-link">
          ← Livros
        </Link>
        <Link href={`/?book=${book.slug}`} className="eyebrow ink-link">
          Ver na estante
        </Link>
      </div>
      <h1 className="display mt-3 text-balance text-[2.6rem] leading-[1.02]">{book.title}</h1>
      <p className="display-italic mt-1 text-[1.3rem] text-ink-soft">{book.author}</p>
      {query.created ? (
        <p role="status" className="mt-4 border-l-2 border-ink pl-3">
          Livro cadastrado. A leitura da IA começa em segundo plano.
        </p>
      ) : null}

      <section aria-labelledby="book-data-heading" className="mt-10">
        <h2 id="book-data-heading" className="eyebrow border-b border-ink pb-2 text-ink">
          Dados, preço e nota
        </h2>
        <div className="mt-6">
          <BookForm key={book.id} book={book} />
        </div>
      </section>

      <section aria-labelledby="reading-heading" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-2">
          <h2 id="reading-heading" className="eyebrow text-ink">
            Como a estante lê este livro
          </h2>
          <p className="eyebrow text-ink-soft">
            {book.semanticStatus !== "ready"
              ? "sem classificação"
              : book.semanticOrigin === "bookseller"
                ? "revisado por você"
                : `leitura da IA · ${book.semanticModel ?? "modelo local"} · confiança ${confidenceLabel(book.confidence)}`}
          </p>
        </div>
        {book.semanticStatus !== "ready" ? (
          <p className="mt-4 border-l-2 border-vermilion pl-3 text-[0.98rem]">{statusText[book.semanticStatus]}</p>
        ) : null}
        <div className="mt-6">
          <ClassificationForm key={`${book.id}-${book.semanticStatus}`} book={book} />
        </div>
        {book.evidence.length > 0 ? (
          <div className="mt-8">
            <h3 className="eyebrow text-ink-soft">Trechos da sinopse em que a IA se apoiou</h3>
            <ul className="mt-2 space-y-1.5 text-[0.98rem]">
              {book.evidence.map((item) => (
                <li key={item.quote}>
                  <span className="font-label font-semibold">{attributeLabel(item.attribute)}</span>: <span className="italic">“{item.quote}”</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <form action={reclassifyBook} className="mt-6">
          <input type="hidden" name="id" value={book.id} />
          <button type="submit" className="button button-outline" disabled={!book.synopsis}>
            Pedir nova leitura à IA
          </button>
          <p className="mt-2 text-[0.85rem] text-ink-soft">
            Descarta a classificação atual (inclusive a sua revisão) e relê a sinopse com o modelo local.
          </p>
        </form>
      </section>

      <section aria-labelledby="remove-book-heading" className="mt-14 border-t border-ink/30 pt-6">
        <h2 id="remove-book-heading" className="eyebrow text-ink">
          Remover do catálogo
        </h2>
        <ConfirmRemoval action={removeBook} id={book.id} label="Remover este livro" question={`Remover "${book.title}" do catálogo? Reservas e presença em vitrines também serão apagadas.`} />
      </section>
    </div>
  );
}
