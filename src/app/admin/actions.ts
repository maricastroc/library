"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { SESSION_COOKIE, SESSION_MAX_AGE, adminConfigured, createSessionToken, verifyPassword } from "@/lib/auth/session";
import { deleteBook, findExistingBook, getBookById, insertBook, saveSemantics, updateBook } from "@/lib/catalog/books";
import { parsePrice } from "@/lib/catalog/import-csv";
import { normalizeIsbn } from "@/lib/catalog/isbn";
import type { BookInput } from "@/lib/catalog/types";
import { db } from "@/lib/db";
import { clearDemand } from "@/lib/demand";
import { allowRequest } from "@/lib/http/rate-limit";
import { setInterestStatus, type InterestStatus } from "@/lib/interest";
import { cleanThemes } from "@/lib/semantic/enrich";
import { indexBook } from "@/lib/semantic/indexing";
import { ensureBackgroundEnrichment, markForReprocessing } from "@/lib/semantic/pipeline";
import {
  ATMOSPHERE_IDS,
  EXPERIENCE_IDS,
  STYLE_IDS,
  type AtmosphereId,
  type ExperienceId,
  type StyleId,
} from "@/lib/semantic/taxonomy";
import { saveShopConfig } from "@/lib/shop/config";
import { createShowcase, deleteShowcase, updateShowcase, type ShowcaseItem } from "@/lib/showcase";

export type FormState = { ok: boolean; message: string | null; fields?: Record<string, string> };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").replace(/\r\n?/g, "\n").trim();

function reindexLater(id: number) {
  void indexBook(id).catch(() => undefined);
}

export async function login(_previous: FormState, form: FormData): Promise<FormState> {
  if (!adminConfigured()) {
    return { ok: false, message: "The counter hasn’t been set up yet. Set ADMIN_PASSWORD and SESSION_SECRET in .env.local." };
  }
  const headerList = await headers();
  const client = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest("login", client, 6, 5 * 60_000)) {
    return { ok: false, message: "Too many attempts. Wait a few minutes." };
  }
  if (!verifyPassword(text(form, "password"))) return { ok: false, message: "Wrong password." };
  const token = createSessionToken();
  if (!token) return { ok: false, message: "Couldn’t start the session." };
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  const destination = text(form, "from");
  redirect(destination.startsWith("/admin") && !destination.startsWith("/admin/login") ? destination : "/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

function readBookForm(form: FormData): { input: BookInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const title = text(form, "title");
  const author = text(form, "author");
  if (!title) errors.title = "Enter the title.";
  if (!author) errors.author = "Enter who wrote it.";

  let isbn: string | null = null;
  const rawIsbn = text(form, "isbn");
  if (rawIsbn) {
    const result = normalizeIsbn(rawIsbn);
    if (result.ok) isbn = result.isbn;
    else errors.isbn = `Invalid ISBN: ${result.reason}.`;
  }

  let priceCents: number | null = null;
  const rawPrice = text(form, "price");
  if (rawPrice) {
    priceCents = parsePrice(rawPrice);
    if (priceCents === null) errors.price = "Use an amount in reais, like 49.90.";
  }

  const integer = (key: string, label: string, min: number, max: number): number | null => {
    const raw = text(form, key);
    if (!raw) return null;
    if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max) {
      errors[key] = `${label} must be a number between ${min} and ${max}.`;
      return null;
    }
    return Number(raw);
  };

  return {
    errors,
    input: {
      title,
      author,
      isbn,
      genre: text(form, "genre") || null,
      synopsis: text(form, "synopsis") || null,
      publisher: text(form, "publisher") || null,
      year: integer("year", "Year", 1, 2100),
      pages: integer("pages", "Pages", 1, 20000),
      priceCents,
      stock: integer("stock", "Stock", 0, 100000),
      note: text(form, "note") || null,
    },
  };
}

export async function saveBook(_previous: FormState, form: FormData): Promise<FormState> {
  await assertAdmin();
  const id = Number(text(form, "id")) || null;
  const { input, errors } = readBookForm(form);
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", fields: errors };

  const duplicate = findExistingBook({ isbn: input.isbn, title: input.title, author: input.author });
  if (duplicate !== null && duplicate !== id) {
    return { ok: false, message: "There’s already a book with this ISBN or with the same title and author.", fields: { title: "Duplicate book." } };
  }

  if (id === null) {
    const newId = insertBook({
      ...input,
      synopsisSource: input.synopsis ? "Bookshop catalog" : null,
      noteOrigin: input.note ? "bookseller" : null,
    });
    ensureBackgroundEnrichment();
    revalidatePath("/admin", "layout");
    revalidatePath("/");
    redirect(`/admin/books/${newId}?created=1`);
  }

  const current = getBookById(id);
  if (!current) return { ok: false, message: "Book not found." };
  const synopsisChanged = (input.synopsis ?? null) !== (current.synopsis ?? null);
  const { semanticInputChanged } = updateBook(id, {
    ...input,
    priceIsDemo: input.priceCents === current.priceCents ? current.priceIsDemo : false,
    stockIsDemo: input.stock === current.stock ? current.stockIsDemo : false,
    noteOrigin: input.note ? (input.note === current.note ? (current.noteOrigin ?? "bookseller") : "bookseller") : null,
    ...(synopsisChanged ? { synopsisSource: input.synopsis ? "Bookshop catalog" : null, synopsisUrl: null } : {}),
  });
  const classificationInputChanged =
    synopsisChanged || input.title !== current.title || input.author !== current.author || (input.genre ?? null) !== (current.genre ?? null);
  if (classificationInputChanged && current.semanticOrigin === "ai") {
    markForReprocessing(id);
    ensureBackgroundEnrichment();
  } else if (semanticInputChanged) {
    reindexLater(id);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  return {
    ok: true,
    message: classificationInputChanged && current.semanticOrigin === "ai" ? "Book saved. The AI will reread the synopsis in the background." : "Book saved.",
  };
}

export async function saveClassification(_previous: FormState, form: FormData): Promise<FormState> {
  await assertAdmin();
  const id = Number(text(form, "id"));
  const book = getBookById(id);
  if (!book) return { ok: false, message: "Book not found." };

  const atmospheres = form
    .getAll("atmospheres")
    .map(String)
    .filter((value): value is AtmosphereId => ATMOSPHERE_IDS.includes(value as AtmosphereId))
    .slice(0, 3);
  if (atmospheres.length === 0) return { ok: false, message: "Choose at least one atmosphere." };
  const styles = form.getAll("styles").map(String).filter((value): value is StyleId => STYLE_IDS.includes(value as StyleId)).slice(0, 2);
  const experiences = form
    .getAll("experiences")
    .map(String)
    .filter((value): value is ExperienceId => EXPERIENCE_IDS.includes(value as ExperienceId))
    .slice(0, 2);
  const pace = Number(text(form, "pace"));
  const density = Number(text(form, "density"));

  saveSemantics(
    id,
    {
      atmospheres,
      pace: pace >= 1 && pace <= 5 ? pace : null,
      density: density >= 1 && density <= 4 ? density : null,
      styles,
      experiences,
      themes: cleanThemes(text(form, "themes").split(/[,;\n]/)),
      portrait: text(form, "portrait").slice(0, 300) || null,
    },
    { status: "ready", origin: "bookseller", error: null },
  );
  reindexLater(id);
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  return { ok: true, message: "Classification saved as the bookseller’s review. The AI won’t overwrite it." };
}

export async function reclassifyBook(form: FormData): Promise<void> {
  await assertAdmin();
  const id = Number(text(form, "id"));
  if (!getBookById(id)) return;
  markForReprocessing(id);
  ensureBackgroundEnrichment();
  revalidatePath("/admin", "layout");
}

export async function removeBook(form: FormData): Promise<void> {
  await assertAdmin();
  const id = Number(text(form, "id"));
  if (getBookById(id)) deleteBook(id);
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  redirect("/admin/books?removed=1");
}

export async function startEnrichment(): Promise<void> {
  await assertAdmin();
  ensureBackgroundEnrichment();
  revalidatePath("/admin", "layout");
}

export async function updateInterest(form: FormData): Promise<void> {
  await assertAdmin();
  const id = Number(text(form, "id"));
  const status = text(form, "status") as InterestStatus;
  if (!["new", "fulfilled", "cancelled"].includes(status)) return;
  const row = db().prepare("SELECT book_id, kind, status FROM interests WHERE id = ?").get(id) as
    | { book_id: number; kind: string; status: string }
    | undefined;
  if (!row) return;
  if (status === "fulfilled" && row.status !== "fulfilled" && row.kind === "reservation" && form.get("decrement") === "1") {
    const book = getBookById(row.book_id);
    if (book && book.stock !== null && book.stock > 0) updateBook(book.id, { stock: book.stock - 1, stockIsDemo: book.stockIsDemo });
  }
  setInterestStatus(id, status);
  revalidatePath("/admin", "layout");
  revalidatePath("/");
}

function readShowcaseItems(raw: string): ShowcaseItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { bookId: number; caption?: string | null } => typeof item === "object" && item !== null && Number.isInteger((item as { bookId: unknown }).bookId))
      .slice(0, 40)
      .map((item) => ({ bookId: item.bookId, caption: typeof item.caption === "string" ? item.caption.slice(0, 280) : null }));
  } catch {
    return [];
  }
}

export async function saveShowcase(_previous: FormState, form: FormData): Promise<FormState> {
  await assertAdmin();
  const id = Number(text(form, "id")) || null;
  const title = text(form, "title");
  const items = readShowcaseItems(text(form, "items"));
  if (title.length < 3) return { ok: false, message: "Give the showcase a title.", fields: { title: "Title too short." } };
  if (title.length > 90) return { ok: false, message: "The title is over 90 characters.", fields: { title: "Title too long." } };
  if (items.length === 0) return { ok: false, message: "Choose at least one book for the showcase." };
  const input = {
    title,
    intro: text(form, "intro").slice(0, 900) || null,
    palette: text(form, "palette"),
    published: form.get("published") === "1",
    items,
  };
  if (id === null) {
    const created = createShowcase(input);
    revalidatePath("/admin", "layout");
    revalidatePath("/");
    redirect(`/admin/showcases/${created.id}?created=1`);
  }
  const updated = updateShowcase(id, input);
  if (!updated) return { ok: false, message: "Showcase not found." };
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath(`/showcase/${updated.slug}`);
  return { ok: true, message: updated.published ? "Showcase saved and published." : "Showcase saved as a draft." };
}

export async function removeShowcase(form: FormData): Promise<void> {
  await assertAdmin();
  deleteShowcase(Number(text(form, "id")));
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  redirect("/admin/showcases");
}

export async function clearSearchLog(): Promise<void> {
  await assertAdmin();
  clearDemand("all");
  revalidatePath("/admin", "layout");
}

export async function clearSampleSearches(): Promise<void> {
  await assertAdmin();
  clearDemand("samples");
  revalidatePath("/admin", "layout");
}

export async function saveShop(_previous: FormState, form: FormData): Promise<FormState> {
  await assertAdmin();
  const name = text(form, "name");
  if (name.length < 2) return { ok: false, message: "The bookshop needs a name.", fields: { name: "Name too short." } };
  saveShopConfig({
    name,
    tagline: text(form, "tagline"),
    bookseller: text(form, "bookseller"),
    city: text(form, "city"),
    contact: text(form, "contact"),
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Bookshop details saved." };
}
