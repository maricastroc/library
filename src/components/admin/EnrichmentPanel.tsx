"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogStats } from "@/lib/catalog/books";

type Payload = {
  state: { running: boolean; processed: number; failed: number; current: string[]; lastError: string | null };
  stats: CatalogStats;
  ollama?: { available: boolean; embedModel: string; chatModel: string; embedReady: boolean; chatReady: boolean };
};

export function EnrichmentPanel({ initial }: { initial: Payload }) {
  const router = useRouter();
  const [data, setData] = useState<Payload>(initial);
  const [error, setError] = useState<string | null>(null);
  const pending = data.stats.semantics.pending + data.stats.semantics.processing;
  const active = data.state.running || pending > 0;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/enrichment", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const next = (await response.json()) as Payload;
      setData((current) => {
        if (current.state.running && !next.state.running) router.refresh();
        return next;
      });
      setError(null);
    } catch {
      setError("I couldn’t check the progress.");
    }
  }, [router]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const start = async () => {
    try {
      const response = await fetch("/api/admin/enrichment", { method: "POST" });
      if (!response.ok) throw new Error();
      await refresh();
    } catch {
      setError("I couldn’t start the reading.");
    }
  };

  const { semantics, total } = data.stats;
  const done = semantics.ready + semantics.insufficient;
  const ollama = data.ollama;
  const ollamaProblem = ollama && (!ollama.available || !ollama.embedReady || !ollama.chatReady);
  const share = total === 0 ? 0 : Math.round((semantics.ready / total) * 100);

  return (
    <section aria-labelledby="reader-heading" className="margin-block reader" data-active={data.state.running ? "true" : undefined}>
      <h2 id="reader-heading" className="eyebrow margin-title">
        The reader
      </h2>
      <p className="reader-figure">
        <span className="reader-share">{share}</span>
        <span className="reader-share-unit">% of the catalogue read</span>
      </p>
      <div className="reader-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Books already read by the AI">
        <span style={{ width: `${total === 0 ? 0 : (semantics.ready / total) * 100}%` }} />
        <span data-kind="insufficient" style={{ width: `${total === 0 ? 0 : (semantics.insufficient / total) * 100}%` }} />
      </div>
      <dl className="reader-facts">
        <div>
          <dt>read</dt>
          <dd>{semantics.ready}</dd>
        </div>
        <div>
          <dt>in the queue</dt>
          <dd>{pending}</dd>
        </div>
        <div>
          <dt>too little synopsis</dt>
          <dd>{semantics.insufficient}</dd>
        </div>
        <div>
          <dt>failed</dt>
          <dd data-alert={semantics.error > 0 ? "true" : undefined}>{semantics.error}</dd>
        </div>
      </dl>
      <div className="reader-status" aria-live="polite">
        {data.state.running ? (
          <p className="reader-now">
            <span aria-hidden className="reader-pulse" />
            Reading {data.state.current.slice(0, 2).join(" and ") || "the queue"}…
          </p>
        ) : pending > 0 ? (
          <p>{pending === 1 ? "One book is" : `${pending} books are`} waiting. The shelf shows them in kraft paper until they are read.</p>
        ) : (
          <p>Nothing in the queue.</p>
        )}
        {ollamaProblem ? (
          <p role="alert" className="reader-alert">
            {!ollama.available
              ? "Ollama isn’t answering on this computer. Until it does, the shop can only be searched by keyword."
              : `Missing from Ollama: ${[!ollama.embedReady ? ollama.embedModel : null, !ollama.chatReady ? ollama.chatModel : null].filter(Boolean).join(" and ")}.`}
          </p>
        ) : null}
        {data.state.lastError && !data.state.running ? <p className="reader-alert">Last error: {data.state.lastError}</p> : null}
        {error ? <p className="reader-alert">{error}</p> : null}
      </div>
      {!data.state.running && pending > 0 ? (
        <button type="button" className="button" onClick={() => void start()}>
          Read the {pending === 1 ? "waiting book" : `${pending} waiting books`}
        </button>
      ) : null}
      <p className="reader-models">
        {ollama ? `${ollama.chatModel} reads · ${ollama.embedModel} searches` : "local models"} · on this computer
      </p>
    </section>
  );
}
