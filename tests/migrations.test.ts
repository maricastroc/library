import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { LATEST_SCHEMA_VERSION, migrate } from "@/lib/db/migrations";
import { SCHEMA_SQL } from "@/lib/db/schema";

describe("database migrations", () => {
  it("translates legacy stored values to the current vocabulary", () => {
    const database = new Database(":memory:");
    database.exec(SCHEMA_SQL);
    database.pragma("user_version = 1");
    database
      .prepare("INSERT INTO books (id, slug, title, author, dedupe_key, staff_note, staff_note_origin) VALUES (1, 'a', 'A', 'B', 'a|b', 'nota', 'exemplo')")
      .run();
    database
      .prepare(
        `INSERT INTO book_semantics (book_id, status, origin, confidence, atmospheres, styles, experiences, evidence)
         VALUES (1, 'pronto', 'ia', 'media', '["melancolica","sombria"]', '["lirico","experimental"]', '["pensar"]', '[{"attribute":"sombria","quote":"x"},{"attribute":"isolamento","quote":"y"}]')`,
      )
      .run();
    database.prepare("INSERT INTO interests (book_id, kind, name, contact, status) VALUES (1, 'reserva', 'n', 'c', 'novo')").run();
    database.prepare("INSERT INTO showcases (slug, title, palette) VALUES ('s', 'S', 'tinta')").run();

    migrate(database);

    expect(database.pragma("user_version", { simple: true })).toBe(LATEST_SCHEMA_VERSION);
    expect(database.prepare("SELECT staff_note_origin AS value FROM books").get()).toEqual({ value: "example" });
    expect(database.prepare("SELECT status, origin, confidence, atmospheres, styles, experiences, evidence FROM book_semantics").get()).toEqual({
      status: "ready",
      origin: "ai",
      confidence: "medium",
      atmospheres: '["melancholic","dark"]',
      styles: '["lyrical","experimental"]',
      experiences: '["lingering"]',
      evidence: '[{"attribute":"dark","quote":"x"},{"attribute":"isolamento","quote":"y"}]',
    });
    expect(database.prepare("SELECT kind, status FROM interests").get()).toEqual({ kind: "reservation", status: "new" });
    expect(database.prepare("SELECT palette FROM showcases").get()).toEqual({ palette: "ink" });
  });

  it("is a no-op on a database that is already current", () => {
    const database = new Database(":memory:");
    database.exec(SCHEMA_SQL);
    migrate(database);
    database.prepare("INSERT INTO showcases (slug, title, palette) VALUES ('s', 'S', 'ink')").run();
    migrate(database);
    expect(database.prepare("SELECT palette FROM showcases").get()).toEqual({ palette: "ink" });
  });
});
