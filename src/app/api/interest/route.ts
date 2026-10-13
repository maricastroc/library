import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookBySlug } from "@/lib/catalog/books";
import { allowRequest, clientKey } from "@/lib/http/rate-limit";
import { createInterest } from "@/lib/interest";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(2, "Tell us what to call you.").max(80),
  contact: z
    .string()
    .trim()
    .min(5, "Leave an email or phone number so the bookshop can reply.")
    .max(120)
    .refine(
      (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.replace(/\D/g, "").length >= 8,
      "Enter a valid email or phone number.",
    ),
  message: z.string().trim().max(500).optional(),
  query: z.string().trim().max(240).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  if (!allowRequest("interest", clientKey(request), 6, 60_000)) {
    return NextResponse.json({ error: "Too many requests in a short time. Try again in a minute." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid data.", field: issue?.path[0] ?? null },
      { status: 400 },
    );
  }
  const book = getBookBySlug(parsed.data.slug);
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const kind = book.stock !== null && book.stock > 0 ? "reservation" : "notice";
  createInterest({
    bookId: book.id,
    kind,
    name: parsed.data.name,
    contact: parsed.data.contact,
    message: parsed.data.message || null,
    searchQuery: parsed.data.query || null,
  });
  return NextResponse.json({ ok: true, kind });
}
