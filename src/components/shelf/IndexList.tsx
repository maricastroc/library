"use client";

import { memo, useCallback, useId, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref, type RefObject } from "react";
import { flushSync } from "react-dom";
import { formatPrice, slugify } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import { ATMOSPHERE_BY_ID, atmosphereLabel, densityLabel, experienceLabel, paceLabel, styleLabel, type AtmosphereId } from "@/lib/semantic/taxonomy";
import { ATMOSPHERE_SPECTRUM, type ShelfGroup, type SortKey } from "@/lib/shelf/arrange";
import type { SpineIdentity } from "@/lib/shelf/identity";
import { locatorFor, seek, seekKey } from "@/lib/shelf/listing";
import { Cover } from "@/components/book/Cover";
import type { GalleryHandle } from "./Gallery";
import { SpineFace } from "./SpineFace";

const PLATE_HEIGHT = 214;
const PAGE_STEP = 12;

type Section = { id: string; label: string; answer: boolean; books: ShelfBook[] };

type EntryProps = {
  book: ShelfBook;
  locator: string;
  reasons: string | null;
  tabbable: boolean;
  shown: boolean;
  open: boolean;
  onOpen: (id: number) => void;
  onPoint: (id: number) => void;
  onEnter: (id: number) => void;
  register: (id: number, element: HTMLButtonElement | null) => void;
};

function Dots({ ids }: { ids: AtmosphereId[] }) {
  if (ids.length === 0) return <span data-unread="true" />;
  return (
    <>
      {ids.slice(0, 3).map((id) => (
        <span key={id} style={{ background: ATMOSPHERE_BY_ID[id].color }} />
      ))}
    </>
  );
}

function EntryBase({ book, locator, reasons, tabbable, shown, open, onOpen, onPoint, onEnter, register }: EntryProps) {
  const out = book.stock === 0;
  const read = book.atmospheres.length > 0;
  return (
    <li>
      <button
        ref={(element) => register(book.id, element)}
        type="button"
        className="index-entry"
        data-id={book.id}
        data-shown={shown ? "true" : undefined}
        data-open={open ? "true" : undefined}
        data-out={out ? "true" : undefined}
        tabIndex={tabbable ? 0 : -1}
        onClick={() => onOpen(book.id)}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" && (event.movementX !== 0 || event.movementY !== 0)) onPoint(book.id);
        }}
        onFocus={() => onEnter(book.id)}
      >
        <span aria-hidden className="index-key">
          <Dots ids={book.atmospheres} />
        </span>
        <span className="index-text">
          <span className="index-head">
            <span className="index-title">{book.title}</span>
            {book.note ? <span aria-hidden className="index-flag" /> : null}
          </span>
          <span className="index-byline">
            <span className="index-author">{book.author}</span>
            {out ? <span className="index-out">out of stock</span> : null}
          </span>
          <span className="sr-only">
            {read ? `, ${book.atmospheres.map(atmosphereLabel).join(", ")}` : ", not yet read"}
            {book.note ? ", with a note from the bookseller" : ""}
          </span>
          {reasons ? <span className="index-reasons">{reasons}</span> : null}
        </span>
        <span aria-hidden className="index-leader" />
        <span className="index-locator">{locator}</span>
      </button>
    </li>
  );
}

const Entry = memo(EntryBase);

function SideHead({ section }: { section: Section }) {
  const atmosphere = ATMOSPHERE_BY_ID[section.id as AtmosphereId];
  const count = `${section.books.length} ${section.books.length === 1 ? "title" : "titles"}`;
  return (
    <header className="index-side">
      <h2 className="index-side-label" data-short={section.label.length <= 3 ? "true" : undefined} data-answer={section.answer ? "true" : undefined}>
        {atmosphere ? <span aria-hidden className="index-side-dot" style={{ background: atmosphere.color }} /> : null}
        {section.label}
      </h2>
      <p className="eyebrow index-side-count">{count}</p>
    </header>
  );
}

function Key({ compact = false }: { compact?: boolean }) {
  return (
    <div className="plate-key">
      {compact ? null : <p className="eyebrow text-ink-soft">the key to the list</p>}
      <ul className="plate-key-atmospheres">
        {ATMOSPHERE_SPECTRUM.map((id) => (
          <li key={id}>
            <span aria-hidden className="index-dot" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
            {ATMOSPHERE_BY_ID[id].label}
          </li>
        ))}
      </ul>
      <ul className="plate-key-marks">
        <li>
          <span aria-hidden className="index-flag" /> marked by the bookseller
        </li>
        <li>
          <span aria-hidden className="index-dot" data-unread="true" /> not yet read
        </li>
      </ul>
      {compact ? null : (
        <>
          <p className="handwriting plate-key-hint">point at a title to take it from the list —</p>
          <p className="eyebrow plate-keys text-ink-soft">↑ ↓ to move · type to jump · ↵ to open</p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="eyebrow">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Plate({
  book,
  identity,
  shopName,
  open,
  coverRef,
  onOpen,
}: {
  book: ShelfBook | undefined;
  identity: SpineIdentity | undefined;
  shopName: string;
  open: boolean;
  coverRef: RefObject<HTMLDivElement | null>;
  onOpen: (id: number) => void;
}) {
  if (!book || !identity) return <Key />;
  const scale = PLATE_HEIGHT / identity.height;
  const thick = Math.max(12, Math.round(identity.width * scale));
  const price = formatPrice(book.priceCents);
  const reading = [paceLabel(book.pace), densityLabel(book.density)].filter(Boolean).join(", ");
  const form = [book.genre, book.year, book.pages ? `${book.pages} pp.` : null].filter(Boolean).join(" · ");
  return (
    <div className="plate-inner">
      <div className="plate-stage" onClick={() => onOpen(book.id)}>
        <div key={book.id} className="plate-book" data-open={open ? "true" : undefined} style={{ "--plate-thick": `${thick}px` } as CSSProperties}>
          <div className="plate-spine">
            <SpineFace identity={identity} scale={scale} className="relative block h-full w-full overflow-hidden" />
          </div>
          <div ref={coverRef} className="plate-cover">
            <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} />
          </div>
        </div>
        <span aria-hidden className="plinth plate-plinth" />
      </div>

      <div key={`card-${book.id}`} className="plate-card">
        <p className="plate-title">{book.title}</p>
        <p className="plate-author">{book.author}</p>
        <dl className="plate-fields">
          <Field label="atmosphere">
            {book.atmospheres.length > 0 ? (
              <>
                <span aria-hidden className="index-key">
                  <Dots ids={book.atmospheres} />
                </span>
                {book.atmospheres.map(atmosphereLabel).join(", ")}
              </>
            ) : (
              "not yet read"
            )}
          </Field>
          {reading ? <Field label="reading">{reading}</Field> : null}
          {book.styles.length > 0 ? <Field label="voice">{book.styles.slice(0, 2).map(styleLabel).join(", ")}</Field> : null}
          {book.experiences.length > 0 ? <Field label="read it">{experienceLabel(book.experiences[0])}</Field> : null}
          {form ? <Field label="form">{form}</Field> : null}
          <Field label="copies">{book.stock === 0 ? "out of stock" : [price, book.stock ? `${book.stock} on the shelves` : null].filter(Boolean).join(" · ")}</Field>
        </dl>
        {book.note ? (
          <p className="plate-note">
            <span className="handwriting">{book.note}</span>
            <span className="eyebrow">{book.noteOrigin === "example" ? "sample note" : "the bookseller"}</span>
          </p>
        ) : null}
        <p className="eyebrow plate-cue">↵ or click to lay the jacket open</p>
      </div>
    </div>
  );
}

export function IndexList({
  ref,
  groups,
  matches,
  ranks,
  results,
  byId,
  identities,
  arrangement,
  shopName,
  openId,
  onOpen,
}: {
  ref?: Ref<GalleryHandle>;
  groups: ShelfGroup[];
  matches: number[] | null;
  ranks: Map<number, number>;
  results: Map<number, SearchResult>;
  byId: Map<number, ShelfBook>;
  identities: Map<number, SpineIdentity>;
  arrangement: SortKey;
  shopName: string;
  openId: number | null;
  onOpen: (id: number) => void;
}) {
  const hintId = useId();
  const entries = useRef(new Map<number, HTMLButtonElement>());
  const coverRef = useRef<HTMLDivElement>(null);
  const pointTimer = useRef<number | undefined>(undefined);
  const typed = useRef({ text: "", at: 0 });
  const [roving, setRoving] = useState<number | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const shownRef = useRef<number | null>(null);
  const show = useCallback((id: number) => {
    shownRef.current = id;
    setShown(id);
  }, []);

  const sections = useMemo(() => {
    const answered = new Set(matches ?? []);
    const list: Section[] = [];
    if (matches && matches.length > 0) {
      const books = matches.map((id) => byId.get(id)).filter((book): book is ShelfBook => Boolean(book));
      list.push({ id: "answer", label: "the bookshop’s answer", answer: true, books });
    }
    for (const group of groups) {
      const books = group.books.filter((book) => !answered.has(book.id));
      if (books.length > 0) list.push({ id: group.id, label: group.label, answer: false, books });
    }
    return list;
  }, [groups, matches, byId]);

  const order = useMemo(() => sections.flatMap((section) => section.books.map((book) => book.id)), [sections]);
  const keys = useMemo(() => order.map((id) => seekKey(byId.get(id) as ShelfBook, arrangement)), [order, byId, arrangement]);
  const tabbable = roving !== null && order.includes(roving) ? roving : (order[0] ?? null);

  const register = useCallback((id: number, element: HTMLButtonElement | null) => {
    if (element) entries.current.set(id, element);
    else entries.current.delete(id);
  }, []);

  const pointed = useRef<number | null>(null);
  const onPoint = useCallback(
    (id: number) => {
      if (pointed.current === id) return;
      pointed.current = id;
      window.clearTimeout(pointTimer.current);
      pointTimer.current = window.setTimeout(() => show(id), 70);
    },
    [show],
  );

  const onEnter = useCallback((id: number) => {
    window.clearTimeout(pointTimer.current);
    pointed.current = null;
    show(id);
    setRoving(id);
  }, [show]);

  const openEntry = useCallback(
    (id: number) => {
      window.clearTimeout(pointTimer.current);
      if (shownRef.current !== id) flushSync(() => show(id));
      onOpen(id);
    },
    [onOpen, show],
  );

  useImperativeHandle(
    ref,
    () => ({
      bookElement: (id: number) => {
        const cover = coverRef.current;
        return shownRef.current === id && cover && cover.offsetParent !== null ? cover : null;
      },
      focusBook: (id: number) => {
        const element = entries.current.get(id);
        if (!element) return;
        setRoving(id);
        element.focus();
      },
    }),
    [],
  );

  const move = (to: number) => {
    const id = order[Math.max(0, Math.min(order.length - 1, to))];
    if (id === undefined) return;
    entries.current.get(id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("index-entry")) return;
    const index = order.indexOf(Number(target.dataset.id));
    if (index === -1) return;
    const step: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: PAGE_STEP, PageUp: -PAGE_STEP };
    if (event.key in step) {
      event.preventDefault();
      move(index + step[event.key]);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      move(event.key === "Home" ? 0 : order.length - 1);
      return;
    }
    if (event.key.length === 1 && /[\p{L}\p{N}]/u.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 800 ? typed.current.text : "") + event.key, at: now };
      const found = seek(keys, index, typed.current.text);
      if (found !== null) move(found);
    }
  };

  const jump = (section: Section) => {
    const first = section.books[0];
    document.getElementById(`index-${slugify(section.id)}`)?.scrollIntoView({ block: "start" });
    if (first) {
      setRoving(first.id);
      entries.current.get(first.id)?.focus({ preventScroll: true });
    }
  };

  const shownBook = shown !== null ? byId.get(shown) : undefined;

  return (
    <div className="index">
      <nav aria-label="Contents of the list" className="index-contents">
        <span className="eyebrow text-ink-soft">contents</span>
        <ol className="paper-scroll">
          {sections.map((section) => {
            const atmosphere = ATMOSPHERE_BY_ID[section.id as AtmosphereId];
            return (
              <li key={section.id}>
                <a
                  href={`#index-${slugify(section.id)}`}
                  data-answer={section.answer ? "true" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    jump(section);
                  }}
                >
                  {atmosphere ? <span aria-hidden className="index-dot" style={{ background: atmosphere.color }} /> : null}
                  {section.answer ? "the answer" : section.label}
                  <span className="index-contents-count">{section.books.length}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <details className="index-legend">
        <summary className="eyebrow">the key to the dots</summary>
        <Key compact />
      </details>

      <p id={hintId} className="sr-only">
        One stop in the tab order: use the arrow keys to move between titles, type the first letters of a {arrangement === "author" ? "surname" : "title"} to jump to it, and press Enter to open the book.
      </p>

      <div className="index-layout">
        <div role="group" aria-label="Titles" aria-describedby={hintId} className="index-body" onKeyDown={onKeyDown}>
          {sections.map((section) => (
            <section key={section.id} id={`index-${slugify(section.id)}`} className="index-section" data-answer={section.answer ? "true" : undefined}>
              <SideHead section={section} />
              <ol className="index-entries">
                {section.books.map((book) => {
                  const result = section.answer ? results.get(book.id) : undefined;
                  return (
                    <Entry
                      key={book.id}
                      book={book}
                      locator={locatorFor(book, arrangement, section.answer ? ranks.get(book.id) : undefined)}
                      reasons={
                        result
                          ? result.reasons
                              .slice(0, 3)
                              .map((reason) => reason.label)
                              .join(" · ") || null
                          : null
                      }
                      tabbable={book.id === tabbable}
                      shown={book.id === shown}
                      open={book.id === openId}
                      onOpen={openEntry}
                      onPoint={onPoint}
                      onEnter={onEnter}
                      register={register}
                    />
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <aside aria-hidden className="index-plate">
          <Plate book={shownBook} identity={shown !== null ? identities.get(shown) : undefined} shopName={shopName} open={shown !== null && shown === openId} coverRef={coverRef} onOpen={openEntry} />
        </aside>
      </div>
    </div>
  );
}
