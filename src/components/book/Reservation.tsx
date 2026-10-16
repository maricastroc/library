"use client";

import { useId, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";

type Status =
  | { step: "closed" }
  | { step: "form"; error: string | null; field: string | null; sending: boolean }
  | { step: "sent"; kind: "reservation" | "notice" };

export function Reservation({ book, query, searchId = null }: { book: ShelfBook; query: string | null; searchId?: number | null }) {
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
          searchId: searchId ?? undefined,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; kind?: "reservation" | "notice"; error?: string; field?: string };
      if (!response.ok || !data.ok) {
        setStatus({ step: "form", error: data.error ?? "We couldn’t record that just now.", field: data.field ?? null, sending: false });
        return;
      }
      setStatus({ step: "sent", kind: data.kind ?? "reservation" });
    } catch {
      setStatus({ step: "form", error: "No connection to the bookshop. Try again in a moment.", field: null, sending: false });
    }
  };

  return (
    <section aria-label="Price and reservation" className="border-t-2 border-ink pt-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="display text-[2.1rem] leading-none">{price ?? "Price on request"}</p>
          <p className="eyebrow mt-1.5 text-ink-soft">
            {book.priceIsDemo && price ? "demo price · " : ""}
            {available === null
              ? "availability on request"
              : available
                ? `${book.stock} ${book.stock === 1 ? "copy" : "copies"} in the shop`
                : "out of stock for now"}
            {book.stockIsDemo && available !== null ? " · demo stock" : ""}
          </p>
        </div>
        {status.step === "closed" ? (
          <button
            type="button"
            className="button"
            onClick={() => setStatus({ step: "form", error: null, field: null, sending: false })}
          >
            {available === false ? "Notify me when it arrives" : "Reserve a copy"}
          </button>
        ) : null}
      </div>

      {status.step === "form" ? (
        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <p className="text-[0.98rem] text-ink-soft">
            {available === false
              ? "Leave your contact and the bookshop will let you know when the book is back."
              : "The bookshop sets the copy aside and confirms with you. Nothing is charged now."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={nameId} className="eyebrow text-ink-soft">
                Your name
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
                Email or phone
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
              Message for the bookshop (optional)
            </label>
            <textarea id={messageId} name="message" className="field resize-none" rows={2} maxLength={500} />
          </div>
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Leave this empty
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
              {status.sending ? "Sending…" : available === false ? "Notify me" : "Confirm reservation"}
            </button>
            <button type="button" className="eyebrow text-ink-soft hover:text-ink" onClick={() => setStatus({ step: "closed" })}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {status.step === "sent" ? (
        <p role="status" className="mt-4 border-l-2 border-vermilion pl-3 text-[1.02rem]">
          {status.kind === "reservation"
            ? "Reservation noted. The bookshop will set the copy aside and get in touch to confirm."
            : "Noted. The bookshop will let you know as soon as this book is back in the shop."}
        </p>
      ) : null}
    </section>
  );
}
