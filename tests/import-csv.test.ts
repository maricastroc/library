import { beforeEach, describe, expect, it } from "vitest";
import { getBookById, insertBook, listShelfBooks } from "@/lib/catalog/books";
import { analyzeCsv, applyImportPlan, listImportRuns, parsePrice } from "@/lib/catalog/import-csv";
import { db } from "@/lib/db";

const SYNOPSIS =
  "A woman returns to her childhood home to bury her mother and meets again the sister she has not spoken to in twenty years. Between silences and memories, the two piece the family story back together.";

beforeEach(() => {
  db().exec("DELETE FROM books; DELETE FROM books_fts; DELETE FROM import_runs;");
});

describe("parsePrice", () => {
  it("understands Brazilian and international formats", () => {
    expect(parsePrice("R$ 49,90")).toBe(4990);
    expect(parsePrice("49.90")).toBe(4990);
    expect(parsePrice("1.234,56")).toBe(123456);
    expect(parsePrice("60")).toBe(6000);
  });

  it("rejects values that are not prices", () => {
    expect(parsePrice("free")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice("")).toBeNull();
  });
});

describe("analyzeCsv", () => {
  it("recognises semicolons and the template headers", () => {
    const csv = `ISBN;Title;Author;Synopsis;Genre;Price;Stock;Bookseller's note\n9788535902778;Book One;Author One;"${SYNOPSIS}";Novel;49,90;3;To read slowly.`;
    const plan = analyzeCsv(csv);
    expect(plan.fatal).toBeNull();
    expect(plan.delimiter).toBe(";");
    expect(plan.totals).toMatchObject({ total: 1, created: 1, errors: 0 });
    expect(plan.rows[0].data).toMatchObject({
      isbn: "9788535902778",
      title: "Book One",
      author: "Author One",
      genre: "Novel",
      priceCents: 4990,
      stock: 3,
      note: "To read slowly.",
      noteOrigin: "bookseller",
    });
  });

  it("does not map headers in other languages", () => {
    const plan = analyzeCsv("titulo,autor\nOld Book,Author");
    expect(plan.fatal).toContain("Title and Author");
    expect(plan.fatal).toContain("titulo, autor");
  });

  it("stops when required columns are missing", () => {
    const plan = analyzeCsv("ISBN,Price\n9788535902778,10");
    expect(plan.fatal).toContain("Title");
    expect(plan.fatal).toContain("Author");
    expect(plan.rows).toHaveLength(0);
  });

  it("reports errors per row without dropping the others", () => {
    const csv = [
      "title,author,isbn,price,stock",
      "Good,Author,9788535902778,39.90,2",
      "Bad ISBN,Author,9788535902776,39.90,2",
      "Bad price,Author,,expensive,2",
      "Bad stock,Author,,39.90,-1",
      ",No title,,,",
    ].join("\n");
    const plan = analyzeCsv(csv);
    expect(plan.totals).toMatchObject({ total: 5, created: 1, errors: 4 });
    expect(plan.rows.map((row) => row.status)).toEqual(["new", "error", "error", "error", "error"]);
    expect(plan.rows[1].issues[0].message).toContain("ISBN");
    expect(plan.rows[2].issues[0].message).toContain("Price");
    expect(plan.rows[3].issues[0].message).toContain("Stock");
    expect(plan.rows[4].issues[0].message).toContain("Empty title");
  });

  it("ignores repeats inside the file", () => {
    const csv = "title,author,isbn\nThe Same,Author,9788535902778\nAnother name,Another,978-85-359-0277-8\nthe same,AUTHOR,";
    const plan = analyzeCsv(csv);
    expect(plan.rows.map((row) => row.status)).toEqual(["new", "duplicate", "duplicate"]);
    expect(plan.rows[1].issues[0].message).toContain("row 2");
  });

  it("warns about a short or missing synopsis", () => {
    const plan = analyzeCsv(`title,author,synopsis\nA,B,short\nC,D,\nE,F,"${SYNOPSIS}"`);
    expect(plan.rows[0].issues[0]).toMatchObject({ level: "warning" });
    expect(plan.rows[1].issues[0].message).toContain("No synopsis");
    expect(plan.rows[2].issues).toHaveLength(0);
    expect(plan.totals.warnings).toBe(2);
  });

  it("tells an update apart from a duplicate of the catalog", () => {
    insertBook({ title: "Old Book", author: "Author", isbn: "9788535902778", priceCents: 3000, stock: 1 });
    const same = analyzeCsv("title,author,isbn,price,stock\nOld Book,Author,9788535902778,30,1");
    expect(same.rows[0].status).toBe("duplicate");
    const changed = analyzeCsv("title,author,isbn,price,stock\nOld Book,Author,9788535902778,45,0");
    expect(changed.rows[0].status).toBe("update");
    expect(changed.rows[0].changes).toEqual(["price", "stock"]);
  });

  it("rejects an empty file", () => {
    expect(analyzeCsv("  \n ").fatal).toContain("empty");
    expect(analyzeCsv("title,author").fatal).toContain("at least one book");
  });
});

describe("applyImportPlan", () => {
  it("inserts new books, updates existing ones and records the run", () => {
    const existing = insertBook({ title: "Old Book", author: "Author", priceCents: 3000, priceIsDemo: true, stock: 1, stockIsDemo: true });
    const csv = `title,author,price,stock,synopsis,note\nOld Book,Author,45,0,,My note\nNew Book,Someone Else,20,5,"${SYNOPSIS}",\nBroken,,,,,`;
    const plan = analyzeCsv(csv);
    const outcome = applyImportPlan(plan, "catalog.csv");
    expect(outcome).toMatchObject({ inserted: 1, updated: 1, skipped: 1 });
    expect(listShelfBooks()).toHaveLength(2);

    const updated = getBookById(existing);
    expect(updated).toMatchObject({ priceCents: 4500, priceIsDemo: false, stock: 0, stockIsDemo: false, note: "My note", noteOrigin: "bookseller" });

    const runs = listImportRuns();
    expect(runs[0]).toMatchObject({ filename: "catalog.csv", inserted: 1, updated: 1, skipped: 1, total: 3 });
  });

  it("writes nothing when the plan is fatal", () => {
    const outcome = applyImportPlan(analyzeCsv("isbn\n123"), "bad.csv");
    expect(outcome).toMatchObject({ inserted: 0, updated: 0 });
    expect(listShelfBooks()).toHaveLength(0);
  });
});
