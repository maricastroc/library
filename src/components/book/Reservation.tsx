"use client";

import { useId, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";

type Status =
  | { step: "closed" }
  | { step: "form"; error: string | null; field: string | null; sending: boolean }
  | { step: "sent"; kind: "reservation" | "notice" };

export function Reservation({ book, query }: { book: ShelfBook; query: string | null }) {
  const [status, setStatus] = useState<Status>({ step: "closed" });
  const nameId = useId();
  const contactId = useId();
  const messageId = useId();
  const errorId = useId();
  const price = formatPrice(book.priceCents);
  const available = book.stock === null ? null : book.stock > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus({ step: "form", error: null, field: null, sending: true });
    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: book.slug,
          name: form.get("name"),
          contact: form.get("contact"),
          message: form.get("message") || undefined,
          website: form.get("website") || undefined,
          query: query ?? undefined,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; kind?: "reservation" | "notice"; error?: string; field?: string };
      if (!response.ok || !data.ok) {
        setStatus({ step: "form", error: data.error ?? "Não foi possível registrar agora.", field: data.field ?? null, sending: false });
        return;
      }
      setStatus({ step: "sent", kind: data.kind ?? "reservation" });
    } catch {
      setStatus({ step: "form", error: "Sem conexão com a livraria. Tente de novo em instantes.", field: null, sending: false });
    }
  };

  return (
    <section aria-label="Preço e reserva" className="border-t-2 border-ink pt-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="display text-[2.1rem] leading-none">{price ?? "Preço sob consulta"}</p>
          <p className="eyebrow mt-1.5 text-ink-soft">
            {book.priceIsDemo && price ? "preço demonstrativo · " : ""}
            {available === null
              ? "disponibilidade sob consulta"
              : available
                ? `${book.stock} ${book.stock === 1 ? "exemplar" : "exemplares"} na loja`
                : "esgotado no momento"}
            {book.stockIsDemo && available !== null ? " · estoque demonstrativo" : ""}
          </p>
        </div>
        {status.step === "closed" ? (
          <button
            type="button"
            className="button"
            onClick={() => setStatus({ step: "form", error: null, field: null, sending: false })}
          >
            {available === false ? "Avise-me quando chegar" : "Reservar um exemplar"}
          </button>
        ) : null}
      </div>

      {status.step === "form" ? (
        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <p className="text-[0.98rem] text-ink-soft">
            {available === false
              ? "Deixe seu contato e a livraria avisa quando o livro voltar."
              : "A livraria separa o exemplar e confirma com você. Nada é cobrado agora."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={nameId} className="eyebrow text-ink-soft">
                Seu nome
              </label>
              <input
                id={nameId}
                name="name"
                className="field"
                autoComplete="name"
                required
                maxLength={80}
                aria-invalid={status.field === "name"}
                aria-describedby={status.error ? errorId : undefined}
              />
            </div>
            <div>
              <label htmlFor={contactId} className="eyebrow text-ink-soft">
                E-mail ou telefone
              </label>
              <input
                id={contactId}
                name="contact"
                className="field"
                autoComplete="email"
                required
                maxLength={120}
                aria-invalid={status.field === "contact"}
                aria-describedby={status.error ? errorId : undefined}
              />
            </div>
          </div>
          <div>
            <label htmlFor={messageId} className="eyebrow text-ink-soft">
              Recado para a livraria (opcional)
            </label>
            <textarea id={messageId} name="message" className="field resize-none" rows={2} maxLength={500} />
          </div>
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Não preencha
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {status.error ? (
            <p id={errorId} role="alert" className="text-[0.95rem] text-vermilion">
              {status.error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="button" disabled={status.sending}>
              {status.sending ? "Enviando…" : available === false ? "Quero ser avisada(o)" : "Confirmar reserva"}
            </button>
            <button type="button" className="eyebrow text-ink-soft hover:text-ink" onClick={() => setStatus({ step: "closed" })}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {status.step === "sent" ? (
        <p role="status" className="mt-4 border-l-2 border-vermilion pl-3 text-[1.02rem]">
          {status.kind === "reservation"
            ? "Reserva anotada. A livraria vai separar o exemplar e entrar em contato para confirmar."
            : "Anotado. A livraria avisa você assim que este livro voltar à estante."}
        </p>
      ) : null}
    </section>
  );
}
