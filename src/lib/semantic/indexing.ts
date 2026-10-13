import { db } from "@/lib/db";
import { getBookById } from "@/lib/catalog/books";
import type { BookDetail } from "@/lib/catalog/types";
import { hashString, splitSentences } from "@/lib/catalog/text";
import { EMBED_MODEL, documentPrompt, embedTexts } from "./ollama";
import { describeProfile } from "./taxonomy";
import { vectorToBlob } from "./vectors";

export type VectorKind = "syn" | "feel";

const MAX_SENTENCES = 16;

export function bumpVectorVersion(): void {
  db()
    .prepare(
      `INSERT INTO shop_settings (key, value) VALUES ('vector_version', '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`,
    )
    .run();
}

export function vectorVersion(): number {
  const row = db().prepare("SELECT value FROM shop_settings WHERE key = 'vector_version'").get() as
    | { value: string }
    | undefined;
  return row ? Number(row.value) : 0;
}

export function synopsisText(book: BookDetail): string {
  const parts = [`${book.author}.`];
  if (book.genre) parts.push(`${book.genre}.`);
  if (book.synopsis) parts.push(book.synopsis);
  if (book.note) parts.push(`Nota da livreira: ${book.note}`);
  return parts.join(" ");
}

export function feelText(book: BookDetail): string | null {
  if (book.semanticStatus !== "ready" || book.atmospheres.length === 0) return null;
  return describeProfile({
    atmospheres: book.atmospheres,
    pace: book.pace,
    density: book.density,
    styles: book.styles,
    experiences: book.experiences,
    themes: book.themes,
    portrait: book.portrait,
  });
}

function inputHash(text: string): string {
  return `${EMBED_MODEL}:${hashString(text).toString(36)}:${text.length}`;
}

function storedHash(bookId: number, kind: VectorKind): string | null {
  const row = db().prepare("SELECT input_hash FROM book_vectors WHERE book_id = ? AND kind = ?").get(bookId, kind) as
    | { input_hash: string }
    | undefined;
  return row?.input_hash ?? null;
}

function storeVector(bookId: number, kind: VectorKind, hash: string, vector: Float32Array): void {
  db()
    .prepare(
      `INSERT INTO book_vectors (book_id, kind, model, input_hash, vector) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(book_id, kind) DO UPDATE SET model = excluded.model, input_hash = excluded.input_hash, vector = excluded.vector`,
    )
    .run(bookId, kind, EMBED_MODEL, hash, vectorToBlob(vector));
}

export async function indexBook(bookId: number): Promise<{ changed: boolean }> {
  const book = getBookById(bookId);
  if (!book) return { changed: false };
  const database = db();
  const prompts: string[] = [];
  const tasks: ((vector: Float32Array) => void)[] = [];

  const synText = synopsisText(book);
  const synHash = inputHash(`syn|${book.title}|${synText}`);
  const synChanged = storedHash(bookId, "syn") !== synHash;
  let sentences: string[] = [];

  if (synChanged) {
    prompts.push(documentPrompt(synText, book.title));
    tasks.push((vector) => storeVector(bookId, "syn", synHash, vector));
    sentences = book.synopsis ? splitSentences(book.synopsis).slice(0, MAX_SENTENCES) : [];
    for (const sentence of sentences) prompts.push(documentPrompt(sentence));
  }

  const feel = feelText(book);
  const feelHash = feel ? inputHash(`feel|${feel}`) : null;
  const feelChanged = feel !== null && storedHash(bookId, "feel") !== feelHash;
  const feelRemoved = feel === null && storedHash(bookId, "feel") !== null;
  if (feelChanged && feel && feelHash) {
    prompts.push(documentPrompt(feel));
    tasks.push((vector) => storeVector(bookId, "feel", feelHash, vector));
  }

  if (prompts.length === 0 && !feelRemoved) return { changed: false };
  const vectors = prompts.length > 0 ? await embedTexts(prompts) : [];

  database.transaction(() => {
    let cursor = 0;
    if (synChanged) {
      tasks[0](vectors[cursor]);
      cursor += 1;
      database.prepare("DELETE FROM book_sentences WHERE book_id = ?").run(bookId);
      const insert = database.prepare("INSERT INTO book_sentences (book_id, position, text, vector) VALUES (?, ?, ?, ?)");
      sentences.forEach((sentence, position) => {
        insert.run(bookId, position, sentence, vectorToBlob(vectors[cursor]));
        cursor += 1;
      });
    }
    if (feelChanged) tasks[tasks.length - 1](vectors[cursor]);
    if (feelRemoved) database.prepare("DELETE FROM book_vectors WHERE book_id = ? AND kind = 'feel'").run(bookId);
    bumpVectorVersion();
  })();
  return { changed: true };
}
