import { describe, expect, it } from "vitest";
import type { ShelfBook } from "@/lib/catalog/types";
import { locatorFor, seek, seekKey } from "@/lib/shelf/listing";

function book(overrides: Partial<ShelfBook> = {}): ShelfBook {
  return {
    id: 1,
    slug: "book",
    title: "The Waves",
    author: "Virginia Woolf",
    genre: "Novel",
    pages: 240,
    year: 1931,
    priceCents: 5490,
    priceIsDemo: true,
    stock: 2,
    stockIsDemo: true,
    note: null,
    noteOrigin: null,
    semanticStatus: "ready",
    atmospheres: ["melancholic"],
    pace: 2,
    density: 3,
    styles: [],
    experiences: [],
    themes: [],
    ...overrides,
  };
}

describe("the list's locators", () => {
  it("shows the year, the price when arranged by price, and the rank of an answer", () => {
    expect(locatorFor(book(), "atmosphere")).toBe("1931");
    expect(locatorFor(book(), "price")).toContain("54.90");
    expect(locatorFor(book(), "title", 3)).toBe("III");
    expect(locatorFor(book({ year: null }), "title")).toBe("—");
  });
});

describe("typing to jump", () => {
  const keys = ["waves", "war and peace", "walden", "watchmen", "beloved"].sort();

  it("finds the first title starting with what was typed, ignoring articles", () => {
    expect(seekKey(book(), "title")).toBe("waves");
    expect(seekKey(book(), "author")).toBe("woolf virginia");
    expect(keys[seek(keys, 0, "wat") ?? -1]).toBe("watchmen");
  });

  it("cycles through titles that share a letter when the same letter is typed again", () => {
    const first = seek(keys, -1, "w");
    const second = seek(keys, first ?? 0, "w");
    const third = seek(keys, second ?? 0, "ww");
    expect([first, second, third].map((index) => keys[index ?? -1])).toEqual(["walden", "war and peace", "watchmen"]);
  });

  it("finds nothing when no title matches", () => {
    expect(seek(keys, 0, "z")).toBeNull();
  });
});
