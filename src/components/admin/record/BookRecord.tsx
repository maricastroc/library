"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { removeBook, saveBook, saveClassification } from "@/app/admin/actions";
import { Cover } from "@/components/book/Cover";
import type { BookDetail, ShelfBook } from "@/lib/catalog/types";
import { spineIdentity } from "@/lib/shelf/identity";
import { ConfirmRemoval } from "../ConfirmRemoval";
import { Stamp } from "../Counter";
import { FormFeedback, INITIAL_FORM_STATE } from "../FormParts";
import {
  BibliographicFields,
  FIELD_NAMES,
  NoteCard,
  READING_INPUTS,
  RECORD_FORM,
  SynopsisField,
  changedFields,
  readRecord,
  recordValues,
  type RecordField,
  type RecordValues,
} from "./fields";
import { PresentationPanel, type Destination } from "./PresentationPanel";
import { changedParts, readingKey, readingOf, type Reading } from "./reading";
import { ReadingPanel } from "./ReadingPanel";

export type Tab = "details" | "reading" | "presentation";

const TABS: { id: Tab; number: string; label: string }[] = [
  { id: "details", number: "01", label: "Book details" },
  { id: "reading", number: "02", label: "AI reading" },
  { id: "presentation", number: "03", label: "Presentation" },
];

const SHELF_FIELDS: RecordField[] = ["price", "stock"];

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "catalogue source";
  }
}

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

function readingNote(book: BookDetail): string {
  if (book.semanticStatus === "pending") return "in the queue";
  if (book.semanticStatus === "processing") return "being read";
  if (book.semanticStatus === "insufficient") return "too little synopsis";
  if (book.semanticStatus === "error") return "reading failed";
  return book.semanticOrigin === "bookseller" ? "reviewed by you" : "read by the AI";
}

export function BookRecord({ book, signature, shopName, initialTab, created }: { book: BookDetail; signature: string; shopName: string; initialTab: Tab; created: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ details: null, reading: null, presentation: null });
  const sentinel = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const [stuck, setStuck] = useState(false);

  const [recordState, recordDispatch, recordPending] = useActionState(saveBook, INITIAL_FORM_STATE);
  const [baseline, setBaseline] = useState<RecordValues>(() => recordValues(book));
  const [values, setValues] = useState<RecordValues>(baseline);
  const [submittedRecord, setSubmittedRecord] = useState<RecordValues | null>(null);
  const [seenRecord, setSeenRecord] = useState(recordState);
  if (recordState !== seenRecord) {
    setSeenRecord(recordState);
    if (recordState.ok && submittedRecord) setBaseline(submittedRecord);
  }

  const [readingState, readingDispatch, readingPending] = useActionState(saveClassification, INITIAL_FORM_STATE);
  const serverReading = useMemo(() => readingOf(book), [book]);
  const [reading, setReading] = useState<Reading>(serverReading);
  const [readingBaseline, setReadingBaseline] = useState<Reading>(serverReading);
  const [readingSource, setReadingSource] = useState(() => readingKey(serverReading));
  const [submittedReading, setSubmittedReading] = useState<Reading | null>(null);
  const [seenReading, setSeenReading] = useState(readingState);
  if (readingState !== seenReading) {
    setSeenReading(readingState);
    if (readingState.ok && submittedReading) setReadingBaseline(submittedReading);
  }
  const serverKey = readingKey(serverReading);
  if (serverKey !== readingSource) {
    setReadingSource(serverKey);
    if (readingKey(reading) === readingKey(readingBaseline)) setReading(serverReading);
    setReadingBaseline(serverReading);
  }

  const recordChanged = changedFields(values, baseline);
  const readingChanged = changedParts(reading, readingBaseline);
  const detailsDirty = recordChanged.some((field) => !SHELF_FIELDS.includes(field));
  const shelfDirty = recordChanged.some((field) => SHELF_FIELDS.includes(field));
  const anyDirty = recordChanged.length > 0 || readingChanged.length > 0;
  const rereads = book.semanticOrigin === "ai" && recordChanged.some((field) => READING_INPUTS.includes(field));
  const waiting = book.semanticStatus === "pending" || book.semanticStatus === "processing";
  const errorFields = recordState.ok ? [] : (Object.keys(recordState.fields ?? {}) as RecordField[]);
  const errorIn: Record<Tab, RecordField | null> = {
    details: errorFields.find((field) => !SHELF_FIELDS.includes(field)) ?? null,
    reading: null,
    presentation: errorFields.find((field) => SHELF_FIELDS.includes(field)) ?? null,
  };

  const draft: ShelfBook = {
    ...book,
    title: values.title.trim() || book.title,
    author: values.author.trim() || book.author,
    genre: values.genre || null,
    year: /^\d+$/.test(values.year.trim()) ? Number(values.year) : null,
    pages: /^\d+$/.test(values.pages.trim()) ? Number(values.pages) : null,
    semanticStatus: readingChanged.length > 0 ? (reading.atmospheres.length > 0 ? "ready" : "pending") : book.semanticStatus,
    atmospheres: reading.atmospheres,
    pace: reading.pace,
    density: reading.density,
    styles: reading.styles,
    experiences: reading.experiences,
  };
  const identity = spineIdentity(draft);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [waiting, router]);

  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.hash)) return;
      if (!window.confirm("Leave this book? The changes you haven’t saved will be lost.")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [anyDirty]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const choose = (next: Tab, focusField?: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "details") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    url.searchParams.delete("created");
    window.history.replaceState(window.history.state, "", url);
    const top = sentinel.current ? sentinel.current.getBoundingClientRect().top + window.scrollY : 0;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
    if (focusField && next === tab) document.getElementById(focusField)?.focus();
    else focusNext.current = focusField ?? null;
  };

  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    document.getElementById(id)?.focus();
  }, [tab]);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const target = event.key === "ArrowRight" ? (index === last ? 0 : index + 1) : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : null;
    if (target === null) return;
    event.preventDefault();
    choose(TABS[target].id);
    tabRefs.current[TABS[target].id]?.focus();
  };

  const track = (target: EventTarget) => {
    const form = (target as HTMLInputElement).form;
    if (form?.getAttribute("id") === RECORD_FORM) setValues(readRecord(new FormData(form)));
  };

  const submitRecord = (data: FormData) => {
    setSubmittedRecord(readRecord(data));
    recordDispatch(data);
  };

  const submitReading = (data: FormData) => {
    setSubmittedReading(reading);
    readingDispatch(data);
  };

  const recordSaveBar = (
    <div className="save-bar" data-dirty={recordChanged.length > 0 ? "true" : undefined}>
      <button type="submit" form={RECORD_FORM} className="button" disabled={recordPending}>
        {recordPending ? "Saving…" : "Save the record"}
      </button>
      {recordChanged.length > 0 ? <Stamp tone="vermilion">unsaved · {recordChanged.map((field) => FIELD_NAMES[field]).join(", ")}</Stamp> : null}
      <FormFeedback state={recordState} />
      {TABS.filter((item) => item.id !== tab && errorIn[item.id]).map((item) => (
        <button key={item.id} type="button" className="button-quiet" data-tone="danger" onClick={() => choose(item.id, errorIn[item.id] ?? undefined)}>
          {FIELD_NAMES[errorIn[item.id] as RecordField]} is in {item.label} →
        </button>
      ))}
      {recordChanged.length > 0 ? (
        <p className="save-bar-note">
          {rereads
            ? "Saving sends the book back to the AI: a new title, author, genre or synopsis means a new reading."
            : book.semanticOrigin === "bookseller" && recordChanged.some((field) => READING_INPUTS.includes(field))
              ? "Your reviewed reading stays as it is."
              : (detailsDirty && shelfDirty) || (tab === "presentation" && detailsDirty) || (tab === "details" && shelfDirty)
                ? "Saves the details and the price and stock together."
                : null}
        </p>
      ) : null}
    </div>
  );

  const dots: Record<Tab, boolean> = { details: detailsDirty, reading: readingChanged.length > 0, presentation: shelfDirty };
  const notes: Record<Tab, string> = {
    details: book.synopsis ? "record · synopsis · note" : "record · no synopsis yet",
    reading: readingNote(book),
    presentation: book.stock === 0 ? "cover · spine · out of stock" : "cover · spine · price",
  };

  return (
    <div
      className="entry"
      onInput={(event) => track(event.target)}
      onChange={(event) => track(event.target)}
    >
      <form id={RECORD_FORM} action={submitRecord} noValidate hidden>
        <input type="hidden" name="id" value={book.id} />
      </form>

      <header className="entry-head">
        <p className="eyebrow counter-head-folio">
          <Link href="/admin/books">← Books</Link>
          <span>02 · catalogue record</span>
        </p>
        <div className="entry-head-row">
          <div className="entry-head-cover" aria-hidden>
            <Cover title={draft.title} author={draft.author} genre={draft.genre} identity={identity} shopName={shopName} />
          </div>
          <div className="entry-head-text">
            <h1 className="entry-title">{book.title}</h1>
            <p className="entry-byline">
              <span className="entry-author">{book.author}</span>
              {book.genre || book.year ? (
                <span className="entry-facts">
                  {[book.genre, book.year].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </p>
            <ul className="entry-stamps" aria-label="State of the book">
              <li>
                <Stamp tone={book.semanticStatus === "error" ? "vermilion" : book.semanticStatus === "ready" ? (book.semanticOrigin === "bookseller" ? "vermilion" : "ink") : "kraft"}>{readingNote(book)}</Stamp>
              </li>
              {book.stock === 0 ? (
                <li>
                  <Stamp tone="vermilion">out of stock</Stamp>
                </li>
              ) : null}
              {book.priceIsDemo || book.stockIsDemo ? (
                <li>
                  <Stamp tone="faint">{book.priceIsDemo && book.stockIsDemo ? "demo price and stock" : book.priceIsDemo ? "demo price" : "demo stock"}</Stamp>
                </li>
              ) : null}
              {book.noteOrigin === "example" ? (
                <li>
                  <Stamp tone="faint">sample note</Stamp>
                </li>
              ) : null}
              <li className="entry-updated">changed {book.updatedAt.slice(0, 10)}</li>
            </ul>
          </div>
          <a href={`/?book=${book.slug}`} className="button-quiet entry-shop" target="_blank" rel="noreferrer">
            See it in the shop ↗
          </a>
        </div>
      </header>

      {created ? (
        <p role="status" className="slip slip-enter entry-created">
          Book added. The AI starts reading it in the background.
        </p>
      ) : null}

      <div ref={sentinel} aria-hidden />
      <div className="entry-tabs" data-stuck={stuck ? "" : undefined}>
        <p aria-hidden className="entry-tabs-title">{book.title}</p>
        <div role="tablist" aria-label="Parts of the record" className="entry-tablist">
          {TABS.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              className="entry-tab"
              onClick={() => choose(item.id)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              <span className="entry-tab-number">{item.number}</span>
              <span className="entry-tab-label">
                {item.label}
                {errorIn[item.id] ? (
                  <span className="entry-tab-dot" data-tone="error" role="img" aria-label="has a field to correct" />
                ) : dots[item.id] ? (
                  <span className="entry-tab-dot" role="img" aria-label="unsaved changes" />
                ) : null}
              </span>
              <span className="entry-tab-note">{notes[item.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <section id="panel-details" role="tabpanel" aria-labelledby="tab-details" hidden={tab !== "details"} className="entry-panel">
        <div className="sheet">
          <div className="sheet-main">
            <fieldset className="sheet-part">
              <legend className="eyebrow sheet-legend">The record</legend>
              <BibliographicFields book={book} errors={recordState.fields ?? {}} />
            </fieldset>
            <fieldset className="sheet-part">
              <legend className="eyebrow sheet-legend">Synopsis</legend>
              <SynopsisField book={book} words={countWords(values.synopsis)} />
            </fieldset>
          </div>
          <aside className="sheet-margin" aria-label="Beside the record">
            <fieldset className="sheet-part">
              <legend className="eyebrow sheet-legend">Your note</legend>
              <NoteCard book={book} signature={signature} />
            </fieldset>
            {book.sourceUrl || book.subjects.length > 0 || book.coverSource ? (
              <section className="sheet-part sheet-sources" aria-labelledby="sources-heading">
                <h3 id="sources-heading" className="eyebrow sheet-legend">
                  From the sources
                </h3>
                <dl className="sheet-facts">
                  {book.sourceUrl ? (
                    <div>
                      <dt>Record</dt>
                      <dd>
                        <a href={book.sourceUrl} className="ink-link" target="_blank" rel="noreferrer">
                          {host(book.sourceUrl)} ↗
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {book.language ? (
                    <div>
                      <dt>Edition language</dt>
                      <dd>{book.language}</dd>
                    </div>
                  ) : null}
                  {book.subjects.length > 0 ? (
                    <div>
                      <dt>Subjects</dt>
                      <dd className="sheet-subjects">{book.subjects.slice(0, 8).join(" · ")}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className="counter-field-hint">Read-only. The AI reads these subjects along with the synopsis.</p>
              </section>
            ) : null}
          </aside>
        </div>
        {recordSaveBar}
        <section className="entry-remove" aria-label="Remove the book">
          <ConfirmRemoval
            action={removeBook}
            id={book.id}
            label="Remove from the catalogue"
            question={`Remove “${book.title}” from the catalogue? Its reservations and its place in showcases go with it.`}
          />
        </section>
      </section>

      <section id="panel-reading" role="tabpanel" aria-labelledby="tab-reading" hidden={tab !== "reading"} className="entry-panel">
        <ReadingPanel
          book={book}
          reading={reading}
          setReading={setReading}
          changed={readingChanged}
          identity={identity}
          state={readingState}
          action={submitReading}
          pending={readingPending}
          waiting={waiting}
          synopsisDirty={recordChanged.includes("synopsis")}
          onDiscard={() => setReading(readingBaseline)}
        />
      </section>

      <section id="panel-presentation" role="tabpanel" aria-labelledby="tab-presentation" hidden={tab !== "presentation"} className="entry-panel">
        <PresentationPanel
          book={book}
          draft={draft}
          identity={identity}
          price={values.price}
          stock={values.stock}
          shopName={shopName}
          errors={recordState.fields ?? {}}
          unsaved={anyDirty}
          onGo={(destination: Destination, field?: string) => choose(destination, field)}
          saveBar={recordSaveBar}
        />
      </section>
    </div>
  );
}
