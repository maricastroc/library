import { describe, expect, it } from "vitest";
import type { ShelfBook } from "@/lib/catalog/types";
import { ATMOSPHERE_IDS } from "@/lib/semantic/taxonomy";
import { arrangeBooks, SORT_OPTIONS } from "@/lib/shelf/arrange";
import { contrastRatio } from "@/lib/shelf/color";
import { KRAFT, SPINE_MAX_HEIGHT, SPINE_MIN_HEIGHT, spineIdentity } from "@/lib/shelf/identity";
import { layoutShelf, neighborInDirection } from "@/lib/shelf/layout";

function book(overrides: Partial<ShelfBook> = {}): ShelfBook {
  return {
    id: 1,
    slug: "livro-autora",
    title: "Um Livro",
    author: "Uma Autora",
    genre: "Romance",
    pages: 240,
    year: 1990,
    priceCents: 4990,
    priceIsDemo: false,
    stock: 2,
    stockIsDemo: false,
    note: null,
    noteOrigin: null,
    semanticStatus: "ready",
    atmospheres: ["melancholic"],
    pace: 2,
    density: 2,
    styles: [],
    experiences: [],
    themes: [],
    ...overrides,
  };
}

describe("spine identity", () => {
  it("is deterministic", () => {
    expect(spineIdentity(book())).toEqual(spineIdentity(book()));
  });

  it("gets thicker with pages and taller with density", () => {
    expect(spineIdentity(book({ pages: 600 })).width).toBeGreaterThan(spineIdentity(book({ pages: 120 })).width);
    expect(spineIdentity(book({ density: 4 })).height).toBeGreaterThan(spineIdentity(book({ density: 1 })).height);
  });

  it("uses pace as the number of bands and atmosphere as colour", () => {
    expect(spineIdentity(book({ pace: 5 })).bands).toBe(5);
    expect(spineIdentity(book({ atmospheres: ["luminous"] })).color).not.toBe(spineIdentity(book({ atmospheres: ["dark"] })).color);
  });

  it("shows unread books in kraft paper with no bands", () => {
    const identity = spineIdentity(book({ semanticStatus: "pending", atmospheres: [], pace: null, density: null }));
    expect(identity.classified).toBe(false);
    expect(identity.bands).toBe(0);
    expect(contrastRatio(identity.color, KRAFT)).toBeLessThan(1.4);
  });

  it("keeps accessible text contrast for every atmosphere combination", () => {
    for (const first of ATMOSPHERE_IDS) {
      for (const second of ATMOSPHERE_IDS) {
        for (const density of [1, 2, 3, 4]) {
          const identity = spineIdentity(book({ atmospheres: first === second ? [first] : [first, second], density }));
          expect(contrastRatio(identity.color, identity.ink), `${first}+${second} d${density}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("respects size limits and never returns an empty title", () => {
    const long = spineIdentity(book({ title: "Uma Aprendizagem ou O Livro dos Prazeres e Outras Histórias Muito Compridas", pages: 90, genre: "Poesia", density: 1 }));
    expect(long.height).toBeGreaterThanOrEqual(SPINE_MIN_HEIGHT);
    expect(long.height).toBeLessThanOrEqual(SPINE_MAX_HEIGHT);
    expect(long.title.length).toBeGreaterThan(3);
    expect(long.titleSize).toBeGreaterThanOrEqual(8.5);
  });
});

const many: ShelfBook[] = Array.from({ length: 120 }, (_, index) =>
  book({
    id: index + 1,
    slug: `livro-${index + 1}`,
    title: `Livro número ${index + 1}`,
    author: `Autora ${String.fromCharCode(65 + (index % 20))}`,
    pages: 100 + ((index * 37) % 600),
    atmospheres: [ATMOSPHERE_IDS[index % ATMOSPHERE_IDS.length]],
    pace: (index % 5) + 1,
    density: (index % 4) + 1,
    priceCents: 3000 + index * 50,
    note: index % 9 === 0 ? "Uma nota" : null,
  }),
);
const identities = new Map(many.map((item) => [item.id, spineIdentity(item)]));
const noted = new Set(many.filter((item) => item.note).map((item) => item.id));

describe("arrangement", () => {
  it("keeps every book under any sort key", () => {
    for (const option of SORT_OPTIONS) {
      const total = arrangeBooks(many, option.key).reduce((sum, group) => sum + group.books.length, 0);
      expect(total, option.key).toBe(many.length);
    }
  });

  it("sorts by ascending price", () => {
    const prices = arrangeBooks(many, "price").flatMap((group) => group.books.map((item) => item.priceCents ?? 0));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

describe("shelf layout", () => {
  for (const width of [343, 720, 1296]) {
    it(`places everything inside ${width}px without overlap`, () => {
      const layout = layoutShelf({ groups: arrangeBooks(many, "atmosphere"), identities, noted, width });
      expect(layout.spines.size).toBe(many.length);
      expect(layout.order).toHaveLength(many.length);
      const rows = new Map<number, { x: number; w: number }[]>();
      for (const spine of layout.spines.values()) {
        expect(spine.x).toBeGreaterThanOrEqual(0);
        expect(spine.x + spine.w).toBeLessThanOrEqual(width + 0.6);
        expect(spine.w).toBeGreaterThanOrEqual(24);
        rows.set(spine.row, [...(rows.get(spine.row) ?? []), { x: spine.x, w: spine.w }]);
      }
      for (const items of rows.values()) {
        const sorted = items.sort((a, b) => a.x - b.x);
        for (let index = 1; index < sorted.length; index += 1) {
          expect(sorted[index].x).toBeGreaterThanOrEqual(sorted[index - 1].x + sorted[index - 1].w - 0.01);
        }
      }
      const talkers = [...layout.talkers].sort((a, b) => a.y - b.y || a.x - b.x);
      for (let index = 1; index < talkers.length; index += 1) {
        if (talkers[index].y === talkers[index - 1].y) {
          expect(talkers[index].x).toBeGreaterThanOrEqual(talkers[index - 1].x + talkers[index - 1].w);
        }
      }
    });
  }

  it("brings matches to the front and dims the rest", () => {
    const matches = [40, 7, 99];
    const layout = layoutShelf({ groups: arrangeBooks(many, "atmosphere"), identities, noted, width: 1200, matches });
    expect(layout.order.slice(0, 3)).toEqual(matches);
    expect(layout.captions.map((caption) => caption.id)).toEqual(matches);
    expect(layout.spines.get(40)).toMatchObject({ state: "match", rank: 1 });
    expect(layout.spines.get(1)?.state).toBe("dim");
    expect(layout.labels.map((label) => label.key)).toEqual(["answer", "rest"]);
    expect(layout.dividers).toHaveLength(0);
    expect(layout.talkers).toHaveLength(0);
    const lowestMatch = Math.max(...matches.map((id) => layout.spines.get(id)?.y ?? 0));
    expect(layout.spines.get(1)?.y ?? 0).toBeGreaterThan(lowestMatch);
  });

  it("moves with arrow keys following visual order", () => {
    const layout = layoutShelf({ groups: arrangeBooks(many, "title"), identities, noted, width: 900 });
    const first = layout.order[0];
    const second = layout.order[1];
    expect(neighborInDirection(layout, first, "right")).toBe(second);
    expect(neighborInDirection(layout, second, "left")).toBe(first);
    expect(neighborInDirection(layout, first, "left")).toBeNull();
    const below = neighborInDirection(layout, first, "down");
    expect(below).not.toBeNull();
    expect(layout.spines.get(below as number)?.row).toBe((layout.spines.get(first)?.row ?? 0) + 1);
  });
});
