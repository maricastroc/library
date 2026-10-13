import { describe, expect, it } from "vitest";
import { formatIsbn, isValidIsbn10, isValidIsbn13, normalizeIsbn, pickIsbn } from "@/lib/catalog/isbn";

describe("ISBN", () => {
  it("accepts a valid hyphenated ISBN-13", () => {
    expect(normalizeIsbn("978-85-359-0277-8")).toEqual({ ok: true, isbn: "9788535902778" });
  });

  it("converts a valid ISBN-10 to ISBN-13", () => {
    expect(isValidIsbn10("8535902775")).toBe(true);
    expect(normalizeIsbn("85-359-0277-5")).toEqual({ ok: true, isbn: "9788535902778" });
  });

  it("rejects a wrong check digit", () => {
    expect(isValidIsbn13("9788535902776")).toBe(false);
    expect(normalizeIsbn("9788535902776").ok).toBe(false);
  });

  it("rejects invalid lengths", () => {
    expect(normalizeIsbn("12345").ok).toBe(false);
    expect(normalizeIsbn("").ok).toBe(false);
  });

  it("prefers the ISBN of a Portuguese-language edition", () => {
    expect(pickIsbn(["9780140449136", "9788535902778"])).toBe("9788535902778");
    expect(pickIsbn(["garbage"])).toBeNull();
  });

  it("formats for display", () => {
    expect(formatIsbn("9788535902778")).toBe("978-85-3590-277-8");
    expect(formatIsbn(null)).toBeNull();
  });
});
