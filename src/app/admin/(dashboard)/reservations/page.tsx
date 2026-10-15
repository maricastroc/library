import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, SectionHead, Stamp, age, daysSince } from "@/components/admin/Counter";
import { LetterActions, ReopenButton } from "@/components/admin/LetterActions";
import { getBookById } from "@/lib/catalog/books";
import { listInterests, type Interest } from "@/lib/interest";

export const metadata: Metadata = { title: "Reservations" };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function received(createdAt: string): string {
  const date = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return createdAt.slice(0, 16);
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function replyLink(interest: Interest): string | null {
  const contact = interest.contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    const subject = interest.kind === "reservation" ? `Your reservation: ${interest.bookTitle}` : `${interest.bookTitle} is back`;
    return `mailto:${contact}?subject=${encodeURIComponent(subject)}`;
  }
  const digits = contact.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 8 ? `tel:${digits}` : null;
}

function outcome(interest: Interest): { tone: "ink" | "faint"; label: string } {
  if (interest.status === "cancelled") return { tone: "faint", label: "cancelled" };
  return { tone: "ink", label: interest.kind === "reservation" ? "fulfilled" : "reader told" };
}

export default function ReservationsPage() {
  const interests = listInterests();
  const waiting = interests.filter((interest) => interest.status === "new").sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
  const filed = interests.filter((interest) => interest.status !== "new");
  const shelf = new Map(waiting.map((interest) => [interest.bookId, getBookById(interest.bookId)]));
  const reservations = waiting.filter((interest) => interest.kind === "reservation").length;
  const oldest = waiting[0] ? daysSince(waiting[0].createdAt) : 0;

  return (
    <div className="counter-page">
      <PageHead
        folio="05 · correspondence"
        title={
          <>
            Requests <em>on the desk</em>
          </>
        }
        lede={
          <p>
            Readers write from inside an open book. When copies are on the shelf the request is a reservation; when the book is out of stock it becomes a request to be told when it returns.
            Nothing is charged on the site: you reply directly, then file the request here.
          </p>
        }
      />

      <section aria-labelledby="waiting-heading" className="counter-section">
        <SectionHead
          id="waiting-heading"
          title="Awaiting a reply"
          count={waiting.length || undefined}
          aside={waiting.length > 0 ? "oldest first" : undefined}
        />
        {waiting.length === 0 ? (
          <div className="blank">
            <p className="blank-line">No letters on the desk.</p>
            <p className="blank-hint">
              {filed.length === 0
                ? "No reader has written yet. Each book’s jacket on the public shelf carries a slip to reserve it, or to be told when it is back; what they send arrives here with their contact and the search that led them to the book."
                : "Everything has been answered. Filed requests are below and can be reopened."}
            </p>
          </div>
        ) : (
          <>
            <p className="letters-summary">
              {plural(reservations, "reservation", "reservations")} and {plural(waiting.length - reservations, "request to be told", "requests to be told")}
              {oldest > 0 ? <> · the oldest has waited {plural(oldest, "day", "days")}</> : <> · all from today</>}
            </p>
            <ol className="letters-pile">
              {waiting.map((interest) => {
                const book = shelf.get(interest.bookId) ?? null;
                const stock = book?.stock ?? null;
                const reply = replyLink(interest);
                const days = daysSince(interest.createdAt);
                return (
                  <li key={interest.id} className="letter" data-kind={interest.kind} data-late={days >= 3 ? "" : undefined}>
                    <div className="letter-post">
                      <span className="letter-age">{age(interest.createdAt)}</span>
                      <span className="eyebrow letter-received">{received(interest.createdAt)}</span>
                    </div>

                    <div className="letter-body">
                      <p className="eyebrow letter-kind">{interest.kind === "reservation" ? "reservation · set a copy aside" : "notify me · when it is back"}</p>
                      <p className="letter-line">
                        <span className="letter-who">{interest.name}</span> {interest.kind === "reservation" ? "asks you to set aside a copy of" : "would like to know when you have"}{" "}
                        <Link href={`/admin/books/${interest.bookId}`} className="letter-book">
                          {interest.bookTitle}
                        </Link>
                        <span className="letter-author">, {interest.bookAuthor}</span>.
                      </p>
                      {interest.message ? <blockquote className="letter-message">{interest.message}</blockquote> : null}
                      <p className="letter-meta">
                        {reply ? (
                          <a href={reply} className="letter-contact">
                            {interest.contact}
                          </a>
                        ) : (
                          <span className="letter-contact">{interest.contact}</span>
                        )}
                        {interest.searchQuery ? (
                          <span className="letter-query">
                            came searching for <q>{interest.searchQuery}</q>
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="letter-desk">
                      <p className="letter-stock">
                        {stock === null ? (
                          <Stamp tone="hollow">stock not recorded</Stamp>
                        ) : interest.kind === "reservation" ? (
                          stock > 0 ? (
                            <Stamp tone="soft">{plural(stock, "copy", "copies")} on the shelf</Stamp>
                          ) : (
                            <Stamp tone="vermilion">no copy left on the shelf</Stamp>
                          )
                        ) : stock > 0 ? (
                          <Stamp tone="vermilion">back on the shelf · {plural(stock, "copy", "copies")}</Stamp>
                        ) : (
                          <Stamp tone="faint">still out of stock</Stamp>
                        )}
                        {book?.stockIsDemo && stock !== null ? <span className="letter-demo">demo stock</span> : null}
                      </p>
                      <LetterActions id={interest.id} kind={interest.kind} stock={stock} />
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="counter-field-hint letters-foot">A filed request can be reopened from the archive below.</p>
          </>
        )}
      </section>

      {filed.length > 0 ? (
        <section aria-labelledby="filed-heading" className="counter-section">
          <SectionHead id="filed-heading" title="Filed" count={filed.length} aside="newest first" />
          <table className="ledger letters-archive">
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Reader</th>
                <th scope="col">Book</th>
                <th scope="col" className="hide-narrow">
                  Request
                </th>
                <th scope="col">Outcome</th>
                <th scope="col">
                  <span className="sr-only">Reopen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filed.map((interest) => {
                const result = outcome(interest);
                return (
                  <tr key={interest.id}>
                    <td className="letters-archive-when">{received(interest.createdAt)}</td>
                    <th scope="row">{interest.name}</th>
                    <td>
                      <Link href={`/admin/books/${interest.bookId}`} className="letters-archive-book">
                        {interest.bookTitle}
                      </Link>
                    </td>
                    <td className="hide-narrow">{interest.kind === "reservation" ? "reservation" : "notify me"}</td>
                    <td>
                      <Stamp tone={result.tone}>{result.label}</Stamp>
                    </td>
                    <td className="letters-archive-reopen">
                      <ReopenButton id={interest.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
