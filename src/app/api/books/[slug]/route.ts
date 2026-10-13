import { NextResponse } from "next/server";
import { getBookBySlug } from "@/lib/catalog/books";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const book = getBookBySlug(slug);
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  return NextResponse.json(book);
}
