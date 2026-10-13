import type { BookInput } from "./types";

export type ImportField =
  | "isbn"
  | "title"
  | "author"
  | "synopsis"
  | "genre"
  | "price"
  | "stock"
  | "note"
  | "pages"
  | "year"
  | "publisher";

export const FIELD_LABELS: Record<ImportField, string> = {
  isbn: "ISBN",
  title: "Título",
  author: "Autor",
  synopsis: "Sinopse",
  genre: "Gênero",
  price: "Preço",
  stock: "Estoque",
  note: "Nota da livreira",
  pages: "Páginas",
  year: "Ano",
  publisher: "Editora",
};

export type ImportIssue = { level: "error" | "warning"; message: string };
export type ImportRowStatus = "new" | "update" | "duplicate" | "error";

export type ImportRow = {
  line: number;
  status: ImportRowStatus;
  title: string;
  author: string;
  isbn: string | null;
  existingId: number | null;
  changes: string[];
  issues: ImportIssue[];
  data: BookInput | null;
};

export type ImportPlan = {
  fatal: string | null;
  delimiter: string;
  columns: { header: string; field: ImportField | null }[];
  rows: ImportRow[];
  totals: { total: number; created: number; updated: number; duplicates: number; errors: number; warnings: number };
};

export type ImportOutcome = {
  inserted: number;
  updated: number;
  skipped: number;
  affectedIds: number[];
};
