export type DemandEntry = {
  id: number;
  query: string;
  folded: string;
  confidence: string;
  fallback: boolean;
  results: number;
  shown: number[];
  atmospheres: string[];
  inferred: string[];
  opened: number[];
  reserved: number[];
  sample: boolean;
  createdAt: string;
};

export type Phrase = { folded: string; text: string; count: number };

export type Shortfall = "declined" | "empty" | "weak" | "offline" | "loose";

export type DemandGroup = {
  label: string;
  phrases: Phrase[];
  count: number;
  answered: number;
  shortfall: Shortfall | null;
  opened: number;
  reserved: number;
  shown: { id: number; times: number }[];
  samples: number;
  lastAt: string;
};

export const GROUP_THRESHOLD = 0.58;
export const RETENTION_DAYS = 90;

export function shortfallOf(entry: DemandEntry): Shortfall | null {
  if (entry.fallback) return "offline";
  if (entry.confidence === "none") return entry.results === 0 ? "declined" : "weak";
  if (entry.results === 0) return "empty";
  if (entry.confidence === "low") return "weak";
  if (entry.confidence === "medium") return "loose";
  return null;
}

export const isAnswered = (entry: DemandEntry) => shortfallOf(entry) === null;

export const isMissed = (entry: DemandEntry) => {
  const shortfall = shortfallOf(entry);
  return shortfall !== null && shortfall !== "loose";
};

export function phrasesOf(entries: DemandEntry[]): Phrase[] {
  const byFolded = new Map<string, { texts: Map<string, number>; count: number }>();
  for (const entry of entries) {
    const slot = byFolded.get(entry.folded) ?? { texts: new Map<string, number>(), count: 0 };
    slot.count += 1;
    slot.texts.set(entry.query, (slot.texts.get(entry.query) ?? 0) + 1);
    byFolded.set(entry.folded, slot);
  }
  return [...byFolded]
    .map(([folded, slot]) => ({ folded, count: slot.count, text: [...slot.texts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0] }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

function unit(vector: Float32Array): Float32Array {
  let norm = 0;
  for (const value of vector) norm += value * value;
  const scale = norm > 0 ? 1 / Math.sqrt(norm) : 0;
  return vector.map((value) => value * scale);
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += a[index] * b[index];
  return sum;
}

export function groupPhrases(phrases: Phrase[], vectors: Map<string, Float32Array> | null, threshold = GROUP_THRESHOLD): Phrase[][] {
  const groups: { members: Phrase[]; sum: Float32Array | null }[] = [];
  for (const phrase of phrases) {
    const vector = vectors?.get(phrase.folded);
    if (!vector) {
      groups.push({ members: [phrase], sum: null });
      continue;
    }
    const own = unit(vector);
    let best: { group: (typeof groups)[number]; score: number } | null = null;
    for (const group of groups) {
      if (!group.sum) continue;
      const score = dot(own, unit(group.sum));
      if (score >= threshold && (!best || score > best.score)) best = { group, score };
    }
    if (best) {
      best.group.members.push(phrase);
      best.group.sum = best.group.sum!.map((value, index) => value + own[index] * phrase.count);
    } else {
      groups.push({ members: [phrase], sum: own.map((value) => value * phrase.count) });
    }
  }
  return groups.map((group) => group.members);
}

function tally(ids: number[][]): { id: number; times: number }[] {
  const counts = new Map<number, number>();
  for (const list of ids) for (const id of new Set(list)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, times]) => ({ id, times })).sort((a, b) => b.times - a.times || a.id - b.id);
}

export function buildGroups(entries: DemandEntry[], grouped: Phrase[][]): DemandGroup[] {
  const groupOf = new Map<string, number>();
  grouped.forEach((members, index) => members.forEach((phrase) => groupOf.set(phrase.folded, index)));
  const buckets = grouped.map(() => [] as DemandEntry[]);
  for (const entry of entries) {
    const index = groupOf.get(entry.folded);
    if (index !== undefined) buckets[index].push(entry);
  }
  return grouped
    .map((members, index) => {
      const items = buckets[index];
      const missing = items.map(shortfallOf).filter((reason): reason is Shortfall => reason !== null);
      const reasons = new Map<Shortfall, number>();
      for (const reason of missing) reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
      const main = [...reasons].sort((a, b) => b[1] - a[1] || Number(a[0] === "loose") - Number(b[0] === "loose"))[0]?.[0] ?? null;
      return {
        label: members[0].text,
        phrases: members,
        count: items.length,
        answered: items.length - missing.length,
        shortfall: missing.length * 2 >= items.length ? main : null,
        opened: items.filter((item) => item.opened.length > 0).length,
        reserved: items.filter((item) => item.reserved.length > 0).length,
        shown: tally(items.map((item) => item.shown.slice(0, 3))),
        samples: items.filter((item) => item.sample).length,
        lastAt: items.reduce((latest, item) => (item.createdAt > latest ? item.createdAt : latest), ""),
      };
    })
    .filter((group) => group.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function summarize(entries: DemandEntry[]) {
  return {
    searches: entries.length,
    answered: entries.filter(isAnswered).length,
    loose: entries.filter((entry) => shortfallOf(entry) === "loose").length,
    missed: entries.filter(isMissed).length,
    opened: entries.filter((entry) => entry.opened.length > 0).length,
    reserved: entries.filter((entry) => entry.reserved.length > 0).length,
    samples: entries.filter((entry) => entry.sample).length,
  };
}

export function atmosphereDemand(entries: DemandEntry[], shelf: Map<string, number>, ids: string[]) {
  return ids
    .map((id) => ({
      id,
      named: entries.filter((entry) => entry.atmospheres.includes(id)).length,
      read: entries.filter((entry) => !entry.atmospheres.includes(id) && entry.inferred.includes(id)).length,
      onShelf: shelf.get(id) ?? 0,
    }))
    .filter((row) => row.named + row.read > 0)
    .sort((a, b) => b.named + b.read - (a.named + a.read) || b.named - a.named);
}

export function bookTraffic(entries: DemandEntry[]) {
  return {
    shown: tally(entries.map((entry) => entry.shown.slice(0, 5))),
    opened: tally(entries.map((entry) => entry.opened)),
    reserved: tally(entries.map((entry) => entry.reserved)),
  };
}
