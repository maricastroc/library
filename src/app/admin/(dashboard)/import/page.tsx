import type { Metadata } from "next";
import { PageHead, SectionHead } from "@/components/admin/Counter";
import { CsvImporter } from "@/components/admin/CsvImporter";
import { listImportRuns } from "@/lib/catalog/import-csv";

export const metadata: Metadata = { title: "Import catalog" };

export default function ImportPage() {
  const runs = listImportRuns();
  return (
    <div className="counter-page">
      <PageHead
        folio="03 · intake"
        title={
          <>
            Bring the <em>catalogue</em> in
          </>
        }
        lede={<p>Upload the bookshop’s spreadsheet as a CSV. Before anything is saved you see what comes in, what changes and what has a problem.</p>}
      />
      <CsvImporter />
      <section aria-labelledby="import-history-heading" className="counter-section">
        <SectionHead id="import-history-heading" title="Previous imports" count={runs.length} />
        {runs.length === 0 ? (
          <div className="blank">
            <p className="blank-line">No spreadsheet has come in yet.</p>
            <p className="blank-hint">The books on the shelves today came with the demo catalogue. Each import you confirm is listed here.</p>
          </div>
        ) : (
          <table className="ledger history">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">File</th>
                <th scope="col" className="numeric">
                  New
                </th>
                <th scope="col" className="numeric">
                  Updated
                </th>
                <th scope="col" className="numeric">
                  Left out
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="numeric history-when">{run.createdAt.replace("T", " ").slice(0, 16)}</td>
                  <td>{run.filename ?? "unnamed file"}</td>
                  <td className="numeric">{run.inserted}</td>
                  <td className="numeric">{run.updated}</td>
                  <td className="numeric">{run.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
