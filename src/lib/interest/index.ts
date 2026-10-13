import { db } from "@/lib/db";

export type InterestKind = "reservation" | "notice";
export type InterestStatus = "new" | "fulfilled" | "cancelled";

export type Interest = {
  id: number;
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  bookSlug: string;
  kind: InterestKind;
  name: string;
  contact: string;
  message: string | null;
  searchQuery: string | null;
  status: InterestStatus;
  createdAt: string;
};

export function createInterest(input: {
  bookId: number;
  kind: InterestKind;
  name: string;
  contact: string;
  message?: string | null;
  searchQuery?: string | null;
}): number {
  const info = db()
    .prepare(
      "INSERT INTO interests (book_id, kind, name, contact, message, search_query, status) VALUES (?, ?, ?, ?, ?, ?, 'new')",
    )
    .run(input.bookId, input.kind, input.name, input.contact, input.message ?? null, input.searchQuery ?? null);
  return Number(info.lastInsertRowid);
}

export function listInterests(): Interest[] {
  const rows = db()
    .prepare(
      `SELECT i.id, i.book_id, b.title, b.author, b.slug, i.kind, i.name, i.contact, i.message, i.search_query, i.status, i.created_at
       FROM interests i JOIN books b ON b.id = i.book_id
       ORDER BY CASE i.status WHEN 'new' THEN 0 ELSE 1 END, i.created_at DESC, i.id DESC`,
    )
    .all() as {
    id: number;
    book_id: number;
    title: string;
    author: string;
    slug: string;
    kind: InterestKind;
    name: string;
    contact: string;
    message: string | null;
    search_query: string | null;
    status: InterestStatus;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    bookId: row.book_id,
    bookTitle: row.title,
    bookAuthor: row.author,
    bookSlug: row.slug,
    kind: row.kind,
    name: row.name,
    contact: row.contact,
    message: row.message,
    searchQuery: row.search_query,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function setInterestStatus(id: number, status: InterestStatus): void {
  db().prepare("UPDATE interests SET status = ? WHERE id = ?").run(status, id);
}

export function countNewInterests(): number {
  const row = db().prepare("SELECT COUNT(*) AS total FROM interests WHERE status = 'new'").get() as { total: number };
  return row.total;
}
