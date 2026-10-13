"use client";

import { useState, type ReactNode } from "react";
import { formatIsbn } from "@/lib/catalog/isbn";
import type { BookDetail, ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import {
  ATMOSPHERE_BY_ID,
  DENSITY_LEVELS,
  PACE_LEVELS,
  attributeLabel,
  confidenceLabel,
  experienceLabel,
  styleLabel,
} from "@/lib/semantic/taxonomy";

export type DetailState =
  | { status: "loading" }
  | { status: "ready"; detail: BookDetail }
  | { status: "error"; message: string };

export function TitleBlock({ book, titleId, compact = false }: { book: ShelfBook; titleId: string; compact?: boolean }) {
  return (
    <div>
      <p className="eyebrow text-ink-soft">
        {[book.genre, book.year ? `first published in ${book.year}` : null].filter(Boolean).join(" · ")}
      </p>
      <h2
        id={titleId}
        className={`book-title mt-2.5 text-balance ${
          compact ? "text-[2.3rem]" : book.title.length <= 14 ? "text-[clamp(2.8rem,4.7vw,4.5rem)]" : "text-[clamp(2.2rem,3.5vw,3.35rem)]"
        }`}
      >
        {book.title}
      </h2>
      <p className="display-italic mt-2.5 text-[1.35rem] leading-tight text-ink-soft">{book.author}</p>
    </div>
  );
}

export function Frontispiece({ detail, children }: { detail: BookDetail | null; children: ReactNode }) {
  const [state, setState] = useState<"waiting" | "loaded" | "failed">("waiting");
  const [ratio, setRatio] = useState<number | null>(null);
  const photographed = Boolean(detail?.coverUrl) && state === "loaded";
  return (
    <figure className="frontispiece">
      <div className="frontispiece-plate" style={photographed && ratio ? { aspectRatio: ratio } : undefined}>
        {children}
        {detail?.coverUrl && state !== "failed" ? (
          <img
            src={`${detail.coverUrl}?default=false`}
            alt={`Cover of an edition of ${detail.title}`}
            decoding="async"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth <= 8 || naturalHeight <= 8) {
                setState("failed");
                return;
              }
              setRatio(Math.min(0.85, Math.max(0.55, naturalWidth / naturalHeight)));
              setState("loaded");
            }}
            onError={() => setState("failed")}
            className="frontispiece-photo"
            data-loaded={state === "loaded" ? "true" : undefined}
          />
        ) : null}
        <span aria-hidden className="frontispiece-corner" data-at="tl" />
        <span aria-hidden className="frontispiece-corner" data-at="br" />
      </div>
      <figcaption className="eyebrow mt-2 text-[8.5px] leading-tight text-ink-soft">
        {photographed ? `edition cover · ${detail?.coverSource ?? "external source"}` : "as it stands on the shelf"}
      </figcaption>
    </figure>
  );
}

function Gauge({ name, value, levels }: { name: string; value: number; levels: readonly { value: number; label: string }[] }) {
  const current = levels.find((level) => level.value === value)?.label ?? "";
  return (
    <div className="gauge">
      <dt className="eyebrow text-[9px] text-ink-soft">{name}</dt>
      <dd className="mt-1.5">
        <span aria-hidden className="gauge-track">
          {levels.map((level) => (
            <span key={level.value} data-on={level.value === value ? "true" : undefined} />
          ))}
        </span>
        <span className="display-italic mt-1 block text-[1.02rem] leading-none">{current}</span>
        <span className="sr-only">
          {value} of {levels.length}
        </span>
      </dd>
    </div>
  );
}

function sentenceList(items: string[], separator = ", "): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(separator)} and ${items[items.length - 1]}`;
}

export function ReadingBlock({ book, detail }: { book: ShelfBook; detail: BookDetail | null }) {
  if (book.semanticStatus !== "ready" || book.atmospheres.length === 0) {
    return (
      <section aria-label="How it reads">
        <h3 className="eyebrow text-ink">How it reads</h3>
        <p className="mt-2 text-[0.98rem] italic leading-snug text-ink-soft">
          {book.semanticStatus === "insufficient"
            ? "There isn’t enough of a synopsis to describe this book responsibly. It sits on the shelf in kraft paper."
            : book.semanticStatus === "error"
              ? "The automatic reading of this book failed. The bookshop can redo it at the counter."
              : "The AI hasn’t read this book’s synopsis yet."}
        </p>
      </section>
    );
  }
  const reviewedByBookseller = detail?.semanticOrigin === "bookseller";
  return (
    <section aria-label="How it reads" className="reading">
      <h3 className="eyebrow text-ink">How it reads</h3>
      {detail?.portrait ? <p className="reading-portrait">{detail.portrait}</p> : null}
      <ul className="swatches" aria-label="Atmosphere">
        {book.atmospheres.map((id, index) => (
          <li key={id} data-rank={index}>
            <span aria-hidden className="swatch" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
            <span className="eyebrow mt-1 block">{ATMOSPHERE_BY_ID[id].label}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 flex flex-wrap gap-x-9 gap-y-3">
        {book.pace ? <Gauge name="pace" value={book.pace} levels={PACE_LEVELS} /> : null}
        {book.density ? <Gauge name="density" value={book.density} levels={DENSITY_LEVELS} /> : null}
      </dl>
      {book.styles.length > 0 || book.experiences.length > 0 ? (
        <p className="mt-4 text-[0.98rem] leading-snug text-ink-soft">
          {book.styles.length > 0 ? (
            <>
              Written in a <em className="text-ink">{sentenceList(book.styles.map(styleLabel))}</em> style.{" "}
            </>
          ) : null}
          {book.experiences.length > 0 ? (
            <>
              A book <em className="text-ink">{sentenceList(book.experiences.map(experienceLabel), "; ")}</em>.
            </>
          ) : null}
        </p>
      ) : null}
      {book.themes.length > 0 ? (
        <p className="eyebrow mt-3 text-[9.5px] leading-relaxed text-ink">
          <span className="text-ink-soft">themes — </span>
          {book.themes.join(" · ")}
        </p>
      ) : null}
      <p className="eyebrow mt-2 text-[8.5px] leading-relaxed text-ink-soft">
        {reviewedByBookseller
          ? "reading reviewed by the bookseller"
          : `AI reading (${detail?.semanticModel ?? "local model"}) based on the synopsis`}
        {detail?.confidence && !reviewedByBookseller ? ` · ${confidenceLabel(detail.confidence)} confidence` : ""}
      </p>
    </section>
  );
}

export function RecordBlock({ book, detail }: { book: ShelfBook; detail: BookDetail | null }) {
  const parts: string[] = [];
  if (detail?.publisher) parts.push(detail.publisher);
  if (book.pages) parts.push(`${book.pages} pages`);
  if (detail?.isbn) parts.push(`ISBN ${formatIsbn(detail.isbn) ?? detail.isbn}`);
  if (parts.length === 0 && detail) parts.push("no reliable bibliographic data");
  return (
    <section aria-label="Book record" className="colophon">
      <span aria-hidden className="spine-ornament mx-auto" data-kind="fleuron" style={{ width: 11, height: 11 }} />
      <p className="eyebrow mt-2 text-[9px] leading-relaxed text-ink">{parts.join(" · ")}</p>
      {detail?.sourceUrl ? (
        <p className="eyebrow mt-0.5 text-[8.5px] text-ink-soft">
          bibliographic data:{" "}
          <a className="ink-link" href={detail.sourceUrl} target="_blank" rel="noreferrer">
            Open Library
          </a>
        </p>
      ) : null}
    </section>
  );
}

export function WhyBlock({
  result,
  query,
  detail,
}: {
  result: SearchResult | null;
  query: string | null;
  detail: BookDetail | null;
}) {
  if (!result || !query) return null;
  return (
    <section aria-label="Why this book" className="border-l-[3px] border-vermilion pl-4">
      <h3 className="eyebrow text-vermilion">Why this book</h3>
      <p className="mt-1.5 text-[1rem] leading-snug text-ink-soft">
        You asked for <span className="italic text-ink">“{query}”</span>. What the catalog holds to back the recommendation:
      </p>
      <ul className="mt-2 space-y-1 font-label text-[0.92rem] leading-snug">
        {result.reasons.map((reason) => (
          <li key={`${reason.kind}-${reason.label}`} className="flex gap-2">
            <span aria-hidden className="text-vermilion">
              —
            </span>
            <span>{reason.label}</span>
          </li>
        ))}
      </ul>
      {result.quote ? (
        <figure className="mt-3">
          <blockquote className="text-[1.02rem] italic leading-snug">“{result.quote}”</blockquote>
          <figcaption className="eyebrow mt-1 text-[9px] text-ink-soft">
            the synopsis excerpt closest to your request
          </figcaption>
        </figure>
      ) : null}
      {result.caveat ? <p className="mt-2 text-[0.92rem] italic text-ink-soft">{result.caveat}</p> : null}
      {detail && detail.evidence.length > 0 && detail.semanticOrigin === "ai" ? (
        <details className="mt-2.5">
          <summary className="eyebrow cursor-pointer text-[9.5px] text-ink-soft hover:text-ink">
            what the classification rests on
          </summary>
          <ul className="mt-1.5 space-y-1.5 text-[0.9rem] leading-snug text-ink-soft">
            {detail.evidence.map((item) => (
              <li key={item.quote}>
                <span className="font-label text-ink">{attributeLabel(item.attribute)}</span>: “{item.quote}”
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

export function NoteBlock({ book, bookseller }: { book: ShelfBook; bookseller: string }) {
  if (!book.note) return null;
  const example = book.noteOrigin === "example";
  return (
    <aside aria-label={example ? "Sample note" : "Bookseller’s note"} className="book-note">
      <span aria-hidden className="book-note-tape" />
      <p className="handwriting text-[1.55rem] text-ink" style={{ lineHeight: "1.5em" }}>
        {book.note}
      </p>
      <p className="eyebrow mt-1.5 text-[8.5px] text-ink-soft">
        {example
          ? "sample note — written for the demo, not by the bookseller"
          : `— ${bookseller || "the bookseller"}`}
      </p>
    </aside>
  );
}

export function SynopsisBlock({ state, dropCap = true }: { state: DetailState; dropCap?: boolean }) {
  if (state.status === "loading") {
    return (
      <section aria-label="Synopsis" aria-busy="true">
        <h3 className="eyebrow text-ink">Synopsis</h3>
        <div className="mt-3 space-y-2.5" aria-hidden>
          {[96, 100, 92, 100, 88, 64].map((width, index) => (
            <span key={index} className="block h-3 bg-ink/10" style={{ width: `${width}%` }} />
          ))}
        </div>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section aria-label="Synopsis">
        <h3 className="eyebrow text-ink">Synopsis</h3>
        <p role="alert" className="mt-2 text-vermilion">
          {state.message}
        </p>
      </section>
    );
  }
  const { detail } = state;
  if (!detail.synopsis) {
    return (
      <section aria-label="Synopsis">
        <h3 className="eyebrow text-ink">Synopsis</h3>
        <p className="mt-2 italic text-ink-soft">
          This book has no synopsis in the catalog yet. The bookshop can add one at the counter.
        </p>
      </section>
    );
  }
  const paragraphs = detail.synopsis.split(/\n{2,}/).filter(Boolean);
  const isEntry = (paragraph: string) => paragraph.length < 64 && !/[.!?…”"]$/.test(paragraph.trim());
  return (
    <section aria-label="Synopsis">
      <h3 className="eyebrow text-ink">Synopsis</h3>
      <div className="synopsis mt-3">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className={index === 0 && dropCap ? "drop-cap" : undefined}
            data-entry={index > 0 && isEntry(paragraph) ? "true" : undefined}
          >
            {paragraph}
          </p>
        ))}
      </div>
      {detail.synopsisSource ? (
        <p className="eyebrow mt-3 text-[9px] text-ink-soft">
          text:{" "}
          {detail.synopsisUrl ? (
            <a className="ink-link" href={detail.synopsisUrl} target="_blank" rel="noreferrer">
              {detail.synopsisSource}
            </a>
          ) : (
            detail.synopsisSource
          )}
        </p>
      ) : null}
    </section>
  );
}
