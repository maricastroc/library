import { db } from "@/lib/db";
import { normalizeText } from "@/lib/catalog/text";
import type { LexicalResult } from "./types";

export const STOPWORDS = new Set(
  `a an the of in on at by for to from with without and or but if so as is are was were be been being am do does did
   i me my mine we you your it its this that these those there here what which who whom whose how when where why
   want wants wanted looking look need needs would like liked likes love loved enjoy enjoyed something anything some any
   book books story stories about kind type sort more most much very really well too also just only not no nor
   read reading recommend recommendation recommendations suggestion suggestions please give find show can could
   feel feels make makes made keep keeps leave leaves let lets get gets thing things one ones them they their
   will have has had into than then up out over days`
    .split(/\s+/)
    .filter(Boolean),
);

export function contentTokens(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export function buildFtsQuery(query: string): string | null {
  const tokens = [...new Set(contentTokens(query))];
  if (tokens.length === 0) return null;
  return tokens
    .map((token) => (token.length >= 6 ? `"${token.slice(0, token.length - 2)}"*` : `"${token}"`))
    .join(" OR ");
}

export function lexicalSearch(query: string, limit = 10): LexicalResult[] {
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) return [];
  try {
    const rows = db()
      .prepare(
        `SELECT b.id AS id, b.slug AS slug, bm25(books_fts, 6.0, 5.0, 2.0, 1.0, 1.0) AS rank
         FROM books_fts JOIN books b ON b.id = books_fts.rowid
         WHERE books_fts MATCH ? ORDER BY rank LIMIT ?`,
      )
      .all(ftsQuery, limit) as { id: number; slug: string; rank: number }[];
    return rows.map((row) => ({ id: row.id, slug: row.slug, score: -row.rank }));
  } catch {
    return [];
  }
}
