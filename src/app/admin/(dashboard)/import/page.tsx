import type { Metadata } from "next";
import { CsvImporter } from "@/components/admin/CsvImporter";
import { listImportRuns } from "@/lib/catalog/import-csv";

export const metadata: Metadata = { title: "Import catalog" };

export default function ImportPage() {
  const runs = listImportRuns();
  return (
    <div className="max-w-5xl">
      <h1 className="display text-[2.6rem] leading-none">Import catalog</h1>
      <p className="mt-3 max-w-[46rem] text-ink-soft">
        Upload the bookshop’s spreadsheet as a CSV. Before anything is saved, you see what comes in, what gets updated and what has a problem.
        Accepted columns: ISBN, Title, Author, Synopsis, Genre, Price, Stock, Bookseller&apos;s note, Pages, Year and Publisher.
        Only Title and Author are required.{" "}
        <a className="ink-link" href="/catalog-template.csv" download>
          Download template
        </a>
        .
      </p>
      <div className="mt-8">
        <CsvImporter />
      </div>
      {runs.length > 0 ? (
        <section aria-labelledby="import-history-heading" className="mt-14">
          <h2 id="import-history-heading" className="eyebrow border-b border-ink pb-2 text-ink">
            Previous imports
          </h2>
          <ul className="divide-y divide-ink/15 text-[0.95rem]">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2">
                <span className="font-label">{run.filename ?? "unnamed file"}</span>
                <span className="eyebrow text-ink-soft">
                  {run.createdAt.replace("T", " ").slice(0, 16)} · {run.inserted} new · {run.updated} updated · {run.skipped} left out
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
