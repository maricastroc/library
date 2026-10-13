import { describe, expect, it } from "vitest";
import { createSessionToken, verifyPassword, verifySessionToken } from "@/lib/auth/session";
import { splitSentences } from "@/lib/catalog/text";
import { cleanThemes, enrichmentInputHash, locateQuote } from "@/lib/semantic/enrich";
import { attributeLabel, confidenceLabel, describeProfile } from "@/lib/semantic/taxonomy";
import { blobToVector, centroid, dot, vectorToBlob } from "@/lib/semantic/vectors";

const SYNOPSIS =
  "Deep in the sertão of Bahia, the sisters Bibiana and Belonísia find an old and mysterious knife in the suitcase kept under their grandmother's bed. Then an accident happens.";

describe("evidence", () => {
  it("locates a quote ignoring accents and case, and returns the original text", () => {
    expect(locateQuote(SYNOPSIS, "deep in the sertao of bahia")).toBe("Deep in the sertão of Bahia");
    expect(locateQuote(SYNOPSIS, "old and mysterious knife in the suitcase")).toBe("old and mysterious knife in the suitcase");
  });

  it("rejects quotes that are not in the synopsis", () => {
    expect(locateQuote(SYNOPSIS, "the sisters live happily ever after")).toBeNull();
    expect(locateQuote(SYNOPSIS, "knife")).toBeNull();
  });

  it("cleans themes returned by the model", () => {
    expect(cleanThemes(["Grief.", "grief", "  Bond between sisters ", "x", 42, "a theme with far too many words in it"])).toEqual([
      "grief",
      "bond between sisters",
    ]);
  });

  it("changes the hash when the synopsis changes", () => {
    const base = { title: "A", author: "B", genre: "Novel", synopsis: SYNOPSIS, subjects: [] };
    expect(enrichmentInputHash(base)).toBe(enrichmentInputHash({ ...base }));
    expect(enrichmentInputHash(base)).not.toBe(enrichmentInputHash({ ...base, synopsis: `${SYNOPSIS} More.` }));
  });
});

describe("taxonomy labels", () => {
  it("describes a reading profile in English", () => {
    const text = describeProfile({
      atmospheres: ["melancholic", "comforting"],
      pace: 2,
      density: 3,
      styles: ["lyrical"],
      experiences: ["slow_read"],
      themes: ["grief"],
      portrait: null,
    });
    expect(text).toContain("melancholic");
    expect(text).toContain("comforting");
    expect(text).toContain("to read slowly");
    expect(text).toContain("grief");
  });

  it("maps internal ids to display labels", () => {
    expect(attributeLabel("fable")).toBe("fable-like");
    expect(attributeLabel("one_sitting")).toBe("to read in one sitting");
    expect(attributeLabel("isolation")).toBe("isolation");
    expect(confidenceLabel("medium")).toBe("medium");
    expect(confidenceLabel(null)).toBe("—");
  });
});

describe("text and vectors", () => {
  it("splits a synopsis into sentences", () => {
    expect(splitSentences(SYNOPSIS)).toHaveLength(1);
    expect(splitSentences(`${SYNOPSIS} And their lives will be bound together forever, to the point that one must become the voice of the other.`)).toHaveLength(2);
  });

  it("preserves vectors through storage", () => {
    const vector = Float32Array.from([0.6, 0.8, 0]);
    expect(Array.from(blobToVector(vectorToBlob(vector)))).toEqual(Array.from(vector));
    expect(dot(vector, vector)).toBeCloseTo(1, 5);
    const middle = centroid([Float32Array.from([1, 0, 0]), Float32Array.from([0, 1, 0])]);
    expect(dot(middle as Float32Array, middle as Float32Array)).toBeCloseTo(1, 5);
  });
});

describe("admin session", () => {
  it("accepts only the configured password", () => {
    expect(verifyPassword("test-password")).toBe(true);
    expect(verifyPassword("other")).toBe(false);
    expect(verifyPassword("")).toBe(false);
  });

  it("validates, expires and rejects tampered tokens", () => {
    const now = Date.now();
    const token = createSessionToken(now) as string;
    expect(verifySessionToken(token, now + 1000)).toBe(true);
    expect(verifySessionToken(token, now + 13 * 60 * 60 * 1000)).toBe(false);
    expect(verifySessionToken(`${token}x`, now)).toBe(false);
    const [expires, nonce, signature] = token.split(".");
    expect(verifySessionToken(`${Number(expires) + 99999999}.${nonce}.${signature}`, now)).toBe(false);
    expect(verifySessionToken(undefined, now)).toBe(false);
  });
});
