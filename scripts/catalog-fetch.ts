import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { seedTitles, type SeedTitle } from "../data/seed/titles";
import { normalizeText, slugify } from "../src/lib/catalog/text";
import { pickIsbn } from "../src/lib/catalog/isbn";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, "data", "seed", ".cache");
const OFFLINE = process.argv.includes("--offline");
const OUT_FILE = join(ROOT, "data", "seed", OFFLINE ? "catalog.offline.json" : "catalog.json");
const REPORT_FILE = join(ROOT, "data", "seed", OFFLINE ? "fetch-report.offline.json" : "fetch-report.json");
const USER_AGENT = "Subtext/0.1 (demo catalog for an independent bookshop)";

type OpenLibraryEdition = {
  key?: string;
  title?: string;
  language?: string[];
  isbn?: string[];
  publisher?: string[];
  publish_date?: string[];
  cover_i?: number;
  number_of_pages?: number;
};

type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  edition_count?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  subject?: string[];
  editions?: { docs?: OpenLibraryEdition[] };
};

type OpenLibraryMatch = {
  workKey: string;
  year: number | null;
  pages: number | null;
  coverId: number | null;
  subjects: string[];
  isbn: string | null;
  publisher: string | null;
  editionDate: string | null;
  editionIsPortuguese: boolean;
};

type WikipediaMatch = {
  title: string;
  url: string;
  synopsis: string;
};

type CachedEntry = {
  ol: OpenLibraryMatch | null;
  wiki: WikipediaMatch | null;
};

export type SeedCatalogEntry = {
  slug: string;
  title: string;
  editionTitle: string | null;
  author: string;
  genre: string;
  isbn: string | null;
  publisher: string | null;
  year: number | null;
  pages: number | null;
  language: string;
  coverUrl: string | null;
  coverSource: string | null;
  sourceUrl: string | null;
  subjects: string[];
  synopsis: string | null;
  synopsisSource: string | null;
  synopsisUrl: string | null;
};

function createLimiter(intervalMs: number) {
  let next = 0;
  return async () => {
    const now = Date.now();
    const wait = Math.max(0, next - now);
    next = Math.max(now, next) + intervalMs;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  };
}

const openLibraryLimiter = createLimiter(1100);
const wikipediaLimiter = createLimiter(750);

class SourceUnavailableError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson<T>(url: string, limiter: () => Promise<void>): Promise<T | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await limiter();
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? (retryAfter + 2) * 1000 : 5000 * (attempt + 1));
        continue;
      }
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new SourceUnavailableError(url);
}

function surnameKey(author: string): string {
  const tokens = normalizeText(author).split(" ").filter(Boolean);
  const last = tokens[tokens.length - 1] ?? "";
  return last.slice(0, 5);
}

function authorMatches(seed: SeedTitle, names: string[] | undefined): boolean {
  if (!names || names.length === 0) return false;
  const key = surnameKey(seed.author);
  const joined = normalizeText(names.join(" "));
  return joined.includes(key);
}

function titleMatches(seed: SeedTitle, doc: OpenLibraryDoc): boolean {
  const wanted = [seed.title, seed.originalTitle].filter(Boolean).map((value) => normalizeText(value as string));
  const main = wanted.map((value) => value.split(":")[0].trim());
  const candidates = [doc.title, ...(doc.editions?.docs ?? []).map((edition) => edition.title ?? "")]
    .filter(Boolean)
    .map((value) => normalizeText(value));
  return candidates.some((candidate) =>
    [...wanted, ...main].some((value) => value.length > 0 && (candidate.includes(value) || value.includes(candidate))),
  );
}

const OL_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "edition_count",
  "cover_i",
  "number_of_pages_median",
  "subject",
  "editions",
  "editions.key",
  "editions.title",
  "editions.language",
  "editions.isbn",
  "editions.publisher",
  "editions.publish_date",
  "editions.cover_i",
  "editions.number_of_pages",
].join(",");

async function searchOpenLibrary(params: Record<string, string>): Promise<OpenLibraryDoc[]> {
  const query = new URLSearchParams({ ...params, lang: "pt", limit: "6", fields: OL_FIELDS });
  const data = await fetchJson<{ docs?: OpenLibraryDoc[] }>(
    `https://openlibrary.org/search.json?${query.toString()}`,
    openLibraryLimiter,
  );
  return data?.docs ?? [];
}

const PRINT_ON_DEMAND =
  /(independently published|createspace|amazon|kindle|lulu|clube de autores|bibliolife|forgotten books|hansebooks|wentworth|legare|nabu press|kessinger|books? on demand|tredition|outlook verlag|sagwan|blurb|scribd|wildside|digireads|e-artnow|good press|bod )/i;

function trustedPortugueseEdition(doc: OpenLibraryDoc): OpenLibraryEdition | null {
  const edition = doc.editions?.docs?.[0];
  if (!edition?.language?.includes("por")) return null;
  const publisher = edition.publisher?.[0] ?? "";
  if (!publisher || PRINT_ON_DEMAND.test(publisher)) return null;
  return edition;
}

function cleanSubjects(subjects: string[] | undefined): string[] {
  return (subjects ?? [])
    .filter((subject) => subject.length < 48 && !/^(nyt:|accessible|protected|in library|large type)/i.test(subject))
    .slice(0, 10);
}

function buildOpenLibraryMatch(valid: OpenLibraryDoc[]): OpenLibraryMatch {
  const ranked = [...valid].sort((a, b) => (b.edition_count ?? 0) - (a.edition_count ?? 0));
  const canonical = ranked[0];
  const withIsbn = ranked.find((doc) => {
    const edition = trustedPortugueseEdition(doc);
    return edition && pickIsbn(edition.isbn ?? []);
  });
  const withEdition = withIsbn ?? ranked.find((doc) => trustedPortugueseEdition(doc));
  const edition = withEdition ? trustedPortugueseEdition(withEdition) : null;
  const years = ranked.map((doc) => doc.first_publish_year).filter((year): year is number => typeof year === "number" && year > 0);
  return {
    workKey: canonical.key,
    year: years.length > 0 ? Math.min(...years) : null,
    pages: edition?.number_of_pages ?? canonical.number_of_pages_median ?? null,
    coverId: edition?.cover_i ?? canonical.cover_i ?? null,
    subjects: cleanSubjects(canonical.subject),
    isbn: edition ? pickIsbn(edition.isbn ?? []) : null,
    publisher: edition?.publisher?.[0] ?? null,
    editionDate: edition?.publish_date?.[0] ?? null,
    editionIsPortuguese: Boolean(edition),
  };
}

async function findInOpenLibrary(seed: SeedTitle): Promise<OpenLibraryMatch | null> {
  const authorTokens = seed.author.split(" ");
  const surname = authorTokens[authorTokens.length - 1];
  const attempts: Record<string, string>[] = [{ title: seed.title, author: surname }];
  if (seed.originalTitle) attempts.push({ title: seed.originalTitle });
  attempts.push({ q: `${seed.title} ${surname}` });

  const collected = new Map<string, OpenLibraryDoc>();
  for (const params of attempts) {
    const docs = await searchOpenLibrary(params);
    for (const doc of docs) {
      if (authorMatches(seed, doc.author_name) && titleMatches(seed, doc)) collected.set(doc.key, doc);
    }
    if (collected.size === 0) continue;
    const match = buildOpenLibraryMatch([...collected.values()]);
    if (match.isbn) return match;
  }
  return collected.size > 0 ? buildOpenLibraryMatch([...collected.values()]) : null;
}

type WikipediaPage = {
  title: string;
  missing?: string;
  fullurl?: string;
  extract?: string;
  pageprops?: { disambiguation?: string };
};

async function fetchWikipediaPage(title: string): Promise<WikipediaPage | null> {
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "extracts|pageprops|info",
    inprop: "url",
    explaintext: "1",
    redirects: "1",
    titles: title,
  });
  const data = await fetchJson<{ query?: { pages?: Record<string, WikipediaPage> } }>(
    `https://pt.wikipedia.org/w/api.php?${query.toString()}`,
    wikipediaLimiter,
  );
  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined || !page.extract) return null;
  return page;
}

async function searchWikipedia(seed: SeedTitle): Promise<string[]> {
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    list: "search",
    srlimit: "4",
    srsearch: `${seed.title} ${seed.author}`,
  });
  const data = await fetchJson<{ query?: { search?: { title: string }[] } }>(
    `https://pt.wikipedia.org/w/api.php?${query.toString()}`,
    wikipediaLimiter,
  );
  return (data?.query?.search ?? []).map((item) => item.title);
}

const WORK_WORDS =
  /(romance|livro|novela|conto|poema|poesia|poético|obra|peça|ensaio|coletânea|antologia|autobiogr|diário|banda desenhada|quadrinhos|graphic novel|epopeia|tragédia|trilogia|saga|narrativa|distopia|ficção|crônica|reportagem|memórias|tratado|fábula)/i;
const ADAPTATION_LEAD =
  /(é um filme|é uma telenovela|é uma minissérie|é uma série de televisão|é um longa-metragem|é uma canção|é um álbum|é uma telessérie|é um município|é uma cidade|é uma banda)/i;
const PLOT_SECTION =
  /^(enredo|sinopse|resumo|trama|argumento|história|historia|narrativa|conteúdo|temas|temática|tema|estrutura|a obra|sobre a obra|o livro|descrição|personagens e enredo|estrutura e enredo|enredo e estrutura|resumo do enredo|análise)/i;

function cutAtSentence(text: string, limit: number): string {
  if (text.length <= limit) return text.trim();
  const slice = text.slice(0, limit);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(".\n"), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  if (lastStop < limit * 0.45) return slice.trim();
  return slice.slice(0, lastStop + 1).trim();
}

function cleanParagraphs(text: string): string {
  return text
    .replace(/\[[^\]]{0,24}\]/g, "")
    .replace(/={2,}[^=\n]+={2,}/g, "\n")
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0)
    .join("\n\n");
}

function composeSynopsis(extract: string): string {
  const parts = extract.split(/\n(?===\s[^=])/);
  const intro = cleanParagraphs(parts[0] ?? "");
  const introParagraphs = intro.split("\n\n").slice(0, 2).join("\n\n");
  let synopsis = cutAtSentence(introParagraphs, 900);

  for (const part of parts.slice(1)) {
    const header = part.match(/^==\s*([^=]+?)\s*==/);
    if (!header) continue;
    if (!PLOT_SECTION.test(header[1].trim())) continue;
    const body = cleanParagraphs(part.replace(/^==\s*[^=]+?\s*==/, ""));
    if (body.length < 140) continue;
    synopsis = `${synopsis}\n\n${cutAtSentence(body, 1100)}`;
    break;
  }
  return synopsis.trim();
}

function titleKeys(seed: SeedTitle): string[] {
  return [seed.title, seed.title.split(":")[0], seed.originalTitle]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeText(value))
    .filter((value) => value.length >= 3);
}

export function isAboutTheWork(seed: SeedTitle, pageTitle: string, extract: string): boolean {
  const keys = titleKeys(seed);
  const title = normalizeText(pageTitle.replace(/\([^)]*\)/g, ""));
  const author = normalizeText(seed.author);
  if (title.length >= 4 && (author.includes(title) || title.includes(author))) return false;
  const lead = normalizeText(extract.slice(0, 170));
  const titleMatches = keys.some((key) => title === key || (key.length >= 6 && (title.includes(key) || key.includes(title))));
  const leadMatches = keys.some((key) => lead.includes(key));
  return titleMatches || leadMatches;
}

function validateWikipediaPage(seed: SeedTitle, page: WikipediaPage): boolean {
  if (page.pageprops?.disambiguation !== undefined) return false;
  const extract = page.extract ?? "";
  if (extract.length < 200) return false;
  const lead = extract.slice(0, 420);
  if (ADAPTATION_LEAD.test(lead.slice(0, 260))) return false;
  if (!WORK_WORDS.test(lead)) return false;
  const head = normalizeText(extract.slice(0, 1400));
  if (!head.includes(surnameKey(seed.author))) return false;
  return isAboutTheWork(seed, page.title, extract);
}

async function findInWikipedia(seed: SeedTitle): Promise<WikipediaMatch | null> {
  const tried = new Set<string>();
  const direct = [seed.wikipediaTitle, seed.title, `${seed.title} (livro)`, `${seed.title} (romance)`, seed.originalTitle].filter(Boolean) as string[];
  const tryTitle = async (title: string): Promise<WikipediaMatch | null> => {
    const key = normalizeText(title);
    if (tried.has(key)) return null;
    tried.add(key);
    const page = await fetchWikipediaPage(title);
    if (!page || !validateWikipediaPage(seed, page)) return null;
    const synopsis = composeSynopsis(page.extract ?? "");
    if (synopsis.length < 220) return null;
    return {
      title: page.title,
      url: page.fullurl ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      synopsis,
    };
  };
  for (const title of direct) {
    const match = await tryTitle(title);
    if (match) return match;
  }
  for (const title of (await searchWikipedia(seed)).slice(0, 4)) {
    const match = await tryTitle(title);
    if (match) return match;
  }
  return null;
}

const REFRESH_OPEN_LIBRARY = process.argv.includes("--refresh-ol");
const REVALIDATE_WIKIPEDIA = process.argv.includes("--revalidate-wiki");

async function resolveSeed(seed: SeedTitle, slug: string): Promise<CachedEntry | null> {
  const cacheFile = join(CACHE_DIR, `${slug}.json`);
  if (OFFLINE) {
    if (!existsSync(cacheFile)) return null;
    const cached = JSON.parse(readFileSync(cacheFile, "utf8")) as CachedEntry;
    const valid = cached.wiki ? isAboutTheWork(seed, cached.wiki.title, cached.wiki.synopsis) : false;
    return { ol: cached.ol, wiki: valid ? cached.wiki : null };
  }
  if (existsSync(cacheFile)) {
    const cached = JSON.parse(readFileSync(cacheFile, "utf8")) as CachedEntry & { olRefreshed?: boolean; wikiChecked?: boolean };
    if (REVALIDATE_WIKIPEDIA && !cached.wikiChecked) {
      const valid = cached.wiki ? isAboutTheWork(seed, cached.wiki.title, cached.wiki.synopsis) : false;
      try {
        const wiki = valid ? cached.wiki : await findInWikipedia(seed);
        const checked = { ...cached, wiki, wikiChecked: true };
        writeFileSync(cacheFile, JSON.stringify(checked, null, 2));
        if (!valid) console.log(`${seed.title}: ${cached.wiki ? `wrong article (${cached.wiki.title})` : "no article"} → ${wiki ? wiki.title : "no synopsis"}`);
        return checked;
      } catch (error) {
        if (error instanceof SourceUnavailableError) return cached;
        throw error;
      }
    }
    if (!REFRESH_OPEN_LIBRARY || cached.olRefreshed) return cached;
    try {
      const refreshed = { ol: await findInOpenLibrary(seed), wiki: cached.wiki, olRefreshed: true };
      writeFileSync(cacheFile, JSON.stringify(refreshed, null, 2));
      return refreshed;
    } catch (error) {
      if (error instanceof SourceUnavailableError) return cached;
      throw error;
    }
  }
  try {
    const [ol, wiki] = await Promise.all([findInOpenLibrary(seed), findInWikipedia(seed)]);
    const entry = { ol, wiki, olRefreshed: true, wikiChecked: true };
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2));
    return entry;
  } catch (error) {
    if (error instanceof SourceUnavailableError) return null;
    throw error;
  }
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const entries: SeedCatalogEntry[] = [];
  const report: { title: string; author: string; openLibrary: boolean; isbn: boolean; synopsis: boolean }[] = [];
  const queue = seedTitles.map((seed, index) => ({ seed, index }));
  const results = new Array<SeedCatalogEntry | null>(seedTitles.length).fill(null);
  let done = 0;
  const unavailable: string[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { seed, index } = item;
      const surname = seed.author.split(" ").slice(-1)[0];
      const title = seed.englishTitle ?? seed.title;
      const resolved = await resolveSeed(seed, slugify(`${seed.title} ${surname}`));
      if (!resolved) {
        unavailable.push(seed.title);
        continue;
      }
      const { ol, wiki } = resolved;
      report[index] = {
        title,
        author: seed.author,
        openLibrary: Boolean(ol),
        isbn: Boolean(ol?.isbn),
        synopsis: Boolean(wiki),
      };
      results[index] = {
        slug: slugify(`${title} ${surname}`),
        title,
        editionTitle: seed.englishTitle ? seed.title : null,
        author: seed.author,
        genre: seed.genre,
        isbn: ol?.isbn ?? null,
        publisher: ol?.publisher ?? null,
        year: seed.year !== undefined ? seed.year : (ol?.year ?? null),
        pages: ol?.pages ?? null,
        language: "pt",
        coverUrl: ol?.coverId ? `https://covers.openlibrary.org/b/id/${ol.coverId}-L.jpg` : null,
        coverSource: ol?.coverId ? "Open Library" : null,
        sourceUrl: ol ? `https://openlibrary.org${ol.workKey}` : null,
        subjects: ol?.subjects ?? [],
        synopsis: wiki?.synopsis ?? null,
        synopsisSource: wiki ? "Wikipedia (CC BY-SA 4.0)" : null,
        synopsisUrl: wiki?.url ?? null,
      };
      done += 1;
      if (done % 20 === 0) {
        console.log(`${done}/${seedTitles.length}`);
        writeFileSync(OUT_FILE, JSON.stringify(results.filter(Boolean), null, 2));
      }
    }
  };

  await Promise.all([worker(), worker()]);
  for (const entry of results) if (entry) entries.push(entry);
  if (unavailable.length > 0) console.log(`sources unavailable for ${unavailable.length} titles: ${unavailable.join("; ")}`);

  writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2));
  writeFileSync(REPORT_FILE, JSON.stringify(report.filter(Boolean), null, 2));
  const withSynopsis = entries.filter((entry) => entry.synopsis).length;
  const withIsbn = entries.filter((entry) => entry.isbn).length;
  const withCover = entries.filter((entry) => entry.coverUrl).length;
  console.log(
    JSON.stringify({ total: entries.length, withSynopsis, withIsbn, withCover, withOpenLibrary: entries.filter((entry) => entry.sourceUrl).length }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
