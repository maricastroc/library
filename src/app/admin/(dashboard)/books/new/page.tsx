import type { Metadata } from "next";
import Link from "next/link";
import { BookForm } from "@/components/admin/BookForm";

export const metadata: Metadata = { title: "Cadastrar livro" };

export default function NewBookPage() {
  return (
    <div className="max-w-4xl">
      <Link href="/admin/books" className="eyebrow ink-link">
        ← Livros
      </Link>
      <h1 className="display mt-3 text-[2.6rem] leading-none">Cadastrar livro</h1>
      <p className="mt-3 text-ink-soft">Depois de salvo, o livro já aparece na estante em papel pardo, até a IA ler a sinopse.</p>
      <div className="mt-8">
        <BookForm book={null} />
      </div>
    </div>
  );
}
