import { normalizeText } from "@/lib/catalog/text";
import type { AtmosphereId, ExperienceId } from "@/lib/semantic/taxonomy";
import { STOPWORDS, contentTokens } from "./lexical";

const TOPICAL_STOPWORDS = new Set(["love", "loved", "days"]);

export type CatalogNames = {
  authors: { name: string; folded: string; aliases: string[]; bookIds: number[] }[];
  titles: { folded: string; id: number }[];
};

export type ParsedReference = {
  kind: "author" | "title";
  label: string;
  bookIds: number[];
  inCatalog: boolean;
  similar: boolean;
};

export type ParsedQuery = {
  original: string;
  positive: string;
  avoid: string[];
  atmospheres: AtmosphereId[];
  emphasis: AtmosphereId[];
  avoidAtmospheres: AtmosphereId[];
  experiences: ExperienceId[];
  pace: "slow" | "fast" | null;
  length: "short" | "long" | null;
  era: "classic" | "contemporary" | null;
  genres: string[];
  reference: ParsedReference | null;
  hasFreeText: boolean;
  unknowable: string[];
  asksPrice: boolean;
  hasSubstance: boolean;
};

const ATMOSPHERE_CUES: [RegExp, AtmosphereId][] = [
  [/\b(melanchol|sad\b|sadness|wistful|bittersweet|rain|gray\b|grey\b|overcast|autumn)/, "melancholic"],
  [/\b(comfort|cozy|cosy|warm|sooth|consol|tender|affection|heartwarming|hug\b|delicate|sweet|gentle|loving)/, "comforting"],
  [/\b(dark|bleak|gloom|depress|heavy|despair|pessimis|tragic|grim\b|harrowing|anguish|downbeat|downer|somber|sombre)/, "dark"],
  [/\b(light\b|lighthearted|light hearted|cheerful|joy|hope|optimis|upbeat|happy|sunny|lumin|bright|fresh start|feel good|uplift)/, "luminous"],
  [/\b(strange|weird|disturb|unsettl|eerie|bizarre|absurd|uncomfortable|creepy|sinister|uncanny)/, "unsettling"],
  [/\b(funny|humor|humour|laugh|ironic|irony|satir|sarcas|comical|comedy|comedic|witty|hilarious|amusing)/, "ironic"],
  [/\b(contemplat|calm|serene|quiet|silen|tranquil|peaceful|philosoph|reflective|meditat|thinking|think\b|ponder|rain|drizzle|overcast|fog|mist)/, "contemplative"],
  [/\b(intense|intensity|visceral|passion|overwhelming|fierce|fury|furious|obsess|all consuming)/, "intense"],
  [/\b(dream|oneiric|magic|fantastical|surreal|fable|enchant|mythic|fairy tale|fairytale)/, "dreamlike"],
  [/\b(nostalg|childhood|memories|old days|bygone|lost time|longing for)/, "nostalgic"],
  [/\b(suspense|tense\b|tension|myster|fear\b|scary|scare|frighten|terror|horror|chilling|thriller|danger)/, "tense"],
  [/\b(raw\b|dry\b|stark|brutal|realist|harsh|gritty|unadorned|unflinching|poverty|misery|expose)/, "raw"],
];

const EXPERIENCE_CUES: [RegExp, ExperienceId][] = [
  [/\b(thinking|think\b|reflect|stays? with me|sticks? with me|on my mind|in my head|long after)/, "lingering"],
  [/\b(cry|cries|tears?|weep|touching|emotional|tearjerker|tear jerker|moves? me|moved)\b|(?<!(?:fast|slow) )\bmoving\b/, "moving"],
  [/\b(laugh|funny|hilarious|amusing)/, "funny"],
  [/\b(lose sleep|losing sleep|keeps? me up|up all night|can t put (?:it )?down|couldn t put (?:it )?down|cannot put (?:it )?down|can t stop|won t let me sleep|keeps? me awake|gripping|addictive|unputdownable|hooked)/, "gripping"],
  [/\b(travel far|travel in time|take me (?:away|far|somewhere)|another world|another time|another era|another place|far away|faraway|far from here)/, "transporting"],
  [/\b(consol|comfort|solace|hard times|difficult times|tough times|hard days|difficult days|rough patch)/, "consoling"],
  [/\b(one sitting|single sitting|quick read|quick to read|in an afternoon|in one afternoon|in a day|in one day|in one night|in an evening)/, "one_sitting"],
  [/\b(slowly|unhurried|no rush|without rushing|savor|savour|little by little)/, "slow_read"],
  [/\b(relate to|relatable|recogni[sz]e myself|see myself|identify with)/, "relatable"],
  [/\b(provok|provocative|challeng|unsettles? me|chang\w* my|shake me)/, "challenging"],
];

const GENRE_CUES: [RegExp, string[]][] = [
  [/\b(poetry|poems?|poetic|verses?)\b/, ["Poetry"]],
  [/\b(short stories|story collections?|tales)\b/, ["Short stories"]],
  [/\b(short story|short tale|short narrative)\b/, ["Short stories", "Novella"]],
  [/\b(essays?)\b/, ["Essay"]],
  [/\b(science fiction|sci fi|scifi|dystopia\w*|dystopic)\b/, ["Science fiction"]],
  [/\b(crime|detective|noir|whodunit|murder mystery)\b/, ["Crime"]],
  [/\b(comics|comic books?|graphic novels?)\b/, ["Comics"]],
  [/\b(theater|theatre|stage plays?|a play|playwright\w*)\b/, ["Theater"]],
  [/\b(children s|children|kids?|young readers?|young adult|ya|middle grade)\b/, ["Young readers"]],
  [/\b(fantasy)\b/, ["Fantasy"]],
  [/\b(memoirs?|autobiograph\w+|diary|diaries)\b/, ["Memoir"]],
  [/\b(reportage|journalis\w+|long form reporting)\b/, ["Reportage"]],
  [/\b(non fiction|nonfiction)\b/, ["Essay", "Reportage", "Memoir"]],
  [/\b(novellas?)\b/, ["Novella"]],
  [/(?<!graphic )\b(novels?)\b/, ["Novel"]],
];

const SHORT_CUE = /\b(short(?! stories)|brief|small|slim|thin|few pages|one sitting|quick read|quick to read|in an afternoon)\b/;
const LONG_CUE = /\b(long(?! after)|lengthy|doorstop\w*|tome|thick|hefty|many pages)\b/;
const SLOW_CUE = /\b(slow|slowly|unhurried|no rush|without rushing|leisurely|lazy|rainy|sluggish|dragging)\b/;
const FAST_CUE = /\b(fast|brisk|frantic|electrifying|gripping|can t put (?:it )?down|page turner|dynamic|breakneck|quick|action packed|propulsive)\b/;

const CLASSIC_CUE = /\b(classics?|classical|19th century|nineteenth century|from the old days)\b/;
const CONTEMPORARY_CUE = /\b(contemporary|recent|current|new releases?|just released|this century|(?:of|from) the last few years)\b/;

const NAME = String.raw`(?:[A-ZÀ-Ý][\p{L}.'-]+)(?:\s+(?:(?:de|da|do|dos|das|von|van)\s+)?[A-ZÀ-Ý][\p{L}.'-]+)*`;
const REFERENCE_CUE =
  /\b(who (?:liked?|loved?|enjoy(?:ed|s)?|likes|loves|read)|fans? of|similar to|in the style of|style of|in the vein of|along the lines of|reminiscent of|reminds? me of|just like|(?:books?|novels?|authors?|writers?|something|anything) like|after reading|just finished|i finished|just read|i (?:really )?(?:loved|liked|adored|enjoyed)|if (?:i|you) (?:liked|loved|enjoyed))\b/;
const REFERENCE_START = /liked?|loved?|enjoy|read|fans?|similar|style|vein|lines|reminiscent|remind|finished|adored/i;
const AUTHOR_MENTION = new RegExp(
  String.raw`(?:(?:books?|works?|novels?|stories|poems|something|anything|everything)\s+(?:by|of|from)|author|writer)\s+(${NAME})|(${NAME})['’]s\s+(?:books?|novels?|works?|stories|poems|writing)`,
  "u",
);
const NOT_A_NAME = /^(Want|Looking|Book|Books|Something|Anything|Give|Find|Show|Please|Recommend|What|Which|Novel|Novels)$/i;

const RECEPTION_CUE =
  /\b(under[\s-]?rated|over[\s-]?rated|underappreciated|overlooked|overhyped|hidden gems?|best[\s-]?sell(?:ers?|ing)|popular|famous|well[\s-]known|renowned|(?:critically )?acclaimed|award[\s-]winning|prize[\s-]winning|trending|viral|booktok|everyone is (?:talking about|reading)|cult (?:classics?|favou?rites?)|top[\s-]rated|highly rated|five[\s-]star)\b/gi;
const PRICE_CUE = /\b(cheap|cheapest|cheaper|affordable|inexpensive|expensive|bargains?|on sale|low[\s-]priced?)\b/gi;
const PRAISE_CUE = /\b(good|great|greatest|best|nice|amazing|awesome|excellent|wonderful|brilliant|masterpieces?|must[\s-]reads?|worth reading)\b/gi;

const NEGATION_PATTERNS: RegExp[] = [
  /(?:^|[\s,;])(?:but|yet|though)\s+(?:(?:that|which|it|it[’']?s)\s+)?(?:(?:(?:is|are)\s+)?not|isn[’']?t|aren[’']?t|(?:doesn[’']?t|does\s+not|don[’']?t|do\s+not)\s+(?:get|feel|seem|become|have|turn))\s+(?:(?:be|being|too|so|very|overly|a|an)\s+)*([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:(?:but|yet)\s+)?without\s+(?:(?:being|getting|becoming|feeling|seeming|falling\s+into|having|too\s+much|so\s+much|too\s+many|so\s+many|too|any|a|an)\s+)*([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:that|which)\s+(?:(?:is|are)\s+not|isn[’']?t|aren[’']?t|(?:doesn[’']?t|does\s+not|don[’']?t|do\s+not)\s+(?:get|feel|seem|become|have|turn))\s+(?:(?:too|so|very|overly|a|an)\s+)*([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:(?:but|and)\s+)?nothing\s+(?:(?:too|so|very|overly)\s+)*([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:(?:but|and)\s+)?no\s+(?!rush\b|hurry\b|matter\b|longer\b|more\b)([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:(?:i\s+)?(?:don[’']?t|do\s+not)\s+(?:want|like|enjoy|need)|(?:i\s+)?(?:can[’']?t|cannot)\s+stand|i\s+hate)\s+(?:(?:anything|something|books?|a|an|too|so|very)\s+)*([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:(?:but|and)\s+)?not\s+(?:(?:be|being|too|so|very|overly)\s+)+([^,.;!?]+)/gi,
];

function cleanAvoidPhrase(value: string): string {
  let phrase = value.trim().toLowerCase();
  phrase = phrase.split(/\s+(?:and\s+that|but|yet|for|to|and\s+not|nor|or)\s+/)[0];
  phrase = phrase.replace(/^(?:being|be|too|so|very|a|an|any|of|having)\s+/g, "").trim();
  return phrase.split(/\s+/).slice(0, 5).join(" ");
}

function cuesIn<T>(folded: string, cues: [RegExp, T][]): T[] {
  const found: T[] = [];
  for (const [pattern, value] of cues) {
    if (pattern.test(folded) && !found.includes(value)) found.push(value);
  }
  return found;
}

function containsPhrase(folded: string, phrase: string): boolean {
  if (!phrase) return false;
  return new RegExp(`(?:^| )${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: |$)`).test(folded);
}

const NAME_ONLY =
  /^[A-ZÀ-Ý][\p{L}.'’-]*(?:\s+(?:(?:de|da|do|dos|das|of|the|and|in|von|van|e|y)\s+)*[A-ZÀ-Ý][\p{L}.'’-]*){1,4}$/u;

function hasReadingCue(folded: string): boolean {
  const patterns = [
    ...ATMOSPHERE_CUES.map(([pattern]) => pattern),
    ...EXPERIENCE_CUES.map(([pattern]) => pattern),
    ...GENRE_CUES.map(([pattern]) => pattern),
    SHORT_CUE,
    LONG_CUE,
    SLOW_CUE,
    FAST_CUE,
    CLASSIC_CUE,
    CONTEMPORARY_CUE,
  ];
  return patterns.some((pattern) => pattern.test(folded));
}

function lookupByName(folded: string, catalog: CatalogNames): ParsedReference | null {
  const tokens = contentTokens(folded);
  if (tokens.length === 0 || tokens.length > 4) return null;
  if (tokens.length === 1 && (tokens[0].length < 5 || hasReadingCue(folded))) return null;
  const covers = (name: string) => {
    const words = name.split(" ");
    return tokens.every((token) => words.includes(token));
  };
  const authors = catalog.authors.filter((author) => covers(author.folded));
  const titles = tokens.length >= 2 ? catalog.titles.filter((entry) => covers(entry.folded)) : [];
  if (authors.length === 1 && titles.length === 0) {
    return { kind: "author", label: authors[0].name, bookIds: authors[0].bookIds, inCatalog: true, similar: false };
  }
  if (titles.length === 1 && authors.length === 0) {
    return { kind: "title", label: titles[0].folded, bookIds: [titles[0].id], inCatalog: true, similar: false };
  }
  return null;
}

function findReference(query: string, folded: string, catalog: CatalogNames): ParsedReference | null {
  const cueMatch = REFERENCE_CUE.exec(folded);
  const similar = Boolean(cueMatch);

  const titleHit = [...catalog.titles]
    .sort((a, b) => b.folded.length - a.folded.length)
    .find((entry) => containsPhrase(folded, entry.folded));
  if (titleHit && (similar || folded.length <= titleHit.folded.length + 14)) {
    return { kind: "title", label: titleHit.folded, bookIds: [titleHit.id], inCatalog: true, similar };
  }

  let authorHit: CatalogNames["authors"][number] | null = null;
  for (const author of catalog.authors) {
    if (containsPhrase(folded, author.folded) || author.aliases.some((alias) => containsPhrase(folded, alias))) {
      if (!authorHit || author.folded.length > authorHit.folded.length) authorHit = author;
    }
  }
  if (authorHit) {
    return { kind: "author", label: authorHit.name, bookIds: authorHit.bookIds, inCatalog: true, similar };
  }

  if (!similar) {
    const looked = lookupByName(folded, catalog);
    if (looked) return looked;
  }

  const mention = AUTHOR_MENTION.exec(query);
  const mentioned = mention?.[1] ?? mention?.[2];
  if (!cueMatch && mentioned && mentioned.length >= 4) {
    return { kind: "author", label: mentioned.trim(), bookIds: [], inCatalog: false, similar: false };
  }

  const firstWord = query.split(" ")[0] ?? "";
  if (!cueMatch && NAME_ONLY.test(query) && !NOT_A_NAME.test(firstWord) && !hasReadingCue(folded)) {
    return { kind: "author", label: query, bookIds: [], inCatalog: false, similar: false };
  }

  if (cueMatch) {
    const after = query.slice(Math.max(0, query.search(REFERENCE_START)));
    const proper = after.match(/(?:[A-ZÀ-Ý][\p{L}.'-]+(?:\s+(?:de|da|do|dos|das|e|von|van)\s+)?\s*){1,5}/u);
    const candidates = after.match(/\b[A-ZÀ-Ý][\p{L}.'-]+(?:\s+(?:(?:de|da|do|dos|das|von|van)\s+)?[A-ZÀ-Ý][\p{L}.'-]+)*/gu) ?? [];
    const named = candidates.find((candidate) => candidate.length >= 4 && !NOT_A_NAME.test(candidate));
    if (named ?? proper?.[0]) {
      return { kind: "author", label: (named ?? proper?.[0] ?? "").trim(), bookIds: [], inCatalog: false, similar: true };
    }
  }
  return null;
}

export function parseQuery(query: string, catalog: CatalogNames): ParsedQuery {
  const original = query.replace(/\s+/g, " ").trim();
  const folded = normalizeText(original);
  const reference = findReference(original, folded, catalog);

  let working = ` ${original}`;
  const avoid: string[] = [];
  const skipNegation = reference?.kind === "title";
  if (!skipNegation) {
    for (const pattern of NEGATION_PATTERNS) {
      working = working.replace(pattern, (match, phrase: string) => {
        const cleaned = cleanAvoidPhrase(phrase);
        if (cleaned.length < 3) return match;
        if (!avoid.includes(cleaned)) avoid.push(cleaned);
        return " ";
      });
    }
  }
  let positive = working.replace(/\s+/g, " ").replace(/[,;]\s*$/, "").trim();
  if (positive.length < 3) positive = original;

  const judged = reference?.kind === "title" ? [] : (positive.match(RECEPTION_CUE) ?? []);
  const praised = reference?.kind === "title" ? [] : (positive.match(PRAISE_CUE) ?? []);
  const unjudged =
    judged.length > 0
      ? positive
          .replace(RECEPTION_CUE, " ")
          .replace(/\s+/g, " ")
          .replace(/\ban (?=[b-df-hj-np-tv-z])/gi, "a ")
          .trim()
      : positive;

  const positiveFolded = normalizeText(positive);
  const avoidFolded = normalizeText(avoid.join(" , "));

  const avoidAtmospheres = cuesIn(avoidFolded, ATMOSPHERE_CUES);
  const atmospheres = cuesIn(positiveFolded, ATMOSPHERE_CUES).filter((id) => !avoidAtmospheres.includes(id));
  const contrast = positiveFolded.split(/ (?:but|yet|though|and at the same time) /);
  const emphasis =
    contrast.length > 1 ? cuesIn(contrast[contrast.length - 1], ATMOSPHERE_CUES).filter((id) => atmospheres.includes(id)) : [];

  let length: ParsedQuery["length"] = SHORT_CUE.test(positiveFolded) ? "short" : LONG_CUE.test(positiveFolded) ? "long" : null;
  if (LONG_CUE.test(avoidFolded)) length = "short";
  else if (SHORT_CUE.test(avoidFolded)) length = "long";

  let pace: ParsedQuery["pace"] = FAST_CUE.test(positiveFolded) ? "fast" : SLOW_CUE.test(positiveFolded) ? "slow" : null;
  if (SLOW_CUE.test(avoidFolded)) pace = "fast";
  else if (FAST_CUE.test(avoidFolded)) pace = "slow";

  const era: ParsedQuery["era"] = CLASSIC_CUE.test(positiveFolded) ? "classic" : CONTEMPORARY_CUE.test(positiveFolded) ? "contemporary" : null;

  const genres: string[] = [];
  for (const [pattern, values] of GENRE_CUES) {
    if (!pattern.test(positiveFolded)) continue;
    for (const value of values) if (!genres.includes(value)) genres.push(value);
  }

  let freeText = positiveFolded;
  if (reference) {
    freeText = freeText.replace(REFERENCE_CUE, " ");
    if (reference.inCatalog) {
      const names =
        reference.kind === "title"
          ? [reference.label]
          : catalog.authors.filter((author) => author.name === reference.label).flatMap((author) => [author.folded, ...author.aliases]);
      for (const name of names.sort((a, b) => b.length - a.length)) freeText = freeText.replace(name, " ");
    } else {
      freeText = freeText.replace(normalizeText(reference.label), " ");
    }
  }
  const hasFreeText = contentTokens(freeText).length >= 1;

  const experiences = cuesIn(positiveFolded, EXPERIENCE_CUES);
  const structured = atmospheres.length + experiences.length + genres.length > 0 || Boolean(pace ?? length ?? era);
  const asksPrice = reference?.kind !== "title" && positive.search(PRICE_CUE) >= 0;
  const plainWords = normalizeText(unjudged.replace(PRAISE_CUE, " ").replace(PRICE_CUE, " "))
    .split(" ")
    .filter((token) => token.length > 1 && (!STOPWORDS.has(token) || TOPICAL_STOPWORDS.has(token)));
  const hasSubstance = structured || reference !== null || plainWords.length > 0;
  const unknowable = [...new Set((hasSubstance ? judged : [...judged, ...praised]).map((word) => word.toLowerCase()))];
  if (hasSubstance && judged.length > 0 && unjudged.length >= 3) positive = unjudged;

  return {
    original,
    positive,
    avoid,
    atmospheres,
    emphasis,
    avoidAtmospheres,
    experiences,
    pace,
    length,
    era,
    genres,
    reference,
    hasFreeText,
    unknowable,
    asksPrice,
    hasSubstance,
  };
}
