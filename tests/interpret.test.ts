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
    { folded: "torto arado", id: 9 },
    { folded: "nao me abandone jamais", id: 10 },
  ],
};

describe("parseQuery", () => {
  it("separates what the reader wants from what they want to avoid", () => {
    const parsed = parseQuery("Quero um livro sobre solidão, mas sem ser deprimente", catalog);
    expect(parsed.avoid).toEqual(["deprimente"]);
    expect(parsed.avoidAtmospheres).toEqual(["dark"]);
    expect(parsed.positive.toLowerCase()).toContain("solidão");
    expect(parsed.positive.toLowerCase()).not.toContain("deprimente");
  });

  it("treats 'mas não' as a restriction and keeps the positive request", () => {
    const parsed = parseQuery("Um romance delicado, mas não previsível", catalog);
    expect(parsed.avoid).toEqual(["previsível"]);
    expect(parsed.atmospheres).toContain("comforting");
    expect(parsed.genres).toContain("Romance");
  });

  it("emphasises what follows 'mas' when it is not a negation", () => {
    const parsed = parseQuery("quero algo melancólico, mas reconfortante", catalog);
    expect(parsed.avoid).toEqual([]);
    expect(parsed.atmospheres).toEqual(["melancholic", "comforting"]);
    expect(parsed.emphasis).toEqual(["comforting"]);
  });

  it("turns a length restriction into a preference", () => {
    expect(parseQuery("um clássico, mas nada muito longo", catalog)).toMatchObject({ length: "short", era: "classic" });
    expect(parseQuery("uma história curta que me deixe pensando por dias", catalog)).toMatchObject({
      length: "short",
      experiences: ["lingering"],
    });
  });

  it("never lets an avoided atmosphere count as wanted", () => {
    const parsed = parseQuery("uma história de família sem ser triste", catalog);
    expect(parsed.avoidAtmospheres).toContain("melancholic");
    expect(parsed.atmospheres).not.toContain("melancholic");
  });

  it("reads a catalog author reference as a request for similar books", () => {
    const parsed = parseQuery("Livros para quem gostou de Clarice Lispector", catalog);
    expect(parsed.reference).toMatchObject({ kind: "author", label: "Clarice Lispector", inCatalog: true, similar: true, bookIds: [1, 2] });
    expect(parsed.hasFreeText).toBe(false);
  });

  it("reads a direct author mention without asking for similarity", () => {
    const parsed = parseQuery("livros do Saramago", catalog);
    expect(parsed.reference).toMatchObject({ label: "José Saramago", inCatalog: true, similar: false });
  });

  it("recognises a catalog title without mistaking it for a negation", () => {
    const parsed = parseQuery("para quem gostou de Não Me Abandone Jamais", catalog);
    expect(parsed.reference).toMatchObject({ kind: "title", bookIds: [10], similar: true });
    expect(parsed.avoid).toEqual([]);
  });

  it("admits when the reference is not in the catalog", () => {
    const parsed = parseQuery("para quem gosta de Rupi Kaur", catalog);
    expect(parsed.reference).toMatchObject({ label: "Rupi Kaur", inCatalog: false });
  });

  it("does not mistake a common word for a surname", () => {
    expect(parseQuery("quero reler meu livro mais amado", catalog).reference).toBeNull();
  });

  it("detects pace and genre", () => {
    expect(parseQuery("um policial ágil para as férias", catalog)).toMatchObject({ pace: "fast", genres: ["Policial"] });
    expect(parseQuery("poesia para ler devagar", catalog)).toMatchObject({ pace: "slow", genres: ["Poesia"] });
  });
});

describe("lexical search", () => {
  it("drops stopwords and diacritics", () => {
    expect(contentTokens("Quero um livro sobre a solidão")).toEqual(["solidao"]);
  });

  it("builds an FTS query with prefixes for long words", () => {
    expect(buildFtsQuery("algo melancólico e reconfortante")).toBe('"melancoli"* OR "reconfortan"*');
    expect(buildFtsQuery("quero um livro")).toBeNull();
  });
});

describe("abstract requests", () => {
  it("reads a rainy afternoon as a quiet, slow, melancholic mood", () => {
    const parsed = parseQuery("algo que pareça uma tarde chuvosa", catalog);
    expect(parsed.atmospheres).toEqual(["melancholic", "contemplative"]);
    expect(parsed.pace).toBe("slow");
  });
});
