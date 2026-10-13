import type { Metadata } from "next";
import Link from "next/link";
import { BooksTable } from "@/components/admin/BooksTable";
import { listBookDetails } from "@/lib/catalog/books";

export const metadata: Metadata = { title: "Livros" };

export default async function BooksPage({ searchParams }: PageProps<"/admin/books">) {
  const params = await searchParams;
  const books = listBookDetails().sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[2.6rem] leading-none">Livros</h1>
        <div className="flex gap-3">
          <Link href="/admin/import" className="button button-outline">
            Importar CSV
          </Link>
          <Link href="/admin/books/new" className="button">
            Cadastrar livro
          </Link>
        </div>
      </div>
      {params.removed ? (
        <p role="status" className="mt-4 border-l-2 border-ink pl-3">
          Livro removido do catálogo.
        </p>
      ) : null}
      <div className="mt-6">
        <BooksTable books={books} initialFilter={typeof params.filter === "string" ? params.filter : "all"} />
      </div>
    </div>
  );
}
