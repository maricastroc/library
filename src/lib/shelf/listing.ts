import { authorSortKey, formatPrice, normalizeText, titleSortKey } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SortKey } from "./arrange";
import { numeral } from "./composition";

export function locatorFor(book: ShelfBook, arrangement: SortKey, rank?: number): string {
  if (rank) return numeral(rank);
  if (arrangement === "price") return formatPrice(book.priceCents) ?? "—";
  return book.year ? String(book.year) : "—";
}

export function seekKey(book: ShelfBook, arrangement: SortKey): string {
  return arrangement === "author" ? authorSortKey(book.author) : titleSortKey(book.title);
}

export function seek(keys: string[], from: number, typed: string): number | null {
  const prefix = normalizeText(typed);
  if (!prefix || keys.length === 0) return null;
  const repeated = prefix.length > 1 && [...prefix].every((char) => char === prefix[0]);
  const wanted = repeated ? prefix[0] : prefix;
  const start = wanted.length === 1 ? from + 1 : Math.max(0, from);
  for (let step = 0; step < keys.length; step += 1) {
    const index = (((start + step) % keys.length) + keys.length) % keys.length;
    if (keys[index].startsWith(wanted)) return index;
  }
  return null;
}
