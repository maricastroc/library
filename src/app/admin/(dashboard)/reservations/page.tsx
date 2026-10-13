import type { Metadata } from "next";
import Link from "next/link";
import { updateInterest } from "@/app/admin/actions";
import { listInterests } from "@/lib/interest";

export const metadata: Metadata = { title: "Reservations" };

export default function ReservationsPage() {
  const interests = listInterests();
  const open = interests.filter((interest) => interest.status === "new");
  const closed = interests.filter((interest) => interest.status !== "new");
  return (
    <div className="max-w-5xl">
      <h1 className="display text-[2.6rem] leading-none">Reservations and notification requests</h1>
      <p className="mt-3 text-ink-soft">Requests readers make from inside an open book. Nothing is charged through the site: you confirm by getting in touch directly.</p>

      <section aria-labelledby="open-requests-heading" className="mt-8">
        <h2 id="open-requests-heading" className="eyebrow border-b border-ink pb-2 text-ink">
          Awaiting a reply · {open.length}
        </h2>
        {open.length === 0 ? (
          <p className="py-8 text-ink-soft">No requests waiting. When someone reserves a book, it shows up here.</p>
        ) : (
          <ul className="divide-y divide-ink/20">
            {open.map((interest) => (
              <li key={interest.id} className="grid gap-x-8 gap-y-3 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="eyebrow text-vermilion">{interest.kind === "reservation" ? "reservation" : "notification request"}</p>
                  <p className="display mt-1 text-[1.3rem] leading-tight">
                    <Link href={`/admin/books/${interest.bookId}`} className="hover:text-vermilion">
                      {interest.bookTitle}
                    </Link>
                  </p>
                  <p className="text-[0.95rem] italic text-ink-soft">{interest.bookAuthor}</p>
                  <p className="mt-2 text-[1rem]">
                    <span className="font-label font-semibold">{interest.name}</span> · <span className="font-mono text-[0.88rem]">{interest.contact}</span>
                  </p>
                  {interest.message ? <p className="mt-1 text-[0.98rem]">“{interest.message}”</p> : null}
                  <p className="eyebrow mt-2 text-[9px] text-ink-soft">
                    {interest.createdAt.slice(0, 16)}
                    {interest.searchQuery ? ` · came searching for “${interest.searchQuery}”` : ""}
                  </p>
                </div>
                <form action={updateInterest} className="flex flex-col items-start gap-2 md:items-end">
                  <input type="hidden" name="id" value={interest.id} />
                  {interest.kind === "reservation" ? (
                    <label className="eyebrow inline-flex cursor-pointer items-center gap-2">
                      <input type="checkbox" name="decrement" value="1" defaultChecked className="h-4 w-4 accent-[var(--color-ink)]" />
                      take 1 off the stock
                    </label>
                  ) : null}
                  <div className="flex gap-2">
                    <button type="submit" name="status" value="fulfilled" className="button">
                      Mark as fulfilled
                    </button>
                    <button type="submit" name="status" value="cancelled" className="button button-outline">
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 ? (
        <section aria-labelledby="closed-requests-heading" className="mt-12">
          <h2 id="closed-requests-heading" className="eyebrow border-b border-ink pb-2 text-ink">
            Resolved · {closed.length}
          </h2>
          <ul className="divide-y divide-ink/15 text-[0.95rem]">
            {closed.map((interest) => (
              <li key={interest.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2">
                <span>
                  <span className="font-label font-semibold">{interest.name}</span> · <span className="italic">{interest.bookTitle}</span>
                </span>
                <span className="flex items-center gap-4">
                  <span className="eyebrow text-ink-soft">{interest.status}</span>
                  <form action={updateInterest}>
                    <input type="hidden" name="id" value={interest.id} />
                    <button type="submit" name="status" value="new" className="eyebrow ink-link">
                      reopen
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
