import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reclassifyBook, removeBook } from "@/app/admin/actions";
import { ClassificationForm } from "@/components/admin/ClassificationForm";
import { ConfirmRemoval } from "@/components/admin/ConfirmRemoval";
import { BookForm } from "@/components/admin/BookForm";
import { getBookById } from "@/lib/catalog/books";
import { attributeLabel, confidenceLabel } from "@/lib/semantic/taxonomy";

export const metadata: Metadata = { title: "Edit book" };

export default async function EditBookPage({ params, searchParams }: PageProps<"/admin/books/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const book = getBookById(Number(id));
  if (!book) notFound();

  const statusText: Record<string, string> = {
    pending: "This book is in the queue for the AI to read its synopsis.",
    processing: "The AI is reading the synopsis right now.",
    insufficient: book.semanticError ?? "The synopsis isn’t enough for a responsible classification.",
    error: `The reading failed: ${book.semanticError ?? "unknown error"}.`,
  };

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/books" className="eyebrow ink-link">
          ← Books
        </Link>
        <Link href={`/?book=${book.slug}`} className="eyebrow ink-link">
          View on the shelf
        </Link>
      </div>
      <h1 className="display mt-3 text-balance text-[2.6rem] leading-[1.02]">{book.title}</h1>
      <p className="display-italic mt-1 text-[1.3rem] text-ink-soft">{book.author}</p>
      {query.created ? (
        <p role="status" className="mt-4 border-l-2 border-ink pl-3">
          Book added. The AI reading starts in the background.
        </p>
      ) : null}

      <section aria-labelledby="book-data-heading" className="mt-10">
        <h2 id="book-data-heading" className="eyebrow border-b border-ink pb-2 text-ink">
          Details, price and note
        </h2>
        <div className="mt-6">
          <BookForm key={book.id} book={book} />
        </div>
      </section>

      <section aria-labelledby="reading-heading" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-2">
          <h2 id="reading-heading" className="eyebrow text-ink">
            How the shelf reads this book
          </h2>
          <p className="eyebrow text-ink-soft">
            {book.semanticStatus !== "ready"
              ? "no classification"
              : book.semanticOrigin === "bookseller"
                ? "reviewed by you"
                : `AI reading · ${book.semanticModel ?? "local model"} · ${confidenceLabel(book.confidence)} confidence`}
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
            <h3 className="eyebrow text-ink-soft">Excerpts from the synopsis the AI relied on</h3>
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
            Ask the AI for a new reading
          </button>
          <p className="mt-2 text-[0.85rem] text-ink-soft">
            Discards the current classification (including your review) and rereads the synopsis with the local model.
          </p>
        </form>
      </section>

      <section aria-labelledby="remove-book-heading" className="mt-14 border-t border-ink/30 pt-6">
        <h2 id="remove-book-heading" className="eyebrow text-ink">
          Remove from the catalog
        </h2>
        <ConfirmRemoval action={removeBook} id={book.id} label="Remove this book" question={`Remove "${book.title}" from the catalog? Its reservations and its place in showcases will be deleted too.`} />
      </section>
    </div>
  );
}
