import { getBookById } from "@/lib/catalog/books";
import { CHAT_MODEL, EMBED_MODEL, type OllamaError } from "@/lib/semantic/ollama";
import { lexicalSearch } from "./lexical";
import type { SearchResponse } from "./types";

export function lexicalFallback(query: string, error: OllamaError): SearchResponse {
  const hits = lexicalSearch(query, 8);
  const reason =
    error.kind === "model"
      ? "O modelo de embeddings não está instalado no Ollama deste computador."
      : "A IA local (Ollama) não está respondendo.";
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
        ? `${reason} Por enquanto a estante só consegue procurar pelas palavras exatas da sua busca.`
        : `${reason} A busca por palavras também não encontrou nada.`,
    results: hits.map((hit) => ({
      id: hit.id,
      slug: hit.slug,
      score: hit.score,
      similarity: 0,
      reasons: [{ kind: "similarity" as const, label: "palavras da busca aparecem no título, autor ou sinopse" }],
      quote: null,
      caveat: getBookById(hit.id) ? "Resultado por palavras-chave, sem interpretação de intenção." : null,
    })),
    engine: { embedModel: EMBED_MODEL, classifierModel: CHAT_MODEL, tookMs: 0, cached: false },
  };
}
