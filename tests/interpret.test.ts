import { describe, expect, it } from "vitest";
import { parseQuery, type CatalogNames } from "@/lib/search/interpret";
import { buildFtsQuery, contentTokens } from "@/lib/search/lexical";

const catalog: CatalogNames = {
  authors: [
    { name: "Clarice Lispector", folded: "clarice lispector", aliases: ["clarice", "lispector", "clarice lispector"], bookIds: [1, 2] },
    { name: "Jorge Amado", folded: "jorge amado", aliases: ["jorge amado"], bookIds: [3] },
    { name: "José Saramago", folded: "jose saramago", aliases: ["saramago", "jose saramago"], bookIds: [4] },
  ],
  titles: [
    { folded: "crooked plow", id: 9 },
    { folded: "no one writes to the colonel", id: 10 },
  ],
};

describe("parseQuery", () => {
  it("separates what the reader wants from what they want to avoid", () => {
    const parsed = parseQuery("I want a book about loneliness, but without being depressing", catalog);
    expect(parsed.avoid).toEqual(["depressing"]);
    expect(parsed.avoidAtmospheres).toEqual(["dark"]);
    expect(parsed.positive.toLowerCase()).toContain("loneliness");
    expect(parsed.positive.toLowerCase()).not.toContain("depressing");
  });

  it("treats 'but not' as a restriction and keeps the positive request", () => {
    const parsed = parseQuery("A delicate novel, but not predictable", catalog);
    expect(parsed.avoid).toEqual(["predictable"]);
    expect(parsed.atmospheres).toContain("comforting");
    expect(parsed.genres).toContain("Novel");
  });

  it("emphasises what follows 'but' when it is not a negation", () => {
    const parsed = parseQuery("I want something melancholic, but comforting", catalog);
    expect(parsed.avoid).toEqual([]);
    expect(parsed.atmospheres).toEqual(["melancholic", "comforting"]);
    expect(parsed.emphasis).toEqual(["comforting"]);
  });

  it("turns a length restriction into a preference", () => {
    expect(parseQuery("a classic, but nothing too long", catalog)).toMatchObject({ length: "short", era: "classic" });
    expect(parseQuery("a short story that keeps me thinking for days", catalog)).toMatchObject({
      length: "short",
      experiences: ["lingering"],
    });
  });

  it("never lets an avoided atmosphere count as wanted", () => {
    const parsed = parseQuery("a family story without being sad", catalog);
    expect(parsed.avoidAtmospheres).toContain("melancholic");
    expect(parsed.atmospheres).not.toContain("melancholic");
  });

  it("understands contracted negations", () => {
    const parsed = parseQuery("science fiction that isn't pessimistic", catalog);
    expect(parsed.avoid).toEqual(["pessimistic"]);
    expect(parsed.avoidAtmospheres).toEqual(["dark"]);
    expect(parsed.genres).toEqual(["Science fiction"]);
  });

  it("does not read an idiom as a negation", () => {
    const parsed = parseQuery("a thriller I can't put down", catalog);
    expect(parsed.avoid).toEqual([]);
    expect(parsed.pace).toBe("fast");
  });

  it("reads a catalog author reference as a request for similar books", () => {
    const parsed = parseQuery("Books for those who liked Clarice Lispector", catalog);
    expect(parsed.reference).toMatchObject({ kind: "author", label: "Clarice Lispector", inCatalog: true, similar: true, bookIds: [1, 2] });
    expect(parsed.hasFreeText).toBe(false);
  });

  it("reads a direct author mention without asking for similarity", () => {
    const parsed = parseQuery("books by Saramago", catalog);
    expect(parsed.reference).toMatchObject({ label: "José Saramago", inCatalog: true, similar: false });
  });

  it("recognises a catalog title without mistaking it for a negation", () => {
    const parsed = parseQuery("for those who liked No One Writes to the Colonel", catalog);
    expect(parsed.reference).toMatchObject({ kind: "title", bookIds: [10], similar: true });
    expect(parsed.avoid).toEqual([]);
  });

  it("admits when the reference is not in the catalog", () => {
    expect(parseQuery("for those who like Rupi Kaur", catalog).reference).toMatchObject({ label: "Rupi Kaur", inCatalog: false, similar: true });
    expect(parseQuery("books by Rupi Kaur", catalog).reference).toMatchObject({ label: "Rupi Kaur", inCatalog: false, similar: false });
    expect(parseQuery("Rupi Kaur's poems", catalog).reference).toMatchObject({ label: "Rupi Kaur", inCatalog: false });
  });

  it("does not mistake a common word for a surname", () => {
    expect(parseQuery("I want to reread my most beloved book", catalog).reference).toBeNull();
    expect(parseQuery("a book about a rose garden", catalog).reference).toBeNull();
  });

  it("detects pace and genre", () => {
    expect(parseQuery("a fast-paced crime novel for the holidays", catalog)).toMatchObject({ pace: "fast", genres: ["Crime", "Novel"] });
    expect(parseQuery("poetry to read slowly", catalog)).toMatchObject({ pace: "slow", genres: ["Poetry"] });
    expect(parseQuery("a graphic novel about memory", catalog).genres).toEqual(["Comics"]);
  });
});

describe("lexical search", () => {
  it("drops stopwords and diacritics", () => {
    expect(contentTokens("I want a book about a café")).toEqual(["cafe"]);
  });

  it("builds an FTS query with prefixes for long words", () => {
    expect(buildFtsQuery("something melancholic and comforting")).toBe('"melanchol"* OR "comforti"*');
    expect(buildFtsQuery("I want a book")).toBeNull();
  });
});

describe("abstract requests", () => {
  it("reads a rainy afternoon as a quiet, slow, melancholic mood", () => {
    const parsed = parseQuery("something that feels like a rainy afternoon", catalog);
    expect(parsed.atmospheres).toEqual(["melancholic", "contemplative"]);
    expect(parsed.pace).toBe("slow");
  });
});
