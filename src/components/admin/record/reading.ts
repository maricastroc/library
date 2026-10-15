import type { BookDetail, Evidence } from "@/lib/catalog/types";
import {
  ATMOSPHERE_BY_ID,
  EXPERIENCES,
  STYLES,
  type AtmosphereId,
  type ExperienceId,
  type StyleId,
} from "@/lib/semantic/taxonomy";

export type Reading = {
  atmospheres: AtmosphereId[];
  pace: number | null;
  density: number | null;
  styles: StyleId[];
  experiences: ExperienceId[];
  themes: string;
  portrait: string;
};

export function readingOf(book: BookDetail): Reading {
  return {
    atmospheres: book.atmospheres,
    pace: book.pace,
    density: book.density,
    styles: book.styles,
    experiences: book.experiences,
    themes: book.themes.join(", "),
    portrait: book.portrait ?? "",
  };
}

const list = (values: readonly string[]) => values.join("|");
const words = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .join("|");

export function readingKey(reading: Reading): string {
  return [list(reading.atmospheres), reading.pace ?? "", reading.density ?? "", list(reading.styles), list(reading.experiences), words(reading.themes), reading.portrait.trim()].join("§");
}

export function changedParts(reading: Reading, baseline: Reading): string[] {
  const parts: string[] = [];
  if (list(reading.atmospheres) !== list(baseline.atmospheres)) parts.push("atmosphere");
  if (reading.pace !== baseline.pace) parts.push("pace");
  if (reading.density !== baseline.density) parts.push("density");
  if (list(reading.styles) !== list(baseline.styles)) parts.push("voice");
  if (list(reading.experiences) !== list(baseline.experiences)) parts.push("good for");
  if (words(reading.themes) !== words(baseline.themes)) parts.push("themes");
  if (reading.portrait.trim() !== baseline.portrait.trim()) parts.push("portrait");
  return parts;
}

export type EvidenceGroup = { key: string; label: string; kind: "atmosphere" | "voice" | "good for" | "other"; color: string | null; current: boolean; quotes: string[] };

export function groupEvidence(evidence: Evidence[], reading: Reading): EvidenceGroup[] {
  const groups = new Map<string, EvidenceGroup>();
  for (const item of evidence) {
    const raw = item.attribute.trim().toLowerCase();
    const atmosphere = ATMOSPHERE_BY_ID[raw as AtmosphereId];
    const style = STYLES.find((entry) => entry.id === raw || entry.label === raw);
    const experience = EXPERIENCES.find((entry) => entry.id === raw || entry.label === raw);
    const group: EvidenceGroup = atmosphere
      ? { key: `a:${atmosphere.id}`, label: atmosphere.label, kind: "atmosphere", color: atmosphere.color, current: reading.atmospheres.includes(atmosphere.id), quotes: [] }
      : style
        ? { key: `s:${style.id}`, label: style.label, kind: "voice", color: null, current: reading.styles.includes(style.id), quotes: [] }
        : experience
          ? { key: `e:${experience.id}`, label: experience.label, kind: "good for", color: null, current: reading.experiences.includes(experience.id), quotes: [] }
          : { key: `o:${raw}`, label: item.attribute.trim(), kind: "other", color: null, current: true, quotes: [] };
    const existing = groups.get(group.key) ?? group;
    existing.quotes.push(item.quote);
    groups.set(group.key, existing);
  }
  const order = { atmosphere: 0, voice: 1, "good for": 2, other: 3 };
  return [...groups.values()].sort((a, b) => order[a.kind] - order[b.kind]);
}
