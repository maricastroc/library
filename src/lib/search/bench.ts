export type Ranked = { id: number; title: string; author: string };
export type SystemName = "lexical" | "embedding" | "full";
export type Rival = Exclude<SystemName, "full">;
export type Outcome = "better" | "level" | "worse";
export type BenchShow = "all" | Outcome | "ungraded";
export type BenchFilter = { show: BenchShow; against: Rival; kind: string | null };

export type BenchQuery = {
  id: string;
  type: string;
  query: string;
  expects?: "abstain" | "limitation" | null;
  abstentionCorrect?: boolean;
  confidence: string;
  message: string | null;
  systems: Record<SystemName, Ranked[]>;
  grades: Record<string, number>;
  metrics: Record<SystemName, { ndcg5: number | null }>;
};

export type BenchReport = {
  summary: {
    generatedAt: string;
    models: { embeddings: string; classifier: string; judge: string | null };
    overall: Record<SystemName, { p5: number | null; ndcg5: number | null; emptyQueries: number }>;
    byType: Record<string, Record<SystemName, number | null>>;
    abstention: { outOfScopeDeclined: number; outOfScopeTotal: number; inScopeAnswered: number; inScopeTotal: number };
  };
  queries: BenchQuery[];
};

export const SYSTEMS: { key: SystemName; label: string; gist: string; description: string }[] = [
  { key: "lexical", label: "Keywords", gist: "the words of the request", description: "FTS5/BM25 over title, author, genre, synopsis and note" },
  { key: "embedding", label: "Embeddings only", gist: "closeness of meaning to the synopsis", description: "closeness between the query and the synopsis" },
  { key: "full", label: "Shelf", gist: "reads the request, then reranks by reading", description: "reads the request, then embeddings and reranking by attributes" },
];

export const RIVALS: { key: Rival; label: string; short: string }[] = [
  { key: "embedding", label: "embeddings only", short: "embeddings" },
  { key: "lexical", label: "keywords", short: "keywords" },
];

export const KINDS: Record<string, { label: string; gist: string; adjective?: string; phrase: string }> = {
  emotional: { label: "Emotional", gist: "a mood or a feeling to find", adjective: "emotional", phrase: "emotional requests" },
  abstract: { label: "Abstract", gist: "an image or a sensation, not a subject", adjective: "abstract", phrase: "abstract requests" },
  author: { label: "Author", gist: "a writer or a book as the reference", adjective: "author", phrase: "author requests" },
  negative: { label: "With a “but”", gist: "something wanted and something to avoid", phrase: "requests with a “but”" },
  ambiguous: { label: "Loose", gist: "one or two open words", adjective: "loose", phrase: "loose requests" },
  "no-match": { label: "Not a bookshop request", gist: "outside what the shop sells", phrase: "requests outside the shop" },
  unanswerable: { label: "A judgement", gist: "asks for an opinion the catalogue cannot hold", phrase: "requests for a judgement" },
};

export const LEVEL = 0.05;

export const formatScore = (value: number | null | undefined) => (value === null || value === undefined ? "—" : value.toFixed(2));
export const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(2)}`;
export const score = (query: BenchQuery, system: SystemName) => query.metrics[system].ndcg5 ?? 0;
export const isGraded = (query: BenchQuery) => query.expects !== "abstain";

export function outcome(query: BenchQuery, against: Rival): Outcome {
  const difference = score(query, "full") - score(query, against);
  return difference >= LEVEL ? "better" : difference <= -LEVEL ? "worse" : "level";
}

export function duel(queries: BenchQuery[], against: Rival) {
  const marks = queries.map((query) => outcome(query, against));
  return {
    marks,
    better: marks.filter((mark) => mark === "better").length,
    level: marks.filter((mark) => mark === "level").length,
    worse: marks.filter((mark) => mark === "worse").length,
  };
}

export function standing(result: { better: number; worse: number }): string {
  if (result.better - result.worse > 2 && result.better >= result.worse * 2) return "clearly ahead of";
  if (result.better - result.worse > 2) return "ahead of";
  if (result.worse - result.better > 2) return "behind";
  return "level with";
}

export function kindStanding(row: Record<SystemName, number | null>): { leads: boolean; behind: Rival | null } {
  const shelf = row.full ?? 0;
  const rivals = RIVALS.map((rival) => ({ key: rival.key, value: row[rival.key] ?? 0 }));
  const best = Math.max(...rivals.map((rival) => rival.value));
  const ahead = rivals.find((rival) => rival.value - shelf >= LEVEL && rival.value === best);
  return { leads: rivals.every((rival) => shelf - rival.value >= LEVEL), behind: ahead?.key ?? null };
}

export function kindsPhrase(types: string[]): string {
  const adjectives = types.map((type) => KINDS[type]?.adjective).filter((word): word is string => Boolean(word));
  const others = types.filter((type) => !KINDS[type]?.adjective).map((type) => KINDS[type]?.phrase ?? type);
  return listWords([...(adjectives.length > 0 ? [`${listWords(adjectives)} requests`] : []), ...others]);
}

export function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function filterHash(filter: Partial<BenchFilter>): string {
  return `#queries/${filter.show ?? "all"}/${filter.against ?? "embedding"}${filter.kind ? `/${filter.kind}` : ""}`;
}
