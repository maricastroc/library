"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FIELD_LABELS, type ImportOutcome, type ImportPlan, type ImportRowStatus } from "@/lib/catalog/import-types";

type Stage =
  | { step: "choose"; error: string | null }
  | { step: "analyzing" }
  | { step: "review"; plan: ImportPlan; error: string | null; applying: boolean }
  | { step: "done"; plan: ImportPlan; outcome: ImportOutcome };

const STATUS: Record<ImportRowStatus, { label: string; className: string }> = {
  new: { label: "novo", className: "bg-ink text-paper" },
  update: { label: "atualiza", className: "border border-ink text-ink" },
  duplicate: { label: "ignorado", className: "border border-ink/40 text-ink-soft" },
  error: { label: "erro", className: "bg-vermilion text-paper" },
};

export function CsvImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>({ step: "choose", error: null });
  const [onlyIssues, setOnlyIssues] = useState(false);

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
    setStage({ step: "analyzing" });
    try {
      const result = await send(selected, "analyze");
      if (!result.plan) {
        setStage({ step: "choose", error: result.error ?? "Não foi possível ler o arquivo." });
        return;
      }
      setStage({ step: "review", plan: result.plan, error: null, applying: false });
    } catch {
      setStage({ step: "choose", error: "Falha ao enviar o arquivo. Tente de novo." });
    }
  };

  const apply = async () => {
    if (!file || stage.step !== "review") return;
    setStage({ ...stage, applying: true, error: null });
    try {
      const result = await send(file, "apply");
      if (!result.ok || !result.outcome || !result.plan) {
        setStage({ ...stage, applying: false, error: result.error ?? "A importação falhou. Nada foi gravado." });
        return;
      }
      setStage({ step: "done", plan: result.plan, outcome: result.outcome });
      router.refresh();
    } catch {
      setStage({ ...stage, applying: false, error: "Falha de conexão. Nada foi gravado." });
    }
  };

  const reset = () => {
    setFile(null);
    setStage({ step: "choose", error: null });
    if (inputRef.current) inputRef.current.value = "";
  };

  if (stage.step === "choose" || stage.step === "analyzing") {
    return (
      <div>
        <label
          htmlFor="csv-file"
          className="flex min-h-[12rem] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-ink/50 bg-paper-light p-8 text-center hover:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-vermilion"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const dropped = event.dataTransfer.files[0];
            if (dropped) void analyze(dropped);
          }}
        >
          <span className="display text-[1.5rem]">
            {stage.step === "analyzing" ? "Lendo o arquivo…" : "Escolha um arquivo CSV ou solte aqui"}
          </span>
          <span className="text-[0.95rem] text-ink-soft">Até 2 MB e 2.000 linhas. Vírgula ou ponto e vírgula, tanto faz.</span>
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
          <p role="alert" className="mt-3 border-l-2 border-vermilion pl-3 text-vermilion">
            {stage.error}
          </p>
        ) : null}
      </div>
    );
  }

  const { plan } = stage;
  const importable = plan.totals.created + plan.totals.updated;
  const rows = onlyIssues ? plan.rows.filter((row) => row.issues.length > 0) : plan.rows;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="eyebrow text-ink-soft">
          {file?.name} · separador “{plan.delimiter === "\t" ? "tabulação" : plan.delimiter}”
        </p>
        <button type="button" className="eyebrow ink-link" onClick={reset}>
          Escolher outro arquivo
        </button>
      </div>

      {plan.fatal ? (
        <p role="alert" className="mt-4 border-l-2 border-vermilion pl-3 text-vermilion">
          {plan.fatal}
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-px bg-ink/25 sm:grid-cols-5">
            {[
              ["linhas", plan.totals.total],
              ["livros novos", plan.totals.created],
              ["atualizações", plan.totals.updated],
              ["ignoradas", plan.totals.duplicates],
              ["com erro", plan.totals.errors],
            ].map(([label, value]) => (
              <div key={label} className="bg-paper p-3">
                <dd className="display text-[1.9rem] leading-none">{value}</dd>
                <dt className="eyebrow mt-1.5 text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[0.95rem] text-ink-soft">
            Colunas reconhecidas:{" "}
            {plan.columns
              .filter((column) => column.field)
              .map((column) => `${column.header} → ${FIELD_LABELS[column.field as keyof typeof FIELD_LABELS]}`)
              .join("; ")}
            .
            {plan.columns.some((column) => !column.field)
              ? ` Ignoradas: ${plan.columns.filter((column) => !column.field).map((column) => column.header || "(sem nome)").join(", ")}.`
              : ""}
          </p>
        </>
      )}

      {stage.step === "done" ? (
        <div role="status" className="mt-6 border-l-2 border-ink pl-3">
          <p className="display text-[1.4rem]">
            {stage.outcome.inserted} {stage.outcome.inserted === 1 ? "livro entrou" : "livros entraram"} na estante
            {stage.outcome.updated > 0 ? ` e ${stage.outcome.updated} ${stage.outcome.updated === 1 ? "foi atualizado" : "foram atualizados"}` : ""}.
          </p>
          <p className="mt-1 text-ink-soft">
            Eles já estão visíveis. A IA lê as sinopses em segundo plano; acompanhe no{" "}
            <Link className="ink-link" href="/admin">
              painel
            </Link>
            .
          </p>
          <div className="mt-3 flex gap-4">
            <Link href="/admin/books" className="button">
              Ver livros
            </Link>
            <button type="button" className="button button-outline" onClick={reset}>
              Importar outro arquivo
            </button>
          </div>
        </div>
      ) : plan.fatal ? null : (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" className="button" disabled={importable === 0 || stage.applying} onClick={() => void apply()}>
            {stage.applying
              ? "Importando…"
              : importable === 0
                ? "Nada a importar"
                : `Importar ${importable} ${importable === 1 ? "livro" : "livros"}`}
          </button>
          {plan.totals.errors > 0 ? (
            <p className="text-[0.95rem] text-ink-soft">
              {plan.totals.errors === 1 ? "A linha com erro fica de fora" : `As ${plan.totals.errors} linhas com erro ficam de fora`}; corrija o arquivo e envie de novo depois.
            </p>
          ) : null}
          {stage.error ? (
            <p role="alert" className="text-vermilion">
              {stage.error}
            </p>
          ) : null}
        </div>
      )}

      {plan.rows.length > 0 ? (
        <div className="mt-8">
          <label className="eyebrow inline-flex cursor-pointer items-center gap-2 text-ink">
            <input type="checkbox" checked={onlyIssues} onChange={(event) => setOnlyIssues(event.target.checked)} className="h-4 w-4 accent-[var(--color-ink)]" />
            mostrar só linhas com erros ou avisos
          </label>
          <div className="mt-2 max-h-[32rem] overflow-auto border-t-2 border-ink">
            <table className="w-full min-w-[40rem] border-collapse text-left text-[0.92rem]">
              <thead className="sticky top-0 bg-paper">
                <tr className="eyebrow border-b border-ink text-ink-soft">
                  <th scope="col" className="py-2 pr-3 font-normal">Linha</th>
                  <th scope="col" className="py-2 pr-3 font-normal">Situação</th>
                  <th scope="col" className="py-2 pr-3 font-normal">Livro</th>
                  <th scope="col" className="py-2 font-normal">Observações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.line} className="border-b border-ink/15 align-baseline">
                    <td className="py-2 pr-3 font-mono text-[0.8rem]">{row.line}</td>
                    <td className="py-2 pr-3">
                      <span className={`eyebrow px-1.5 py-0.5 text-[9px] ${STATUS[row.status].className}`}>{STATUS[row.status].label}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-label font-semibold">{row.title || "(sem título)"}</span>
                      <span className="block text-[0.85rem] italic text-ink-soft">{row.author || "(sem autor)"}</span>
                    </td>
                    <td className="py-2 text-[0.88rem]">
                      {row.changes.length > 0 ? <p>Atualiza: {row.changes.join(", ")}.</p> : null}
                      {row.issues.map((issue, index) => (
                        <p key={index} className={issue.level === "error" ? "text-vermilion" : "text-ink-soft"}>
                          {issue.message}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
