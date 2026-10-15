import { describe, expect, it } from "vitest";
import { duel, filterHash, kindStanding, kindsPhrase, outcome, standing, type BenchQuery } from "@/lib/search/bench";

function query(full: number | null, embedding: number | null, lexical: number | null, overrides: Partial<BenchQuery> = {}): BenchQuery {
  return {
    id: "q",
    type: "emotional",
    query: "something",
    confidence: "high",
    message: null,
    systems: { lexical: [], embedding: [], full: [] },
    grades: { "1": 2 },
    metrics: { full: { ndcg5: full }, embedding: { ndcg5: embedding }, lexical: { ndcg5: lexical } },
    ...overrides,
  };
}

describe("outcome", () => {
  it("counts a difference under 0.05 as level, before rounding", () => {
    expect(outcome(query(0.74, 0.789, 0), "embedding")).toBe("level");
    expect(outcome(query(0.65, 0.701, 0), "embedding")).toBe("worse");
    expect(outcome(query(0.8, 0.75, 0), "embedding")).toBe("better");
  });

  it("scores an engine that returned nothing as 0", () => {
    expect(outcome(query(null, 0.57, null), "embedding")).toBe("worse");
    expect(outcome(query(null, 0.57, null), "lexical")).toBe("level");
  });
});

describe("duel and standing", () => {
  it("tallies each query and words the overall standing", () => {
    const queries = [query(0.9, 0.5, 0.1), query(0.8, 0.4, 0.1), query(0.7, 0.3, 0.1), query(0.6, 0.6, 0.1), query(0.2, 0.6, 0.1)];
    const result = duel(queries, "embedding");
    expect([result.better, result.level, result.worse]).toEqual([3, 1, 1]);
    expect(standing(result)).toBe("level with");
    expect(standing(duel(queries, "lexical"))).toBe("clearly ahead of");
    expect(standing({ better: 9, worse: 10 })).toBe("level with");
  });
});

describe("kindStanding", () => {
  it("says when the shelf leads or which engine is ahead of it", () => {
    expect(kindStanding({ full: 0.81, embedding: 0.59, lexical: 0.12 })).toEqual({ leads: true, behind: null });
    expect(kindStanding({ full: 0.57, embedding: 0.73, lexical: 0.58 })).toEqual({ leads: false, behind: "embedding" });
    expect(kindStanding({ full: 0.65, embedding: 0.69, lexical: 0.34 })).toEqual({ leads: false, behind: null });
  });
});

describe("kindsPhrase", () => {
  it("joins adjectives before the word requests and keeps other phrases whole", () => {
    expect(kindsPhrase(["emotional", "abstract"])).toBe("emotional and abstract requests");
    expect(kindsPhrase(["negative", "ambiguous"])).toBe("loose requests and requests with a “but”");
  });
});

describe("filterHash", () => {
  it("writes the filter the query list reads", () => {
    expect(filterHash({ show: "worse", against: "embedding" })).toBe("#queries/worse/embedding");
    expect(filterHash({ against: "lexical", kind: "author" })).toBe("#queries/all/lexical/author");
  });
});
