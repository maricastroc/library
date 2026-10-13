import { db } from "@/lib/db";
import { getBookById, saveSemantics, setSemanticStatus } from "@/lib/catalog/books";
import { classifyBook, enrichmentInputHash } from "./enrich";
import { indexBook } from "./indexing";
import { OllamaError } from "./ollama";

export type EnrichmentState = {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  processed: number;
  failed: number;
  current: string[];
  lastError: string | null;
};

type GlobalWithState = typeof globalThis & { __entrelinhasEnrichment?: EnrichmentState };

function state(): EnrichmentState {
  const scope = globalThis as GlobalWithState;
  if (!scope.__entrelinhasEnrichment) {
    scope.__entrelinhasEnrichment = {
      running: false,
      startedAt: null,
      finishedAt: null,
      processed: 0,
      failed: 0,
      current: [],
      lastError: null,
    };
  }
  return scope.__entrelinhasEnrichment;
}

export function enrichmentState(): EnrichmentState {
  return { ...state(), current: [...state().current] };
}

function emptyProfile() {
  return { atmospheres: [], pace: null, density: null, styles: [], experiences: [], themes: [], portrait: null };
}

export async function enrichBook(bookId: number, options: { force?: boolean } = {}): Promise<"ready" | "insufficient" | "kept"> {
  const book = getBookById(bookId);
  if (!book) return "kept";
  await indexBook(bookId);
  if (book.semanticOrigin === "bookseller" && !options.force) return "kept";

  const input = {
    title: book.title,
    author: book.author,
    genre: book.genre,
    synopsis: book.synopsis,
    subjects: book.subjects,
  };
  const inputHash = enrichmentInputHash(input);
  setSemanticStatus(bookId, "processing");
  const outcome = await classifyBook(input);
  if (outcome.status === "insufficient") {
    saveSemantics(bookId, emptyProfile(), {
      status: "insufficient",
      origin: "ai",
      evidence: [],
      inputHash,
      error: outcome.reason,
    });
    await indexBook(bookId);
    return "insufficient";
  }
  saveSemantics(bookId, outcome.profile, {
    status: "ready",
    origin: "ai",
    evidence: outcome.evidence,
    confidence: outcome.confidence,
    model: outcome.model,
    inputHash,
    error: null,
  });
  await indexBook(bookId);
  return "ready";
}

export function pendingBookIds(): number[] {
  const rows = db()
    .prepare(
      `SELECT b.id FROM books b LEFT JOIN book_semantics s ON s.book_id = b.id
       WHERE COALESCE(s.status, 'pending') IN ('pending', 'processing') ORDER BY b.id`,
    )
    .all() as { id: number }[];
  return rows.map((row) => row.id);
}

export function markForReprocessing(bookId: number): void {
  db()
    .prepare("UPDATE book_semantics SET status = 'pending', origin = 'ai', error = NULL WHERE book_id = ?")
    .run(bookId);
}

export type RunOptions = {
  concurrency?: number;
  onProgress?: (info: { done: number; total: number; title: string; result: string }) => void;
};

export async function runEnrichment(options: RunOptions = {}): Promise<EnrichmentState> {
  const current = state();
  if (current.running) return enrichmentState();
  current.running = true;
  current.startedAt = new Date().toISOString();
  current.finishedAt = null;
  current.processed = 0;
  current.failed = 0;
  current.lastError = null;
  current.current = [];

  try {
    db().prepare("UPDATE book_semantics SET status = 'pending' WHERE status = 'processing'").run();
    const allIds = (db().prepare("SELECT id FROM books ORDER BY id").all() as { id: number }[]).map((row) => row.id);
    for (const id of allIds) await indexBook(id);

    const queue = pendingBookIds();
    const total = queue.length;
    let aborted = false;
    const worker = async () => {
      while (queue.length > 0 && !aborted) {
        const id = queue.shift();
        if (id === undefined) break;
        const title = getBookById(id)?.title ?? `#${id}`;
        current.current.push(title);
        try {
          const result = await enrichBook(id);
          current.processed += 1;
          options.onProgress?.({ done: current.processed + current.failed, total, title, result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "erro desconhecido";
          current.lastError = message;
          if (error instanceof OllamaError && (error.kind === "unavailable" || error.kind === "model")) {
            setSemanticStatus(id, "pending");
            aborted = true;
          } else {
            current.failed += 1;
            setSemanticStatus(id, "error", message);
            options.onProgress?.({ done: current.processed + current.failed, total, title, result: `erro: ${message}` });
          }
        } finally {
          current.current = current.current.filter((item) => item !== title);
        }
      }
    };
    await Promise.all(Array.from({ length: options.concurrency ?? 4 }, () => worker()));
  } catch (error) {
    current.lastError = error instanceof Error ? error.message : "erro desconhecido";
  } finally {
    current.running = false;
    current.finishedAt = new Date().toISOString();
    current.current = [];
  }
  return enrichmentState();
}

export function ensureBackgroundEnrichment(): void {
  if (state().running) return;
  void runEnrichment();
}
