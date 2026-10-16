import { beforeAll, describe, expect, it } from "vitest";
import { clearDemand, noteOpened, noteReserved, readDemand, recordSearch } from "@/lib/demand";
import { atmosphereDemand, bookTraffic, buildGroups, groupPhrases, isMissed, phrasesOf, shortfallOf, summarize, type DemandEntry } from "@/lib/demand/report";

function entry(overrides: Partial<DemandEntry> = {}): DemandEntry {
  return {
    id: 1,
    query: "something funny",
    folded: "something funny",
    confidence: "high",
    fallback: false,
    results: 5,
    shown: [1, 2, 3],
    atmospheres: [],
    inferred: [],
    opened: [],
    reserved: [],
    sample: false,
    createdAt: "2026-10-10 12:00:00",
    ...overrides,
  };
}

describe("shortfallOf", () => {
  it("tells a close answer from a loose one and from no answer", () => {
    expect(shortfallOf(entry())).toBeNull();
    expect(shortfallOf(entry({ confidence: "medium" }))).toBe("loose");
    expect(shortfallOf(entry({ confidence: "low" }))).toBe("weak");
    expect(shortfallOf(entry({ confidence: "none", results: 0 }))).toBe("declined");
    expect(shortfallOf(entry({ results: 0 }))).toBe("empty");
    expect(shortfallOf(entry({ fallback: true }))).toBe("offline");
    expect(isMissed(entry({ confidence: "medium" }))).toBe(false);
    expect(isMissed(entry({ confidence: "low" }))).toBe(true);
  });
});

describe("grouping by meaning", () => {
  const phrases = phrasesOf([
    entry({ query: "something funny", folded: "something funny" }),
    entry({ query: "Something funny", folded: "something funny" }),
    entry({ query: "Something funny", folded: "something funny" }),
    entry({ query: "a book that makes me laugh", folded: "a book that makes me laugh" }),
    entry({ query: "stories of the sea", folded: "stories of the sea" }),
  ]);

  it("counts the same words once, keeping the most used spelling", () => {
    expect(phrases.map((phrase) => [phrase.text, phrase.count])).toEqual([
      ["Something funny", 3],
      ["a book that makes me laugh", 1],
      ["stories of the sea", 1],
    ]);
  });

  it("joins phrases close in meaning and keeps the rest apart", () => {
    const vectors = new Map([
      ["something funny", new Float32Array([1, 0, 0])],
      ["a book that makes me laugh", new Float32Array([0.9, 0.3, 0])],
      ["stories of the sea", new Float32Array([0, 0.2, 1])],
    ]);
    expect(groupPhrases(phrases, vectors).map((group) => group.map((phrase) => phrase.folded))).toEqual([["something funny", "a book that makes me laugh"], ["stories of the sea"]]);
  });

  it("falls back to exact words without vectors", () => {
    expect(groupPhrases(phrases, null)).toHaveLength(3);
  });
});

describe("buildGroups and summarize", () => {
  const entries = [
    entry({ id: 1, query: "travel guide", folded: "travel guide", confidence: "none", results: 0, shown: [] }),
    entry({ id: 2, query: "travel guide", folded: "travel guide", confidence: "medium", shown: [7] }),
    entry({ id: 3, query: "travel guide", folded: "travel guide", confidence: "none", results: 0, shown: [] }),
    entry({ id: 4, opened: [1], reserved: [1], sample: true }),
    entry({ id: 5, confidence: "medium", opened: [2] }),
  ];

  it("names what most of a group lacked and keeps the books it showed", () => {
    const groups = buildGroups(entries, groupPhrases(phrasesOf(entries), null));
    const travel = groups.find((group) => group.label === "travel guide")!;
    expect(travel).toMatchObject({ count: 3, answered: 0, shortfall: "declined", shown: [{ id: 7, times: 1 }] });
    const funny = groups.find((group) => group.label === "something funny")!;
    expect(funny).toMatchObject({ count: 2, answered: 1, shortfall: "loose", opened: 2, reserved: 1, samples: 1 });
  });

  it("adds up the period", () => {
    expect(summarize(entries)).toEqual({ searches: 5, answered: 1, loose: 2, missed: 2, opened: 2, reserved: 1, samples: 1 });
  });

  it("counts each book once per search", () => {
    const traffic = bookTraffic([entry({ shown: [1, 1, 2] }), entry({ shown: [1] })]);
    expect(traffic.shown).toEqual([
      { id: 1, times: 2 },
      { id: 2, times: 1 },
    ]);
  });

  it("separates atmospheres named by the reader from those read into the request", () => {
    const rows = atmosphereDemand(
      [entry({ atmospheres: ["ironic"], inferred: ["luminous"] }), entry({ inferred: ["ironic"] })],
      new Map([["ironic", 15]]),
      ["ironic", "luminous", "dark"],
    );
    expect(rows).toEqual([
      { id: "ironic", named: 1, read: 1, onShelf: 15 },
      { id: "luminous", named: 0, read: 1, onShelf: 0 },
    ]);
  });
});

describe("the search log", () => {
  beforeAll(() => {
    process.env.SUBTEXT_DB = ":memory:";
  });

  it("links an opened or reserved book only when the search showed it, once", () => {
    const id = recordSearch({ query: "Stories of the sea", confidence: "high", fallback: false, shown: [19, 110], results: 2, atmospheres: [], inferred: ["dreamlike"] });
    noteOpened(id, 19);
    noteOpened(id, 19);
    noteOpened(id, 999);
    noteReserved(id, 110);
    const [stored] = readDemand(30);
    expect(stored).toMatchObject({ query: "Stories of the sea", folded: "stories of the sea", shown: [19, 110], opened: [19], reserved: [110], inferred: ["dreamlike"], sample: false });
  });

  it("drops searches older than the retention and clears samples on their own", () => {
    clearDemand("all");
    recordSearch({ query: "old", confidence: "high", fallback: false, shown: [], results: 0, atmospheres: [], inferred: [], createdAt: "2020-01-01 00:00:00" });
    recordSearch({ query: "sample", confidence: "high", fallback: false, shown: [], results: 0, atmospheres: [], inferred: [], sample: true });
    recordSearch({ query: "real", confidence: "high", fallback: false, shown: [], results: 0, atmospheres: [], inferred: [] });
    expect(readDemand(3650).map((item) => item.query).sort()).toEqual(["real", "sample"]);
    expect(clearDemand("samples")).toBe(1);
    expect(readDemand(30).map((item) => item.query)).toEqual(["real"]);
  });
});
