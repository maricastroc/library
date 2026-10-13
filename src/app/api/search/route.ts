import { NextResponse, type NextRequest } from "next/server";
import { allowRequest, clientKey } from "@/lib/http/rate-limit";
import { semanticSearch } from "@/lib/search/engine";
import { lexicalFallback } from "@/lib/search/fallback";
import { OllamaError } from "@/lib/semantic/ollama";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
  if (query.length < 2) {
    return NextResponse.json({ error: "Escreva pelo menos duas letras para buscar." }, { status: 400 });
  }
  if (!allowRequest("search", clientKey(request), 40, 60_000)) {
    return NextResponse.json({ error: "Muitas buscas em pouco tempo. Tente de novo em um minuto." }, { status: 429 });
  }
  try {
    return NextResponse.json(await semanticSearch(query));
  } catch (error) {
    if (error instanceof OllamaError) return NextResponse.json(lexicalFallback(query, error));
    console.error("[busca]", error);
    return NextResponse.json({ error: "A estante não conseguiu responder agora." }, { status: 500 });
  }
}
