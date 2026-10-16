import Link from "next/link";
import { CatalogBand } from "@/components/admin/CatalogBand";
import { PageHead, SectionHead, Stamp, age } from "@/components/admin/Counter";
import { EnrichmentPanel } from "@/components/admin/EnrichmentPanel";
import { catalogStats, listBookDetails } from "@/lib/catalog/books";
import { listImportRuns } from "@/lib/catalog/import-csv";
import { readDemand } from "@/lib/demand";
import { isMissed } from "@/lib/demand/report";
import { listInterests } from "@/lib/interest";
import { ollamaStatus } from "@/lib/semantic/ollama";
import { enrichmentState } from "@/lib/semantic/pipeline";
import { SHOWCASE_PALETTES, listShowcases } from "@/lib/showcase";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default async function DashboardPage() {
  const stats = catalogStats();
  const books = listBookDetails();
  const interests = listInterests();
  const waiting = interests.filter((interest) => interest.status === "new");
  const showcases = listShowcases();
  const lastImport = listImportRuns(1)[0] ?? null;
  const ollama = await ollamaStatus();

  const read = stats.semantics.ready;
  const samples = books.filter((book) => book.noteOrigin === "example").length;
  const demoPrices = books.filter((book) => book.priceIsDemo).length;
  const reviewed = books.filter((book) => book.semanticOrigin === "bookseller").length;
  const drafts = showcases.filter((showcase) => !showcase.published).length;
  const published = showcases.length - drafts;
  const failed = stats.semantics.error;
  const unanswered = readDemand(7).filter(isMissed).length;
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const attention = [
    { count: waiting.length, text: waiting.length === 1 ? "request is waiting for your reply" : "requests are waiting for your reply", href: "/admin/reservations", action: "Answer", urgent: true },
    { count: stats.withoutSynopsis, text: stats.withoutSynopsis === 1 ? "book has no synopsis, so the AI can’t read it and searches by feeling won’t find it" : "books have no synopsis, so the AI can’t read them and searches by feeling won’t find them", href: "/admin/books?filter=without-synopsis", action: "Write synopses", urgent: false },
    { count: failed, text: failed === 1 ? "reading by the AI failed" : "readings by the AI failed", href: "/admin/books?filter=unread", action: "Look at them", urgent: true },
    { count: samples, text: samples === 1 ? "note is still a sample written for the demo" : "notes are still samples written for the demo", href: "/admin/books?filter=example-note", action: "Rewrite in your words", urgent: false },
    { count: demoPrices, text: demoPrices === 1 ? "price is a demo value" : "prices are demo values", href: "/admin/import", action: "Import real prices", urgent: false },
    { count: unanswered, text: unanswered === 1 ? "search this week found little or nothing on the shelf" : "searches this week found little or nothing on the shelf", href: "/admin/demand", action: "See what they asked", urgent: false },
    { count: stats.outOfStock, text: stats.outOfStock === 1 ? "title is out of stock" : "titles are out of stock", href: "/admin/books?filter=out-of-stock", action: "See which", urgent: false },
    { count: drafts, text: drafts === 1 ? "showcase is still a draft" : "showcases are still drafts", href: "/admin/showcases", action: "Review", urgent: false },
  ].filter((item) => item.count > 0);

  return (
    <div className="counter-page">
      <PageHead
        folio={`${today} · the day book`}
        title={
          <>
            {stats.total} books on the shelves, <em>{read === stats.total ? "all of them" : `${read} of them`} read</em> by the local AI.
          </>
        }
        lede={
          <p>
            {plural(stats.withNote, "carries", "carry")} a note from the bookshop
            {samples > 0 ? ` (${samples} still the demo’s samples)` : ""}, {reviewed > 0 ? `${plural(reviewed, "reading was", "readings were")} reviewed by you, ` : ""}
            {plural(published, "showcase is", "showcases are")} on display and{" "}
            {waiting.length === 0 ? "no request is waiting." : `${plural(waiting.length, "request is", "requests are")} waiting for a reply.`}
          </p>
        }
      />

      <CatalogBand books={books} />

      <div className="day-grid">
        <div className="day-main">
          <section aria-labelledby="attention-heading" className="counter-section">
            <SectionHead id="attention-heading" title={<>Needs <em>your</em> attention</>} aside={attention.length === 0 ? "nothing pending" : `${attention.length} ${attention.length === 1 ? "item" : "items"}`} />
            {attention.length === 0 ? (
              <div className="blank">
                <p className="blank-line">Nothing needs you right now. The catalogue is read, priced and answered.</p>
              </div>
            ) : (
              <ol className="attention">
                {attention.map((item) => (
                  <li key={item.href + item.text}>
                    <Link href={item.href} className="attention-row" data-urgent={item.urgent ? "true" : undefined}>
                      <span className="attention-count">{item.count}</span>
                      <span className="attention-text">{item.text}</span>
                      <span className="attention-action">
                        {item.action} <span aria-hidden>→</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="letters-heading" className="counter-section">
            <SectionHead
              id="letters-heading"
              title="Correspondence"
              count={waiting.length || undefined}
              aside={
                <Link href="/admin/reservations" className="ink-link">
                  all requests
                </Link>
              }
            />
            {waiting.length === 0 ? (
              <div className="blank">
                <p className="blank-line">No letters on the desk.</p>
                <p className="blank-hint">Reservations and “let me know” requests arrive from the slip inside each book’s jacket, on the public shelf.</p>
              </div>
            ) : (
              <ul className="letters">
                {waiting.slice(0, 5).map((interest) => (
                  <li key={interest.id} className="letters-row">
                    <span className="eyebrow letters-when">{age(interest.createdAt)}</span>
                    <span className="letters-body">
                      <span className="letters-who">{interest.name}</span>{" "}
                      {interest.kind === "reservation" ? "would like to reserve" : "wants to know when there is"}{" "}
                      <Link href={`/admin/books/${interest.bookId}`} className="letters-book">
                        {interest.bookTitle}
                      </Link>
                    </span>
                    <Stamp tone={interest.kind === "reservation" ? "vermilion" : "ink"}>{interest.kind === "reservation" ? "reservation" : "notify me"}</Stamp>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="day-margin" aria-label="The counter at a glance">
          <EnrichmentPanel initial={{ state: enrichmentState(), stats, ollama }} />

          <section aria-labelledby="display-heading" className="margin-block">
            <h2 id="display-heading" className="eyebrow margin-title">
              On display
            </h2>
            {showcases.length === 0 ? (
              <p className="margin-text">No showcases yet.</p>
            ) : (
              <ul className="display-list">
                {showcases.map((showcase) => (
                  <li key={showcase.id}>
                    <Link href={`/admin/showcases/${showcase.id}`} className="display-row">
                      <span aria-hidden className="display-swatch" style={{ background: SHOWCASE_PALETTES[showcase.palette].background }} />
                      <span className="display-name">{showcase.title}</span>
                      <Stamp tone={showcase.published ? "ink" : "faint"}>{showcase.published ? `${showcase.items.length} books` : "draft"}</Stamp>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="hand-heading" className="margin-block">
            <h2 id="hand-heading" className="eyebrow margin-title">
              At hand
            </h2>
            <ul className="at-hand">
              <li>
                <Link href="/admin/books/new">Add a book</Link>
              </li>
              <li>
                <Link href="/admin/import">Import a catalogue</Link>
              </li>
              <li>
                <Link href="/admin/showcases/new">Put together a showcase</Link>
              </li>
              {samples > 0 ? (
                <li>
                  <Link href="/admin/books?filter=example-note">Rewrite the sample notes</Link>
                </li>
              ) : null}
            </ul>
            <p className="margin-text">
              {lastImport
                ? `Last import: ${lastImport.filename ?? "unnamed file"}, ${lastImport.createdAt.slice(0, 10)} · ${lastImport.inserted} new, ${lastImport.updated} updated.`
                : "No catalogue imported from a spreadsheet yet; the books here came with the demo."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
