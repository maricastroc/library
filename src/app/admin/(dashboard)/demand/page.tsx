import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { clearSampleSearches, clearSearchLog } from "@/app/admin/actions";
import { ConfirmRemoval } from "@/components/admin/ConfirmRemoval";
import { PageHead, SectionHead, Stamp } from "@/components/admin/Counter";
import { RETENTION_DAYS, bookNames, demandArchive, phraseVectors, readDemand, shelfAtmospheres } from "@/lib/demand";
import { atmosphereDemand, bookTraffic, buildGroups, groupPhrases, phrasesOf, summarize, type DemandGroup, type Shortfall } from "@/lib/demand/report";
import { ATMOSPHERES, ATMOSPHERE_BY_ID, atmosphereLabel, type AtmosphereId } from "@/lib/semantic/taxonomy";

export const metadata: Metadata = { title: "Demand" };
export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90];
const SHOWN_GROUPS = 10;

const SHORTFALL: Record<Shortfall, string> = {
  declined: "declined: not something the catalogue holds",
  empty: "no book came close",
  weak: "answered with low confidence",
  offline: "the local AI was off, keywords only",
  loose: "answered, but with nothing close",
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function day(value: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function Phrasings({ group }: { group: DemandGroup }) {
  const others = group.phrases.slice(1);
  if (others.length === 0) return null;
  return (
    <p className="demand-also">
      also asked as{" "}
      {others.map((phrase, index) => (
        <span key={phrase.folded}>
          {index > 0 ? " · " : ""}“{phrase.text}”{phrase.count > 1 ? <span className="demand-times"> ×{phrase.count}</span> : null}
        </span>
      ))}
    </p>
  );
}

function BookList({ items, names, empty }: { items: { id: number; times: number }[]; names: Map<number, { title: string; author: string }>; empty: string }) {
  const known = items.filter((item) => names.has(item.id)).slice(0, 5);
  if (known.length === 0) return <p className="demand-none">{empty}</p>;
  return (
    <ol className="demand-books">
      {known.map((item) => (
        <li key={item.id}>
          <Link href={`/admin/books/${item.id}`} className="demand-book">
            {names.get(item.id)!.title}
            <span>{names.get(item.id)!.author}</span>
          </Link>
          <span className="demand-book-times">{item.times}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function DemandPage({ searchParams }: PageProps<"/admin/demand">) {
  const query = await searchParams;
  const days = PERIODS.find((period) => String(period) === query.days) ?? 30;
  const entries = readDemand(days);
  const archive = demandArchive();
  const phrases = phrasesOf(entries);
  const vectors = await phraseVectors(phrases);
  const groups = buildGroups(entries, groupPhrases(phrases, vectors));
  const summary = summarize(entries);
  const answeredGroups = groups.filter((group) => !group.shortfall);
  const missingGroups = groups.filter((group) => group.shortfall);
  const shelf = shelfAtmospheres();
  const atmospheres = atmosphereDemand(entries, shelf.counts, ATMOSPHERES.map((atmosphere) => atmosphere.id));
  const withAtmosphere = entries.filter((entry) => entry.atmospheres.length + entry.inferred.length > 0).length;
  const shares = atmospheres.map((row) => ({
    asked: withAtmosphere > 0 ? (row.named + row.read) / withAtmosphere : 0,
    stocked: shelf.books > 0 ? row.onShelf / shelf.books : 0,
  }));
  const widest = Math.max(0.0001, ...shares.flatMap((share) => [share.asked, share.stocked]));
  const traffic = bookTraffic(entries);
  const names = bookNames();
  const unanswered = summary.missed;
  const period = days === 7 ? "the last week" : `the last ${days} days`;

  return (
    <div className="counter-page counter-page-wide">
      <PageHead
        folio="06 · what readers ask"
        title={
          <>
            What readers <em>ask for</em>
          </>
        }
        lede={<p>Every search on the shelf, kept on this computer without who made it, and read together by meaning: “something funny” and “I want to laugh” count as one request.</p>}
        actions={
          <div role="group" aria-label="Period" className="demand-periods">
            {PERIODS.map((period) => (
              <Link key={period} href={period === 30 ? "/admin/demand" : `/admin/demand?days=${period}`} className="facet-option" aria-current={period === days ? "page" : undefined}>
                {period} days
              </Link>
            ))}
          </div>
        }
      />

      {summary.samples > 0 ? (
        <p className="slip demand-sample">
          {summary.samples === summary.searches ? "All" : `${summary.samples} of the ${summary.searches}`} searches here are samples made for the demo: real requests run through the
          shelf, with the books it really showed and the confidence it really had. Which of those books were opened or reserved is simulated, and the dates are spread over the
          last month. They can be deleted under <a href="#kept">What is kept</a>.
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="blank">
          <p className="blank-line">No searches in {period}.</p>
          <p className="blank-hint">What readers type into the shelf’s search appears here, grouped by meaning, without who typed it.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="demand-summary-heading" className="demand-summary">
            <h2 id="demand-summary-heading" className="sr-only">
              In {period}
            </h2>
            <p className="demand-verdict">
              In {period} readers searched {plural(summary.searches, "time", "times")}. The shelf answered {summary.answered} with books close to what they asked
              {summary.loose > 0 ? <>, {summary.loose} only loosely</> : null}
              {unanswered > 0 ? <>, and <em>{unanswered} found little or nothing</em></> : null}.
            </p>
            <dl className="demand-figures">
              {[
                { label: "searches", value: summary.searches },
                { label: "answered closely", value: summary.answered },
                { label: "only loosely", value: summary.loose },
                { label: "found little or nothing", value: unanswered, tone: unanswered > 0 ? "missing" : undefined },
                { label: "ended with a book opened", value: summary.opened },
                { label: "with a reservation or a notice", value: summary.reserved },
              ].map((figure) => (
                <div key={figure.label} data-tone={figure.tone}>
                  <dt>{figure.label}</dt>
                  <dd>{figure.value}</dd>
                </div>
              ))}
            </dl>
            {vectors === null ? <p className="counter-field-hint">The local AI is not answering, so requests are grouped by their exact words for now.</p> : null}
          </section>

          <section aria-labelledby="missing-heading" className="counter-section">
            <SectionHead id="missing-heading" title={<>What the shelf <em>could not answer</em></>} aside={missingGroups.length > 0 ? "a list to buy from" : undefined} />
            {missingGroups.length === 0 ? (
              <p className="demand-none demand-none-wide">Every request in {period} found books close to what was asked.</p>
            ) : (
              <ol className="demand-groups">
                {missingGroups.map((group) => (
                  <li key={group.label} className="demand-group" data-missing={group.shortfall === "loose" ? "loose" : ""}>
                    <div className="demand-group-text">
                      <p className="demand-label">{group.label}</p>
                      <Phrasings group={group} />
                      <p className="demand-reason">{SHORTFALL[group.shortfall!]}</p>
                    </div>
                    <p className="demand-count">
                      {group.count}
                      <span>{group.count === 1 ? "time" : "times"}</span>
                    </p>
                    <p className="demand-shown">
                      {group.shown.filter((item) => names.has(item.id)).length > 0 ? (
                        <>
                          <span className="eyebrow">it showed</span>{" "}
                          {group.shown
                            .filter((item) => names.has(item.id))
                            .slice(0, 2)
                            .map((item) => names.get(item.id)!.title)
                            .join(", ")}
                        </>
                      ) : (
                        <span className="eyebrow">it showed nothing</span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="asked-heading" className="counter-section">
            <SectionHead id="asked-heading" title={<>What they <em>asked for</em></>} aside={`${plural(answeredGroups.length, "request", "requests")} the shelf answered`} />
            <ol className="demand-groups">
              {answeredGroups.slice(0, SHOWN_GROUPS).map((group) => (
                <DemandRow key={group.label} group={group} names={names} />
              ))}
            </ol>
            {answeredGroups.length > SHOWN_GROUPS ? (
              <details className="demand-more">
                <summary>Show the other {answeredGroups.length - SHOWN_GROUPS}</summary>
                <ol className="demand-groups">
                  {answeredGroups.slice(SHOWN_GROUPS).map((group) => (
                    <DemandRow key={group.label} group={group} names={names} />
                  ))}
                </ol>
              </details>
            ) : null}
          </section>

          {atmospheres.length > 0 ? (
            <section aria-labelledby="atmospheres-heading" className="counter-section">
              <SectionHead id="atmospheres-heading" title={<>Atmospheres asked for, <em>against the shelf</em></>} aside="share of requests · share of books" />
              <ul className="demand-atmospheres">
                {atmospheres.map((row, index) => {
                  const { asked, stocked } = shares[index];
                  const short = row.named + row.read >= 3 && asked >= stocked * 1.5;
                  return (
                    <li
                      key={row.id}
                      className="demand-atmosphere"
                      data-short={short ? "" : undefined}
                      style={{ "--asked": asked / widest, "--stocked": stocked / widest, "--tint": ATMOSPHERE_BY_ID[row.id as AtmosphereId]?.color } as CSSProperties}
                    >
                      <p className="demand-atmosphere-name">
                        <span aria-hidden className="demand-atmosphere-dot" />
                        {atmosphereLabel(row.id)}
                      </p>
                      <p className="demand-atmosphere-counts">
                        {row.named > 0 ? <span>named in {plural(row.named, "search", "searches")}</span> : null}
                        {row.read > 0 ? <span>read into {row.read} more</span> : null}
                        <span>{plural(row.onShelf, "book", "books")} on the shelf</span>
                      </p>
                      <span aria-hidden className="demand-bars">
                        <span className="demand-bar" data-kind="asked" />
                        <span className="demand-bar" data-kind="stocked" />
                      </span>
                      {short ? <Stamp tone="vermilion">asked more than stocked</Stamp> : <span />}
                    </li>
                  );
                })}
              </ul>
              <p className="counter-field-hint">
                Named: the reader wrote the atmosphere. Read into: the shelf heard it in the request. The top bar is the share of requests with an atmosphere that ask for this one; the lower one,
                the share of the {shelf.books} books read by the AI that carry it.
              </p>
            </section>
          ) : null}

          <section aria-labelledby="journey-heading" className="counter-section">
            <SectionHead id="journey-heading" title={<>From request <em>to reservation</em></>} aside="the books searches led to" />
            <div className="demand-journey">
              <div>
                <p className="eyebrow demand-journey-title">Shown most often</p>
                <BookList items={traffic.shown} names={names} empty="No book was shown." />
              </div>
              <div>
                <p className="eyebrow demand-journey-title">Opened most often</p>
                <BookList items={traffic.opened} names={names} empty="No book was opened from a search." />
              </div>
              <div>
                <p className="eyebrow demand-journey-title">Reserved, or asked to be told</p>
                <BookList items={traffic.reserved} names={names} empty={`No reservation came from a search in ${period}.`} />
              </div>
            </div>
          </section>
        </>
      )}

      <section id="kept" aria-labelledby="kept-heading" className="counter-section demand-kept">
        <SectionHead id="kept-heading" title={<>What is <em>kept</em></>} aside="only on this computer" />
        <dl className="demand-kept-list">
          <div>
            <dt>Kept</dt>
            <dd>The words of each search, when it was made, how the shelf answered, the books it showed, and which of them were opened or reserved from it.</dd>
          </div>
          <div>
            <dt>Never kept</dt>
            <dd>Who searched: no name, contact, address or device. A reservation keeps its own letter in Reservations, as it always has.</dd>
          </div>
          <div>
            <dt>For how long</dt>
            <dd>{RETENTION_DAYS} days. Older searches are deleted the next time someone searches.</dd>
          </div>
          <div>
            <dt>Now</dt>
            <dd>
              {archive.stored === 0
                ? "Nothing is stored."
                : `${plural(archive.stored, "search is", "searches are")} stored, the oldest from ${day(archive.oldest!)}${archive.samples > 0 ? `; ${archive.samples} of them are samples for the demo` : ""}.`}
            </dd>
          </div>
        </dl>
        {archive.stored > 0 ? (
          <div className="demand-kept-actions">
            {archive.samples > 0 && archive.samples < archive.stored ? (
              <ConfirmRemoval action={clearSampleSearches} id={0} label="Delete the sample searches" question={`Delete the ${archive.samples} sample searches made for the demo? The real ones stay.`} />
            ) : null}
            <ConfirmRemoval action={clearSearchLog} id={0} label="Delete the whole search log" question={`Delete all ${archive.stored} searches? This page starts again from the next one.`} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DemandRow({ group, names }: { group: DemandGroup; names: Map<number, { title: string; author: string }> }) {
  const shown = group.shown.filter((item) => names.has(item.id)).slice(0, 2);
  return (
    <li className="demand-group">
      <div className="demand-group-text">
        <p className="demand-label">{group.label}</p>
        <Phrasings group={group} />
      </div>
      <p className="demand-count">
        {group.count}
        <span>{group.count === 1 ? "time" : "times"}</span>
      </p>
      <p className="demand-shown">
        {shown.length > 0 ? (
          <>
            <span className="eyebrow">it showed</span> {shown.map((item) => names.get(item.id)!.title).join(", ")}
          </>
        ) : null}
        {group.answered < group.count ? <span className="demand-journey-line">{group.answered} of {group.count} answered closely</span> : null}
        {group.opened + group.reserved > 0 ? (
          <span className="demand-journey-line">
            {group.opened > 0 ? `${group.opened} opened a book` : ""}
            {group.opened > 0 && group.reserved > 0 ? " · " : ""}
            {group.reserved > 0 ? `${group.reserved} reserved` : ""}
          </span>
        ) : null}
      </p>
    </li>
  );
}
