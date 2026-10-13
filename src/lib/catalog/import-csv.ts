import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";
import { dedupeKey, findExistingBook, getBookById, insertBook, updateBook, type BookPatch } from "./books";
import { normalizeIsbn } from "./isbn";
import { normalizeText } from "./text";
import {
  FIELD_LABELS,
  type ImportField,
  type ImportIssue,
  type ImportOutcome,
  type ImportPlan,
  type ImportRow,
} from "./import-types";
import type { BookInput } from "./types";

export { FIELD_LABELS };
export type { ImportField, ImportIssue, ImportOutcome, ImportPlan, ImportRow, ImportRowStatus } from "./import-types";

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;
const SHORT_SYNOPSIS = 140;

const HEADER_ALIASES: Record<ImportField, string[]> = {
  isbn: ["isbn", "isbn13", "isbn 13", "isbn10", "isbn 10", "ean", "barcode"],
  title: ["title", "name", "book", "book title"],
  author: ["author", "authors", "written by"],
  synopsis: ["synopsis", "description", "summary", "blurb"],
  genre: ["genre", "category", "section", "subject"],
  price: ["price", "sale price", "price r"],
  stock: ["stock", "quantity", "qty", "in stock", "availability"],
  note: ["bookseller s note", "bookseller note", "booksellers note", "note", "staff note", "recommendation"],
  pages: ["pages", "page count", "number of pages"],
  year: ["year", "publication year", "published"],
  publisher: ["publisher", "imprint"],
};

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const counts: [string, number][] = [",", ";", "\t", "|"].map((delimiter) => {
    let count = 0;
    let quoted = false;
    for (const char of firstLine) {
      if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) count += 1;
    }
    return [delimiter, count];
  });
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

function mapHeader(header: string): ImportField | null {
  const folded = normalizeText(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [ImportField, string[]][]) {
    if (aliases.includes(folded)) return field;
  }
  return null;
}

export function parsePrice(value: string): number | null {
  let cleaned = value.replace(/[R$\s]/gi, "");
  if (!cleaned) return null;
  if (/,\d{1,2}$/.test(cleaned)) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  else cleaned = cleaned.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return Number.isFinite(cents) && cents >= 0 && cents < 10_000_000 ? cents : null;
}

function parseInteger(value: string, min: number, max: number): number | null {
  const cleaned = value.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return number >= min && number <= max ? number : null;
}

const emptyTotals = () => ({ total: 0, created: 0, updated: 0, duplicates: 0, errors: 0, warnings: 0 });

export function analyzeCsv(text: string): ImportPlan {
  const plan: ImportPlan = { fatal: null, delimiter: ",", columns: [], rows: [], totals: emptyTotals() };
  if (Buffer.byteLength(text, "utf8") > IMPORT_MAX_BYTES) {
    plan.fatal = "The file is larger than 2 MB. Split the catalog into smaller parts.";
    return plan;
  }
  if (text.trim().length === 0) {
    plan.fatal = "The file is empty.";
    return plan;
  }
  plan.delimiter = detectDelimiter(text);

  let records: string[][];
  try {
    records = parse(text, {
      bom: true,
      delimiter: plan.delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
    }) as string[][];
  } catch (error) {
    plan.fatal = `Could not read the CSV: ${error instanceof Error ? error.message : "invalid format"}.`;
    return plan;
  }
  if (records.length < 2) {
    plan.fatal = "The file needs a header row and at least one book.";
    return plan;
  }
  if (records.length - 1 > IMPORT_MAX_ROWS) {
    plan.fatal = `The file has ${records.length - 1} rows; the limit per import is ${IMPORT_MAX_ROWS}.`;
    return plan;
  }

  const seenFields = new Set<ImportField>();
  plan.columns = records[0].map((header) => {
    const field = mapHeader(header);
    if (field && seenFields.has(field)) return { header, field: null };
    if (field) seenFields.add(field);
    return { header, field };
  });
  const missing = (["title", "author"] as ImportField[]).filter((field) => !seenFields.has(field));
  if (missing.length > 0) {
    plan.fatal = `Required columns are missing: ${missing.map((field) => FIELD_LABELS[field]).join(" and ")}. Headers found: ${records[0].join(", ")}.`;
    return plan;
  }

  const seenKeys = new Map<string, number>();
  records.slice(1).forEach((record, index) => {
    const line = index + 2;
    const values: Partial<Record<ImportField, string>> = {};
    plan.columns.forEach((column, position) => {
      if (column.field) values[column.field] = (record[position] ?? "").trim();
    });

    const issues: ImportIssue[] = [];
    const title = values.title ?? "";
    const author = values.author ?? "";
    if (!title) issues.push({ level: "error", message: "Empty title." });
    if (!author) issues.push({ level: "error", message: "Empty author." });

    let isbn: string | null = null;
    if (values.isbn) {
      const result = normalizeIsbn(values.isbn);
      if (result.ok) isbn = result.isbn;
      else issues.push({ level: "error", message: `Invalid ISBN "${values.isbn}": ${result.reason}.` });
    }

    let priceCents: number | null | undefined;
    if (values.price) {
      priceCents = parsePrice(values.price);
      if (priceCents === null) issues.push({ level: "error", message: `Price "${values.price}" is not an amount in reais.` });
    }
    let stock: number | null | undefined;
    if (values.stock) {
      stock = parseInteger(values.stock, 0, 100000);
      if (stock === null) issues.push({ level: "error", message: `Stock "${values.stock}" must be a whole number, zero or greater.` });
    }
    let pages: number | null | undefined;
    if (values.pages) {
      pages = parseInteger(values.pages, 1, 20000);
      if (pages === null) issues.push({ level: "warning", message: `Pages "${values.pages}" ignored: not a number.` });
    }
    let year: number | null | undefined;
    if (values.year) {
      year = parseInteger(values.year, 1, 2100);
      if (year === null) issues.push({ level: "warning", message: `Year "${values.year}" ignored: not a valid year.` });
    }

    const synopsis = values.synopsis ?? "";
    if (seenFields.has("synopsis")) {
      if (!synopsis) {
        issues.push({ level: "warning", message: "No synopsis: the book goes on the shelf, but search by intent cannot find it." });
      } else if (synopsis.length < SHORT_SYNOPSIS) {
        issues.push({ level: "warning", message: "Short synopsis: the AI may not be able to classify this book." });
      }
    }

    const row: ImportRow = { line, status: "new", title, author, isbn, existingId: null, changes: [], issues, data: null };
    if (issues.some((issue) => issue.level === "error")) {
      row.status = "error";
      plan.rows.push(row);
      return;
    }

    const keys = [isbn ? `isbn:${isbn}` : null, `work:${dedupeKey(title, author)}`].filter((key): key is string => key !== null);
    const repeated = keys.map((key) => seenKeys.get(key)).find((value) => value !== undefined);
    if (repeated !== undefined) {
      row.status = "duplicate";
      row.issues.push({ level: "warning", message: `Repeats row ${repeated}; only the first occurrence is imported.` });
      plan.rows.push(row);
      return;
    }
    for (const key of keys) seenKeys.set(key, line);

    const data: BookInput = { title, author };
    if (isbn) data.isbn = isbn;
    if (values.genre) data.genre = values.genre;
    if (synopsis) {
      data.synopsis = synopsis;
      data.synopsisSource = "Bookshop catalog";
    }
    if (values.publisher) data.publisher = values.publisher;
    if (typeof priceCents === "number") data.priceCents = priceCents;
    if (typeof stock === "number") data.stock = stock;
    if (typeof pages === "number") data.pages = pages;
    if (typeof year === "number") data.year = year;
    if (values.note) {
      data.note = values.note;
      data.noteOrigin = "bookseller";
    }
    row.data = data;

    const existingId = findExistingBook({ isbn, title, author });
    if (existingId !== null) {
      const existing = getBookById(existingId);
      row.existingId = existingId;
      const changes: string[] = [];
      if (existing) {
        if (data.isbn && data.isbn !== existing.isbn) changes.push("ISBN");
        if (data.genre && data.genre !== existing.genre) changes.push("genre");
        if (data.synopsis && data.synopsis !== existing.synopsis) changes.push("synopsis");
        if (data.publisher && data.publisher !== existing.publisher) changes.push("publisher");
        if (data.priceCents !== undefined && (data.priceCents !== existing.priceCents || existing.priceIsDemo)) changes.push("price");
        if (data.stock !== undefined && (data.stock !== existing.stock || existing.stockIsDemo)) changes.push("stock");
        if (data.pages !== undefined && data.pages !== existing.pages) changes.push("pages");
        if (data.year !== undefined && data.year !== existing.year) changes.push("year");
        if (data.note && (data.note !== existing.note || existing.noteOrigin !== "bookseller")) changes.push("bookseller's note");
      }
      row.changes = changes;
      if (changes.length === 0) {
        row.status = "duplicate";
        row.issues.push({ level: "warning", message: "Already in the catalog, with nothing to update." });
      } else {
        row.status = "update";
      }
    }
    plan.rows.push(row);
  });

  plan.totals = {
    total: plan.rows.length,
    created: plan.rows.filter((row) => row.status === "new").length,
    updated: plan.rows.filter((row) => row.status === "update").length,
    duplicates: plan.rows.filter((row) => row.status === "duplicate").length,
    errors: plan.rows.filter((row) => row.status === "error").length,
    warnings: plan.rows.reduce((sum, row) => sum + row.issues.filter((issue) => issue.level === "warning").length, 0),
  };
  return plan;
}

export function applyImportPlan(plan: ImportPlan, filename: string | null): ImportOutcome {
  const outcome: ImportOutcome = { inserted: 0, updated: 0, skipped: 0, affectedIds: [] };
  if (plan.fatal) return outcome;
  const database = db();
  database.transaction(() => {
    for (const row of plan.rows) {
      if (!row.data || row.status === "error" || row.status === "duplicate") {
        outcome.skipped += 1;
        continue;
      }
      if (row.status === "new") {
        outcome.affectedIds.push(insertBook({ ...row.data, priceIsDemo: false, stockIsDemo: false }));
        outcome.inserted += 1;
        continue;
      }
      if (row.existingId === null) continue;
      const patch: BookPatch = {};
      const { data } = row;
      if (data.isbn) patch.isbn = data.isbn;
      if (data.genre) patch.genre = data.genre;
      if (data.synopsis) {
        patch.synopsis = data.synopsis;
        patch.synopsisSource = data.synopsisSource;
        patch.synopsisUrl = null;
      }
      if (data.publisher) patch.publisher = data.publisher;
      if (data.priceCents !== undefined) {
        patch.priceCents = data.priceCents;
        patch.priceIsDemo = false;
      }
      if (data.stock !== undefined) {
        patch.stock = data.stock;
        patch.stockIsDemo = false;
      }
      if (data.pages !== undefined) patch.pages = data.pages;
      if (data.year !== undefined) patch.year = data.year;
      if (data.note) {
        patch.note = data.note;
        patch.noteOrigin = "bookseller";
      }
      const { semanticInputChanged } = updateBook(row.existingId, patch);
      if (semanticInputChanged && (patch.synopsis !== undefined || patch.genre !== undefined)) {
        database
          .prepare("UPDATE book_semantics SET status = 'pending', error = NULL WHERE book_id = ? AND origin = 'ai'")
          .run(row.existingId);
      }
      outcome.affectedIds.push(row.existingId);
      outcome.updated += 1;
    }
    database
      .prepare("INSERT INTO import_runs (filename, total, inserted, updated, skipped, issues) VALUES (?, ?, ?, ?, ?, ?)")
      .run(
        filename,
        plan.totals.total,
        outcome.inserted,
        outcome.updated,
        outcome.skipped,
        JSON.stringify(
          plan.rows
            .filter((row) => row.issues.length > 0)
            .slice(0, 200)
            .map((row) => ({ line: row.line, title: row.title, issues: row.issues })),
        ),
      );
  })();
  return outcome;
}

export type ImportRun = {
  id: number;
  filename: string | null;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  createdAt: string;
};

export function listImportRuns(limit = 8): ImportRun[] {
  const rows = db()
    .prepare("SELECT id, filename, total, inserted, updated, skipped, created_at FROM import_runs ORDER BY id DESC LIMIT ?")
    .all(limit) as { id: number; filename: string | null; total: number; inserted: number; updated: number; skipped: number; created_at: string }[];
  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    total: row.total,
    inserted: row.inserted,
    updated: row.updated,
    skipped: row.skipped,
    createdAt: row.created_at,
  }));
}
