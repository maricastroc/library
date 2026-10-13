import { getBookById } from "@/lib/catalog/books";
import { CHAT_MODEL, EMBED_MODEL, type OllamaError } from "@/lib/semantic/ollama";
import { lexicalSearch } from "./lexical";
import type { SearchResponse } from "./types";

export function lexicalFallback(query: string, error: OllamaError): SearchResponse {
  const hits = lexicalSearch(query, 8);
  const reason =
    error.kind === "model"
      ? "The embedding model is not installed in Ollama on this computer."
      : "The local AI (Ollama) is not responding.";
  return {
    query,
    fallback: "lexical",
    interpretation: {
      positive: query,
      avoid: [],
      unassessable: [],
      atmospheres: [],
      avoidAtmospheres: [],
      inferredAtmospheres: [],
      pace: null,
      length: null,
      era: null,
      genres: [],
      reference: null,
    },
    confidence: hits.length > 0 ? "low" : "none",
    message:
      hits.length > 0
        ? `${reason} For now the shelf can only look for the exact words of your search.`
        : `${reason} The keyword search found nothing either.`,
    results: hits.map((hit) => ({
      id: hit.id,
      slug: hit.slug,
      score: hit.score,
      similarity: 0,
      reasons: [{ kind: "similarity" as const, label: "words from the search appear in the title, author or synopsis" }],
      quote: null,
      caveat: getBookById(hit.id) ? "Keyword result, with no interpretation of intent." : null,
    })),
    engine: { embedModel: EMBED_MODEL, classifierModel: CHAT_MODEL, tookMs: 0, cached: false },
  };
}
