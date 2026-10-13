import { normalizeText } from "@/lib/catalog/text";
import type { AtmosphereId, ExperienceId } from "@/lib/semantic/taxonomy";
import { contentTokens } from "./lexical";

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
};

const ATMOSPHERE_CUES: [RegExp, AtmosphereId][] = [
  [/\b(melancol|trist|saudos|chuv|cinzent|nublad|outon)/, "melancholic"],
  [/\b(reconfort|acolhed|aconcheg|consol|tern[oau]|afetuos|carinh|quentinh|abraco|delicad|doce|gentil|amoros|confort)/, "comforting"],
  [/\b(sombri|deprim|depress|pesad|desesper|pessimis|tragic|baixo astral|sofrid|angusti|pra baixo|para baixo)/, "dark"],
  [/\b(leve[s]?\b|alegr|esperan|otimis|alto astral|feliz|solar|lumin|recomec|pra cima|para cima)/, "luminous"],
  [/\b(estranh|perturb|inquiet|esquisit|bizarr|absurd|desconfort|sinistr)/, "unsettling"],
  [/\b(engrac|humor|rir\b|risad|ironi|satir|sarcas|comic|deboch|divertid)/, "ironic"],
  [/\b(contempla|calm[oa]|seren|silenci|tranquil|filosof|reflexiv|medita|sosseg|pensando|pensar\b|chuv|garoa|nublad|nevoeiro)/, "contemplative"],
  [/\b(intens|visceral|arrebat|paixao|apaixon|avassalad|furi[oa]|obsess)/, "intense"],
  [/\b(sonh|oniric|magic|fantastic|surreal|fabul|encantad|mitic)/, "dreamlike"],
  [/\b(nostalg|infancia|lembranc|antigament|tempo perdido|saudade)/, "nostalgic"],
  [/\b(suspense|tens[ao]\b|misteri|medo\b|assust|terror|arrepi|thriller|perigo)/, "tense"],
  [/\b(crua?\b|sec[oa]\b|brutal|realista|dur[oa]\b|sem enfeite|miseria|denuncia)/, "raw"],
];

const EXPERIENCE_CUES: [RegExp, ExperienceId][] = [
  [/\b(pensando|pensar\b|refletir|reflex|fique na cabeca|continu\w+ depois)/, "lingering"],
  [/\b(chorar|emocion|comov)/, "moving"],
  [/\b(rir\b|risad|engrac|divertid)/, "funny"],
  [/\b(perder o sono|nao consig\w* largar|nao consig\w* parar|que prenda|viciante)/, "gripping"],
  [/\b(viajar|outro mundo|outra epoca|outro lugar|longe daqui)/, "transporting"],
  [/\b(consol|confort|reconfort|dias dificeis|momento dificil|fase dificil)/, "consoling"],
  [/\b(de uma sentada|rapid\w+ de ler|numa tarde|em um dia|num dia|numa noite)/, "one_sitting"],
  [/\b(devagar|sem pressa|saborear|aos poucos)/, "slow_read"],
  [/\b(me reconhec|me identific|me ver n)/, "relatable"],
  [/\b(provoc|desafi|incomod|mud\w+ minha|mud\w+ meu|tire do lugar)/, "challenging"],
];

const GENRE_CUES: [RegExp, string[]][] = [
  [/\b(poesia|poema|poemas|poetic[oa]s?|versos)\b/, ["Poesia"]],
  [/\b(conto|contos)\b/, ["Contos"]],
  [/\b(historia[s]? curta[s]?|narrativa[s]? curta[s]?)\b/, ["Contos", "Novela"]],
  [/\b(ensaio|ensaios)\b/, ["Ensaio"]],
  [/\b(ficcao cientifica|sci fi|scifi|distopia|distopic[oa]s?)\b/, ["Ficção científica"]],
  [/\b(policial|policiais|detetive|noir)\b/, ["Policial"]],
  [/\b(quadrinho|quadrinhos|hq|hqs|graphic novel)\b/, ["Quadrinhos"]],
  [/\b(teatro|peca de teatro|dramaturgia)\b/, ["Teatro"]],
  [/\b(infantil|infantis|criancas?|infantojuvenil|juvenil)\b/, ["Infantojuvenil"]],
  [/\b(fantasia)\b/, ["Fantasia"]],
  [/\b(memorias|autobiografi\w+|diario)\b/, ["Memórias"]],
  [/\b(reportagem|jornalis\w+|livro reportagem)\b/, ["Reportagem"]],
  [/\b(nao ficcao)\b/, ["Ensaio", "Reportagem", "Memórias"]],
  [/\b(novela)\b/, ["Novela"]],
  [/\b(romance|romances)\b/, ["Romance"]],
];

const SHORT_CUE = /\b(curt[oa]s?|breve[s]?|pequen[oa]s?|fininh[oa]s?|poucas paginas|de uma sentada|rapid[oa]s? de ler|numa tarde)\b/;
const LONG_CUE = /\b(long[oa]s?|calhamaco|extens[oa]s?|tijol\w+|muitas paginas|catatau)\b/;
const SLOW_CUE = /\b(lent[oa]s?|devagar|sem pressa|arrastad[oa]s?|parad[oa]s?|chuvos[oa]s?|preguicos[oa]s?)\b/;
const FAST_CUE = /\b(agil|ageis|frenetic[oa]s?|eletrizante|que prenda|nao consig\w* largar|page turner|dinamic[oa]s?|vertiginos[oa]s?|rapid[oa]s?)\b/;

const CLASSIC_CUE = /\b(classic[oa]s?|seculo xix|seculo 19|de antigamente)\b/;
const CONTEMPORARY_CUE = /\b(contemporane[oa]s?|recentes?|atual|atuais|lancamentos?|deste seculo|dos ultimos anos)\b/;

const REFERENCE_CUE =
  /\b(quem gost\w+|quem curt\w+|quem am\w+|quem leu|fas? d[eoa]s?|parecid[oa]s? com|parec\w+ com|no estilo|estilo d[eoa]s?|na linha|como [oa]s? d[eoa]s?|lembr\w+|igual a|similar\w* a|semelhante\w* a|depois de ler|terminei|acabei de ler|adorei|amei|gostei)\b/;
const AUTHOR_MENTION = /(?:livros?|obras?|romances?|contos|poemas|algo|tudo|autor[a]?|escritor[a]?)\s+(?:d[eoa]s?\s+)?((?:[A-ZÀ-Ý][\p{L}.'-]+)(?:\s+(?:(?:de|da|do|dos|das|von|van)\s+)?[A-ZÀ-Ý][\p{L}.'-]+)*)/u;

const NEGATION_PATTERNS: RegExp[] = [
  /(?:^|[\s,;])(?:mas|porém|porem|só que|so que)\s+(?:que\s+)?(?:não|nao)\s+(?:(?:seja[m]?|fique[m]?|é|são|tenha[m]?|pareça[m]?|muito|tão|tao)\s+)*([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:(?:mas|porém|porem)\s+)?sem\s+(?:(?:ser(?:em)?|que\s+seja[m]?|ficar|parecer|cair\s+n[oa]s?|ter|muit[oa]s?|tant[oa]s?|nenhum[a]?)\s+)*([^,.;!?]+)/gi,
  /(?:^|[\s,;])que\s+(?:não|nao)\s+(?:seja[m]?|fique[m]?|é|são|tenha[m]?|pareça[m]?)\s+(?:(?:muito|tão|tao)\s+)?([^,.;!?]+)/gi,
  /(?:^|[\s,;])nada\s+(?:de\s+)?([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:não|nao)\s+(?:quero|queria|gosto\s+de|curto|suporto|aguento)\s+([^,.;!?]+)/gi,
  /(?:^|[\s,;])(?:não|nao)\s+(?:(?:seja[m]?|muito|tão|tao)\s+)+([^,.;!?]+)/gi,
];

function cleanAvoidPhrase(value: string): string {
  let phrase = value.trim().toLowerCase();
  phrase = phrase.split(/\s+(?:e\s+que|mas|porém|porem|para|pra|e\s+nem|nem)\s+/)[0];
  phrase = phrase.replace(/^(?:ser|muito|tão|tao|um|uma|uns|umas|de|ter)\s+/g, "").trim();
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

  const mention = AUTHOR_MENTION.exec(query);
  if (!cueMatch && mention && mention[1].length >= 4) {
    return { kind: "author", label: mention[1].trim(), bookIds: [], inCatalog: false, similar: false };
  }

  if (cueMatch) {
    const after = query.slice(Math.max(0, query.toLowerCase().search(/gost|curt|am[oae]|leu|fã|fa[ns]|parec|estilo|linha|como|lembr|igual|similar|semelhante|ler|terminei|adorei|gostei/i)));
    const proper = after.match(/(?:[A-ZÀ-Ý][\p{L}.'-]+(?:\s+(?:de|da|do|dos|das|e|von|van)\s+)?\s*){1,5}/u);
    const candidates = after.match(/\b[A-ZÀ-Ý][\p{L}.'-]+(?:\s+(?:(?:de|da|do|dos|das|von|van)\s+)?[A-ZÀ-Ý][\p{L}.'-]+)*/gu) ?? [];
    const named = candidates.find((candidate) => candidate.length >= 4 && !/^(Quero|Queria|Procuro|Livro|Livros|Algo|Um|Uma|Para)$/i.test(candidate));
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

  const positiveFolded = normalizeText(positive);
  const avoidFolded = normalizeText(avoid.join(" , "));

  const avoidAtmospheres = cuesIn(avoidFolded, ATMOSPHERE_CUES);
  const atmospheres = cuesIn(positiveFolded, ATMOSPHERE_CUES).filter((id) => !avoidAtmospheres.includes(id));
  const contrast = positiveFolded.split(/ (?:mas|porem|so que|e ao mesmo tempo) /);
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

  return {
    original,
    positive,
    avoid,
    atmospheres,
    emphasis,
    avoidAtmospheres,
    experiences: cuesIn(positiveFolded, EXPERIENCE_CUES),
    pace,
    length,
    era,
    genres,
    reference,
    hasFreeText,
  };
}
