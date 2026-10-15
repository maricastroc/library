import { describe, expect, it } from "vitest";
import { changesBetween, moveItem, reasonKey, sharedReasons, type ShowcaseDraft } from "@/lib/showcase/curation";

function draft(overrides: Partial<ShowcaseDraft> = {}): ShowcaseDraft {
  return {
    title: "Books for rainy days",
    intro: "A few quiet books.",
    palette: "ink",
    published: false,
    items: [
      { bookId: 1, caption: null },
      { bookId: 2, caption: "For the window seat" },
    ],
    ...overrides,
  };
}

describe("changesBetween", () => {
  it("reports nothing when only surrounding spaces differ", () => {
    expect(changesBetween(draft({ title: " Books for rainy days ", items: [{ bookId: 1, caption: "" }, { bookId: 2, caption: "For the window seat " }] }), draft())).toEqual([]);
  });

  it("names each kind of change", () => {
    const changed = draft({
      title: "Rain",
      palette: "wine",
      published: true,
      items: [
        { bookId: 2, caption: "Another line" },
        { bookId: 1, caption: null },
      ],
    });
    expect(changesBetween(changed, draft())).toEqual(["title", "books", "captions", "colour", "putting it on display"]);
  });

  it("does not count a new book's caption as a caption change", () => {
    const added = draft({ items: [...draft().items, { bookId: 3, caption: "New" }] });
    expect(changesBetween(added, draft())).toEqual(["books"]);
  });

  it("says when a showcase is being taken off display", () => {
    expect(changesBetween(draft({ published: false }), draft({ published: true }))).toEqual(["taking it off display"]);
  });
});

describe("moveItem", () => {
  it("moves an item to a new position", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("leaves the list alone for impossible moves", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, 2)).toBe(items);
    expect(moveItem(items, -1, 0)).toBe(items);
    expect(moveItem(items, 1, 1)).toBe(items);
  });
});

describe("sharedReasons", () => {
  const atmosphere = (label: string) => ({ kind: "atmosphere", label });
  const pace = (label: string) => ({ kind: "pace", label });

  it("treats the same words in another order as the same reason", () => {
    expect(reasonKey(atmosphere("contemplative and melancholic atmosphere"))).toBe(reasonKey(atmosphere("melancholic and contemplative atmosphere")));
    expect(reasonKey(pace("slow pace"))).not.toBe(reasonKey(pace("unhurried pace")));
  });

  it("lifts reasons most suggestions share and keeps the rest per book", () => {
    const lists = [
      [atmosphere("contemplative and melancholic atmosphere"), pace("slow pace")],
      [atmosphere("melancholic and contemplative atmosphere"), pace("unhurried pace")],
      [atmosphere("contemplative and melancholic atmosphere"), pace("unhurried pace"), { kind: "note", label: "has a sample note" }],
      [atmosphere("contemplative and melancholic atmosphere"), pace("unhurried pace")],
    ];
    const { keys, labels } = sharedReasons(lists);
    expect(labels).toEqual(["contemplative and melancholic atmosphere", "unhurried pace"]);
    expect(keys.has(reasonKey(pace("slow pace")))).toBe(false);
    expect([...keys].some((key) => key.startsWith("note:"))).toBe(false);
  });

  it("lifts nothing from fewer than three suggestions", () => {
    expect(sharedReasons([[pace("slow pace")], [pace("slow pace")]]).labels).toEqual([]);
  });
});
