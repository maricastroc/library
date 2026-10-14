import { db } from "@/lib/db";
import { listBookDetails } from "@/lib/catalog/books";
import type { BookDetail } from "@/lib/catalog/types";
import { hashString, normalizeText } from "@/lib/catalog/text";
import { EMBED_MODEL, documentPrompt, embedTexts } from "@/lib/semantic/ollama";
import { ATMOSPHERES, type AtmosphereId } from "@/lib/semantic/taxonomy";
import { blobToVector, vectorToBlob } from "@/lib/semantic/vectors";

export type IndexedBook = {
  book: BookDetail;
  syn: Float32Array | null;
  feel: Float32Array | null;
  sentences: { text: string; vector: Float32Array }[];
};

export type AuthorEntry = {
  name: string;
  folded: string;
  surname: string;
  aliases: string[];
  bookIds: number[];
};

export type VectorIndex = {
  signature: string;
  books: IndexedBook[];
  byId: Map<number, IndexedBook>;
  authors: AuthorEntry[];
  titles: { folded: string; id: number }[];
  genres: string[];
};

type GlobalWithIndex = typeof globalThis & {
  __subtextIndex?: VectorIndex;
  __subtextAnchors?: { model: string; vectors: Map<AtmosphereId, Float32Array> };
};

const AMBIGUOUS_NAME_TOKENS = new Set(
  "rosa paz lins mann king lee han eco walker levi grass lobo maria jose joao paulo pedro mario carlos luis ana julio jorge lima reis neto junior roy lem dick frank".split(
    " ",
  ),
);

function catalogSignature(): string {
  const rows = db()
    .prepare("SELECT key, value FROM shop_settings WHERE key IN ('catalog_revision', 'vector_version')")
    .all() as { key: string; value: string }[];
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return `${values.catalog_revision ?? "0"}|${values.vector_version ?? "0"}`;
}

function buildAuthors(books: BookDetail[]): AuthorEntry[] {
  const byName = new Map<string, AuthorEntry>();
  for (const book of books) {
    const folded = normalizeText(book.author);
    const existing = byName.get(folded);
    if (existing) {
      existing.bookIds.push(book.id);
      continue;
    }
    const tokens = folded.split(" ").filter(Boolean);
    byName.set(folded, {
      name: book.author,
      folded,
      surname: tokens[tokens.length - 1] ?? folded,
      aliases: [],
      bookIds: [book.id],
    });
  }
  const entries = [...byName.values()];
  const tokenOwners = new Map<string, number>();
  for (const entry of entries) {
    for (const token of new Set(entry.folded.split(" "))) tokenOwners.set(token, (tokenOwners.get(token) ?? 0) + 1);
  }
  for (const entry of entries) {
    const tokens = entry.folded.split(" ").filter(Boolean);
    const aliases = new Set<string>();
    for (const token of tokens) {
      if (token.length < 5 || AMBIGUOUS_NAME_TOKENS.has(token)) continue;
      if ((tokenOwners.get(token) ?? 0) !== 1) continue;
      aliases.add(token);
    }
    if (tokens.length >= 2) aliases.add(tokens.slice(-2).join(" "));
    entry.aliases = [...aliases];
  }
  return entries;
}

export function getVectorIndex(): VectorIndex {
  const scope = globalThis as GlobalWithIndex;
  const signature = catalogSignature();
  if (scope.__subtextIndex?.signature === signature) return scope.__subtextIndex;

  const database = db();
  const details = listBookDetails();
  const vectorRows = database.prepare("SELECT book_id, kind, vector FROM book_vectors WHERE model = ?").all(EMBED_MODEL) as {
    book_id: number;
    kind: string;
    vector: Buffer;
  }[];
  const sentenceRows = database
    .prepare("SELECT book_id, text, vector FROM book_sentences ORDER BY book_id, position")
    .all() as { book_id: number; text: string; vector: Buffer }[];

  const byId = new Map<number, IndexedBook>();
  for (const book of details) byId.set(book.id, { book, syn: null, feel: null, sentences: [] });
  for (const row of vectorRows) {
    const entry = byId.get(row.book_id);
    if (!entry) continue;
    if (row.kind === "syn") entry.syn = blobToVector(row.vector);
    if (row.kind === "feel") entry.feel = blobToVector(row.vector);
  }
  for (const row of sentenceRows) {
    byId.get(row.book_id)?.sentences.push({ text: row.text, vector: blobToVector(row.vector) });
  }

  const index: VectorIndex = {
    signature,
    books: [...byId.values()],
    byId,
    authors: buildAuthors(details),
    titles: details
      .map((book) => ({ folded: normalizeText(book.title), id: book.id }))
      .filter((entry) => entry.folded.length >= 6 && entry.folded.split(" ").length >= 2),
    genres: [...new Set(details.map((book) => book.genre).filter((genre): genre is string => Boolean(genre)))],
  };
  scope.__subtextIndex = index;
  return index;
}

export async function embedCached(prompts: string[]): Promise<{ vectors: Float32Array[]; cached: boolean }> {
  const database = db();
  const keys = prompts.map((prompt) => `${EMBED_MODEL}:${hashString(prompt).toString(36)}:${prompt.length}`);
  const select = database.prepare("SELECT vector FROM text_vectors WHERE hash = ? AND text = ?");
  const vectors: (Float32Array | null)[] = prompts.map((prompt, position) => {
    const row = select.get(keys[position], prompt) as { vector: Buffer } | undefined;
    return row ? blobToVector(row.vector) : null;
  });
  const missing = vectors.map((vector, position) => (vector ? -1 : position)).filter((position) => position >= 0);
  if (missing.length > 0) {
    const fresh = await embedTexts(missing.map((position) => prompts[position]));
    const insert = database.prepare(
      "INSERT OR REPLACE INTO text_vectors (hash, model, text, vector) VALUES (?, ?, ?, ?)",
    );
    missing.forEach((position, order) => {
      vectors[position] = fresh[order];
      insert.run(keys[position], EMBED_MODEL, prompts[position], vectorToBlob(fresh[order]));
    });
  }
  return { vectors: vectors as Float32Array[], cached: missing.length === 0 };
}

export async function atmosphereAnchors(): Promise<Map<AtmosphereId, Float32Array>> {
  const scope = globalThis as GlobalWithIndex;
  if (scope.__subtextAnchors?.model === EMBED_MODEL) return scope.__subtextAnchors.vectors;
  const prompts = ATMOSPHERES.map((atmosphere) =>
    documentPrompt(`A book with a ${atmosphere.label} atmosphere: ${atmosphere.description}.`),
  );
  const { vectors } = await embedCached(prompts);
  const anchors = new Map<AtmosphereId, Float32Array>();
  ATMOSPHERES.forEach((atmosphere, position) => anchors.set(atmosphere.id, vectors[position]));
  scope.__subtextAnchors = { model: EMBED_MODEL, vectors: anchors };
  return anchors;
}
