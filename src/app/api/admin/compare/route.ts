import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth/guard";
import { getBookById } from "@/lib/catalog/books";
import { semanticSearch } from "@/lib/search/engine";
import { lexicalSearch } from "@/lib/search/lexical";
import { OllamaError } from "@/lib/semantic/ollama";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Access restricted to the bookshop counter." }, { status: 401 });
  const query = (request.nextUrl.searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
  if (query.length < 2) return NextResponse.json({ error: "Type at least two letters." }, { status: 400 });
  const limit = Math.min(20, Math.max(3, Number(request.nextUrl.searchParams.get("n")) || 8));
  const describe = (id: number) => {
    const book = getBookById(id);
    return book ? { id, slug: book.slug, title: book.title, author: book.author } : null;
  };
  const lexical = lexicalSearch(query, limit).map((hit) => describe(hit.id)).filter((item) => item !== null);
  try {
    const semantic = await semanticSearch(query, { limit });
    return NextResponse.json({
      query,
      lexical,
      semantic: {
        confidence: semantic.confidence,
        message: semantic.message,
        interpretation: semantic.interpretation,
        tookMs: semantic.engine.tookMs,
        results: semantic.results
          .map((result) => {
            const book = describe(result.id);
            return book ? { ...book, reasons: result.reasons.map((reason) => reason.label), matches: result.reasons, quote: result.quote, caveat: result.caveat } : null;
          })
          .filter((item) => item !== null),
      },
    });
  } catch (error) {
    if (error instanceof OllamaError) {
      return NextResponse.json({ query, lexical, semantic: null, error: error.message }, { status: 200 });
    }
    return NextResponse.json({ error: "Comparison failed." }, { status: 500 });
  }
}
