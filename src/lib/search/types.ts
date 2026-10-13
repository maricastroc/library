import type { AtmosphereId } from "@/lib/semantic/taxonomy";

export type ReasonKind =
  | "atmosphere"
  | "theme"
  | "pace"
  | "length"
  | "era"
  | "genre"
  | "style"
  | "experience"
  | "reference"
  | "author"
  | "note"
  | "similarity";

export type Reason = {
  kind: ReasonKind;
  label: string;
};

export type SearchResult = {
  id: number;
  slug: string;
  score: number;
  similarity: number;
  reasons: Reason[];
  quote: string | null;
  caveat: string | null;
};

export type Interpretation = {
  positive: string;
  avoid: string[];
  unassessable: string[];
  atmospheres: AtmosphereId[];
  avoidAtmospheres: AtmosphereId[];
  inferredAtmospheres: AtmosphereId[];
  pace: "slow" | "fast" | null;
  length: "short" | "long" | null;
  era: "classic" | "contemporary" | null;
  genres: string[];
  reference: {
    label: string;
    kind: "author" | "title";
    inCatalog: boolean;
    titles: string[];
    similar: boolean;
  } | null;
};

export type SearchConfidence = "high" | "medium" | "low" | "none";

export type SearchResponse = {
  query: string;
  fallback?: "lexical";
  interpretation: Interpretation;
  confidence: SearchConfidence;
  message: string | null;
  results: SearchResult[];
  engine: {
    embedModel: string;
    classifierModel: string;
    tookMs: number;
    cached: boolean;
  };
  debug?: {
    topSyn: number;
    topFeel: number;
    spread: number;
    zTopSyn: number;
    zTopFeel: number;
  };
};

export type LexicalResult = {
  id: number;
  slug: string;
  score: number;
};
