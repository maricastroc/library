import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { catalogStats, deleteBook, findExistingBook, insertBook, updateBook } from "../src/lib/catalog/books";
import { hashString } from "../src/lib/catalog/text";
import { closeDb, db } from "../src/lib/db";
import type { SeedCatalogEntry } from "./catalog-fetch";

const CATALOG_FILE = join(process.cwd(), "data", "seed", process.env.SEED_CATALOG ?? "catalog.json");
const NOTES_FILE = join(process.cwd(), "data", "seed", "example-notes.json");
const ADDITIONS_FILE = join(process.cwd(), "data", "seed", "additions.json");
const MAX_WITHOUT_SYNOPSIS = 4;
const TARGET_SIZE = 200;

function demoPriceCents(entry: SeedCatalogEntry): number {
  const pages = entry.pages ?? 240;
  const raw = 3200 + pages * 9;
  const clamped = Math.min(12990, Math.max(2990, raw));
  const tens = Math.floor(clamped / 1000) * 1000;
  const ending = clamped - tens >= 500 ? 990 : 490;
  return tens + ending;
}

function demoStock(entry: SeedCatalogEntry): number {
  const bucket = hashString(entry.slug) % 9;
  return bucket === 0 ? 0 : 1 + (bucket % 6);
}

function main() {
  if (!existsSync(CATALOG_FILE)) {
    console.error("Seed catalog not found. Run first: npm run catalog:fetch");
    process.exit(1);
  }
  const entries = JSON.parse(readFileSync(CATALOG_FILE, "utf8")) as SeedCatalogEntry[];
  const notes = existsSync(NOTES_FILE)
    ? (JSON.parse(readFileSync(NOTES_FILE, "utf8")) as Record<string, string>)
    : {};

  const quality = (entry: SeedCatalogEntry) =>
    Math.min(1500, entry.synopsis?.length ?? 0) + (entry.isbn ? 300 : 0) + (entry.coverUrl ? 120 : 0) + (entry.pages ? 80 : 0);
  const withSynopsis = entries
    .filter((entry) => entry.synopsis && entry.synopsis.length >= 300 && entry.sourceUrl)
    .sort((a, b) => quality(b) - quality(a));
  const withoutSynopsis = entries.filter((entry) => !entry.synopsis && entry.sourceUrl && entry.isbn);
  const complete = process.argv.includes("--complete");
  const currentTotal = () => (db().prepare("SELECT COUNT(*) AS total FROM books").get() as { total: number }).total;
  const room = Math.max(0, TARGET_SIZE - MAX_WITHOUT_SYNOPSIS - currentTotal());
  const additions = new Set(existsSync(ADDITIONS_FILE) ? (JSON.parse(readFileSync(ADDITIONS_FILE, "utf8")) as string[]) : []);
  const fresh = withSynopsis.filter(
    (entry) => !additions.has(entry.slug) && !findExistingBook({ isbn: entry.isbn, title: entry.title, author: entry.author }),
  );
  const addArgument = process.argv.find((argument) => argument.startsWith("--add="));
  const requested = addArgument ? new Set(addArgument.slice("--add=".length).split(",").filter(Boolean)) : null;
  if (requested) {
    const known = new Set(entries.map((entry) => entry.slug));
    const unknown = [...requested].filter((slug) => !known.has(slug));
    if (unknown.length > 0) {
      console.error(`Not in the seed catalog: ${unknown.join(", ")}`);
      process.exit(1);
    }
  }
  const selected = requested
    ? entries.filter((entry) => requested.has(entry.slug))
    : [
        ...fresh.slice(0, room),
        ...(complete ? withoutSynopsis.slice(0, MAX_WITHOUT_SYNOPSIS) : []),
        ...entries.filter((entry) => additions.has(entry.slug)),
      ];

  let inserted = 0;
  let skipped = 0;
  let noted = 0;
  db().transaction(() => {
    for (const entry of selected) {
      const existing = findExistingBook({ isbn: entry.isbn, title: entry.title, author: entry.author });
      const note = notes[entry.slug] ?? null;
      if (existing) {
        skipped += 1;
        continue;
      }
      insertBook({
        isbn: entry.isbn,
        title: entry.title,
        author: entry.author,
        genre: entry.genre,
        synopsis: entry.synopsis,
        synopsisSource: entry.synopsisSource,
        synopsisUrl: entry.synopsisUrl,
        publisher: entry.publisher,
        year: entry.year,
        pages: entry.pages,
        language: entry.language,
        coverUrl: entry.coverUrl,
        coverSource: entry.coverSource,
        sourceUrl: entry.sourceUrl,
        subjects: entry.subjects,
        priceCents: demoPriceCents(entry),
        priceIsDemo: true,
        stock: demoStock(entry),
        stockIsDemo: true,
        note,
        noteOrigin: note ? "example" : null,
      });
      inserted += 1;
      if (note) noted += 1;
    }
  })();

  let retitled = 0;
  if (process.argv.includes("--refresh-titles")) {
    for (const entry of entries) {
      if (!entry.editionTitle) continue;
      const existing = findExistingBook({ isbn: null, title: entry.editionTitle, author: entry.author });
      if (!existing) continue;
      updateBook(existing, { title: entry.title });
      retitled += 1;
    }
  }

  let synopsesFixed = 0;
  if (process.argv.includes("--refresh-synopsis")) {
    for (const entry of entries) {
      const existing = findExistingBook({ isbn: null, title: entry.title, author: entry.author });
      if (!existing) continue;
      const row = db().prepare("SELECT synopsis, synopsis_source FROM books WHERE id = ?").get(existing) as {
        synopsis: string | null;
        synopsis_source: string | null;
      };
      if (row.synopsis_source && !row.synopsis_source.startsWith("Wikipedia")) continue;
      if ((row.synopsis ?? null) === (entry.synopsis ?? null)) continue;
      updateBook(existing, { synopsis: entry.synopsis, synopsisSource: entry.synopsisSource, synopsisUrl: entry.synopsisUrl });
      db()
        .prepare("UPDATE book_semantics SET status = 'pending', origin = 'ai', error = NULL WHERE book_id = ?")
        .run(existing);
      synopsesFixed += 1;
    }
  }

  let pruned = 0;
  if (process.argv.includes("--prune-empty")) {
    const empty = db().prepare("SELECT id, title FROM books WHERE synopsis IS NULL ORDER BY id").all() as { id: number; title: string }[];
    for (const row of empty.slice(MAX_WITHOUT_SYNOPSIS)) {
      deleteBook(row.id);
      pruned += 1;
    }
    const validKeys = new Set(withSynopsis.map((entry) => `${entry.title}|${entry.author}`));
    const stillRoom = Math.max(0, TARGET_SIZE - currentTotal());
    const candidates = withSynopsis.filter(
      (entry) => validKeys.has(`${entry.title}|${entry.author}`) && !findExistingBook({ isbn: entry.isbn, title: entry.title, author: entry.author }),
    );
    for (const entry of candidates.slice(0, stillRoom)) {
      insertBook({
        isbn: entry.isbn,
        title: entry.title,
        author: entry.author,
        genre: entry.genre,
        synopsis: entry.synopsis,
        synopsisSource: entry.synopsisSource,
        synopsisUrl: entry.synopsisUrl,
        publisher: entry.publisher,
        year: entry.year,
        pages: entry.pages,
        language: entry.language,
        coverUrl: entry.coverUrl,
        coverSource: entry.coverSource,
        sourceUrl: entry.sourceUrl,
        subjects: entry.subjects,
        priceCents: demoPriceCents(entry),
        priceIsDemo: true,
        stock: demoStock(entry),
        stockIsDemo: true,
      });
      inserted += 1;
    }
  }

  let refreshed = 0;
  if (process.argv.includes("--refresh-meta")) {
    for (const entry of entries) {
      const existing = findExistingBook({ isbn: null, title: entry.title, author: entry.author });
      if (!existing) continue;
      try {
        updateBook(existing, {
          isbn: entry.isbn,
          publisher: entry.publisher,
          year: entry.year,
          pages: entry.pages,
          coverUrl: entry.coverUrl,
          coverSource: entry.coverSource,
          sourceUrl: entry.sourceUrl,
          subjects: entry.subjects,
        });
        refreshed += 1;
      } catch (error) {
        console.warn(`could not update ${entry.title}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  if (process.argv.includes("--notes")) {
    for (const entry of entries) {
      const note = notes[entry.slug];
      const existing = findExistingBook({ isbn: entry.isbn, title: entry.title, author: entry.author });
      if (!note || !existing) continue;
      const row = db().prepare("SELECT staff_note, staff_note_origin FROM books WHERE id = ?").get(existing) as {
        staff_note: string | null;
        staff_note_origin: string | null;
      };
      if (row.staff_note && row.staff_note_origin === "bookseller") continue;
      if (row.staff_note === note) continue;
      updateBook(existing, { note, noteOrigin: "example" });
      noted += 1;
    }
  }

  console.log(JSON.stringify({ inserted, skipped, refreshed, retitled, synopsesFixed, pruned, exampleNotes: noted, stats: catalogStats() }, null, 1));
  closeDb();
}

main();
