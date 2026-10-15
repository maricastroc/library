"use client";

import {
  memo,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from "react";
import { formatPrice, hashString } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import { ATMOSPHERE_BY_ID, atmosphereLabel, type AtmosphereId } from "@/lib/semantic/taxonomy";
import type { ShelfGroup } from "@/lib/shelf/arrange";
import { COVER_RATIO, compose, nearestInDirection, numeral, type Composition, type Density, type PlacedBook } from "@/lib/shelf/composition";
import { spineIdentity, type SpineIdentity } from "@/lib/shelf/identity";
import { Cover } from "@/components/book/Cover";
import { SpineFace } from "./SpineFace";

export type GalleryHandle = {
  bookElement: (id: number) => HTMLElement | null;
  focusBook: (id: number) => void;
};

type GalleryProps = {
  ref?: Ref<GalleryHandle>;
  books: ShelfBook[];
  groups: ShelfGroup[];
  arrangement: string;
  answers: number[] | null;
  ranks: Map<number, number>;
  results: Map<number, SearchResult>;
  heard: AtmosphereId[];
  confidence: "high" | "medium" | "low" | "none" | null;
  level: boolean;
  density: Density;
  staged: boolean;
  reading: boolean;
  openId: number | null;
  shopName: string;
  bookseller: string;
  onOpen: (id: number) => void;
};

const countBooks = (count: number) => `${count} ${count === 1 ? "book" : "books"}`;
const position = (x: number, y: number, extra?: CSSProperties) => ({ "--x": `${x}px`, "--y": `${y}px`, ...extra }) as CSSProperties;

function describe(book: ShelfBook, result: SearchResult | undefined, rank: number | null): string {
  const parts: string[] = [];
  if (rank) parts.push(`Answer ${rank}:`);
  parts.push(`${book.title}, by ${book.author}.`);
  if (book.genre) parts.push(`${book.genre}.`);
  if (book.atmospheres.length > 0) parts.push(`Atmosphere: ${book.atmospheres.map(atmosphereLabel).join(", ")}.`);
  const price = formatPrice(book.priceCents);
  if (price) parts.push(`${price}.`);
  if (book.stock === 0) parts.push("Out of stock.");
  if (book.note) parts.push(book.noteOrigin === "example" ? "With a sample note." : "With a bookseller’s note.");
  if (result) parts.push(`Why: ${result.reasons.map((reason) => reason.label).join("; ")}.`);
  if (result?.quote) parts.push(`From the synopsis: “${result.quote}”`);
  return parts.join(" ");
}

type BookObjectProps = {
  book: ShelfBook;
  identity: SpineIdentity;
  placed: PlacedBook;
  shopName: string;
  label: string;
  state: "normal" | "dim" | "match";
  tabbable: boolean;
  active: boolean;
  absent: boolean;
  nudge: number;
  showCover: boolean;
  onOpen: (id: number) => void;
  onActive: (id: number | null, viaKeyboard: boolean) => void;
  register: (id: number, element: HTMLButtonElement | null) => void;
};

function quoteFit(text: string, width: number, height: number): { size: number; lines: number } {
  const room = Math.max(0, height - 60);
  for (let size = 27.2; size > 15; size -= 0.4) {
    const perLine = Math.max(1, (width - 24) / (size * 0.56));
    const lines = Math.ceil(text.length / perLine) + 1;
    if (lines * size * 1.32 <= room) return { size, lines: Math.floor(room / (size * 1.32)) };
  }
  return { size: 15, lines: Math.max(2, Math.floor(room / (15 * 1.32))) };
}

function BookObjectBase({ book, identity, placed, shopName, label, state, tabbable, active, absent, nudge, showCover, onOpen, onActive, register }: BookObjectProps) {
  const thick = Math.max(24, identity.width);
  const depth = Math.round(identity.height * COVER_RATIO);
  const { pose } = placed;
  const style = {
    "--x": `${pose.x}px`,
    "--y": `${pose.y}px`,
    "--a": `${pose.angle}deg`,
    "--s": pose.scale,
    "--ox": `${pose.ox}px`,
    "--oy": `${pose.oy}px`,
    "--turn": `${pose.turn}deg`,
    "--thick": `${thick}px`,
    "--depth": `${depth}px`,
    "--nudge": `${nudge}px`,
    width: thick,
    height: identity.height,
    zIndex: placed.role === "pile" || placed.role === "lean" ? 3 : placed.pose.posture === "face" ? 2 : 1,
  } as CSSProperties;

  return (
    <button
      ref={(element) => register(book.id, element)}
      type="button"
      className="book"
      style={style}
      data-id={book.id}
      data-posture={pose.posture}
      data-role={placed.role}
      data-state={state}
      data-active={active ? "true" : undefined}
      data-absent={absent ? "true" : undefined}
      tabIndex={tabbable ? 0 : -1}
      aria-label={label}
      onClick={() => onOpen(book.id)}
      onFocus={(event) => onActive(book.id, event.currentTarget.matches(":focus-visible"))}
      onBlur={() => onActive(null, false)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onActive(book.id, false);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onActive(null, false);
      }}
    >
      <span className="book-body">
        <span className="book-spine">
          <SpineFace identity={identity} className="relative block h-full w-full overflow-hidden" />
        </span>
        <span className="book-cover" style={{ background: identity.color }}>
          {showCover ? <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} /> : null}
        </span>
      </span>
      {book.note && pose.posture !== "face" ? <span aria-hidden className="bookmark-flag" data-kind={book.id % 3} /> : null}
    </button>
  );
}

const BookObject = memo(BookObjectBase);

function Swatches({ ids }: { ids: AtmosphereId[] }) {
  if (ids.length === 0) return null;
  return (
    <span aria-hidden className="inline-flex gap-[2px] align-middle">
      {ids.map((id) => (
        <span key={id} className="inline-block h-[10px] w-[6px]" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
      ))}
    </span>
  );
}

function SingleCaption({ book, result, heard, onOpen }: { book: ShelfBook | undefined; result: SearchResult | undefined; heard: AtmosphereId[]; onOpen: (id: number) => void }) {
  if (!book) return null;
  const matched = book.atmospheres.filter((id) => heard.includes(id));
  const reason = result?.reasons.find((item) => item.kind !== "note" && item.kind !== "atmosphere");
  return (
    <button type="button" tabIndex={-1} className="stage-caption-body" onClick={() => onOpen(book.id)}>
      <span className="display block text-[1.18rem] leading-[1.04]">{book.title}</span>
      <span className="block text-[0.9rem] italic leading-tight text-ink-soft">{book.author}</span>
      {matched.length > 0 ? (
        <span className="mt-1.5 flex items-center gap-1.5 font-label text-[0.76rem] leading-snug">
          <Swatches ids={matched} /> {matched.map(atmosphereLabel).join(" and ")}
        </span>
      ) : null}
      {reason ? <span className="mt-0.5 block font-label text-[0.76rem] leading-snug text-ink-soft">{reason.label}</span> : null}
    </button>
  );
}

export function Gallery({
  ref,
  books,
  groups,
  arrangement,
  answers,
  ranks,
  results,
  heard,
  confidence,
  level,
  density,
  staged,
  reading,
  openId,
  shopName,
  bookseller,
  onOpen,
}: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<number, HTMLButtonElement>());
  const rangeRef = useRef({ top: -400, bottom: 1600 });
  const previous = useRef<Composition | null>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [rovingId, setRovingId] = useState<number | null>(null);
  const [turned, setTurned] = useState<Set<number>>(() => new Set());

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateRange = () => {
      const rect = element.getBoundingClientRect();
      rangeRef.current = { top: -rect.top - 360, bottom: -rect.top + window.innerHeight + 360 };
    };
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? element.clientWidth);
      setWidth((current) => (Math.abs(current - next) >= 1 ? next : current));
      updateRange();
    });
    observer.observe(element);
    setWidth(Math.floor(element.getBoundingClientRect().width));
    updateRange();
    window.addEventListener("scroll", updateRange, { passive: true });
    window.addEventListener("resize", updateRange);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateRange);
      window.removeEventListener("resize", updateRange);
    };
  }, []);

  const identities = useMemo(() => new Map(books.map((book) => [book.id, spineIdentity(book)])), [books]);
  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const answerSet = useMemo(() => new Set(answers ?? []), [answers]);

  const composition = useMemo(() => {
    if (width <= 0) return null;
    return compose({ groups, identities, width, answers: staged && answers ? answers : undefined, ranks, confidence: confidence ?? "high", level, density });
  }, [groups, identities, width, staged, answers, ranks, confidence, level, density]);

  const labels = useMemo(() => {
    const map = new Map<number, string>();
    for (const book of books) map.set(book.id, describe(book, results.get(book.id), ranks.get(book.id) ?? null));
    return map;
  }, [books, results, ranks]);

  useLayoutEffect(() => {
    if (!composition) return;
    const before = previous.current;
    const { top, bottom } = rangeRef.current;
    const resized = before !== null && before.width !== composition.width;
    const seen = (placed: PlacedBook | undefined) => Boolean(placed && placed.rect.y + placed.rect.h >= top && placed.rect.y <= bottom);
    let step = 0;
    for (const [id, next] of composition.books) {
      const element = elements.current.get(id);
      if (!element) continue;
      if (!before) {
        element.dataset.instant = "true";
        if (seen(next)) {
          element.style.setProperty("--enter-delay", `${Math.min(1100, next.row * 120 + (next.rect.x / composition.width) * 520)}ms`);
          element.classList.add("book-enter");
        }
        continue;
      }
      const was = before.books.get(id);
      const moved = !was || was.pose.x !== next.pose.x || was.pose.y !== next.pose.y || was.pose.posture !== next.pose.posture;
      const animate = !resized && moved && (seen(was) || seen(next));
      element.dataset.instant = animate ? "false" : "true";
      if (animate) {
        const promoted = next.rank !== null && was?.rank === null;
        element.style.setProperty("--delay", promoted ? `${120 + (next.rank ?? 0) * 110}ms` : `${Math.min(420, step * 3)}ms`);
        step += 1;
      }
    }
    previous.current = composition;
  }, [composition]);

  const register = useCallback((id: number, element: HTMLButtonElement | null) => {
    if (element) elements.current.set(id, element);
    else elements.current.delete(id);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      bookElement: (id) => elements.current.get(id) ?? null,
      focusBook: (id) => elements.current.get(id)?.focus({ preventScroll: true }),
    }),
    [],
  );

  const handleActive = useCallback((id: number | null, viaKeyboard: boolean) => {
    setActive(id);
    if (id !== null) {
      setTurned((current) => (current.has(id) ? current : new Set(current).add(id)));
      if (viaKeyboard) setRovingId(id);
    }
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!composition) return;
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(".book");
    if (!target) return;
    const currentId = Number(target.dataset.id);
    const directions: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    let nextId: number | null = null;
    if (directions[event.key]) nextId = nearestInDirection(composition, currentId, directions[event.key]);
    else if (event.key === "Home") nextId = composition.order[0] ?? null;
    else if (event.key === "End") nextId = composition.order[composition.order.length - 1] ?? null;
    else return;
    event.preventDefault();
    if (nextId === null) return;
    setRovingId(nextId);
    const element = elements.current.get(nextId);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  };

  const nudges = useMemo(() => {
    const map = new Map<number, number>();
    if (!composition || active === null) return map;
    const current = composition.books.get(active);
    if (!current || current.pose.posture === "face" || current.role === "pile") return map;
    const identity = identities.get(active);
    const room = identity ? Math.round(identity.height * COVER_RATIO * 0.36 * current.pose.scale) : 40;
    for (const placed of composition.books.values()) {
      if (placed.bay !== current.bay || placed.order <= current.order || placed.row !== current.row) continue;
      if (placed.rect.x < current.rect.x) continue;
      map.set(placed.id, room);
    }
    return map;
  }, [composition, active, identities]);

  if (books.length === 0) {
    return (
      <div className="border-t-[3px] border-ink py-16 text-center">
        <p className="display text-3xl">The collection is still empty.</p>
        <p className="mt-3 text-ink-soft">
          Import a catalog at the{" "}
          <a className="ink-link" href="/admin/import">
            bookshop counter
          </a>{" "}
          to get started.
        </p>
      </div>
    );
  }

  const tabbableId = composition ? (rovingId !== null && composition.books.has(rovingId) ? rovingId : (composition.order[0] ?? null)) : null;
  const answering = Boolean(answers && answers.length > 0);
  const activePlaced = active !== null && composition ? composition.books.get(active) : undefined;
  const activeBook = active !== null ? byId.get(active) : undefined;
  const quoted = composition?.quote ? [...(answers ?? [])].sort((a, b) => (ranks.get(a) ?? 99) - (ranks.get(b) ?? 99)).find((id) => results.get(id)?.quote) : undefined;
  const quoteBook = quoted !== undefined ? byId.get(quoted) : undefined;
  const quoteResult = quoted !== undefined ? results.get(quoted) : undefined;
  const fit = composition?.quote && quoteResult?.quote ? quoteFit(`“${quoteResult.quote}”`, composition.quote.w, composition.quote.h) : null;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={
        answering
          ? `Collection of ${countBooks(books.length)}. ${answers?.length} ${answers?.length === 1 ? "book answers" : "books answer"} your request and ${staged ? "stand first" : "are lit"}. Use the arrow keys to move between books and Enter to open one.`
          : `Collection of ${countBooks(books.length)}, arranged by ${arrangement}. Use the arrow keys to move between books and Enter to open one.`
      }
      aria-busy={reading}
      className={`gallery ${reading ? "is-reading" : ""}`}
      data-answering={answering ? "true" : undefined}
      style={{ height: composition ? composition.height : 760, minHeight: 320 }}
      onKeyDown={handleKeyDown}
    >
      {composition ? (
        <>
          {composition.plinths.map((plinth) => (
            <div key={plinth.key} aria-hidden className="plinth" data-stage={plinth.stage ? "true" : undefined} style={position(plinth.x, plinth.y, { width: plinth.w, height: plinth.h })}>
              {plinth.numeral ? <span className="plinth-numeral">{plinth.numeral}</span> : null}
              {plinth.label ? (
                <span className="plinth-label">
                  <span>{plinth.label}</span>
                  <span className="plinth-count">{plinth.count}</span>
                </span>
              ) : null}
            </div>
          ))}

          {composition.shadows.map((shadow) => (
            <span key={shadow.key} aria-hidden className="floor-shadow" style={position(shadow.x, shadow.y - 6, { width: shadow.w })} />
          ))}

          {composition.labels.map((label) => (
            <p key={label.key} aria-hidden className="group-label" data-continued={label.count === null ? "true" : undefined} style={position(label.x, label.y)}>
              <span className="group-label-name">{label.label}</span>
              {label.count !== null ? <span className="group-label-count">{countBooks(label.count)}</span> : null}
            </p>
          ))}

          {composition.easels.map((easel) => (
            <span key={easel.key} aria-hidden className="easel" style={position(easel.x, easel.y - 9, { width: easel.w })} />
          ))}

          {composition.restLabel !== null ? (
            <p className="gallery-rest eyebrow" style={position(0, composition.restLabel, { width: composition.width })}>
              <span>The rest of the collection</span>
              <span className="text-ink-soft">{countBooks(books.length - answerSet.size)}, set back</span>
            </p>
          ) : null}

          {composition.captions.map((caption) => (
            <div key={caption.key} aria-hidden className="stage-caption" style={position(caption.x, caption.y, { width: caption.w, height: caption.h })}>
              {caption.ids.length === 1 ? (
                <SingleCaption book={byId.get(caption.ids[0])} result={results.get(caption.ids[0])} heard={heard} onOpen={onOpen} />
              ) : (
                caption.ids.map((id) => {
                  const book = byId.get(id);
                  if (!book) return null;
                  return (
                    <button key={id} type="button" tabIndex={-1} className="stage-caption-line" onClick={() => onOpen(id)}>
                      <span className="stage-caption-numeral">{numeral(ranks.get(id) ?? 0)}</span>
                      <span className="min-w-0">
                        <span className="display block truncate text-[1rem] leading-[1.1]">{book.title}</span>
                        <span className="block truncate text-[0.82rem] italic leading-tight text-ink-soft">{book.author}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ))}

          {composition.quote && quoteBook && quoteResult?.quote ? (
            <figure
              aria-hidden
              className="stage-quote"
              style={position(composition.quote.x, composition.quote.y, {
                width: composition.quote.w,
                height: composition.quote.h,
                "--quote-size": `${fit?.size ?? 27.2}px`,
                "--quote-lines": fit?.lines ?? "none",
              } as CSSProperties)}
            >
              <blockquote>“{quoteResult.quote}”</blockquote>
              <figcaption className="eyebrow">
                {numeral(ranks.get(quoteBook.id) ?? 0)} · {quoteBook.title} · the passage of its synopsis closest to your words
              </figcaption>
            </figure>
          ) : null}

          {books.map((book) => {
            const placed = composition.books.get(book.id);
            const identity = identities.get(book.id);
            if (!placed || !identity) return null;
            const state = answering ? (answerSet.has(book.id) ? "match" : "dim") : "normal";
            return (
              <BookObject
                key={book.id}
                book={book}
                identity={identity}
                placed={placed}
                shopName={shopName}
                label={labels.get(book.id) ?? book.title}
                state={state}
                tabbable={tabbableId === book.id}
                active={active === book.id}
                absent={openId === book.id}
                nudge={nudges.get(book.id) ?? 0}
                showCover={placed.pose.posture === "face" || turned.has(book.id)}
                onOpen={onOpen}
                onActive={handleActive}
                register={register}
              />
            );
          })}

          {[
            ...composition.notes,
            ...[...composition.books.values()]
              .filter((placed) => placed.role === "answer" && placed.rank === 1 && !level && confidence !== "low" && byId.get(placed.id)?.note)
              .map((placed) => ({ id: placed.id, x: Math.min(composition.width - 154, placed.rect.x + placed.rect.w * 0.42), y: placed.rect.y + placed.rect.h + 2, w: 150 })),
          ]
            .filter((note) => byId.get(note.id)?.note)
            .map((note) => {
              const book = byId.get(note.id) as ShelfBook;
              const seed = hashString(`note-${book.id}`);
              return (
                <div
                  key={`note-${book.id}`}
                  aria-hidden
                  className="gallery-note"
                  data-active={active === book.id ? "true" : undefined}
                  style={position(note.x, note.y, { "--tilt": `${((seed % 7) - 3) * 0.9}deg` } as CSSProperties)}
                  onClick={() => onOpen(book.id)}
                >
                  <p className="handwriting">{book.note}</p>
                  <p className="eyebrow">{book.noteOrigin === "example" ? "sample note" : `— ${bookseller || "the bookseller"}`}</p>
                </div>
              );
            })}

          {activePlaced && activeBook && activePlaced.pose.posture !== "face" && activePlaced.rank === null && openId === null ? (
            <div
              aria-hidden
              className="gallery-tag"
              style={position(
                Math.min(Math.max(0, composition.width - 236), Math.max(0, activePlaced.rect.x + activePlaced.rect.w / 2 - 116)),
                activePlaced.rect.y - 22,
              )}
            >
              <div key={activeBook.id} className="shelf-preview">
                <p className="eyebrow text-[9px] text-ink-soft">{[activeBook.genre, activeBook.year].filter(Boolean).join(" · ") || "in the collection"}</p>
                <p className="display mt-1 text-[1.08rem] leading-[1.05]">{activeBook.title}</p>
                <p className="mt-0.5 text-[0.86rem] italic leading-tight text-ink-soft">{activeBook.author}</p>
                {activeBook.atmospheres.length > 0 ? (
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-label text-[0.74rem] leading-tight">
                    {activeBook.atmospheres.map((id) => (
                      <span key={id} className="inline-flex items-center gap-1">
                        <span className="inline-block h-2.5 w-1.5" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                        {ATMOSPHERE_BY_ID[id].label}
                      </span>
                    ))}
                  </p>
                ) : null}
                <p className="eyebrow mt-2 flex justify-between gap-3 border-t border-ink/20 pt-1.5 text-[9px] text-ink-soft">
                  <span>{activeBook.stock === 0 ? "out of stock" : (formatPrice(activeBook.priceCents) ?? "no price")}</span>
                  <span>open the jacket ↵</span>
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
