import type { Evidence, SemanticPatch } from "@/lib/catalog/types";
import { stripDiacritics } from "@/lib/catalog/text";
import { CHAT_MODEL, chatJson } from "./ollama";
import {
  ATMOSPHERES,
  ATMOSPHERE_IDS,
  DENSITY_LEVELS,
  EXPERIENCES,
  EXPERIENCE_IDS,
  PACE_LEVELS,
  STYLES,
  STYLE_IDS,
  type AtmosphereId,
  type ExperienceId,
  type StyleId,
} from "./taxonomy";

export const MIN_SYNOPSIS_LENGTH = 140;
export const ENRICHMENT_VERSION = "v3";

export type EnrichmentInput = {
  title: string;
  author: string;
  genre: string | null;
  synopsis: string | null;
  subjects: string[];
};

export type EnrichmentOutcome =
  | { status: "insufficient"; reason: string }
  | {
      status: "ready";
      profile: SemanticPatch;
      evidence: Evidence[];
      confidence: "high" | "medium" | "low";
      model: string;
    };

type RawClassification = {
  atmospheres?: unknown;
  pace?: unknown;
  density?: unknown;
  styles?: unknown;
  experiences?: unknown;
  themes?: unknown;
  portrait?: unknown;
  evidence?: unknown;
};

const SYSTEM_PROMPT = `You catalog books for an independent Brazilian bookshop. Your task is to describe WHAT IT FEELS LIKE to read each book, so readers can find books by feeling and not only by genre.

Rules:
- Rely only on the text provided (title, author, genre, subjects and synopsis). Do not add plot facts, characters or prizes that are not in the text.
- Choose values only from the options listed.
- "atmospheres": 1 to 3 identifiers, from the most to the least predominant.
- "pace": integer from 1 to 5. "density": integer from 1 to 4.
- "styles": 1 or 2 identifiers. "experiences": 1 or 2 identifiers.
- "themes": 3 to 5 short themes in English, in lowercase (e.g. "grief", "bond between sisters", "social inequality").
- "portrait": one sentence in English (200 characters at most) about the reading experience the text suggests. Do not repeat the title or the author's name, do not reveal the ending and do not invent details.
- "evidence": exactly 2 items. In "quote", copy literally from the synopsis a short passage (5 to 14 words) that justifies the attribute named in "attribute". The passage must exist word for word in the synopsis.

Atmosphere options:
${ATMOSPHERES.map((atmosphere) => `- ${atmosphere.id}: ${atmosphere.description}`).join("\n")}

Pace (1 to 5):
${PACE_LEVELS.map((level) => `- ${level.value}: ${level.description}`).join("\n")}

Density (1 to 4):
${DENSITY_LEVELS.map((level) => `- ${level.value}: ${level.description}`).join("\n")}

Style options:
${STYLES.map((style) => `- ${style.id}: ${style.description}`).join("\n")}

Reading experience options:
${EXPERIENCES.map((experience) => `- ${experience.id}: ${experience.description}`).join("\n")}

Reply only with a JSON object, with no text before or after, in this format:
{"atmospheres":["..."],"pace":0,"density":0,"styles":["..."],"experiences":["..."],"themes":["..."],"portrait":"...","evidence":[{"attribute":"...","quote":"..."}]}`;

function buildUserPrompt(input: EnrichmentInput): string {
  const lines = [`Title: ${input.title}`, `Author: ${input.author}`];
  if (input.genre) lines.push(`Genre: ${input.genre}`);
  if (input.subjects.length > 0) lines.push(`Catalog subjects: ${input.subjects.slice(0, 8).join("; ")}`);
  lines.push("", "Synopsis:", (input.synopsis ?? "").slice(0, 2400));
  return lines.join("\n");
}

function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  let lastWasSpace = true;
  for (let index = 0; index < text.length; index += 1) {
    const base = stripDiacritics(text[index]).toLowerCase();
    for (const char of base) {
      if (/[a-z0-9]/.test(char)) {
        folded += char;
        map.push(index);
        lastWasSpace = false;
      } else if (!lastWasSpace) {
        folded += " ";
        map.push(index);
        lastWasSpace = true;
      }
    }
  }
  return { folded, map };
}

export function locateQuote(source: string, quote: string): string | null {
  const wanted = foldWithMap(quote).folded.trim();
  if (wanted.length < 12) return null;
  const { folded, map } = foldWithMap(source);
  const start = folded.indexOf(wanted);
  if (start === -1) return null;
  const from = map[start];
  const to = map[start + wanted.length - 1];
  return source.slice(from, to + 1).trim();
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], max: number): T[] {
  if (!Array.isArray(value)) return [];
  const result: T[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim().toLowerCase() as T;
    if (allowed.includes(id) && !result.includes(id)) result.push(id);
    if (result.length >= max) break;
  }
  return result;
}

function clampInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function cleanThemes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const themes: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const theme = item.replace(/[.;]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (theme.length < 3 || theme.length > 42 || theme.split(" ").length > 5) continue;
    if (!themes.includes(theme)) themes.push(theme);
    if (themes.length >= 6) break;
  }
  return themes;
}

function cleanPortrait(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const portrait = value.replace(/\s+/g, " ").trim();
  if (portrait.length < 20) return null;
  if (portrait.length <= 300) return portrait;
  const cut = portrait.slice(0, 300);
  const stop = cut.lastIndexOf(". ");
  return stop > 120 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

export function enrichmentInputHash(input: EnrichmentInput): string {
  const payload = [ENRICHMENT_VERSION, input.title, input.author, input.genre ?? "", input.synopsis ?? ""].join("\u0001");
  let hash = 5381;
  for (let index = 0; index < payload.length; index += 1) hash = ((hash << 5) + hash + payload.charCodeAt(index)) | 0;
  return `${ENRICHMENT_VERSION}:${(hash >>> 0).toString(36)}:${payload.length}`;
}

export async function classifyBook(input: EnrichmentInput): Promise<EnrichmentOutcome> {
  const synopsis = (input.synopsis ?? "").trim();
  if (synopsis.length < MIN_SYNOPSIS_LENGTH) {
    return {
      status: "insufficient",
      reason: "Synopsis missing or too short for a responsible classification.",
    };
  }

  const raw = await chatJson<RawClassification>({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
    temperature: 0.15,
    maxTokens: 380,
    timeoutMs: 180000,
  });

  const atmospheres = pickEnum<AtmosphereId>(raw.atmospheres, ATMOSPHERE_IDS, 3);
  if (atmospheres.length === 0) {
    return { status: "insufficient", reason: "The model could not assign an atmosphere from the synopsis." };
  }

  const evidence: Evidence[] = [];
  if (Array.isArray(raw.evidence)) {
    for (const item of raw.evidence) {
      if (typeof item !== "object" || item === null) continue;
      const { attribute, quote } = item as { attribute?: unknown; quote?: unknown };
      if (typeof attribute !== "string" || typeof quote !== "string") continue;
      const located = locateQuote(synopsis, quote);
      if (!located || located.length > 260) continue;
      if (evidence.some((existing) => existing.quote === located)) continue;
      evidence.push({ attribute: attribute.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 60), quote: located });
    }
  }

  const lengthScore = synopsis.length >= 700 ? 2 : synopsis.length >= 320 ? 1 : 0;
  const evidenceScore = evidence.length >= 2 ? 1 : evidence.length === 1 ? 0 : -1;
  const total = lengthScore + evidenceScore;
  const confidence = total >= 3 ? "high" : total >= 1 ? "medium" : "low";

  return {
    status: "ready",
    profile: {
      atmospheres,
      pace: clampInteger(raw.pace, 1, 5),
      density: clampInteger(raw.density, 1, 4),
      styles: pickEnum<StyleId>(raw.styles, STYLE_IDS, 2),
      experiences: pickEnum<ExperienceId>(raw.experiences, EXPERIENCE_IDS, 2),
      themes: cleanThemes(raw.themes),
      portrait: cleanPortrait(raw.portrait),
    },
    evidence,
    confidence,
    model: CHAT_MODEL,
  };
}
