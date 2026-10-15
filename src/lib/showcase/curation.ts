import type { Showcase, ShowcaseItem } from "./index";
import type { ShowcasePalette } from "./palettes";

export type ShowcaseDraft = { title: string; intro: string; palette: ShowcasePalette; published: boolean; items: ShowcaseItem[] };
export type SuggestionReason = { kind: string; label: string };

export function draftOf(showcase: Showcase | null): ShowcaseDraft {
  return { title: showcase?.title ?? "", intro: showcase?.intro ?? "", palette: showcase?.palette ?? "ink", published: showcase?.published ?? false, items: showcase?.items ?? [] };
}

export function changesBetween(draft: ShowcaseDraft, saved: ShowcaseDraft): string[] {
  const parts: string[] = [];
  if (draft.title.trim() !== saved.title.trim()) parts.push("title");
  if (draft.intro.trim() !== saved.intro.trim()) parts.push("introduction");
  if (draft.items.map((item) => item.bookId).join() !== saved.items.map((item) => item.bookId).join()) parts.push("books");
  const before = new Map(saved.items.map((item) => [item.bookId, (item.caption ?? "").trim()]));
  if (draft.items.some((item) => before.has(item.bookId) && before.get(item.bookId) !== (item.caption ?? "").trim())) parts.push("captions");
  if (draft.palette !== saved.palette) parts.push("colour");
  if (draft.published !== saved.published) parts.push(draft.published ? "putting it on display" : "taking it off display");
  return parts;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function reasonKey(reason: SuggestionReason): string {
  return `${reason.kind}:${reason.label.toLowerCase().split(/\W+/).filter(Boolean).sort().join(" ")}`;
}

export function sharedReasons(lists: SuggestionReason[][]): { keys: Set<string>; labels: string[] } {
  if (lists.length < 3) return { keys: new Set(), labels: [] };
  const groups = new Map<string, Map<string, number>>();
  for (const reasons of lists) {
    for (const key of new Set(reasons.filter((reason) => reason.kind !== "note").map(reasonKey))) {
      const labels = groups.get(key) ?? new Map<string, number>();
      for (const reason of reasons) if (reasonKey(reason) === key) labels.set(reason.label, (labels.get(reason.label) ?? 0) + 1);
      groups.set(key, labels);
    }
  }
  const half = Math.ceil(lists.length / 2);
  const kept = [...groups].filter(([, labels]) => [...labels.values()].reduce((sum, count) => sum + count, 0) >= half);
  return { keys: new Set(kept.map(([key]) => key)), labels: kept.map(([, labels]) => [...labels].sort((a, b) => b[1] - a[1])[0][0]) };
}
