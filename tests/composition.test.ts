import { describe, expect, it } from "vitest";
import type { ShelfBook } from "@/lib/catalog/types";
import { ATMOSPHERE_IDS } from "@/lib/semantic/taxonomy";
import { arrangeBooks, SORT_OPTIONS, type ShelfGroup } from "@/lib/shelf/arrange";
import { compose, composeBay, nearestInDirection } from "@/lib/shelf/composition";
import { spineIdentity } from "@/lib/shelf/identity";

const GENRES = ["Novel", "Novella", "Poetry", "Essay", "Science fiction", "Crime", "Short stories"];

function book(id: number, overrides: Partial<ShelfBook> = {}): ShelfBook {
  return {
    id,
    slug: `book-${id}`,
    title: `A title number ${id}`,
    author: `Author ${id % 37}`,
    genre: GENRES[id % GENRES.length],
    pages: 90 + ((id * 37) % 640),
    year: 1850 + ((id * 13) % 170),
    priceCents: 4990,
    priceIsDemo: true,
    stock: 2,
    stockIsDemo: true,
    note: id % 9 === 0 ? "A note." : null,
    noteOrigin: id % 9 === 0 ? "example" : null,
    semanticStatus: "ready",
    atmospheres: [ATMOSPHERE_IDS[id % ATMOSPHERE_IDS.length], ATMOSPHERE_IDS[(id * 5) % ATMOSPHERE_IDS.length]],
    pace: 1 + (id % 5),
    density: 1 + (id % 4),
    styles: [],
    experiences: [],
    themes: [],
    ...overrides,
  };
}

const catalog = Array.from({ length: 220 }, (_, index) => book(index + 1));
const identities = new Map(catalog.map((item) => [item.id, spineIdentity(item)]));

function group(id: string, size: number, start = 1): ShelfGroup {
  return { id, label: id, books: catalog.slice(start - 1, start - 1 + size) };
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
}

describe("composition", () => {
  for (const width of [360, 820, 1360]) {
    for (const option of SORT_OPTIONS) {
      it(`places every book once, inside the width (${option.key}, ${width}px)`, () => {
        const result = compose({ groups: arrangeBooks(catalog, option.key), identities, width });
        expect(result.books.size).toBe(catalog.length);
        expect(new Set(result.order).size).toBe(catalog.length);
        for (const placed of result.books.values()) {
          expect(Number.isFinite(placed.pose.x) && Number.isFinite(placed.pose.y)).toBe(true);
          expect(placed.rect.x).toBeGreaterThanOrEqual(-12);
          expect(placed.rect.x + placed.rect.w).toBeLessThanOrEqual(width + 12);
        }
        expect(result.height).toBeGreaterThan(0);
      });
    }
  }

  it("never lets two pedestals of the same row overlap", () => {
    const result = compose({ groups: arrangeBooks(catalog, "atmosphere"), identities, width: 1360 });
    const plinths = result.plinths.filter((plinth) => !plinth.stage);
    for (let i = 0; i < plinths.length; i += 1) {
      for (let j = i + 1; j < plinths.length; j += 1) expect(overlaps(plinths[i], plinths[j])).toBe(false);
    }
  });

  it("composes groups of one, two, three and a hundred and fifty", () => {
    for (const size of [1, 2, 3, 5, 54, 159]) {
      const result = compose({ groups: [group(`g${size}`, size)], identities, width: 1360 });
      expect(result.books.size).toBe(size);
      expect([...result.books.values()].some((placed) => placed.pose.posture === "face")).toBe(true);
    }
  });

  it("puts a book with a bookseller's note face-out", () => {
    const items = catalog.slice(10, 22);
    const pieces = composeBay(items.map((item) => ({ book: item, identity: identities.get(item.id)! })), 4, { narrow: false });
    const face = pieces.find((piece) => piece.kind === "face");
    expect(face && face.kind === "face" ? face.book.book.note : null).not.toBeNull();
  });

  it("lays slim books flat and stacks them largest at the bottom", () => {
    const slim = catalog.slice(0, 14).map((item, index) => ({ ...item, pages: index < 5 ? 120 : 400 }));
    const pieces = composeBay(slim.map((item) => ({ book: item, identity: spineIdentity(item) })), 1, { narrow: false });
    const pile = pieces.find((piece) => piece.kind === "pile");
    expect(pile && pile.kind === "pile" ? pile.books.length : 0).toBeGreaterThanOrEqual(2);
    if (pile && pile.kind === "pile") {
      const heights = pile.books.map((item) => item.identity.height);
      expect([...heights].sort((a, b) => b - a)).toEqual(heights);
    }
  });

  it("varies the arrangement between groups of the same size", () => {
    const shapes = new Set<string>();
    for (const seed of [0, 1, 2]) {
      const pieces = composeBay(catalog.slice(30, 44).map((item) => ({ book: item, identity: identities.get(item.id)! })), seed, { narrow: false });
      shapes.add(pieces.map((piece) => piece.kind).join(","));
    }
    expect(shapes.size).toBeGreaterThan(1);
  });

  it("raises the closest answer highest and largest, and steps down after it", () => {
    const answers = [12, 40, 77, 101, 150];
    const ranks = new Map(answers.map((id, index) => [id, index + 1]));
    const result = compose({ groups: arrangeBooks(catalog, "atmosphere"), identities, width: 1360, answers, ranks, confidence: "high" });
    const stage = result.plinths.filter((plinth) => plinth.stage);
    expect(stage.map((plinth) => plinth.numeral)).toEqual(["I", "II", "III", "IV–V"]);
    expect(stage[0].h).toBeGreaterThan(stage[1].h);
    expect(stage[1].h).toBeGreaterThan(stage[2].h);
    const first = result.books.get(12)!;
    const second = result.books.get(40)!;
    expect(first.pose.posture).toBe("face");
    expect(first.rect.h).toBeGreaterThan(second.rect.h);
    expect(result.order.slice(0, 5)).toEqual(answers);
    for (const id of answers) expect(result.books.get(id)!.rect.y).toBeLessThan(result.stageHeight);
    const rest = [...result.books.values()].filter((placed) => !answers.includes(placed.id));
    for (const placed of rest) expect(placed.rect.y).toBeGreaterThan(result.stageHeight);
  });

  it("gives every answer the same footing when the match is weak", () => {
    const answers = [12, 40, 77];
    const result = compose({ groups: arrangeBooks(catalog, "atmosphere"), identities, width: 1360, answers, confidence: "low" });
    const stage = result.plinths.filter((plinth) => plinth.stage);
    expect(new Set(stage.map((plinth) => plinth.h)).size).toBe(1);
  });

  for (const width of [343, 820, 1100, 1344]) {
    for (const option of SORT_OPTIONS) {
      it(`keeps the balanced density free of collisions (${option.key}, ${width}px)`, () => {
        const result = compose({ groups: arrangeBooks(catalog, option.key), identities, width, density: "balanced" });
        expect(result.books.size).toBe(catalog.length);
        const placed = [...result.books.values()];
        for (const book of placed) {
          expect(book.rect.x).toBeGreaterThanOrEqual(-12);
          expect(book.rect.x + book.rect.w).toBeLessThanOrEqual(width + 12);
        }
        for (let i = 0; i < placed.length; i += 1) {
          for (let j = i + 1; j < placed.length; j += 1) {
            if (placed[i].bay === placed[j].bay) continue;
            expect(overlaps(placed[i].rect, placed[j].rect)).toBe(false);
          }
        }
        const plinths = result.plinths;
        for (let i = 0; i < plinths.length; i += 1) {
          for (let j = i + 1; j < plinths.length; j += 1) expect(overlaps(plinths[i], plinths[j])).toBe(false);
        }
        for (const label of result.labels) {
          const box = { x: label.x, y: label.y - 4, w: label.label.length * 11 + 70, h: 24 };
          if (label.x > 0) expect(box.x + box.w).toBeLessThanOrEqual(width + 1);
          for (const book of placed) expect(overlaps(box, book.rect)).toBe(false);
        }
      });
    }
  }

  it("is shorter in the balanced density and fills its rows", () => {
    const airy = compose({ groups: arrangeBooks(catalog, "atmosphere"), identities, width: 1344 });
    const balanced = compose({ groups: arrangeBooks(catalog, "atmosphere"), identities, width: 1344, density: "balanced" });
    expect(balanced.height).toBeLessThan(airy.height * 0.8);
    const rows = new Map<number, { left: number; right: number }>();
    for (const book of balanced.books.values()) {
      const row = rows.get(book.row) ?? { left: Infinity, right: 0 };
      rows.set(book.row, { left: Math.min(row.left, book.rect.x), right: Math.max(row.right, book.rect.x + book.rect.w) });
    }
    const spans = [...rows.values()].map((row) => row.right - row.left);
    const full = spans.slice(0, -1).filter((span) => span >= 1344 * 0.8);
    expect(full.length).toBeGreaterThanOrEqual(spans.length - 2);
  });

  it("moves through the composition with the arrow keys", () => {
    const result = compose({ groups: arrangeBooks(catalog, "title"), identities, width: 1360 });
    const [first, second] = result.order;
    expect(nearestInDirection(result, first, "right")).toBe(second);
    expect(nearestInDirection(result, second, "left")).toBe(first);
    const below = nearestInDirection(result, first, "down");
    expect(below).not.toBeNull();
    expect(result.books.get(below as number)!.row).toBe(result.books.get(first)!.row + 1);
  });
});
