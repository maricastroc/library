"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollRail } from "@/components/ScrollRail";
import { FIELD_LABELS, type ImportField, type ImportOutcome, type ImportPlan, type ImportRow, type ImportRowStatus } from "@/lib/catalog/import-types";

type Stage =
  | { step: "choose"; error: string | null }
  | { step: "analyzing" }
  | { step: "review"; plan: ImportPlan; error: string | null; applying: boolean }
  | { step: "done"; plan: ImportPlan; outcome: ImportOutcome };

type RowFilter = "all" | ImportRowStatus | "warnings";

const STATUS: Record<ImportRowStatus, { label: string; tone: string }> = {
  new: { label: "new", tone: "new" },
  update: { label: "updates", tone: "update" },
  duplicate: { label: "set aside", tone: "skip" },
  error: { label: "error", tone: "error" },
};

const STEPS = ["Choose the file", "Read and check", "Review", "Import"];

const COLUMNS: { field: ImportField; required?: boolean; note: string }[] = [
  { field: "title", required: true, note: "as it should appear on the shelf" },
  { field: "author", required: true, note: "as on the cover" },
  { field: "isbn", note: "10 or 13 digits; the surest way to match a book" },
  { field: "synopsis", note: "what the AI reads; without it, searches by feeling miss the book" },
  { field: "genre", note: "novel, poetry, essay…" },
  { field: "price", note: "in reais, 49.90 or 49,90" },
  { field: "stock", note: "whole copies; zero means out of stock" },
  { field: "note", note: "your handwritten card" },
  { field: "pages", note: "a number" },
  { field: "year", note: "first publication" },
  { field: "publisher", note: "of the edition you sell" },
];

function stepOf(stage: Stage): number {
  if (stage.step === "choose") return 0;
  if (stage.step === "analyzing") return 1;
  if (stage.step === "review") return stage.applying ? 3 : 2;
  return 4;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function verdict(plan: ImportPlan): string {
  const { total, created, updated, duplicates, errors } = plan.totals;
  const parts = [
    created > 0 ? plural(created, "new book", "new books") : null,
    updated > 0 ? plural(updated, "update", "updates") : null,
    duplicates > 0 ? `${duplicates} set aside` : null,
    errors > 0 ? plural(errors, "row with an error", "rows with errors") : null,
  ].filter(Boolean) as string[];
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "nothing to do");
  return `${plural(total, "row", "rows")}: ${list}.`;
}

function rowMatches(row: ImportRow, filter: RowFilter): boolean {
  if (filter === "all") return true;
  if (filter === "warnings") return row.issues.some((issue) => issue.level === "warning");
  return row.status === filter;
}

export function CsvImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>({ step: "choose", error: null });
  const [filter, setFilter] = useState<RowFilter>("all");
  const [over, setOver] = useState(false);

  const send = async (selected: File, mode: "analyze" | "apply") => {
    const body = new FormData();
    body.set("file", selected);
    body.set("mode", mode);
    const response = await fetch("/api/admin/import", { method: "POST", body });
    const data = (await response.json()) as { plan?: ImportPlan; outcome?: ImportOutcome; error?: string };
    return { ok: response.ok, ...data };
  };

  const analyze = async (selected: File) => {
    setFile(selected);
    setFilter("all");
    setStage({ step: "analyzing" });
    try {
      const result = await send(selected, "analyze");
      if (!result.plan) {
        setStage({ step: "choose", error: result.error ?? "Couldn’t read the file." });
        return;
      }
      setStage({ step: "review", plan: result.plan, error: null, applying: false });
    } catch {
      setStage({ step: "choose", error: "Couldn’t upload the file. Try again." });
    }
  };

  const apply = async () => {
    if (!file || stage.step !== "review") return;
    setStage({ ...stage, applying: true, error: null });
    try {
      const result = await send(file, "apply");
      if (!result.ok || !result.outcome || !result.plan) {
        setStage({ ...stage, applying: false, error: result.error ?? "The import failed. Nothing was saved." });
        return;
      }
      setStage({ step: "done", plan: result.plan, outcome: result.outcome });
      router.refresh();
    } catch {
      setStage({ ...stage, applying: false, error: "Connection failed. Nothing was saved." });
    }
  };

  const reset = () => {
    setFile(null);
    setStage({ step: "choose", error: null });
    if (inputRef.current) inputRef.current.value = "";
  };

  const current = stepOf(stage);

  return (
    <div className="intake">
      <ol className="intake-steps" aria-label="Import steps">
        {STEPS.map((label, index) => (
          <li key={label} data-state={index < current ? "done" : index === current ? "current" : "upcoming"} aria-current={index === current ? "step" : undefined}>
            <span className="intake-step-number">{index + 1}</span>
            <span className="intake-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {stage.step === "choose" || stage.step === "analyzing" ? (
        <div className="intake-choose">
          <div>
            <label
              htmlFor="csv-file"
              className="intake-tray"
              data-over={over ? "true" : undefined}
              data-busy={stage.step === "analyzing" ? "true" : undefined}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                const dropped = event.dataTransfer.files[0];
                if (dropped) void analyze(dropped);
              }}
            >
              <span aria-hidden className="intake-sheets">
                <span />
                <span />
                <span />
              </span>
              <span className="intake-tray-title">{stage.step === "analyzing" ? `Reading ${file?.name ?? "the spreadsheet"}…` : "Drop the spreadsheet here"}</span>
              <span className="intake-tray-sub">
                {stage.step === "analyzing" ? (
                  "checking columns, ISBNs, prices and repeats; nothing is saved yet"
                ) : (
                  <>
                    or <span className="intake-tray-choose">choose a CSV file</span> · up to 2 MB and 2,000 rows · comma or semicolon
                  </>
                )}
              </span>
              <input
                ref={inputRef}
                id="csv-file"
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                disabled={stage.step === "analyzing"}
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) void analyze(selected);
                }}
              />
            </label>
            {stage.step === "choose" && stage.error ? (
              <p role="alert" className="slip slip-enter mt-4" data-tone="error">
                {stage.error}
              </p>
            ) : null}
          </div>
          <aside className="intake-card" aria-labelledby="intake-columns-heading">
            <h2 id="intake-columns-heading" className="eyebrow intake-card-title">
              What the file can carry
            </h2>
            <dl className="intake-fields">
              {COLUMNS.map((column) => (
                <div key={column.field}>
                  <dt>
                    {FIELD_LABELS[column.field]}
                    {column.required ? <span className="intake-required">required</span> : null}
                  </dt>
                  <dd>{column.note}</dd>
                </div>
              ))}
            </dl>
            <p className="intake-card-note">
              A row updates a book already in the catalogue when its ISBN matches, or its title and author do. Nothing is written until you confirm.
            </p>
            <a className="button-quiet" href="/catalog-template.csv" download>
              Download the template ↓
            </a>
          </aside>
        </div>
      ) : (
        <Review
          stage={stage}
          file={file}
          filter={filter}
          onFilter={setFilter}
          onApply={() => void apply()}
          onReset={reset}
        />
      )}
    </div>
  );
}

function Review({
  stage,
  file,
  filter,
  onFilter,
  onApply,
  onReset,
}: {
  stage: Extract<Stage, { step: "review" | "done" }>;
  file: File | null;
  filter: RowFilter;
  onFilter: (filter: RowFilter) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const { plan } = stage;
  const tableRef = useRef<HTMLDivElement>(null);
  const importable = plan.totals.created + plan.totals.updated;
  const rows = plan.rows.filter((row) => rowMatches(row, filter));
  const warnings = plan.rows.filter((row) => rowMatches(row, "warnings")).length;
  const filters: { key: RowFilter; label: string; count: number }[] = [
    { key: "all", label: "all rows", count: plan.rows.length },
    { key: "new", label: "new", count: plan.totals.created },
    { key: "update", label: "updates", count: plan.totals.updated },
    { key: "duplicate", label: "set aside", count: plan.totals.duplicates },
    { key: "error", label: "errors", count: plan.totals.errors },
    { key: "warnings", label: "with warnings", count: warnings },
  ];
  const segments: { tone: string; count: number }[] = [
    { tone: "new", count: plan.totals.created },
    { tone: "update", count: plan.totals.updated },
    { tone: "skip", count: plan.totals.duplicates },
    { tone: "error", count: plan.totals.errors },
  ];

  return (
    <div className="intake-review">
      <div className="intake-file">
        <span aria-hidden className="intake-file-icon" />
        <span className="intake-file-name">{file?.name ?? "spreadsheet"}</span>
        <span className="eyebrow intake-file-meta">
          {plan.delimiter === "\t" ? "tab" : `“${plan.delimiter}”`} separated · {plural(plan.rows.length, "row", "rows")}
        </span>
        {stage.step === "review" ? (
          <button type="button" className="button-quiet" onClick={onReset} disabled={stage.applying}>
            Choose another file
          </button>
        ) : null}
      </div>

      {plan.fatal ? (
        <div className="blank">
          <p role="alert" className="slip" data-tone="error">
            {plan.fatal}
          </p>
          <p className="blank-hint">Nothing was read from this file. Check that it is a CSV with a header row, then choose it again.</p>
        </div>
      ) : stage.step === "done" ? (
        <div className="receipt slip-enter" role="status">
          <p className="eyebrow receipt-title">Intake receipt</p>
          <p className="receipt-line">
            {plural(stage.outcome.inserted, "book joined", "books joined")} the collection
            {stage.outcome.updated > 0 ? <> and {plural(stage.outcome.updated, "was", "were")} updated</> : null}.
          </p>
          <dl className="receipt-figures">
            <div>
              <dt>new</dt>
              <dd>{stage.outcome.inserted}</dd>
            </div>
            <div>
              <dt>updated</dt>
              <dd>{stage.outcome.updated}</dd>
            </div>
            <div>
              <dt>left out</dt>
              <dd>{stage.outcome.skipped}</dd>
            </div>
          </dl>
          <p className="receipt-note">They are already on the shelf. The AI reads the new synopses in the background; you can follow it on the dashboard.</p>
          <div className="counter-actions">
            <Link href="/admin/books?filter=unread" className="button">
              See the new books
            </Link>
            <Link href="/admin" className="button-quiet">
              Follow the reading
            </Link>
            <button type="button" className="button-quiet" onClick={onReset}>
              Import another file
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="intake-verdict">{verdict(plan)}</p>
          <div className="intake-tally" aria-hidden>
            {segments
              .filter((segment) => segment.count > 0)
              .map((segment) => (
                <span key={segment.tone} data-tone={segment.tone} style={{ flexGrow: segment.count }} />
              ))}
          </div>
          <div className="intake-map">
            <p className="eyebrow intake-map-title">How the columns were read</p>
            <ul>
              {plan.columns.map((column, index) => (
                <li key={`${column.header}-${index}`} data-ignored={column.field ? undefined : "true"}>
                  <span className="intake-map-header">{column.header || "(unnamed)"}</span>
                  <span aria-hidden className="intake-map-arrow">
                    →
                  </span>
                  <span className="intake-map-field">{column.field ? FIELD_LABELS[column.field] : "ignored"}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {plan.rows.length > 0 ? (
        <section aria-label="Rows of the spreadsheet" className="intake-rows">
          <div role="group" aria-label="Show rows" className="intake-filters">
            {filters
              .filter((item) => item.key === "all" || item.count > 0)
              .map((item) => (
                <button key={item.key} type="button" className="facet-option" aria-pressed={filter === item.key} onClick={() => onFilter(item.key)}>
                  {item.label}
                  <span className="facet-option-count">{item.count}</span>
                </button>
              ))}
          </div>
          <div className="railed">
            <div ref={tableRef} className="intake-table">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Status</th>
                  <th scope="col">Book</th>
                  <th scope="col">What happens</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.line} data-status={row.status}>
                    <td className="numeric intake-line">{row.line}</td>
                    <td>
                      <span className="intake-status" data-tone={STATUS[row.status].tone}>
                        {STATUS[row.status].label}
                      </span>
                    </td>
                    <td>
                      <span className="intake-book">{row.title || "(untitled)"}</span>
                      <span className="intake-author">{row.author || "(no author)"}</span>
                    </td>
                    <td className="intake-remarks">
                      {row.status === "new" && row.issues.length === 0 ? <p>Joins the shelf.</p> : null}
                      {row.changes.length > 0 ? <p>Updates the {row.changes.join(", ")}.</p> : null}
                      {row.issues.map((issue, index) => (
                        <p key={index} data-level={issue.level}>
                          {issue.message}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <p className="blank-hint py-6">No row in this group.</p> : null}
            </div>
            <ScrollRail target={tableRef} />
          </div>
        </section>
      ) : null}

      {stage.step === "review" && !plan.fatal ? (
        <div className="save-bar intake-confirm">
          <button type="button" className="button" disabled={importable === 0 || stage.applying} onClick={onApply}>
            {stage.applying ? "Importing…" : importable === 0 ? "Nothing to import" : `Import ${plural(importable, "book", "books")}`}
          </button>
          <p className="intake-confirm-note">
            {plan.totals.errors > 0
              ? `${plural(plan.totals.errors, "row with an error stays", "rows with errors stay")} out; fix the file and upload it again later.`
              : "Nothing is written until you press the button."}
          </p>
          {stage.error ? (
            <p role="alert" className="slip" data-tone="error">
              {stage.error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
