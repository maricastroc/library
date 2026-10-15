import { describe, expect, it } from "vitest";
import type { ShelfBook } from "@/lib/catalog/types";
import { ATMOSPHERE_IDS } from "@/lib/semantic/taxonomy";
import { arrangeBooks, SORT_OPTIONS } from "@/lib/shelf/arrange";
import { contrastRatio } from "@/lib/shelf/color";
import { KRAFT, SPINE_MAX_HEIGHT, SPINE_MIN_HEIGHT, spineIdentity } from "@/lib/shelf/identity";

function book(overrides: Partial<ShelfBook> = {}): ShelfBook {
  return {
    id: 1,
    slug: "book-author",
    title: "A Book",
    author: "An Author",
    genre: "Novel",
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

  it("binds each book by its era and kind", () => {
    expect(spineIdentity(book({ year: 1850 })).binding).toBe("leather");
    expect(spineIdentity(book({ year: 1910 })).binding).toBe("cloth");
    expect(["banded", "cloth"]).toContain(spineIdentity(book({ year: 1950 })).binding);
    expect(spineIdentity(book({ year: 1985 })).binding).toBe("trade");
    expect(spineIdentity(book({ year: 2015 })).binding).toBe("minimal");
    expect(spineIdentity(book({ year: 1950, genre: "Poetry" })).binding).toBe("wrapper");
    expect(spineIdentity(book({ year: 1965, genre: "Science fiction" })).binding).toBe("pocket");
    expect(spineIdentity(book({ year: 1990, genre: "Essay" })).binding).toBe("jacket");
    expect(spineIdentity(book({ year: 1850, genre: "Poetry" })).binding).toBe("leather");
  });

  it("gives books by the same author the same ornaments", () => {
    const first = spineIdentity(book({ slug: "one", title: "One", year: 1910 }));
    const second = spineIdentity(book({ slug: "two", title: "Another Title", year: 1912, pages: 480 }));
    expect([second.ornament, second.mark, second.variant]).toEqual([first.ornament, first.mark, first.variant]);
  });

  it("keeps labels and plates readable", () => {
    for (const year of [1850, 1910, 1950, 1985, 2015]) {
      for (const genre of ["Novel", "Poetry", "Science fiction", "Essay"]) {
        for (const atmosphere of ATMOSPHERE_IDS) {
          const identity = spineIdentity(book({ year, genre, atmospheres: [atmosphere], pages: 520 }));
          expect(contrastRatio(identity.panel, identity.panelInk), `${identity.binding} ${atmosphere}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("stacks the title across a wide spine only when every word fits", () => {
    const wide = spineIdentity(book({ title: "War and Peace", year: 1869, pages: 1200, density: 4 }));
    expect(wide.stack).toEqual(["WAR", "AND", "PEACE"]);
    const narrow = spineIdentity(book({ title: "War and Peace", year: 1869, pages: 150 }));
    expect(narrow.stack).toBeNull();
  });

  it("shows unread books in kraft paper with no bands", () => {
    const identity = spineIdentity(book({ semanticStatus: "pending", atmospheres: [], pace: null, density: null }));
    expect(identity.classified).toBe(false);
    expect(identity.binding).toBe("kraft");
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
    const long = spineIdentity(book({ title: "An Apprenticeship or The Book of Pleasures and Other Very Long Stories", pages: 90, genre: "Poetry", density: 1 }));
    expect(long.height).toBeGreaterThanOrEqual(SPINE_MIN_HEIGHT);
    expect(long.height).toBeLessThanOrEqual(SPINE_MAX_HEIGHT);
    expect(long.title.length).toBeGreaterThan(3);
    expect(long.titleSize).toBeGreaterThanOrEqual(8.5);
  });
});

const many: ShelfBook[] = Array.from({ length: 120 }, (_, index) =>
  book({
    id: index + 1,
    slug: `book-${index + 1}`,
    title: `Book number ${index + 1}`,
    author: `Author ${String.fromCharCode(65 + (index % 20))}`,
    pages: 100 + ((index * 37) % 600),
    atmospheres: [ATMOSPHERE_IDS[index % ATMOSPHERE_IDS.length]],
    pace: (index % 5) + 1,
    density: (index % 4) + 1,
    priceCents: 3000 + index * 50,
    note: index % 9 === 0 ? "A note" : null,
  }),
);

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
