import type { ShelfBook } from "@/lib/catalog/types";
import { hashString, normalizeText } from "@/lib/catalog/text";
import { ATMOSPHERE_BY_ID } from "@/lib/semantic/taxonomy";
import { INK, mixColors, readableInk, shiftLightness } from "./color";

export type SpineTypeface = "serif" | "italic" | "grotesque" | "mono" | "soft" | "hand";
export type Binding = "leather" | "cloth" | "banded" | "trade" | "minimal" | "wrapper" | "pocket" | "jacket" | "kraft";
export type Ornament = "diamond" | "star" | "ring" | "fleuron" | "bars";
export type ImprintMark = "disc" | "arch" | "triangle" | "lozenge" | "square" | "dots";

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
  titleLines: 1 | 2 | 3;
  title: string;
  author: string;
  binding: Binding;
  variant: number;
  orientation: "down" | "up";
  align: "head" | "center";
  stack: string[] | null;
  authorAcross: boolean;
  labelled: boolean;
  ornament: Ornament;
  mark: ImprintMark;
  foil: string;
  panel: string;
  panelInk: string;
  head: number;
  foot: number;
  authorReserve: number;
  authorSize: number;
  worn: boolean;
  number: string;
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
  hand: 0.4,
};
const AUTHOR_CHAR = 6.1;
const AUTHOR_SIZE = 8.5;
const AUTHOR_SIZE_TIGHT = 7;
const AUTHOR_ACROSS_CHAR = 5.3;
const STACK_LINE = 1.1;

const ORNAMENTS: Ornament[] = ["diamond", "fleuron", "star", "ring", "bars"];
const MARKS: ImprintMark[] = ["disc", "arch", "triangle", "lozenge", "square", "dots"];
const PAPER_STOCKS = ["#efe6d2", "#e8dfcb", "#f2ead8"];
const LABEL_LEATHERS = ["#5a1a1c", "#1f3a2d", "#1c1a17"];
const GILT = "#dcc27e";

const WRAPPER_GENRES = new Set(["poetry", "theater", "novella"]);
const POCKET_GENRES = new Set(["science fiction", "fantasy", "crime"]);
const JACKET_GENRES = new Set(["essay", "reportage", "memoir", "chronicles", "nonfiction", "comics", "young readers"]);

function bindingFor(genreKey: string, year: number | null, seed: number): Binding {
  if (year !== null && year < 1880) return "leather";
  if (WRAPPER_GENRES.has(genreKey)) return "wrapper";
  if (year !== null && year < 1900) return "cloth";
  if (POCKET_GENRES.has(genreKey)) return "pocket";
  if (JACKET_GENRES.has(genreKey)) return "jacket";
  if (year === null) return seed % 2 === 0 ? "trade" : "cloth";
  if (year < 1935) return "cloth";
  if (year < 1970) return seed % 4 === 0 ? "cloth" : "banded";
  if (year < 2000) return "trade";
  return "minimal";
}

function stackTitle(title: string, inner: number, maxHeight: number, face: SpineTypeface): { lines: string[]; size: number } | null {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const factor = CHAR_FACTOR[face];
  const longest = Math.max(...words.map((word) => word.length));
  for (let size = 11.5; size >= 8.5; size -= 0.5) {
    const maxChars = Math.floor(inner / (size * factor));
    if (longest > maxChars) continue;
    const lines: string[] = [];
    for (const word of words) {
      const last = lines[lines.length - 1];
      if (last !== undefined && last.length + 1 + word.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    if (lines.length * size * STACK_LINE <= maxHeight) return { lines, size };
  }
  return null;
}

export function spineSurname(author: string): string {
  const tokens = author.trim().split(/\s+/);
  if (tokens.length === 1) return tokens[0];
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (/^(junior|júnior|filho|neto)$/i.test(last) && tokens.length > 2) return `${tokens[tokens.length - 2]} ${last}`;
  if (/^(de|da|do|dos|das|di|von|van|del)$/i.test(previous)) return last;
  return last;
}

type FittedTitle = { text: string; size: number; lines: 1 | 2 | 3; whole: boolean };

function fitTitle(title: string, available: number, width: number, preferred: number, face: SpineTypeface): FittedTitle {
  const factor = CHAR_FACTOR[face];
  const needed = (size: number) => title.length * size * factor;
  let size = preferred;
  while (size > 9.5 && needed(size) > available) size -= 0.5;
  if (needed(size) <= available) return { text: title, size, lines: 1, whole: true };

  const words = title.split(/\s+/);
  const longestWord = Math.max(...words.map((word) => word.length));
  for (const lines of [2, 3] as const) {
    if (words.length < lines || width < (lines === 2 ? 24 : 36)) continue;
    const reach = available * (lines === 2 ? 1.72 : 2.5);
    let wrapped = Math.min(preferred, (width - 6) / (lines * 1.06));
    while (wrapped > 8 && (needed(wrapped) > reach || longestWord * wrapped * factor > available)) wrapped -= 0.25;
    if (wrapped >= 8 && needed(wrapped) <= reach && longestWord * wrapped * factor <= available) {
      return { text: title, size: wrapped, lines, whole: true };
    }
  }

  size = 10;
  const maxChars = Math.max(6, Math.floor(available / (size * factor)) - 1);
  const short = title.split(/[:—–(]/)[0].trim();
  if (short.length <= maxChars) return { text: short, size, lines: 1, whole: short === title };
  const cut = short.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return { text: `${(lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`, size, lines: 1, whole: false };
}

export function spineIdentity(book: ShelfBook): SpineIdentity {
  const genreKey = normalizeText(book.genre ?? "");
  const classified = book.semanticStatus === "ready" && book.atmospheres.length > 0;
  const seed = hashString(normalizeText(book.author));
  const own = hashString(book.slug);
  const binding: Binding = classified ? bindingFor(genreKey, book.year, seed) : "kraft";
  const face: SpineTypeface = binding === "kraft" ? "hand" : (FACE_BY_GENRE[genreKey] ?? "serif");
  const variant = seed % 3;

  const pages = book.pages ?? 230;
  const width = Math.round(Math.min(58, Math.max(24, 17 + pages * 0.052)));

  const density = book.density ?? 2;
  const fine = ((book.year ?? own) % 5) * 2 - 4;
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
  const foil = ink === INK ? mixColors(background, INK, 0.62) : GILT;

  let panel = PAPER_STOCKS[variant];
  let panelInk = INK;
  if (binding === "leather") {
    panel = LABEL_LEATHERS[variant];
    panelInk = GILT;
  } else if (binding === "pocket") {
    const plate = readableInk(accentSource ?? background);
    panel = plate.background;
    panelInk = plate.ink;
  }

  const surname = spineSurname(book.author);
  const author = surname.length > 13 ? `${surname.slice(0, 12)}.` : surname;
  const orientation = binding === "wrapper" || (binding === "banded" && seed % 4 === 1) ? "up" : "down";
  const authorFits = author.length * AUTHOR_ACROSS_CHAR + 6 <= width;
  const authorAcross = authorFits && binding !== "minimal" && (binding === "wrapper" || orientation === "down");

  let head = 9;
  let foot = 30;
  let authorInText = true;
  let preferredCap = 15.5;
  let stack: { lines: string[]; size: number } | null = null;
  let labelled = false;

  if (binding === "leather") {
    head = Math.round(height * 0.08) + 7;
    foot = Math.round(height * 0.16) + 5;
    if (width >= 38) stack = stackTitle(book.title.toUpperCase(), width - 12, height * 0.38 - 16, face);
  } else if (binding === "cloth") {
    head = 27;
    foot = 25;
    labelled = variant === 0 && width >= 28;
  } else if (binding === "banded") {
    head = Math.round(height * (0.17 + variant * 0.025));
    foot = Math.round(height * 0.15);
  } else if (binding === "minimal") {
    head = 12;
    foot = 46;
    preferredCap = 13;
  } else if (binding === "wrapper") {
    head = 33;
    foot = (authorAcross ? Math.round(height * 0.2) : Math.max(Math.round(height * 0.22), Math.round(author.length * 5.4 + 12))) + 16;
    authorInText = false;
  } else if (binding === "pocket") {
    head = 27;
    foot = 33;
  } else if (binding === "jacket") {
    head = 11;
    if (width >= 38) stack = stackTitle(book.title.toUpperCase(), width - 11, height * 0.56, face);
  }

  const preferred = Math.min(preferredCap, Math.max(11, width * 0.37)) + (face === "hand" ? 3 : 0);
  const reserveAt = (size: number) => (authorInText ? (authorAcross ? 16 : author.length * AUTHOR_CHAR * (size / AUTHOR_SIZE) + 9) : 0);
  const fit = (size: number) => fitTitle(book.title, height - head - foot - 12 - reserveAt(size), width, preferred, face);
  let authorSize = AUTHOR_SIZE;
  let fitted: FittedTitle = stack ? { text: book.title, size: stack.size, lines: 1, whole: true } : fit(authorSize);
  if (!fitted.whole && authorInText && !authorAcross) {
    authorSize = AUTHOR_SIZE_TIGHT;
    fitted = fit(authorSize);
  }
  if (!fitted.whole && binding === "banded") {
    head = Math.round(height * 0.1);
    foot = Math.round(height * 0.09);
    fitted = fit(authorSize);
  }
  const authorReserve = reserveAt(authorSize);

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
    binding,
    variant,
    orientation,
    align: binding === "minimal" || (binding === "trade" && seed % 2 === 0) ? "head" : "center",
    stack: stack?.lines ?? null,
    authorAcross,
    labelled,
    ornament: ORNAMENTS[seed % ORNAMENTS.length],
    mark: MARKS[seed % MARKS.length],
    foil,
    panel,
    panelInk,
    head,
    foot,
    authorReserve,
    authorSize,
    worn: (binding === "trade" || binding === "banded" || binding === "pocket") && own % 3 === 0,
    number: String((own % 900) + 100),
  };
}
