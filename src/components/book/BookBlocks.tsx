"use client";

import { useState } from "react";
import { formatIsbn } from "@/lib/catalog/isbn";
import type { BookDetail, ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import {
  ATMOSPHERE_BY_ID,
  DENSITY_LEVELS,
  PACE_LEVELS,
  attributeLabel,
  confidenceLabel,
  densityLabel,
  experienceLabel,
  paceLabel,
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
        {[book.genre, book.year ? `published in ${book.year}` : null].filter(Boolean).join(" · ")}
      </p>
      <h2
        id={titleId}
        className={`display mt-2 text-balance leading-[0.98] ${compact ? "text-[2.1rem]" : "text-[clamp(2rem,3.3vw,3.1rem)]"}`}
      >
        {book.title}
      </h2>
      <p className="display-italic mt-2 text-[1.3rem] leading-tight text-ink-soft">{book.author}</p>
    </div>
  );
}

export function CoverPlate({ detail }: { detail: BookDetail }) {
  const [failed, setFailed] = useState(false);
  if (!detail.coverUrl || failed) return null;
  return (
    <figure className="w-[7.4rem] shrink-0 -rotate-[1.6deg]">
      <img
        src={`${detail.coverUrl}?default=false`}
        alt={`Cover of an edition of ${detail.title}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="block w-full bg-paper-deep shadow-[0_10px_18px_-12px_rgb(28_26_23/0.7)] outline outline-1 outline-ink/20"
      />
      <figcaption className="eyebrow mt-1.5 text-[8.5px] leading-tight text-ink-soft">
        edition cover · {detail.coverSource ?? "external source"}
      </figcaption>
    </figure>
  );
}

function LevelScale({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="inline-flex gap-[3px]">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={`block h-3 w-[5px] ${index < value ? "bg-ink" : "bg-ink/20"}`} />
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
}

export function ReadingBlock({ book, detail }: { book: ShelfBook; detail: BookDetail | null }) {
  if (book.semanticStatus !== "ready" || book.atmospheres.length === 0) {
    return (
      <section aria-label="How it reads" className="border-t border-ink/30 pt-3">
        <h3 className="eyebrow text-ink">How it reads</h3>
        <p className="mt-2 text-[0.95rem] italic text-ink-soft">
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
    <section aria-label="How it reads" className="border-t border-ink/30 pt-3">
      <h3 className="eyebrow text-ink">How it reads</h3>
      <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-label text-[0.88rem] leading-snug">
        <dt className="text-ink-soft">atmosphere</dt>
        <dd className="flex flex-wrap gap-x-3 gap-y-1">
          {book.atmospheres.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-3 w-2" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
              {ATMOSPHERE_BY_ID[id].label}
            </span>
          ))}
        </dd>
        {book.pace ? (
          <>
            <dt className="text-ink-soft">pace</dt>
            <dd>
              <LevelScale value={book.pace} max={PACE_LEVELS.length} label={paceLabel(book.pace) ?? ""} />
            </dd>
          </>
        ) : null}
        {book.density ? (
          <>
            <dt className="text-ink-soft">density</dt>
            <dd>
              <LevelScale value={book.density} max={DENSITY_LEVELS.length} label={densityLabel(book.density) ?? ""} />
            </dd>
          </>
        ) : null}
        {book.styles.length > 0 ? (
          <>
            <dt className="text-ink-soft">style</dt>
            <dd>{book.styles.map(styleLabel).join(", ")}</dd>
          </>
        ) : null}
        {book.experiences.length > 0 ? (
          <>
            <dt className="text-ink-soft">a book</dt>
            <dd>{book.experiences.map(experienceLabel).join("; ")}</dd>
          </>
        ) : null}
        {book.themes.length > 0 ? (
          <>
            <dt className="text-ink-soft">themes</dt>
            <dd>{book.themes.join(", ")}</dd>
          </>
        ) : null}
      </dl>
      {detail?.portrait ? <p className="mt-3 text-[1rem] italic leading-snug text-ink">{detail.portrait}</p> : null}
      <p className="eyebrow mt-2.5 text-[9px] leading-relaxed text-ink-soft">
        {reviewedByBookseller
          ? "reading reviewed by the bookseller"
          : `AI reading (${detail?.semanticModel ?? "local model"}) based on the synopsis`}
        {detail?.confidence && !reviewedByBookseller ? ` · ${confidenceLabel(detail.confidence)} confidence` : ""}
      </p>
    </section>
  );
}

export function RecordBlock({ book, detail }: { book: ShelfBook; detail: BookDetail | null }) {
  const rows: [string, string][] = [];
  if (detail?.isbn) rows.push(["ISBN", formatIsbn(detail.isbn) ?? detail.isbn]);
  if (detail?.publisher) rows.push(["publisher", detail.publisher]);
  if (book.pages) rows.push(["pages", String(book.pages)]);
  if (book.year) rows.push(["first published", String(book.year)]);
  if (rows.length === 0 && detail) rows.push(["record", "no reliable bibliographic data"]);
  return (
    <section aria-label="Book record" className="border-t border-ink/30 pt-3">
      <dl className="eyebrow grid grid-cols-2 gap-x-6 gap-y-2 text-ink">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[9px] text-ink-soft">{label}</dt>
            <dd className="mt-0.5 normal-case tracking-normal">{value}</dd>
          </div>
        ))}
      </dl>
      {detail?.sourceUrl ? (
        <p className="eyebrow mt-2.5 text-[9px] text-ink-soft">
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
    <aside
      aria-label={example ? "Sample note" : "Bookseller’s note"}
      className="ruled relative -rotate-[0.7deg] bg-[#fbf7ea] px-5 pb-3 pt-4 shadow-[0_14px_22px_-16px_rgb(28_26_23/0.6)]"
    >
      <span aria-hidden className="absolute -top-2 left-8 h-4 w-14 rotate-[-3deg] bg-vermilion/75" />
      <p className="handwriting text-[1.6rem] text-ink" style={{ lineHeight: "1.55em" }}>
        {book.note}
      </p>
      <p className="eyebrow mt-2 text-[9px] text-ink-soft">
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
  return (
    <section aria-label="Synopsis">
      <h3 className="eyebrow text-ink">Synopsis</h3>
      <div className="mt-2.5 space-y-3 text-[1.06rem] leading-[1.58] hyphens-auto">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className={index === 0 && dropCap ? "drop-cap" : undefined}>
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
