import { describe, expect, it } from "vitest";
import { createSessionToken, verifyPassword, verifySessionToken } from "@/lib/auth/session";
import { splitSentences } from "@/lib/catalog/text";
import { cleanThemes, enrichmentInputHash, locateQuote } from "@/lib/semantic/enrich";
import { attributeLabel, confidenceLabel, describeProfile } from "@/lib/semantic/taxonomy";
import { blobToVector, centroid, dot, vectorToBlob } from "@/lib/semantic/vectors";

const SYNOPSIS =
  "Nas profundezas do sertão baiano, as irmãs Bibiana e Belonísia encontram uma velha e misteriosa faca na mala guardada sob a cama da avó. Ocorre então um acidente.";

describe("evidence", () => {
  it("locates a quote ignoring accents and case, and returns the original text", () => {
    expect(locateQuote(SYNOPSIS, "nas profundezas do sertao baiano")).toBe("Nas profundezas do sertão baiano");
    expect(locateQuote(SYNOPSIS, "velha e misteriosa faca na mala")).toBe("velha e misteriosa faca na mala");
  });

  it("rejects quotes that are not in the synopsis", () => {
    expect(locateQuote(SYNOPSIS, "as irmãs vivem felizes para sempre")).toBeNull();
    expect(locateQuote(SYNOPSIS, "faca")).toBeNull();
  });

  it("cleans themes returned by the model", () => {
    expect(cleanThemes(["Luto.", "luto", "  Relação entre irmãs ", "x", 42, "um tema com palavras demais para ser tema"])).toEqual([
      "luto",
      "relação entre irmãs",
    ]);
  });

  it("changes the hash when the synopsis changes", () => {
    const base = { title: "A", author: "B", genre: "Romance", synopsis: SYNOPSIS, subjects: [] };
    expect(enrichmentInputHash(base)).toBe(enrichmentInputHash({ ...base }));
    expect(enrichmentInputHash(base)).not.toBe(enrichmentInputHash({ ...base, synopsis: `${SYNOPSIS} Mais.` }));
  });
});

describe("taxonomy labels", () => {
  it("describes a reading profile in Portuguese", () => {
    const text = describeProfile({
      atmospheres: ["melancholic", "comforting"],
      pace: 2,
      density: 3,
      styles: ["lyrical"],
      experiences: ["slow_read"],
      themes: ["luto"],
      portrait: null,
    });
    expect(text).toContain("melancólica");
    expect(text).toContain("acolhedora");
    expect(text).toContain("luto");
  });

  it("maps internal ids to Portuguese display labels", () => {
    expect(attributeLabel("melancholic")).toBe("melancólica");
    expect(attributeLabel("wry")).toBe("irônico");
    expect(attributeLabel("isolamento")).toBe("isolamento");
    expect(confidenceLabel("medium")).toBe("média");
    expect(confidenceLabel(null)).toBe("—");
  });
});

describe("text and vectors", () => {
  it("splits a synopsis into sentences", () => {
    expect(splitSentences(SYNOPSIS)).toHaveLength(1);
    expect(splitSentences(`${SYNOPSIS} E para sempre suas vidas estarão ligadas, a ponto de uma precisar ser a voz da outra.`)).toHaveLength(2);
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
