import { beforeEach, describe, expect, it } from "vitest";
import { getBookById, insertBook, listShelfBooks } from "@/lib/catalog/books";
import { analyzeCsv, applyImportPlan, listImportRuns, parsePrice } from "@/lib/catalog/import-csv";
import { db } from "@/lib/db";

const SYNOPSIS =
  "Uma mulher volta à casa da infância para enterrar a mãe e reencontra a irmã com quem não fala há vinte anos. Entre silêncios e lembranças, as duas refazem a história da família.";

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
    expect(parsePrice("grátis")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice("")).toBeNull();
  });
});

describe("analyzeCsv", () => {
  it("recognises semicolons and Portuguese headers", () => {
    const csv = `ISBN;Título;Autor;Sinopse;Gênero;Preço;Estoque;Nota da livreira\n9788535902778;Livro Um;Autora Um;"${SYNOPSIS}";Romance;49,90;3;Para ler devagar.`;
    const plan = analyzeCsv(csv);
    expect(plan.fatal).toBeNull();
    expect(plan.delimiter).toBe(";");
    expect(plan.totals).toMatchObject({ total: 1, created: 1, errors: 0 });
    expect(plan.rows[0].data).toMatchObject({
      isbn: "9788535902778",
      title: "Livro Um",
      author: "Autora Um",
      genre: "Romance",
      priceCents: 4990,
      stock: 3,
      note: "Para ler devagar.",
      noteOrigin: "bookseller",
    });
  });

  it("stops when required columns are missing", () => {
    const plan = analyzeCsv("ISBN,Preço\n9788535902778,10");
    expect(plan.fatal).toContain("Título");
    expect(plan.fatal).toContain("Autor");
    expect(plan.rows).toHaveLength(0);
  });

  it("reports errors per row without dropping the others", () => {
    const csv = [
      "titulo,autor,isbn,preco,estoque",
      "Bom,Autora,9788535902778,39.90,2",
      "ISBN ruim,Autora,9788535902776,39.90,2",
      "Preço ruim,Autora,,caro,2",
      "Estoque ruim,Autora,,39.90,-1",
      ",Sem título,,,",
    ].join("\n");
    const plan = analyzeCsv(csv);
    expect(plan.totals).toMatchObject({ total: 5, created: 1, errors: 4 });
    expect(plan.rows.map((row) => row.status)).toEqual(["new", "error", "error", "error", "error"]);
    expect(plan.rows[1].issues[0].message).toContain("ISBN");
    expect(plan.rows[2].issues[0].message).toContain("Preço");
    expect(plan.rows[3].issues[0].message).toContain("Estoque");
    expect(plan.rows[4].issues[0].message).toContain("Título vazio");
  });

  it("ignores repeats inside the file", () => {
    const csv = "titulo,autor,isbn\nO Mesmo,Autora,9788535902778\nOutro nome,Outra,978-85-359-0277-8\no mesmo,AUTORA,";
    const plan = analyzeCsv(csv);
    expect(plan.rows.map((row) => row.status)).toEqual(["new", "duplicate", "duplicate"]);
    expect(plan.rows[1].issues[0].message).toContain("linha 2");
  });

  it("warns about a short or missing synopsis", () => {
    const plan = analyzeCsv(`titulo,autor,sinopse\nA,B,curta\nC,D,\nE,F,"${SYNOPSIS}"`);
    expect(plan.rows[0].issues[0]).toMatchObject({ level: "warning" });
    expect(plan.rows[1].issues[0].message).toContain("Sem sinopse");
    expect(plan.rows[2].issues).toHaveLength(0);
    expect(plan.totals.warnings).toBe(2);
  });

  it("tells an update apart from a duplicate of the catalog", () => {
    insertBook({ title: "Livro Antigo", author: "Autora", isbn: "9788535902778", priceCents: 3000, stock: 1 });
    const same = analyzeCsv("titulo,autor,isbn,preco,estoque\nLivro Antigo,Autora,9788535902778,30,1");
    expect(same.rows[0].status).toBe("duplicate");
    const changed = analyzeCsv("titulo,autor,isbn,preco,estoque\nLivro Antigo,Autora,9788535902778,45,0");
    expect(changed.rows[0].status).toBe("update");
    expect(changed.rows[0].changes).toEqual(["preço", "estoque"]);
  });

  it("rejects an empty file", () => {
    expect(analyzeCsv("  \n ").fatal).toContain("vazio");
    expect(analyzeCsv("titulo,autor").fatal).toContain("pelo menos um livro");
  });
});

describe("applyImportPlan", () => {
  it("inserts new books, updates existing ones and records the run", () => {
    const existing = insertBook({ title: "Livro Antigo", author: "Autora", priceCents: 3000, priceIsDemo: true, stock: 1, stockIsDemo: true });
    const csv = `titulo,autor,preco,estoque,sinopse,nota\nLivro Antigo,Autora,45,0,,Minha nota\nLivro Novo,Outro,20,5,"${SYNOPSIS}",\nQuebrado,,,,,`;
    const plan = analyzeCsv(csv);
    const outcome = applyImportPlan(plan, "catalogo.csv");
    expect(outcome).toMatchObject({ inserted: 1, updated: 1, skipped: 1 });
    expect(listShelfBooks()).toHaveLength(2);

    const updated = getBookById(existing);
    expect(updated).toMatchObject({ priceCents: 4500, priceIsDemo: false, stock: 0, stockIsDemo: false, note: "Minha nota", noteOrigin: "bookseller" });

    const runs = listImportRuns();
    expect(runs[0]).toMatchObject({ filename: "catalogo.csv", inserted: 1, updated: 1, skipped: 1, total: 3 });
  });

  it("writes nothing when the plan is fatal", () => {
    const outcome = applyImportPlan(analyzeCsv("isbn\n123"), "ruim.csv");
    expect(outcome).toMatchObject({ inserted: 0, updated: 0 });
    expect(listShelfBooks()).toHaveLength(0);
  });
});
