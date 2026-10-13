import { db } from "@/lib/db";
import { normalizeText } from "@/lib/catalog/text";
import type { LexicalResult } from "./types";

export const STOPWORDS = new Set(
  `a o as os um uma uns umas de do da dos das em no na nos nas por para pra pro com sem que e ou mas se eu me meu minha
   quero queria procuro busco gostaria algo alguma algum alguns livro livros historia historias sobre tipo como mais muito
   muita bem ser seja sejam e sao ao aos quem gostou gosta gosto tem ter isso esse essa este esta pelo pela nao nem so ja
   tambem ler leitura indicacao recomendacao recomenda indica preciso dias deixe pareca parece ficar fique estou esta
   to ta uns coisa coisas the of`
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
