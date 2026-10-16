import { clearDemand, phraseVectors, recordSearch } from "@/lib/demand";
import { isMissed, phrasesOf, type DemandEntry } from "@/lib/demand/report";
import { normalizeText } from "@/lib/catalog/text";
import { semanticSearch } from "@/lib/search/engine";

const REQUESTS: [string, number][] = [
  ["a book that makes me laugh", 5],
  ["something funny", 4],
  ["I want to laugh out loud", 2],
  ["a light and funny novel", 2],
  ["something for a rainy afternoon", 4],
  ["a cosy book for a rainy day", 3],
  ["a rainy Sunday read", 1],
  ["books about grief", 3],
  ["a novel about losing someone", 2],
  ["something to read while mourning", 2],
  ["something to read when your heart is broken", 3],
  ["a book for after a breakup", 2],
  ["stories of the sea", 2],
  ["a novel about sailing", 2],
  ["shipwrecks and long voyages", 1],
  ["a thriller that keeps me up at night", 3],
  ["something gripping I can't put down", 3],
  ["travel guide to Lisbon", 3],
  ["a guidebook for Japan", 2],
  ["vegetarian recipes", 2],
  ["a cookbook for beginners", 1],
  ["books like Clarice Lispector", 3],
  ["something in the style of Lispector", 1],
  ["a short book I can finish in one sitting", 3],
  ["something short to read on a train", 2],
  ["fantasy for a twelve-year-old", 3],
  ["a young adult fantasy series", 2],
  ["love poems", 2],
  ["poetry about love", 1],
  ["hopeful science fiction", 2],
  ["science fiction that isn't bleak", 1],
  ["a book about gardens", 2],
  ["nature writing about forests", 1],
  ["a graphic novel for adults", 2],
  ["books about Brazilian history", 2],
  ["something melancholic, but comforting", 2],
  ["a classic, but nothing too long", 2],
  ["the best book you have", 1],
  ["learn to code in python", 1],
];

let seed = 20261015;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const stamp = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

async function main() {
  const removed = clearDemand("samples");
  const now = Date.now();
  let written = 0;
  const entries: DemandEntry[] = [];
  for (const [query, times] of REQUESTS) {
    const response = await semanticSearch(query);
    const shown = response.results.map((result) => result.id);
    for (let index = 0; index < times; index += 1) {
      const createdAt = stamp(new Date(now - Math.floor(random() * 29 * 24 + 2) * 3_600_000));
      const entry: DemandEntry = {
        id: 0,
        query,
        folded: normalizeText(query),
        confidence: response.confidence,
        fallback: false,
        results: shown.length,
        shown,
        atmospheres: response.interpretation.atmospheres,
        inferred: response.interpretation.inferredAtmospheres,
        opened: [],
        reserved: [],
        sample: true,
        createdAt,
      };
      if (!isMissed(entry) && shown.length > 0 && random() < 0.4) {
        const book = shown[random() < 0.65 ? 0 : Math.min(1, shown.length - 1)];
        entry.opened = [book];
        if (random() < 0.3) entry.reserved = [book];
      }
      recordSearch({ ...entry, fallback: false, sample: true });
      entries.push(entry);
      written += 1;
    }
  }
  const vectors = await phraseVectors(phrasesOf(entries));
  const missed = entries.filter(isMissed).length;
  console.log(JSON.stringify({ removed, written, missed, grouped: vectors ? "by meaning" : "by exact words" }));
}

void main();
