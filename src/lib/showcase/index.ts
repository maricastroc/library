import { db } from "@/lib/db";
import { slugify } from "@/lib/catalog/text";
import { SHOWCASE_PALETTES, type ShowcasePalette } from "./palettes";

export { SHOWCASE_PALETTES };
export type { ShowcasePalette };

export type ShowcaseItem = { bookId: number; caption: string | null };

export type Showcase = {
  id: number;
  slug: string;
  title: string;
  intro: string | null;
  palette: ShowcasePalette;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  items: ShowcaseItem[];
};

export type ShowcaseInput = {
  title: string;
  intro?: string | null;
  palette?: string;
  published?: boolean;
  items: ShowcaseItem[];
};

type Row = {
  id: number;
  slug: string;
  title: string;
  intro: string | null;
  palette: string;
  published: number;
  created_at: string;
  updated_at: string;
};

function toShowcase(row: Row): Showcase {
  const items = db()
    .prepare("SELECT book_id, caption FROM showcase_books WHERE showcase_id = ? ORDER BY position")
    .all(row.id) as { book_id: number; caption: string | null }[];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    intro: row.intro,
    palette: (row.palette in SHOWCASE_PALETTES ? row.palette : "ink") as ShowcasePalette,
    published: row.published === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((item) => ({ bookId: item.book_id, caption: item.caption })),
  };
}

export function listShowcases(options: { publishedOnly?: boolean } = {}): Showcase[] {
  const rows = db()
    .prepare(`SELECT * FROM showcases ${options.publishedOnly ? "WHERE published = 1" : ""} ORDER BY updated_at DESC, id DESC`)
    .all() as Row[];
  return rows.map(toShowcase);
}

export function getShowcaseBySlug(slug: string): Showcase | null {
  const row = db().prepare("SELECT * FROM showcases WHERE slug = ?").get(slug) as Row | undefined;
  return row ? toShowcase(row) : null;
}

export function getShowcaseById(id: number): Showcase | null {
  const row = db().prepare("SELECT * FROM showcases WHERE id = ?").get(id) as Row | undefined;
  return row ? toShowcase(row) : null;
}

function uniqueSlug(title: string, ignoreId?: number): string {
  const base = slugify(title) || "showcase";
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = db().prepare("SELECT id FROM showcases WHERE slug = ?").get(candidate) as { id: number } | undefined;
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function writeItems(showcaseId: number, items: ShowcaseItem[]): void {
  const database = db();
  database.prepare("DELETE FROM showcase_books WHERE showcase_id = ?").run(showcaseId);
  const insert = database.prepare(
    "INSERT OR IGNORE INTO showcase_books (showcase_id, book_id, position, caption) VALUES (?, ?, ?, ?)",
  );
  const exists = database.prepare("SELECT 1 FROM books WHERE id = ?");
  items.forEach((item, position) => {
    if (!exists.get(item.bookId)) return;
    insert.run(showcaseId, item.bookId, position, item.caption?.trim() || null);
  });
}

function normalizePalette(value: string | undefined): ShowcasePalette {
  return value && value in SHOWCASE_PALETTES ? (value as ShowcasePalette) : "ink";
}

export function createShowcase(input: ShowcaseInput): Showcase {
  const database = db();
  const id = database.transaction(() => {
    const info = database
      .prepare("INSERT INTO showcases (slug, title, intro, palette, published) VALUES (?, ?, ?, ?, ?)")
      .run(
        uniqueSlug(input.title),
        input.title.trim(),
        input.intro?.trim() || null,
        normalizePalette(input.palette),
        input.published ? 1 : 0,
      );
    const showcaseId = Number(info.lastInsertRowid);
    writeItems(showcaseId, input.items);
    return showcaseId;
  })();
  return getShowcaseById(id) as Showcase;
}

export function updateShowcase(id: number, input: ShowcaseInput): Showcase | null {
  const database = db();
  const current = getShowcaseById(id);
  if (!current) return null;
  database.transaction(() => {
    database
      .prepare(
        "UPDATE showcases SET title = ?, intro = ?, palette = ?, published = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(input.title.trim(), input.intro?.trim() || null, normalizePalette(input.palette), input.published ? 1 : 0, id);
    writeItems(id, input.items);
  })();
  return getShowcaseById(id);
}

export function deleteShowcase(id: number): void {
  db().prepare("DELETE FROM showcases WHERE id = ?").run(id);
}
