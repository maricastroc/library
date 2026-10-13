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
      setError("Não consegui consultar o andamento.");
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
      setError("Não consegui iniciar a leitura.");
    }
  };

  const { semantics, total } = data.stats;
  const done = semantics.ready + semantics.insufficient;
  const ollama = data.ollama;
  const ollamaProblem = ollama && (!ollama.available || !ollama.embedReady || !ollama.chatReady);

  return (
    <section aria-labelledby="reading-heading" className="border border-ink/30 bg-paper-light p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="reading-heading" className="display text-[1.5rem] leading-none">
          Leitura do catálogo pela IA
        </h2>
        <p className="eyebrow text-ink-soft">
          {ollama ? `${ollama.chatModel} · ${ollama.embedModel}` : "modelos locais"}
        </p>
      </div>
      <div
        className="mt-4 h-2 w-full bg-ink/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Livros já lidos pela IA"
      >
        <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }} />
      </div>
      <dl className="eyebrow mt-3 flex flex-wrap gap-x-6 gap-y-1 text-ink">
        <div className="flex gap-1.5">
          <dt className="text-ink-soft">lidos</dt>
          <dd>{semantics.ready}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-soft">na fila</dt>
          <dd>{pending}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-soft">sinopse insuficiente</dt>
          <dd>{semantics.insufficient}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-soft">com erro</dt>
          <dd>{semantics.error}</dd>
        </div>
      </dl>
      <div className="mt-3 min-h-6 text-[0.95rem]" aria-live="polite">
        {data.state.running ? (
          <p className="italic text-ink-soft">
            Lendo agora: {data.state.current.slice(0, 3).join(", ") || "preparando embeddings"}…
          </p>
        ) : pending > 0 ? (
          <p className="text-ink-soft">Há livros aguardando leitura. A estante já os mostra em papel pardo.</p>
        ) : (
          <p className="text-ink-soft">Tudo em dia.</p>
        )}
        {ollamaProblem ? (
          <p role="alert" className="mt-1 text-vermilion">
            {!ollama.available
              ? "O Ollama não está respondendo neste computador. Sem ele, a estante só busca por palavras."
              : `Modelo ausente no Ollama: ${[!ollama.embedReady ? ollama.embedModel : null, !ollama.chatReady ? ollama.chatModel : null].filter(Boolean).join(" e ")}.`}
          </p>
        ) : null}
        {data.state.lastError && !data.state.running ? (
          <p className="mt-1 text-vermilion">Último erro: {data.state.lastError}</p>
        ) : null}
        {error ? <p className="mt-1 text-vermilion">{error}</p> : null}
      </div>
      {!data.state.running && pending > 0 ? (
        <button type="button" className="button mt-3" onClick={() => void start()}>
          Ler os {pending} pendentes
        </button>
      ) : null}
    </section>
  );
}
