import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookRecord, type Tab } from "@/components/admin/record/BookRecord";
import { getBookById } from "@/lib/catalog/books";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Edit book" };

const TABS: Tab[] = ["details", "reading", "presentation"];

export default async function EditBookPage({ params, searchParams }: PageProps<"/admin/books/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const book = getBookById(Number(id));
  if (!book) notFound();
  const shop = getShopConfig();
  const tab = TABS.find((item) => item === query.tab) ?? "details";

  return (
    <div className="counter-page counter-page-wide">
      <BookRecord key={book.id} book={book} signature={shop.bookseller} shopName={shop.name} initialTab={tab} created={Boolean(query.created)} />
    </div>
  );
}
