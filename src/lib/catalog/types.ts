import type { AtmosphereId, ExperienceId, StyleId } from "@/lib/semantic/taxonomy";

export type SemanticStatus = "pending" | "processing" | "ready" | "insufficient" | "error";
export type NoteOrigin = "bookseller" | "example";
export type SemanticOrigin = "ai" | "bookseller";

export type Evidence = {
  attribute: string;
  quote: string;
};

export type ShelfBook = {
  id: number;
  slug: string;
  title: string;
  author: string;
  genre: string | null;
  pages: number | null;
  year: number | null;
  priceCents: number | null;
  priceIsDemo: boolean;
  stock: number | null;
  stockIsDemo: boolean;
  note: string | null;
  noteOrigin: NoteOrigin | null;
  semanticStatus: SemanticStatus;
  atmospheres: AtmosphereId[];
  pace: number | null;
  density: number | null;
  styles: StyleId[];
  experiences: ExperienceId[];
  themes: string[];
};

export type BookDetail = ShelfBook & {
  isbn: string | null;
  synopsis: string | null;
  synopsisSource: string | null;
  synopsisUrl: string | null;
  publisher: string | null;
  language: string | null;
  coverUrl: string | null;
  coverSource: string | null;
  sourceUrl: string | null;
  subjects: string[];
  portrait: string | null;
  evidence: Evidence[];
  confidence: string | null;
  semanticOrigin: SemanticOrigin;
  semanticModel: string | null;
  semanticError: string | null;
  updatedAt: string;
};

export type BookInput = {
  isbn?: string | null;
  title: string;
  author: string;
  genre?: string | null;
  synopsis?: string | null;
  synopsisSource?: string | null;
  synopsisUrl?: string | null;
  publisher?: string | null;
  year?: number | null;
  pages?: number | null;
  language?: string | null;
  coverUrl?: string | null;
  coverSource?: string | null;
  sourceUrl?: string | null;
  subjects?: string[];
  priceCents?: number | null;
  priceIsDemo?: boolean;
  stock?: number | null;
  stockIsDemo?: boolean;
  note?: string | null;
  noteOrigin?: NoteOrigin | null;
};

export type SemanticPatch = {
  atmospheres: AtmosphereId[];
  pace: number | null;
  density: number | null;
  styles: StyleId[];
  experiences: ExperienceId[];
  themes: string[];
  portrait: string | null;
};
