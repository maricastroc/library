import type { ShelfBook } from "@/lib/catalog/types";
import { authorSortKey, normalizeText, titleSortKey } from "@/lib/catalog/text";
import { ATMOSPHERE_BY_ID, GENRES, PACE_LEVELS, type AtmosphereId } from "@/lib/semantic/taxonomy";

export type SortKey = "atmosphere" | "pace" | "genre" | "author" | "title" | "price";

export const SORT_OPTIONS: { key: SortKey; label: string; hint: string }[] = [
  { key: "atmosphere", label: "Atmosphere", hint: "from luminous to dark" },
  { key: "pace", label: "Pace", hint: "from slow to breakneck" },
  { key: "genre", label: "Genre", hint: "by the book’s form" },
  { key: "author", label: "Author", hint: "by surname" },
  { key: "title", label: "Title", hint: "in alphabetical order" },
  { key: "price", label: "Price", hint: "from lowest to highest" },
];

export const ATMOSPHERE_SPECTRUM: AtmosphereId[] = [
  "luminous",
  "comforting",
  "nostalgic",
  "contemplative",
  "melancholic",
  "dreamlike",
  "ironic",
  "intense",
  "unsettling",
  "tense",
  "raw",
  "dark",
];

export type ShelfGroup = {
  id: string;
  label: string;
  books: ShelfBook[];
};

const spectrumIndex = (id: AtmosphereId | undefined) => (id ? ATMOSPHERE_SPECTRUM.indexOf(id) : ATMOSPHERE_SPECTRUM.length);

function byTitle(a: ShelfBook, b: ShelfBook): number {
  return titleSortKey(a.title).localeCompare(titleSortKey(b.title), "en");
}

function byAuthor(a: ShelfBook, b: ShelfBook): number {
  return authorSortKey(a.author).localeCompare(authorSortKey(b.author), "en") || byTitle(a, b);
}

function byAtmosphere(a: ShelfBook, b: ShelfBook): number {
  return (
    spectrumIndex(a.atmospheres[0]) - spectrumIndex(b.atmospheres[0]) ||
    spectrumIndex(a.atmospheres[1]) - spectrumIndex(b.atmospheres[1]) ||
    (a.density ?? 2) - (b.density ?? 2) ||
    byTitle(a, b)
  );
}

function collect(
  books: ShelfBook[],
  keyOf: (book: ShelfBook) => string,
  labelOf: (key: string) => string,
  order: (a: string, b: string) => number,
  within: (a: ShelfBook, b: ShelfBook) => number,
): ShelfGroup[] {
  const buckets = new Map<string, ShelfBook[]>();
  for (const book of books) {
    const key = keyOf(book);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(book);
    else buckets.set(key, [book]);
  }
  return [...buckets.keys()]
    .sort(order)
    .map((key) => ({ id: key, label: labelOf(key), books: (buckets.get(key) ?? []).sort(within) }));
}

const UNREAD = "zz-unread";
const PRICE_BANDS = [
  { id: "1", label: "up to R$ 45", max: 4500 },
  { id: "2", label: "R$ 45 to 60", max: 6000 },
  { id: "3", label: "R$ 60 a 80", max: 8000 },
  { id: "4", label: "over R$ 80", max: Number.POSITIVE_INFINITY },
];

export function arrangeBooks(books: ShelfBook[], key: SortKey): ShelfGroup[] {
  switch (key) {
    case "atmosphere":
      return collect(
        books,
        (book) => book.atmospheres[0] ?? UNREAD,
        (id) => (id === UNREAD ? "not yet read" : ATMOSPHERE_BY_ID[id as AtmosphereId].label),
        (a, b) => spectrumIndex(a === UNREAD ? undefined : (a as AtmosphereId)) - spectrumIndex(b === UNREAD ? undefined : (b as AtmosphereId)),
        byAtmosphere,
      );
    case "pace":
      return collect(
        books,
        (book) => (book.pace ? String(book.pace) : UNREAD),
        (id) => (id === UNREAD ? "not yet read" : (PACE_LEVELS.find((level) => String(level.value) === id)?.label ?? id)),
        (a, b) => a.localeCompare(b),
        byAtmosphere,
      );
    case "genre": {
      const genreOrder = GENRES.map((genre) => normalizeText(genre));
      const position = (value: string) => {
        const index = genreOrder.indexOf(normalizeText(value));
        return index === -1 ? genreOrder.length : index;
      };
      return collect(
        books,
        (book) => book.genre ?? "No genre",
        (id) => id,
        (a, b) => position(a) - position(b) || a.localeCompare(b, "en"),
        byAuthor,
      );
    }
    case "author":
      return collect(
        books,
        (book) => authorSortKey(book.author).charAt(0).toUpperCase() || "#",
        (id) => id,
        (a, b) => a.localeCompare(b),
        byAuthor,
      );
    case "title":
      return collect(
        books,
        (book) => {
          const initial = titleSortKey(book.title).charAt(0).toUpperCase();
          return /[A-Z]/.test(initial) ? initial : "0–9";
        },
        (id) => id,
        (a, b) => a.localeCompare(b),
        byTitle,
      );
    case "price":
      return collect(
        books,
        (book) => {
          if (book.priceCents === null) return "9";
          return PRICE_BANDS.find((band) => (book.priceCents ?? 0) <= band.max)?.id ?? "4";
        },
        (id) => PRICE_BANDS.find((band) => band.id === id)?.label ?? "no price",
        (a, b) => a.localeCompare(b),
        (a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0) || byTitle(a, b),
      );
  }
}
