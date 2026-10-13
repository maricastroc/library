import type { ShelfBook } from "@/lib/catalog/types";
import { hashString, normalizeText } from "@/lib/catalog/text";
import { ATMOSPHERE_BY_ID } from "@/lib/semantic/taxonomy";
import { INK, mixColors, readableInk, shiftLightness } from "./color";

export type SpineTypeface = "serif" | "italic" | "grotesque" | "mono" | "soft";

export type SpineIdentity = {
  width: number;
  height: number;
  color: string;
  ink: string;
  accent: string;
  face: SpineTypeface;
  bands: number;
  classified: boolean;
  titleSize: number;
  titleLines: 1 | 2;
  title: string;
  author: string;
};

export const KRAFT = "#b9a07c";
export const SPINE_MIN_HEIGHT = 160;
export const SPINE_MAX_HEIGHT = 246;

const FACE_BY_GENRE: Record<string, SpineTypeface> = {
  novel: "serif",
  novella: "italic",
  "short stories": "serif",
  poetry: "italic",
  essay: "grotesque",
  chronicles: "italic",
  memoir: "soft",
  reportage: "grotesque",
  theater: "grotesque",
  "science fiction": "mono",
  fantasy: "mono",
  crime: "grotesque",
  comics: "soft",
  "young readers": "soft",
  nonfiction: "grotesque",
};

const HEIGHT_OFFSET_BY_GENRE: Record<string, number> = {
  poetry: -26,
  novella: -16,
  theater: -18,
  "short stories": -8,
  chronicles: -10,
  "young readers": -12,
  memoir: -4,
  essay: 4,
  reportage: 4,
  comics: 10,
};

const CHAR_FACTOR: Record<SpineTypeface, number> = {
  serif: 0.66,
  italic: 0.455,
  grotesque: 0.445,
  mono: 0.655,
  soft: 0.495,
};
const AUTHOR_CHAR = 6.1;

export function spineSurname(author: string): string {
  const tokens = author.trim().split(/\s+/);
  if (tokens.length === 1) return tokens[0];
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (/^(junior|júnior|filho|neto)$/i.test(last) && tokens.length > 2) return `${tokens[tokens.length - 2]} ${last}`;
  if (/^(de|da|do|dos|das|di|von|van|del)$/i.test(previous)) return last;
  return last;
}

type FittedTitle = { text: string; size: number; lines: 1 | 2 };

function fitTitle(title: string, available: number, width: number, preferred: number, face: SpineTypeface): FittedTitle {
  const factor = CHAR_FACTOR[face];
  const needed = (size: number) => title.length * size * factor;
  let size = preferred;
  while (size > 10 && needed(size) > available) size -= 0.5;
  if (needed(size) <= available) return { text: title, size, lines: 1 };

  const words = title.split(/\s+/);
  if (width >= 28 && words.length >= 2) {
    const longestWord = Math.max(...words.map((word) => word.length));
    let doubled = Math.min(preferred, (width - 7) / 2.12);
    while (doubled > 8.5 && (needed(doubled) > available * 1.72 || longestWord * doubled * factor > available)) doubled -= 0.5;
    if (doubled >= 8.5 && needed(doubled) <= available * 1.72 && longestWord * doubled * factor <= available) {
      return { text: title, size: doubled, lines: 2 };
    }
  }

  size = 10;
  const maxChars = Math.max(6, Math.floor(available / (size * factor)) - 1);
  const short = title.split(/[:—–(]/)[0].trim();
  if (short.length <= maxChars) return { text: short, size, lines: 1 };
  const cut = short.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return { text: `${(lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`, size, lines: 1 };
}

export function spineIdentity(book: ShelfBook): SpineIdentity {
  const genreKey = normalizeText(book.genre ?? "");
  const face = FACE_BY_GENRE[genreKey] ?? "serif";
  const classified = book.semanticStatus === "ready" && book.atmospheres.length > 0;

  const pages = book.pages ?? 230;
  const width = Math.round(Math.min(58, Math.max(24, 17 + pages * 0.052)));

  const density = book.density ?? 2;
  const fine = ((book.year ?? hashString(book.slug)) % 5) * 2 - 4;
  const rawHeight = 181 + density * 13 + (HEIGHT_OFFSET_BY_GENRE[genreKey] ?? 0) + fine;
  const height = Math.round(Math.min(SPINE_MAX_HEIGHT, Math.max(SPINE_MIN_HEIGHT, rawHeight)));

  let base = KRAFT;
  let accentSource: string | null = null;
  if (classified) {
    const [first, second, third] = book.atmospheres;
    base = ATMOSPHERE_BY_ID[first].color;
    if (second) base = mixColors(base, ATMOSPHERE_BY_ID[second].color, 0.2);
    base = shiftLightness(base, [0.035, 0.012, -0.012, -0.035][density - 1] ?? 0);
    accentSource = ATMOSPHERE_BY_ID[third ?? second ?? first].color;
  }
  const { background, ink } = readableInk(base);
  const accent = accentSource ? mixColors(accentSource, ink, 0.35) : mixColors(background, ink, 0.5);

  const surname = spineSurname(book.author);
  const author = surname.length > 13 ? `${surname.slice(0, 12)}.` : surname;
  const preferred = Math.min(15.5, Math.max(11, width * 0.37));
  const authorReserve = author.length * AUTHOR_CHAR + 9;
  const fitted = fitTitle(book.title, height - authorReserve - 30 - 12, width, preferred, face);

  return {
    width,
    height,
    color: background,
    ink,
    accent: ink === INK ? mixColors(accent, INK, 0.25) : accent,
    face,
    bands: classified ? (book.pace ?? 0) : 0,
    classified,
    titleSize: fitted.size,
    titleLines: fitted.lines,
    title: fitted.text,
    author,
  };
}
