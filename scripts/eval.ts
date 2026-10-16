import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getBookById } from "../src/lib/catalog/books";
import { hashString } from "../src/lib/catalog/text";
import { closeDb } from "../src/lib/db";
import { semanticSearch } from "../src/lib/search/engine";
import { lexicalSearch } from "../src/lib/search/lexical";
import { CHAT_MODEL, EMBED_MODEL, chatJson } from "../src/lib/semantic/ollama";

type EvalQuery = { id: string; type: string; query: string; expects?: "abstain" | "limitation" };
type SystemName = "lexical" | "embedding" | "full";
type Ranked = { id: number; title: string; author: string };
type Metrics = { p5: number | null; ndcg5: number | null; results: number };

type QueryReport = {
  id: string;
  type: string;
  query: string;
  expects: string | null;
  confidence: string;
  message: string | null;
  interpretation: Record<string, unknown>;
  topSyn: number;
  topFeel: number;
  systems: Record<SystemName, Ranked[]>;
  grades: Record<string, number>;
  metrics: Record<SystemName, Metrics>;
  abstentionCorrect: boolean | null;
};

const EVAL_DIR = join(process.cwd(), "data", "eval");
const JUDGE_MODEL = process.env.SUBTEXT_JUDGE_MODEL ?? "gemma4:12b";
const JUDGE_CACHE_FILE = join(EVAL_DIR, "judge-cache.json");
const SYSTEMS: SystemName[] = ["lexical", "embedding", "full"];
const TOP = 5;

const TYPE_LABELS: Record<string, string> = {
  emotional: "emotional",
  abstract: "abstract",
  author: "author",
  negative: "negative",
  ambiguous: "ambiguous",
  "no-match": "no match",
  unanswerable: "unanswerable",
};

const SYSTEM_LABELS: Record<SystemName, string> = { lexical: "keywords", embedding: "embeddings only", full: "shelf" };

const judgeCache: Record<string, number> = existsSync(JUDGE_CACHE_FILE)
  ? (JSON.parse(readFileSync(JUDGE_CACHE_FILE, "utf8")) as Record<string, number>)
  : {};

function describe(id: number): Ranked {
  const book = getBookById(id);
  return { id, title: book?.title ?? `#${id}`, author: book?.author ?? "" };
}

function excerpt(id: number): string {
  return (getBookById(id)?.synopsis ?? "no synopsis").replace(/\s+/g, " ").slice(0, 440);
}

function cacheKey(query: string, id: number): string {
  return `${JUDGE_MODEL}|${hashString(query).toString(36)}|${id}|${hashString(excerpt(id)).toString(36)}`;
}

async function judge(query: string, ids: number[]): Promise<Record<string, number>> {
  const grades: Record<string, number> = {};
  const missing: number[] = [];
  for (const id of ids) {
    const cached = judgeCache[cacheKey(query, id)];
    if (cached === undefined) missing.push(id);
    else grades[String(id)] = cached;
  }
  if (missing.length === 0) return grades;
  const lines = missing.map((id, index) => {
    const book = getBookById(id);
    return `[${index + 1}] ${book?.title} — ${book?.author} (${book?.genre ?? "no genre"}, ${book?.pages ?? "?"} pages, ${book?.year ?? "unknown year"})\n${excerpt(id)}`;
  });
  const raw = await chatJson<{ grades?: Record<string, unknown> }>({
    model: JUDGE_MODEL,
    system:
      'You are an experienced bookseller assessing reading recommendations. For a reader\'s request, give each book a grade: 0 = does not meet the request, 1 = meets it in part, 2 = meets it well. Rely only on the information provided about each book. If the request has nothing to do with literature, essays or similar books, every grade must be 0. Reply only with JSON in the format {"grades":{"1":0,"2":2}} containing every number.',
    user: `Reader's request: "${query}"\n\nBooks:\n\n${lines.join("\n\n")}`,
    temperature: 0,
    maxTokens: 260,
    timeoutMs: 400000,
  });
  missing.forEach((id, index) => {
    const value = Number(raw.grades?.[String(index + 1)]);
    const grade = Number.isFinite(value) ? Math.max(0, Math.min(2, Math.round(value))) : 0;
    grades[String(id)] = grade;
    judgeCache[cacheKey(query, id)] = grade;
  });
  writeFileSync(JUDGE_CACHE_FILE, JSON.stringify(judgeCache));
  return grades;
}

function precisionAt(ranked: Ranked[], grades: Record<string, number>): number | null {
  if (ranked.length === 0) return null;
  return ranked.slice(0, TOP).filter((item) => (grades[String(item.id)] ?? 0) >= 1).length / TOP;
}

function ndcgAt(ranked: Ranked[], grades: Record<string, number>): number | null {
  if (ranked.length === 0) return null;
  const gain = (grade: number, position: number) => (2 ** grade - 1) / Math.log2(position + 2);
  const dcg = ranked.slice(0, TOP).reduce((sum, item, position) => sum + gain(grades[String(item.id)] ?? 0, position), 0);
  const ideal = Object.values(grades)
    .sort((a, b) => b - a)
    .slice(0, TOP)
    .reduce((sum, grade, position) => sum + gain(grade, position), 0);
  return ideal === 0 ? 0 : dcg / ideal;
}

const mean = (values: (number | null)[]) => {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : present.reduce((sum, value) => sum + value, 0) / present.length;
};
const format = (value: number | null) => (value === null ? "—" : value.toFixed(2));

async function main() {
  const useJudge = process.argv.includes("--judge");
  const queries = JSON.parse(readFileSync(join(EVAL_DIR, "queries.json"), "utf8")) as EvalQuery[];
  const reports: QueryReport[] = [];

  for (const item of queries) {
    const full = await semanticSearch(item.query, { debug: true });
    const embedding = await semanticSearch(item.query, { variant: "embedding", limit: TOP });
    const systems: Record<SystemName, Ranked[]> = {
      lexical: lexicalSearch(item.query, TOP).map((hit) => describe(hit.id)),
      embedding: embedding.results.slice(0, TOP).map((hit) => describe(hit.id)),
      full: full.results.slice(0, TOP).map((hit) => describe(hit.id)),
    };
    const pooled = [...new Set(SYSTEMS.flatMap((system) => systems[system].map((entry) => entry.id)))];
    const judged = useJudge && item.expects !== "abstain";
    const grades = judged ? await judge(item.query, pooled) : {};
    const abstained = full.confidence === "none" || full.confidence === "low";
    const metricsFor = (system: SystemName): Metrics => ({
      p5: judged ? precisionAt(systems[system], grades) : null,
      ndcg5: judged ? ndcgAt(systems[system], grades) : null,
      results: systems[system].length,
    });
    const report: QueryReport = {
      id: item.id,
      type: item.type,
      query: item.query,
      expects: item.expects ?? null,
      confidence: full.confidence,
      message: full.message,
      interpretation: {
        atmospheres: full.interpretation.atmospheres,
        inferredAtmospheres: full.interpretation.inferredAtmospheres,
        avoid: full.interpretation.avoid,
        avoidAtmospheres: full.interpretation.avoidAtmospheres,
        unassessable: full.interpretation.unassessable,
        pace: full.interpretation.pace,
        length: full.interpretation.length,
        era: full.interpretation.era,
        genres: full.interpretation.genres,
        reference: full.interpretation.reference?.label ?? null,
      },
      topSyn: full.debug?.topSyn ?? 0,
      topFeel: full.debug?.topFeel ?? 0,
      systems,
      grades,
      metrics: { lexical: metricsFor("lexical"), embedding: metricsFor("embedding"), full: metricsFor("full") },
      abstentionCorrect: item.expects === "abstain" ? abstained : item.expects === "limitation" ? Boolean(full.message) : !abstained,
    };
    reports.push(report);
    console.log(
      `${item.id.padEnd(6)} ${full.confidence.padEnd(8)} syn ${report.topSyn.toFixed(3)} feel ${report.topFeel.toFixed(3)} | ${item.query}\n         → ${systems.full.map((entry) => `${entry.title}${judged ? `(${grades[String(entry.id)] ?? 0})` : ""}`).join(" · ") || "(no results)"}`,
    );
  }

  const inScope = reports.filter((report) => report.expects !== "abstain");
  const types = [...new Set(inScope.map((report) => report.type))];
  const scored = (value: number | null) => value ?? (useJudge ? 0 : null);
  const summary = {
    generatedAt: new Date().toISOString(),
    models: { embeddings: EMBED_MODEL, classifier: CHAT_MODEL, judge: useJudge ? JUDGE_MODEL : null },
    overall: Object.fromEntries(
      SYSTEMS.map((system) => [
        system,
        {
          p5: mean(inScope.map((report) => scored(report.metrics[system].p5))),
          ndcg5: mean(inScope.map((report) => scored(report.metrics[system].ndcg5))),
          emptyQueries: inScope.filter((report) => report.metrics[system].results === 0).length,
        },
      ]),
    ) as Record<SystemName, { p5: number | null; ndcg5: number | null; emptyQueries: number }>,
    byType: Object.fromEntries(
      types.map((type) => [
        type,
        Object.fromEntries(
          SYSTEMS.map((system) => [
            system,
            mean(inScope.filter((report) => report.type === type).map((report) => scored(report.metrics[system].ndcg5))),
          ]),
        ),
      ]),
    ) as Record<string, Record<SystemName, number | null>>,
    abstention: {
      outOfScopeDeclined: reports.filter((report) => report.expects === "abstain" && report.abstentionCorrect).length,
      outOfScopeTotal: reports.filter((report) => report.expects === "abstain").length,
      inScopeAnswered: reports.filter((report) => report.expects === null && report.abstentionCorrect).length,
      inScopeTotal: reports.filter((report) => report.expects === null).length,
    },
  };

  mkdirSync(EVAL_DIR, { recursive: true });
  writeFileSync(join(EVAL_DIR, "results.json"), JSON.stringify({ summary, queries: reports }, null, 2));

  const lines: string[] = [
    "# Search evaluation — keywords × semantics",
    "",
    `Generated at ${summary.generatedAt}. Embeddings: \`${EMBED_MODEL}\`. Classifier: \`${CHAT_MODEL}\`. ${useJudge ? `Relevance grades assigned automatically by \`${JUDGE_MODEL}\` (0, 1 or 2), reading only each book's title, author, genre, pages, year and synopsis. This is not a human evaluation.` : "No relevance grades (run with --judge)."}`,
    "",
    "- **keywords** (`lexical`): FTS5/BM25 over title, author, genre, synopsis and note, with prefixes.",
    "- **embeddings only** (`embedding`): closeness between the query and the synopsis.",
    "- **shelf** (`full`): query interpretation, synopsis and reading embeddings, reranking by attributes.",
    "",
    "## Summary",
    "",
    "| engine | P@5 | nDCG@5 | queries with no results |",
    "| --- | --- | --- | --- |",
    ...SYSTEMS.map((system) => {
      const row = summary.overall[system];
      return `| ${SYSTEM_LABELS[system]} | ${format(row.p5)} | ${format(row.ndcg5)} | ${row.emptyQueries} of ${inScope.length} |`;
    }),
    "",
    "nDCG@5 by query type:",
    "",
    "| type | keywords | embeddings only | shelf |",
    "| --- | --- | --- | --- |",
    ...types.map((type) => {
      const row = summary.byType[type];
      return `| ${TYPE_LABELS[type] ?? type} | ${format(row.lexical)} | ${format(row.embedding)} | ${format(row.full)} |`;
    }),
    "",
    `Out-of-scope queries declined or flagged as weak: ${summary.abstention.outOfScopeDeclined} of ${summary.abstention.outOfScopeTotal}. In-scope queries answered with confidence: ${summary.abstention.inScopeAnswered} of ${summary.abstention.inScopeTotal}.`,
    "",
    "## Queries",
  ];
  for (const report of reports) {
    lines.push("", `### ${report.id} · ${TYPE_LABELS[report.type] ?? report.type} — "${report.query}"`, "");
    lines.push(
      `Confidence: **${report.confidence}** (highest similarity to a synopsis ${report.topSyn}, to a reading ${report.topFeel}). Reading of the request: \`${JSON.stringify(report.interpretation)}\``,
    );
    if (report.message) lines.push("", `> ${report.message}`);
    lines.push("", "| # | keywords | embeddings only | shelf |", "| --- | --- | --- | --- |");
    const showGrades = Object.keys(report.grades).length > 0;
    for (let position = 0; position < TOP; position += 1) {
      const cell = (system: SystemName) => {
        const entry = report.systems[system][position];
        if (!entry) return "—";
        const grade = showGrades ? ` **(${report.grades[String(entry.id)] ?? 0})**` : "";
        return `${entry.title} — ${entry.author}${grade}`;
      };
      lines.push(`| ${position + 1} | ${cell("lexical")} | ${cell("embedding")} | ${cell("full")} |`);
    }
    if (showGrades) {
      lines.push(
        "",
        `nDCG@5 — keywords ${format(report.metrics.lexical.ndcg5)} · embeddings only ${format(report.metrics.embedding.ndcg5)} · shelf ${format(report.metrics.full.ndcg5)}`,
      );
    }
  }
  writeFileSync(join(EVAL_DIR, "REPORT.md"), `${lines.join("\n")}\n`);
  console.log(JSON.stringify(summary, null, 1));
  closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
