import type { Metadata } from "next";
import Link from "next/link";
import { BookForm } from "@/components/admin/BookForm";

export const metadata: Metadata = { title: "Add book" };

export default function NewBookPage() {
  return (
    <div className="max-w-4xl">
      <Link href="/admin/books" className="eyebrow ink-link">
        ← Books
      </Link>
      <h1 className="display mt-3 text-[2.6rem] leading-none">Add book</h1>
      <p className="mt-3 text-ink-soft">Once saved, the book shows up on the shelf right away in kraft paper, until the AI reads the synopsis.</p>
      <div className="mt-8">
        <BookForm book={null} />
      </div>
    </div>
  );
}
