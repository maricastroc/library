import { catalogStats } from "../src/lib/catalog/books";
import { closeDb, db } from "../src/lib/db";
import { ollamaStatus } from "../src/lib/semantic/ollama";
import { runEnrichment } from "../src/lib/semantic/pipeline";

async function main() {
  const status = await ollamaStatus();
  if (!status.available || !status.embedReady || !status.chatReady) {
    console.error(
      `Ollama unavailable or models missing (embeddings: ${status.embedModel} ${status.embedReady ? "ok" : "missing"}; classifier: ${status.chatModel} ${status.chatReady ? "ok" : "missing"}).`,
    );
    process.exit(1);
  }
  if (process.argv.includes("--all")) {
    db().prepare("UPDATE book_semantics SET status = 'pending', error = NULL WHERE origin = 'ai'").run();
  } else if (process.argv.includes("--retry")) {
    db().prepare("UPDATE book_semantics SET status = 'pending', error = NULL WHERE status = 'error'").run();
  }
  const started = Date.now();
  const state = await runEnrichment({
    concurrency: Number(process.env.ENRICH_CONCURRENCY ?? 4),
    onProgress: ({ done, total, title, result }) => {
      const elapsed = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`[${done}/${total}] ${elapsed}s ${title} → ${result}`);
    },
  });
  console.log(JSON.stringify({ state, stats: catalogStats() }, null, 1));
  closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
