import { NextResponse } from "next/server";
import { getBookBySlug } from "@/lib/catalog/books";
import { noteOpened } from "@/lib/demand";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const book = getBookBySlug(slug);
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const from = Number(new URL(request.url).searchParams.get("from"));
  if (Number.isInteger(from) && from > 0) noteOpened(from, book.id);
  return NextResponse.json(book);
}
