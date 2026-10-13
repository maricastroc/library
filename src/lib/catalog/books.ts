import { db, parseJsonArray } from "@/lib/db";
import {
  ATMOSPHERE_IDS,
  EXPERIENCE_IDS,
  STYLE_IDS,
  type AtmosphereId,
  type ExperienceId,
  type StyleId,
} from "@/lib/semantic/taxonomy";
import { normalizeText, slugify } from "./text";
import type {
  BookDetail,
  BookInput,
  Evidence,
  NoteOrigin,
  SemanticOrigin,
  SemanticPatch,
  SemanticStatus,
  ShelfBook,
} from "./types";

type JoinedRow = {
  id: number;
  slug: string;
  isbn: string | null;
  title: string;
  author: string;
  genre: string | null;
  synopsis: string | null;
  synopsis_source: string | null;
  synopsis_url: string | null;
  publisher: string | null;
  year: number | null;
  pages: number | null;
  language: string | null;
  cover_url: string | null;
  cover_source: string | null;
  source_url: string | null;
  subjects: string;
  price_cents: number | null;
  price_is_demo: number;
  stock: number | null;
  stock_is_demo: number;
  staff_note: string | null;
  staff_note_origin: string | null;
  updated_at: string;
  status: string | null;
  atmospheres: string | null;
  pace: number | null;
  density: number | null;
  styles: string | null;
  experiences: string | null;
  themes: string | null;
  portrait: string | null;
  evidence: string | null;
  confidence: string | null;
  model: string | null;
  origin: string | null;
  error: string | null;
};

const SELECT_JOINED = `
  SELECT b.*, s.status, s.atmospheres, s.pace, s.density, s.styles, s.experiences, s.themes,
         s.portrait, s.evidence, s.confidence, s.model, s.origin, s.error
  FROM books b
  LEFT JOIN book_semantics s ON s.book_id = b.id
`;

function parseEvidence(value: string | null): Evidence[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Evidence =>
        typeof item === "object" && item !== null && typeof (item as Evidence).quote === "string",
    );
  } catch {
    return [];
  }
}

function toShelfBook(row: JoinedRow): ShelfBook {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    genre: row.genre,
    pages: row.pages,
    year: row.year,
    priceCents: row.price_cents,
    priceIsDemo: row.price_is_demo === 1,
    stock: row.stock,
    stockIsDemo: row.stock_is_demo === 1,
    note: row.staff_note,
    noteOrigin: (row.staff_note_origin as NoteOrigin | null) ?? null,
    semanticStatus: (row.status as SemanticStatus | null) ?? "pending",
    atmospheres: parseJsonArray(row.atmospheres).filter((id): id is AtmosphereId =>
      ATMOSPHERE_IDS.includes(id as AtmosphereId),
    ),
    pace: row.pace,
    density: row.density,
    styles: parseJsonArray(row.styles).filter((id): id is StyleId => STYLE_IDS.includes(id as StyleId)),
    experiences: parseJsonArray(row.experiences).filter((id): id is ExperienceId =>
      EXPERIENCE_IDS.includes(id as ExperienceId),
    ),
    themes: parseJsonArray(row.themes),
  };
}

function toBookDetail(row: JoinedRow): BookDetail {
  return {
    ...toShelfBook(row),
    isbn: row.isbn,
    synopsis: row.synopsis,
    synopsisSource: row.synopsis_source,
    synopsisUrl: row.synopsis_url,
    publisher: row.publisher,
    language: row.language,
    coverUrl: row.cover_url,
    coverSource: row.cover_source,
    sourceUrl: row.source_url,
    subjects: parseJsonArray(row.subjects),
    portrait: row.portrait,
    evidence: parseEvidence(row.evidence),
    confidence: row.confidence,
    semanticOrigin: (row.origin as SemanticOrigin | null) ?? "ai",
    semanticModel: row.model,
    semanticError: row.error,
    updatedAt: row.updated_at,
  };
}

export function touchCatalog(): void {
  db()
    .prepare(
      `INSERT INTO shop_settings (key, value) VALUES ('catalog_revision', '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`,
    )
    .run();
}

export function catalogRevision(): number {
  const row = db().prepare("SELECT value FROM shop_settings WHERE key = 'catalog_revision'").get() as
    | { value: string }
    | undefined;
  return row ? Number(row.value) : 0;
}

export function dedupeKey(title: string, author: string): string {
  return `${normalizeText(title)}|${normalizeText(author)}`;
}

export function listShelfBooks(): ShelfBook[] {
  const rows = db().prepare(`${SELECT_JOINED} ORDER BY b.id`).all() as JoinedRow[];
  return rows.map(toShelfBook);
}

export function listBookDetails(): BookDetail[] {
  const rows = db().prepare(`${SELECT_JOINED} ORDER BY b.id`).all() as JoinedRow[];
  return rows.map(toBookDetail);
}

export function getBookBySlug(slug: string): BookDetail | null {
  const row = db().prepare(`${SELECT_JOINED} WHERE b.slug = ?`).get(slug) as JoinedRow | undefined;
  return row ? toBookDetail(row) : null;
}

export function getBookById(id: number): BookDetail | null {
  const row = db().prepare(`${SELECT_JOINED} WHERE b.id = ?`).get(id) as JoinedRow | undefined;
  return row ? toBookDetail(row) : null;
}

export function findExistingBook(input: { isbn?: string | null; title: string; author: string }): number | null {
  const database = db();
  if (input.isbn) {
    const byIsbn = database.prepare("SELECT id FROM books WHERE isbn = ?").get(input.isbn) as { id: number } | undefined;
    if (byIsbn) return byIsbn.id;
  }
  const byKey = database
    .prepare("SELECT id FROM books WHERE dedupe_key = ?")
    .get(dedupeKey(input.title, input.author)) as { id: number } | undefined;
  return byKey?.id ?? null;
}

function uniqueSlug(title: string, author: string, ignoreId?: number): string {
  const database = db();
  const authorTokens = author.trim().split(/\s+/);
  const base = slugify(`${title} ${authorTokens[authorTokens.length - 1] ?? ""}`) || "book";
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = database.prepare("SELECT id FROM books WHERE slug = ?").get(candidate) as { id: number } | undefined;
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export function syncFts(id: number): void {
  const database = db();
  const row = database
    .prepare("SELECT title, author, genre, synopsis, staff_note FROM books WHERE id = ?")
    .get(id) as { title: string; author: string; genre: string | null; synopsis: string | null; staff_note: string | null } | undefined;
  database.prepare("DELETE FROM books_fts WHERE rowid = ?").run(id);
  if (!row) return;
  database
    .prepare("INSERT INTO books_fts (rowid, title, author, genre, synopsis, staff_note) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, row.title, row.author, row.genre ?? "", row.synopsis ?? "", row.staff_note ?? "");
}

function clean(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function insertBook(input: BookInput): number {
  const database = db();
  const title = input.title.trim();
  const author = input.author.trim();
  const note = clean(input.note);
  const info = database
    .prepare(
      `INSERT INTO books (
        slug, isbn, title, author, genre, synopsis, synopsis_source, synopsis_url, publisher, year, pages,
        language, cover_url, cover_source, source_url, subjects, price_cents, price_is_demo, stock, stock_is_demo,
        staff_note, staff_note_origin, dedupe_key
      ) VALUES (
        @slug, @isbn, @title, @author, @genre, @synopsis, @synopsisSource, @synopsisUrl, @publisher, @year, @pages,
        @language, @coverUrl, @coverSource, @sourceUrl, @subjects, @priceCents, @priceIsDemo, @stock, @stockIsDemo,
        @note, @noteOrigin, @dedupeKey
      )`,
    )
    .run({
      slug: uniqueSlug(title, author),
      isbn: clean(input.isbn),
      title,
      author,
      genre: clean(input.genre),
      synopsis: clean(input.synopsis),
      synopsisSource: clean(input.synopsisSource),
      synopsisUrl: clean(input.synopsisUrl),
      publisher: clean(input.publisher),
      year: input.year ?? null,
      pages: input.pages ?? null,
      language: clean(input.language),
      coverUrl: clean(input.coverUrl),
      coverSource: clean(input.coverSource),
      sourceUrl: clean(input.sourceUrl),
      subjects: JSON.stringify(input.subjects ?? []),
      priceCents: input.priceCents ?? null,
      priceIsDemo: input.priceIsDemo ? 1 : 0,
      stock: input.stock ?? null,
      stockIsDemo: input.stockIsDemo ? 1 : 0,
      note,
      noteOrigin: note ? (input.noteOrigin ?? "bookseller") : null,
      dedupeKey: dedupeKey(title, author),
    });
  const id = Number(info.lastInsertRowid);
  database.prepare("INSERT INTO book_semantics (book_id, status, origin) VALUES (?, 'pending', 'ai')").run(id);
  syncFts(id);
  touchCatalog();
  return id;
}

export type BookPatch = Partial<BookInput>;

const COLUMN_BY_FIELD: Record<string, string> = {
  isbn: "isbn",
  title: "title",
  author: "author",
  genre: "genre",
  synopsis: "synopsis",
  synopsisSource: "synopsis_source",
  synopsisUrl: "synopsis_url",
  publisher: "publisher",
  year: "year",
  pages: "pages",
  language: "language",
  coverUrl: "cover_url",
  coverSource: "cover_source",
  sourceUrl: "source_url",
  priceCents: "price_cents",
  stock: "stock",
};

export function updateBook(id: number, patch: BookPatch): { semanticInputChanged: boolean } {
  const database = db();
  const current = database.prepare("SELECT * FROM books WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!current) throw new Error("Livro não encontrado.");
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };
  let semanticInputChanged = false;

  for (const [field, column] of Object.entries(COLUMN_BY_FIELD)) {
    if (!(field in patch)) continue;
    const raw = (patch as Record<string, unknown>)[field];
    const next = typeof raw === "string" ? clean(raw) : (raw ?? null);
    if (next === (current[column] ?? null)) continue;
    sets.push(`${column} = @${field}`);
    values[field] = next;
    if (["title", "author", "genre", "synopsis"].includes(field)) semanticInputChanged = true;
  }
  if ("subjects" in patch && patch.subjects) {
    sets.push("subjects = @subjects");
    values.subjects = JSON.stringify(patch.subjects);
  }
  if ("priceCents" in patch || "priceIsDemo" in patch) {
    sets.push("price_is_demo = @priceIsDemo");
    values.priceIsDemo = patch.priceIsDemo ? 1 : 0;
  }
  if ("stock" in patch || "stockIsDemo" in patch) {
    sets.push("stock_is_demo = @stockIsDemo");
    values.stockIsDemo = patch.stockIsDemo ? 1 : 0;
  }
  if ("note" in patch) {
    const note = clean(patch.note);
    if (note !== (current.staff_note ?? null) || (note && patch.noteOrigin && patch.noteOrigin !== current.staff_note_origin)) {
      sets.push("staff_note = @note", "staff_note_origin = @noteOrigin");
      values.note = note;
      values.noteOrigin = note ? (patch.noteOrigin ?? "bookseller") : null;
      semanticInputChanged = true;
    }
  }
  if (sets.length === 0) return { semanticInputChanged: false };

  const title = (values.title as string | undefined) ?? (current.title as string);
  const author = (values.author as string | undefined) ?? (current.author as string);
  if ("title" in values || "author" in values) {
    sets.push("dedupe_key = @dedupeKey", "slug = @slug");
    values.dedupeKey = dedupeKey(title, author);
    values.slug = uniqueSlug(title, author, id);
  }
  sets.push("updated_at = datetime('now')");
  database.prepare(`UPDATE books SET ${sets.join(", ")} WHERE id = @id`).run(values);
  syncFts(id);
  touchCatalog();
  return { semanticInputChanged };
}

export function deleteBook(id: number): void {
  const database = db();
  database.prepare("DELETE FROM books_fts WHERE rowid = ?").run(id);
  database.prepare("DELETE FROM books WHERE id = ?").run(id);
  touchCatalog();
}

export function saveSemantics(
  bookId: number,
  patch: SemanticPatch,
  meta: {
    status: SemanticStatus;
    origin: SemanticOrigin;
    evidence?: Evidence[];
    confidence?: string | null;
    model?: string | null;
    inputHash?: string | null;
    error?: string | null;
  },
): void {
  db()
    .prepare(
      `INSERT INTO book_semantics (
        book_id, status, atmospheres, pace, density, styles, experiences, themes, portrait, evidence,
        confidence, model, origin, input_hash, error, updated_at
      ) VALUES (
        @bookId, @status, @atmospheres, @pace, @density, @styles, @experiences, @themes, @portrait, @evidence,
        @confidence, @model, @origin, @inputHash, @error, datetime('now')
      )
      ON CONFLICT(book_id) DO UPDATE SET
        status = excluded.status, atmospheres = excluded.atmospheres, pace = excluded.pace,
        density = excluded.density, styles = excluded.styles, experiences = excluded.experiences,
        themes = excluded.themes, portrait = excluded.portrait,
        evidence = COALESCE(@evidenceOrNull, book_semantics.evidence),
        confidence = COALESCE(@confidenceOrNull, book_semantics.confidence),
        model = COALESCE(@modelOrNull, book_semantics.model),
        origin = excluded.origin,
        input_hash = COALESCE(@inputHashOrNull, book_semantics.input_hash),
        error = excluded.error, updated_at = datetime('now')`,
    )
    .run({
      bookId,
      status: meta.status,
      atmospheres: JSON.stringify(patch.atmospheres),
      pace: patch.pace,
      density: patch.density,
      styles: JSON.stringify(patch.styles),
      experiences: JSON.stringify(patch.experiences),
      themes: JSON.stringify(patch.themes),
      portrait: patch.portrait,
      evidence: JSON.stringify(meta.evidence ?? []),
      evidenceOrNull: meta.evidence ? JSON.stringify(meta.evidence) : null,
      confidence: meta.confidence ?? null,
      confidenceOrNull: meta.confidence ?? null,
      model: meta.model ?? null,
      modelOrNull: meta.model ?? null,
      origin: meta.origin,
      inputHash: meta.inputHash ?? null,
      inputHashOrNull: meta.inputHash ?? null,
      error: meta.error ?? null,
    });
  touchCatalog();
}

export function setSemanticStatus(bookId: number, status: SemanticStatus, error?: string | null): void {
  db()
    .prepare(
      `INSERT INTO book_semantics (book_id, status, origin, error) VALUES (?, ?, 'ai', ?)
       ON CONFLICT(book_id) DO UPDATE SET status = excluded.status, error = excluded.error, updated_at = datetime('now')`,
    )
    .run(bookId, status, error ?? null);
  touchCatalog();
}

export type CatalogStats = {
  total: number;
  withNote: number;
  withoutSynopsis: number;
  outOfStock: number;
  semantics: Record<SemanticStatus, number>;
};

export function catalogStats(): CatalogStats {
  const database = db();
  const totals = database
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN staff_note IS NOT NULL THEN 1 ELSE 0 END) AS withNote,
              SUM(CASE WHEN synopsis IS NULL THEN 1 ELSE 0 END) AS withoutSynopsis,
              SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS outOfStock
       FROM books`,
    )
    .get() as { total: number; withNote: number | null; withoutSynopsis: number | null; outOfStock: number | null };
  const semantics: Record<SemanticStatus, number> = { pending: 0, processing: 0, ready: 0, insufficient: 0, error: 0 };
  const rows = database
    .prepare(
      `SELECT COALESCE(s.status, 'pending') AS status, COUNT(*) AS count
       FROM books b LEFT JOIN book_semantics s ON s.book_id = b.id GROUP BY 1`,
    )
    .all() as { status: SemanticStatus; count: number }[];
  for (const row of rows) semantics[row.status] = row.count;
  return {
    total: totals.total,
    withNote: totals.withNote ?? 0,
    withoutSynopsis: totals.withoutSynopsis ?? 0,
    outOfStock: totals.outOfStock ?? 0,
    semantics,
  };
}
