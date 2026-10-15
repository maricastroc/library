import { normalizeText } from "@/lib/catalog/text";
import { CHAT_MODEL, EMBED_MODEL, queryPrompt } from "@/lib/semantic/ollama";
import {
  ATMOSPHERE_IDS,
  atmosphereLabel,
  experienceLabel,
  paceLabel,
  styleLabel,
  type AtmosphereId,
} from "@/lib/semantic/taxonomy";
import { centroid, dot, mean, standardDeviation } from "@/lib/semantic/vectors";
import { parseQuery, type ParsedQuery } from "./interpret";
import { contentTokens, lexicalSearch } from "./lexical";
import type { Interpretation, Reason, SearchConfidence, SearchResponse, SearchResult } from "./types";
import { atmosphereAnchors, embedCached, getVectorIndex, type IndexedBook, type VectorIndex } from "./vector-index";

export const SEARCH_TUNING = {
  synWeight: 0.55,
  feelWeight: 0.45,
  atmosphereBoost: 2.2,
  inferredAtmosphereBoost: 0.45,
  avoidPenalty: 1.7,
  avoidInferredPenalty: 0.7,
  experienceBoost: 0.7,
  paceBoost: 0.4,
  lengthBoost: 0.7,
  eraBoost: 0.6,
  genreBoost: 0.5,
  lexicalBoost: 0.35,
  noteBoost: 0.12,
  authorDirectBoost: 4,
  referenceSynWeight: 0.45,
  referenceFeelWeight: 0.55,
  referenceBlend: 0.6,
  anchorZ: 1.15,
  anchorMin: 0.3,
  quoteMin: 0.33,
  quoteRelative: 0.82,
  scoreWindow: 1.7,
  minResults: 5,
  maxResults: 10,
  confidence: { floor: 0.2, structuredHigh: 0.3, high: 0.4, medium: 0.31, low: 0.275, feelFloor: 0.23, synOverride: 0.45 },
  unreadPenalty: 1.2,
};

export type SearchVariant = "full" | "embedding";

const POSITION_WEIGHT = [1, 0.62, 0.38];

function zScores(values: (number | null)[]): number[] {
  const present = values.filter((value): value is number => value !== null);
  const average = mean(present);
  const deviation = standardDeviation(present) || 1;
  return values.map((value) => (value === null ? -1 : (value - average) / deviation));
}

function inferAtmospheres(vector: Float32Array, anchors: Map<AtmosphereId, Float32Array>, exclude: AtmosphereId[]): AtmosphereId[] {
  const scored = ATMOSPHERE_IDS.map((id) => ({ id, value: dot(vector, anchors.get(id) as Float32Array) }));
  const values = scored.map((item) => item.value);
  const average = mean(values);
  const deviation = standardDeviation(values) || 1;
  return scored
    .filter(
      (item) =>
        (item.value - average) / deviation >= SEARCH_TUNING.anchorZ &&
        item.value >= SEARCH_TUNING.anchorMin &&
        !exclude.includes(item.id),
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((item) => item.id);
}

function atmosphereMatch(bookAtmospheres: AtmosphereId[], wanted: AtmosphereId[], emphasis: AtmosphereId[] = []): number {
  if (wanted.length === 0) return 0;
  let total = 0;
  let weights = 0;
  for (const id of wanted) {
    const weight = emphasis.includes(id) ? 2 : 1;
    weights += weight;
    const position = bookAtmospheres.indexOf(id);
    if (position >= 0) total += weight * (POSITION_WEIGHT[position] ?? 0.3);
  }
  const coverage = wanted.filter((id) => bookAtmospheres.includes(id)).length === wanted.length && wanted.length > 1 ? 0.45 : 0;
  return total / weights + coverage;
}

function themeMatches(themes: string[], queryTokens: string[]): string[] {
  const stems = queryTokens.filter((token) => token.length >= 4).map((token) => token.slice(0, Math.max(4, token.length - 2)));
  if (stems.length === 0) return [];
  return themes.filter((theme) => {
    const folded = normalizeText(theme);
    return stems.some((stem) => folded.split(" ").some((word) => word.startsWith(stem)));
  });
}

const BIBLIOGRAPHIC_SENTENCE =
  /(published|released|publisher|edition|prize|award|adapted|adaptation|translated|translation|copies|film|miniseries|telenovela|best-?seller|list of|considered (?:an?|one|by)|regarded as|written by|is an? (?:[\w-]+ )?(?:novel|book|novella|work|short story|collection|play|poem|essay))/i;

function bestQuote(entry: IndexedBook, queryVector: Float32Array, reference: number): { text: string; value: number } | null {
  let best: { text: string; value: number } | null = null;
  for (const sentence of entry.sentences) {
    if (sentence.text.length < 48 || sentence.text.length > 320) continue;
    if (BIBLIOGRAPHIC_SENTENCE.test(sentence.text) || /\b(1[5-9]\d{2}|20\d{2})\b/.test(sentence.text)) continue;
    const value = dot(queryVector, sentence.vector);
    if (!best || value > best.value) best = { text: sentence.text, value };
  }
  const minimum = Math.max(SEARCH_TUNING.quoteMin, reference * SEARCH_TUNING.quoteRelative);
  return best && best.value >= minimum ? best : null;
}

function listLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

type Scored = {
  entry: IndexedBook;
  score: number;
  cosSyn: number;
  cosFeel: number | null;
  base: number;
};

type Context = {
  topSyn: number;
  parsed: ParsedQuery;
  wanted: AtmosphereId[];
  inferred: AtmosphereId[];
  avoided: AtmosphereId[];
  avoidedInferred: AtmosphereId[];
  queryTokens: string[];
  referenceBooks: IndexedBook[];
};

function buildReasons(entry: IndexedBook, context: Context, queryVector: Float32Array): { reasons: Reason[]; quote: string | null; caveat: string | null } {
  const { book } = entry;
  const reasons: Reason[] = [];
  const { parsed } = context;
  const classified = book.semanticStatus === "ready";

  if (parsed.reference?.inCatalog && !parsed.reference.similar && parsed.reference.bookIds.includes(book.id)) {
    reasons.push({ kind: "author", label: parsed.reference.kind === "author" ? `by ${book.author}` : "this is the book you mentioned" });
  }

  if (parsed.reference?.similar && context.referenceBooks.length > 0 && classified) {
    const referenceAtmospheres = new Set(context.referenceBooks.flatMap((item) => item.book.atmospheres));
    const referenceStyles = new Set(context.referenceBooks.flatMap((item) => item.book.styles));
    const sharedAtmospheres = book.atmospheres.filter((id) => referenceAtmospheres.has(id)).slice(0, 2).map(atmosphereLabel);
    const sharedStyles = book.styles.filter((id) => referenceStyles.has(id)).slice(0, 1).map(styleLabel);
    const shared = [
      sharedAtmospheres.length > 0 ? `${listLabels(sharedAtmospheres)} atmosphere` : null,
      sharedStyles.length > 0 ? `${listLabels(sharedStyles)} style` : null,
    ].filter((item): item is string => item !== null);
    if (shared.length > 0) {
      const target = parsed.reference.kind === "author" ? `${parsed.reference.label}` : "the book you mentioned";
      reasons.push({ kind: "reference", label: `in common with ${target}: ${shared.join("; ")}` });
    }
  }

  const matchedAtmospheres = book.atmospheres.filter((id) => context.wanted.includes(id) || context.inferred.includes(id));
  if (matchedAtmospheres.length > 0) {
    reasons.push({ kind: "atmosphere", label: `${listLabels(matchedAtmospheres.map(atmosphereLabel))} atmosphere` });
  }

  const themes = themeMatches(book.themes, context.queryTokens).slice(0, 3);
  if (themes.length > 0) reasons.push({ kind: "theme", label: `themes: ${themes.join(", ")}` });

  const matchedExperiences = book.experiences.filter((id) => parsed.experiences.includes(id));
  if (matchedExperiences.length > 0) {
    reasons.push({ kind: "experience", label: listLabels(matchedExperiences.map(experienceLabel)) });
  }

  if (parsed.pace && book.pace) {
    const matches = parsed.pace === "slow" ? book.pace <= 2 : book.pace >= 4;
    if (matches) reasons.push({ kind: "pace", label: `${paceLabel(book.pace)} pace` });
  }
  if (parsed.length && book.pages) {
    const matches = parsed.length === "short" ? book.pages <= 200 : book.pages >= 420;
    if (matches) reasons.push({ kind: "length", label: `${book.pages} pages` });
  }
  if (parsed.era && book.year) {
    const matches = parsed.era === "classic" ? book.year <= 1975 : book.year >= 1985;
    if (matches) reasons.push({ kind: "era", label: `published in ${book.year}` });
  }
  if (parsed.genres.length > 0 && book.genre && parsed.genres.includes(book.genre)) {
    reasons.push({ kind: "genre", label: book.genre.toLowerCase() });
  }
  if (book.note) {
    reasons.push({ kind: "note", label: book.noteOrigin === "example" ? "has a sample note" : "has a bookseller's note" });
  }

  const quote = parsed.reference?.similar && !parsed.hasFreeText ? null : bestQuote(entry, queryVector, context.topSyn);
  if (reasons.filter((reason) => reason.kind !== "note").length === 0) {
    reasons.unshift({
      kind: "similarity",
      label: quote ? "the synopsis comes close to what you described" : "overall closeness to the synopsis",
    });
  }

  let caveat: string | null = null;
  if (!classified) caveat = "This book has no AI reading yet; it appears only because its synopsis is close.";
  else if (book.confidence === "low") caveat = "This book's classification rests on a short synopsis.";
  return { reasons, quote: quote?.text ?? null, caveat };
}

function toInterpretation(context: Context, unassessable: string[], index: VectorIndex): Interpretation {
  const { parsed } = context;
  return {
    positive: parsed.positive,
    avoid: parsed.avoid,
    unassessable,
    atmospheres: context.wanted,
    avoidAtmospheres: [...context.avoided, ...context.avoidedInferred],
    inferredAtmospheres: context.inferred,
    pace: parsed.pace,
    length: parsed.length,
    era: parsed.era,
    genres: parsed.genres,
    reference: parsed.reference
      ? {
          label:
            parsed.reference.kind === "title"
              ? (index.byId.get(parsed.reference.bookIds[0])?.book.title ?? parsed.reference.label)
              : parsed.reference.label,
          kind: parsed.reference.kind,
          inCatalog: parsed.reference.inCatalog,
          titles: parsed.reference.bookIds
            .map((id) => index.byId.get(id)?.book.title)
            .filter((title): title is string => Boolean(title))
            .slice(0, 8),
          similar: parsed.reference.similar,
        }
      : null,
  };
}

export async function semanticSearch(
  query: string,
  options: { variant?: SearchVariant; limit?: number; debug?: boolean } = {},
): Promise<SearchResponse> {
  const started = Date.now();
  const variant = options.variant ?? "full";
  const index = getVectorIndex();
  const parsed = parseQuery(query, { authors: index.authors, titles: index.titles });
  const emptyContext: Context = {
    topSyn: 0,
    parsed,
    wanted: [],
    inferred: [],
    avoided: [],
    avoidedInferred: [],
    queryTokens: [],
    referenceBooks: [],
  };
  const engine = { embedModel: EMBED_MODEL, classifierModel: CHAT_MODEL, tookMs: 0, cached: false };

  const indexed = index.books.filter((entry) => entry.syn);
  if (indexed.length === 0) {
    return {
      query: parsed.original,
      interpretation: toInterpretation(emptyContext, [], index),
      confidence: "none",
      message: "The catalog has not been indexed by the AI yet. Once the embeddings are generated, search by intent will start working.",
      results: [],
      engine: { ...engine, tookMs: Date.now() - started },
    };
  }

  const useFull = variant === "full";
  if (useFull && !parsed.hasSubstance) {
    const judged = parsed.unknowable.map((word) => `"${word}"`).join(", ");
    return {
      query: parsed.original,
      interpretation: toInterpretation(emptyContext, parsed.unknowable, index),
      confidence: "none",
      message:
        parsed.unknowable.length > 0
          ? `I cannot tell which books are ${judged}: the catalog knows what each book is about and how it reads, not how it was received. Tell me a feeling, a theme or a pace and I will look for that.`
          : parsed.asksPrice
            ? "I do not search by price. Arrange the collection by price to see the least expensive books first, or tell me what you would like to read."
            : "That is too little for me to go on. Tell me a feeling, a theme, a pace, or an author you liked.",
      results: [],
      engine: { ...engine, tookMs: Date.now() - started },
    };
  }
  const queryText = useFull ? parsed.positive : parsed.original;
  const prompts = [queryPrompt(queryText), ...(useFull ? parsed.avoid.map((phrase) => queryPrompt(phrase)) : [])];
  const [{ vectors, cached }, anchors] = await Promise.all([embedCached(prompts), atmosphereAnchors()]);
  const queryVector = vectors[0];
  const avoidVectors = vectors.slice(1);

  const wanted = useFull ? parsed.atmospheres : [];
  const avoided = useFull ? parsed.avoidAtmospheres : [];
  const inferred = useFull ? inferAtmospheres(queryVector, anchors, [...wanted, ...avoided]) : [];
  const avoidedInferred: AtmosphereId[] = [];
  const unassessable: string[] = useFull ? [...parsed.unknowable] : [];
  if (useFull) {
    parsed.avoid.forEach((phrase, position) => {
      const phraseFolded = normalizeText(phrase);
      const handledByCue =
        parsed.avoidAtmospheres.length > 0 ||
        /\b(long|short|slow|fast|quick|brief|lengthy|dragg)/.test(phraseFolded);
      const fromAnchors = inferAtmospheres(avoidVectors[position], anchors, [...wanted, ...avoided]);
      const strong = fromAnchors.filter((id) => dot(avoidVectors[position], anchors.get(id) as Float32Array) >= 0.36);
      for (const id of strong) if (!avoidedInferred.includes(id) && !inferred.includes(id)) avoidedInferred.push(id);
      if (!handledByCue && strong.length === 0) unassessable.push(phrase);
    });
  }

  const referenceBooks =
    useFull && parsed.reference?.inCatalog
      ? parsed.reference.bookIds.map((id) => index.byId.get(id)).filter((entry): entry is IndexedBook => Boolean(entry?.syn))
      : [];
  const similarMode = Boolean(useFull && parsed.reference?.similar && referenceBooks.length > 0);
  const directMode = Boolean(useFull && parsed.reference?.inCatalog && !parsed.reference.similar);
  const context: Context = {
    topSyn: 0,
    parsed,
    wanted,
    inferred,
    avoided,
    avoidedInferred,
    queryTokens: contentTokens(parsed.positive),
    referenceBooks,
  };

  const cosSyn = indexed.map((entry) => dot(queryVector, entry.syn as Float32Array));
  const cosFeel = indexed.map((entry) => (entry.feel ? dot(queryVector, entry.feel) : null));
  const zSyn = zScores(cosSyn);
  const zFeel = zScores(cosFeel);

  let zRefSyn: number[] = [];
  let zRefFeel: number[] = [];
  if (similarMode) {
    const refSyn = centroid(referenceBooks.map((entry) => entry.syn as Float32Array));
    const refFeel = centroid(referenceBooks.map((entry) => entry.feel).filter((vector): vector is Float32Array => Boolean(vector)));
    zRefSyn = zScores(indexed.map((entry) => (refSyn ? dot(refSyn, entry.syn as Float32Array) : null)));
    zRefFeel = zScores(indexed.map((entry) => (refFeel && entry.feel ? dot(refFeel, entry.feel) : null)));
  }

  const lexical = useFull ? lexicalSearch(parsed.positive, 12) : [];
  const lexicalTop = lexical[0]?.score ?? 0;
  const lexicalById = new Map(lexical.map((item) => [item.id, lexicalTop > 0 ? item.score / lexicalTop : 0]));
  const referenceIds = new Set(referenceBooks.map((entry) => entry.book.id));

  const scored: Scored[] = indexed.map((entry, position) => {
    const { book } = entry;
    const feelPart = entry.feel ? zFeel[position] : zSyn[position] - SEARCH_TUNING.unreadPenalty;
    let base = SEARCH_TUNING.synWeight * zSyn[position] + SEARCH_TUNING.feelWeight * feelPart;
    if (!useFull) return { entry, score: zSyn[position], cosSyn: cosSyn[position], cosFeel: cosFeel[position], base: zSyn[position] };
    if (!entry.feel) base -= SEARCH_TUNING.unreadPenalty * SEARCH_TUNING.synWeight;

    if (similarMode) {
      const refFeelPart = entry.feel ? zRefFeel[position] : zRefSyn[position] - SEARCH_TUNING.unreadPenalty;
      const referenceScore = SEARCH_TUNING.referenceSynWeight * zRefSyn[position] + SEARCH_TUNING.referenceFeelWeight * refFeelPart;
      base = parsed.hasFreeText
        ? SEARCH_TUNING.referenceBlend * referenceScore + (1 - SEARCH_TUNING.referenceBlend) * base
        : referenceScore;
    }

    let score = base;
    score += SEARCH_TUNING.atmosphereBoost * atmosphereMatch(book.atmospheres, wanted, parsed.emphasis);
    score += SEARCH_TUNING.inferredAtmosphereBoost * atmosphereMatch(book.atmospheres, inferred);
    for (const id of avoided) {
      const at = book.atmospheres.indexOf(id);
      if (at >= 0) score -= SEARCH_TUNING.avoidPenalty * (POSITION_WEIGHT[at] ?? 0.3);
    }
    for (const id of avoidedInferred) {
      const at = book.atmospheres.indexOf(id);
      if (at >= 0) score -= SEARCH_TUNING.avoidInferredPenalty * (POSITION_WEIGHT[at] ?? 0.3);
    }
    if (parsed.experiences.length > 0) {
      const hits = book.experiences.filter((id) => parsed.experiences.includes(id)).length;
      score += SEARCH_TUNING.experienceBoost * (hits / parsed.experiences.length);
    }
    if (parsed.pace && book.pace) {
      const distance = parsed.pace === "slow" ? book.pace - 1.5 : 4.5 - book.pace;
      score += SEARCH_TUNING.paceBoost * Math.max(-1, Math.min(1, 1 - distance / 1.5));
    }
    if (parsed.length && book.pages) {
      if (parsed.length === "short") score += SEARCH_TUNING.lengthBoost * (book.pages <= 160 ? 1 : book.pages <= 220 ? 0.5 : book.pages <= 320 ? -0.3 : -1);
      else score += SEARCH_TUNING.lengthBoost * (book.pages >= 500 ? 1 : book.pages >= 380 ? 0.5 : book.pages >= 250 ? -0.3 : -1);
    }
    if (parsed.era && book.year) {
      if (parsed.era === "classic") score += SEARCH_TUNING.eraBoost * (book.year <= 1945 ? 1 : book.year <= 1975 ? 0.4 : book.year >= 1995 ? -0.7 : 0);
      else score += SEARCH_TUNING.eraBoost * (book.year >= 2000 ? 1 : book.year >= 1985 ? 0.35 : book.year <= 1950 ? -0.7 : 0);
    }
    if (parsed.genres.length > 0 && book.genre) {
      score += parsed.genres.includes(book.genre) ? SEARCH_TUNING.genreBoost : -SEARCH_TUNING.genreBoost * 0.4;
    }
    score += SEARCH_TUNING.lexicalBoost * (lexicalById.get(book.id) ?? 0);
    if (book.note && book.noteOrigin === "bookseller") score += SEARCH_TUNING.noteBoost;
    if (directMode && referenceIds.has(book.id)) score += SEARCH_TUNING.authorDirectBoost;
    if (similarMode && referenceIds.has(book.id)) score = Number.NEGATIVE_INFINITY;
    return { entry, score, cosSyn: cosSyn[position], cosFeel: cosFeel[position], base };
  });

  const ranked = scored.filter((item) => Number.isFinite(item.score)).sort((a, b) => b.score - a.score);
  const topSyn = Math.max(...cosSyn);
  const topFeel = Math.max(...cosFeel.filter((value): value is number => value !== null), 0);
  const strength = Math.max(topSyn, topFeel);
  context.topSyn = topSyn;
  const hasStructure =
    wanted.length > 0 ||
    parsed.experiences.length > 0 ||
    parsed.genres.length > 0 ||
    Boolean(parsed.pace) ||
    Boolean(parsed.length) ||
    Boolean(parsed.era);

  let confidence: SearchConfidence;
  const thresholds = SEARCH_TUNING.confidence;
  if (directMode || similarMode) confidence = "high";
  else if (strength < thresholds.floor) confidence = "none";
  else if (!hasStructure && topFeel < thresholds.feelFloor && topSyn < thresholds.synOverride) confidence = "none";
  else if (hasStructure) confidence = strength >= thresholds.structuredHigh ? "high" : "medium";
  else if (strength >= thresholds.high) confidence = "high";
  else if (strength >= thresholds.medium) confidence = "medium";
  else if (strength >= thresholds.low) confidence = "low";
  else confidence = "none";

  let message: string | null = null;
  const missingReference = Boolean(useFull && parsed.reference && !parsed.reference.inCatalog);
  if (missingReference && parsed.reference) {
    if (parsed.hasFreeText && confidence !== "none") {
      message = `${parsed.reference.label} is not in this catalog, so I cannot compare against that reference. Here is what comes closest to the rest of your request.`;
      if (confidence === "high") confidence = "medium";
    } else {
      message = `${parsed.reference.label} is not in this catalog. Without knowing that reference's books, I would rather not invent a resemblance.`;
      confidence = "none";
    }
  }

  let limit = options.limit ?? SEARCH_TUNING.maxResults;
  let picked: Scored[] = [];
  const nameWords = contentTokens(parsed.positive).length;
  const soundsLikeName = useFull && !hasStructure && !parsed.reference && nameWords >= 2 && nameWords <= 3;
  if (confidence === "none") {
    message =
      message ??
      (soundsLikeName
        ? `Nothing in this collection answers “${parsed.original}”: no title or author goes by that name, and no synopsis comes close to it. The catalog may not have this kind of book.`
        : "I found nothing in this collection that answers this request well. The catalog may not have this kind of book.");
  } else {
    if (confidence === "low") {
      limit = Math.min(limit, 3);
      message = message ?? "The collection has no clear answer for this request. These are the closest books, but the match is weak.";
    }
    const top = ranked[0]?.score ?? 0;
    picked = ranked.filter((item, position) => position < SEARCH_TUNING.minResults || item.score >= top - SEARCH_TUNING.scoreWindow).slice(0, limit);
    if (directMode) {
      const own = ranked.filter((item) => referenceIds.has(item.entry.book.id));
      const others = ranked.filter((item) => !referenceIds.has(item.entry.book.id)).slice(0, Math.max(0, Math.min(3, limit - own.length)));
      picked = [...own.slice(0, limit), ...others].slice(0, Math.max(limit, own.length));
    }
  }
  if (unassessable.length > 0) {
    const note = `I have no way to assess "${unassessable.join('", "')}" with the catalog data; I considered the rest of your request.`;
    message = message ? `${message} ${note}` : note;
  }

  const results: SearchResult[] = picked.map((item) => {
    const { reasons, quote, caveat } = useFull
      ? buildReasons(item.entry, context, queryVector)
      : { reasons: [{ kind: "similarity" as const, label: "closeness to the synopsis" }], quote: null, caveat: null };
    return {
      id: item.entry.book.id,
      slug: item.entry.book.slug,
      score: Number(item.score.toFixed(4)),
      similarity: Number(item.cosSyn.toFixed(4)),
      reasons,
      quote,
      caveat,
    };
  });

  const scores = ranked.map((item) => item.score);
  return {
    query: parsed.original,
    interpretation: toInterpretation(context, unassessable, index),
    confidence,
    message,
    results,
    engine: { ...engine, tookMs: Date.now() - started, cached },
    debug: options.debug
      ? {
          topSyn: Number(topSyn.toFixed(4)),
          topFeel: Number(topFeel.toFixed(4)),
          spread: Number(((scores[0] ?? 0) - (scores[Math.min(9, scores.length - 1)] ?? 0)).toFixed(3)),
          zTopSyn: Number(Math.max(...zSyn).toFixed(2)),
          zTopFeel: Number(Math.max(...zFeel).toFixed(2)),
        }
      : undefined,
  };
}
