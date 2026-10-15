import type { Metadata } from "next";
import Link from "next/link";
import { BooksTable } from "@/components/admin/BooksTable";
import { PageHead } from "@/components/admin/Counter";
import { listBookDetails } from "@/lib/catalog/books";

export const metadata: Metadata = { title: "Books" };

export default async function BooksPage({ searchParams }: PageProps<"/admin/books">) {
  const params = await searchParams;
  const books = listBookDetails().sort((a, b) => a.title.localeCompare(b.title, "en"));
  return (
    <div className="counter-page counter-page-wide">
      <PageHead
        folio="02 · the catalogue"
        title={
          <>
            Books <em>on the shelves</em>
          </>
        }
        actions={
          <>
            <Link href="/admin/import" className="button-quiet">
              Import a spreadsheet
            </Link>
            <Link href="/admin/books/new" className="button">
              Add a book
            </Link>
          </>
        }
      />
      {params.removed ? (
        <p role="status" className="slip slip-enter mb-6">
          The book was removed from the catalogue.
        </p>
      ) : null}
      <BooksTable books={books} initialFilter={typeof params.filter === "string" ? params.filter : "all"} />
    </div>
  );
}
