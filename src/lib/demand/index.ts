import { normalizeText } from "@/lib/catalog/text";
import { db, parseJsonArray } from "@/lib/db";
import type { SearchResponse } from "@/lib/search/types";
import { embedCached } from "@/lib/search/vector-index";
import { queryPrompt } from "@/lib/semantic/ollama";
import { RETENTION_DAYS, type DemandEntry, type Phrase } from "./report";

export { RETENTION_DAYS };

type Row = {
  id: number;
  query: string;
  folded: string;
  confidence: string;
  fallback: number;
  results: number;
  shown_ids: string;
  atmospheres: string;
  inferred: string;
  opened_ids: string;
  reserved_ids: string;
  sample: number;
  created_at: string;
};

function ids(value: string): number[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}

function toEntry(row: Row): DemandEntry {
  return {
    id: row.id,
    query: row.query,
    folded: row.folded,
    confidence: row.confidence,
    fallback: row.fallback === 1,
    results: row.results,
    shown: ids(row.shown_ids),
    atmospheres: parseJsonArray(row.atmospheres),
    inferred: parseJsonArray(row.inferred),
    opened: ids(row.opened_ids),
    reserved: ids(row.reserved_ids),
    sample: row.sample === 1,
    createdAt: row.created_at,
  };
}

export type LoggedSearch = {
  query: string;
  confidence: string;
  fallback: boolean;
  shown: number[];
  results: number;
  atmospheres: string[];
  inferred: string[];
  opened?: number[];
  reserved?: number[];
  sample?: boolean;
  createdAt?: string;
};

export function recordSearch(search: LoggedSearch): number {
  const database = db();
  database.prepare("DELETE FROM search_log WHERE created_at < datetime('now', ?)").run(`-${RETENTION_DAYS} days`);
  const info = database
    .prepare(
      `INSERT INTO search_log (query, folded, confidence, fallback, results, shown_ids, atmospheres, inferred, opened_ids, reserved_ids, sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    )
    .run(
      search.query,
      normalizeText(search.query),
      search.confidence,
      search.fallback ? 1 : 0,
      search.results,
      JSON.stringify(search.shown.slice(0, 20)),
      JSON.stringify(search.atmospheres),
      JSON.stringify(search.inferred),
      JSON.stringify(search.opened ?? []),
      JSON.stringify(search.reserved ?? []),
      search.sample ? 1 : 0,
      search.createdAt ?? null,
    );
  return Number(info.lastInsertRowid);
}

export function logSearch(response: SearchResponse): number | null {
  try {
    return recordSearch({
      query: response.query,
      confidence: response.confidence,
      fallback: response.fallback === "lexical",
      shown: response.results.map((result) => result.id),
      results: response.results.length,
      atmospheres: response.interpretation.atmospheres,
      inferred: response.interpretation.inferredAtmospheres,
    });
  } catch (error) {
    console.error("[demand]", error);
    return null;
  }
}

function append(searchId: number, bookId: number, column: "opened_ids" | "reserved_ids"): void {
  try {
    const database = db();
    const row = database.prepare(`SELECT ${column} AS list, shown_ids FROM search_log WHERE id = ?`).get(searchId) as { list: string; shown_ids: string } | undefined;
    if (!row || !ids(row.shown_ids).includes(bookId)) return;
    const list = ids(row.list);
    if (list.includes(bookId)) return;
    database.prepare(`UPDATE search_log SET ${column} = ? WHERE id = ?`).run(JSON.stringify([...list, bookId]), searchId);
  } catch (error) {
    console.error("[demand]", error);
  }
}

export const noteOpened = (searchId: number, bookId: number) => append(searchId, bookId, "opened_ids");
export const noteReserved = (searchId: number, bookId: number) => append(searchId, bookId, "reserved_ids");

export function readDemand(days: number): DemandEntry[] {
  const rows = db()
    .prepare("SELECT * FROM search_log WHERE created_at >= datetime('now', ?) ORDER BY created_at DESC")
    .all(`-${days} days`) as Row[];
  return rows.map(toEntry);
}

export function demandArchive(): { stored: number; samples: number; oldest: string | null } {
  const row = db().prepare("SELECT COUNT(*) AS stored, COALESCE(SUM(sample), 0) AS samples, MIN(created_at) AS oldest FROM search_log").get() as {
    stored: number;
    samples: number;
    oldest: string | null;
  };
  return row;
}

export function clearDemand(which: "all" | "samples"): number {
  const statement = which === "all" ? "DELETE FROM search_log" : "DELETE FROM search_log WHERE sample = 1";
  return db().prepare(statement).run().changes;
}

export function shelfAtmospheres(): { counts: Map<string, number>; books: number } {
  const rows = db().prepare("SELECT atmospheres FROM book_semantics WHERE status = 'ready'").all() as { atmospheres: string }[];
  const counts = new Map<string, number>();
  for (const row of rows) for (const id of new Set(parseJsonArray(row.atmospheres))) counts.set(id, (counts.get(id) ?? 0) + 1);
  return { counts, books: rows.length };
}

export async function phraseVectors(phrases: Phrase[]): Promise<Map<string, Float32Array> | null> {
  if (phrases.length === 0) return new Map();
  try {
    const { vectors } = await embedCached(phrases.map((phrase) => queryPrompt(phrase.folded)));
    return new Map(phrases.map((phrase, index) => [phrase.folded, vectors[index]]));
  } catch {
    return null;
  }
}

export function bookNames(): Map<number, { title: string; author: string }> {
  const rows = db().prepare("SELECT id, title, author FROM books").all() as { id: number; title: string; author: string }[];
  return new Map(rows.map((row) => [row.id, { title: row.title, author: row.author }]));
}
