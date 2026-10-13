"use client";

import { AnimatePresence, motion } from "motion/react";
import {
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
import { ATMOSPHERE_BY_ID, atmosphereLabel } from "@/lib/semantic/taxonomy";
import type { ShelfGroup } from "@/lib/shelf/arrange";
import { spineIdentity, type SpineIdentity } from "@/lib/shelf/identity";
import { layoutShelf, neighborInDirection, type PlacedSpine, type ShelfLayout } from "@/lib/shelf/layout";
import { Spine } from "./Spine";

export type ShelfHandle = {
  spineElement: (id: number) => HTMLButtonElement | null;
  focusSpine: (id: number) => void;
};

type ShelfProps = {
  ref?: Ref<ShelfHandle>;
  books: ShelfBook[];
  groups: ShelfGroup[];
  arrangement: string;
  matches: number[] | null;
  ranks: Map<number, number>;
  results: Map<number, SearchResult>;
  reading: boolean;
  openId: number | null;
  bookseller: string;
  onOpen: (id: number) => void;
};

const countBooks = (count: number) => `${count} ${count === 1 ? "book" : "books"}`;

const NOTE_PAPERS = ["card", "kraft", "slip", "ledger"] as const;
const NOTE_FIXINGS = ["thread", "tape", "pin"] as const;

function noteStyle(id: number, note: string, slot: number) {
  const seed = hashString(`note-${id}`);
  const long = note.length > 58;
  const width = Math.min(slot, (long ? 150 : 124) + (seed % 4) * 9);
  return {
    paper: NOTE_PAPERS[seed % NOTE_PAPERS.length],
    fixing: NOTE_FIXINGS[(seed >> 3) % NOTE_FIXINGS.length],
    width,
    drop: 5 + ((seed >> 5) % 4) * 3,
    size: long ? 16.5 : note.length > 40 ? 18 : 20,
  };
}

const position = (x: number, y: number, extra?: CSSProperties) =>
  ({ "--x": `${x}px`, "--y": `${y}px`, ...extra }) as CSSProperties;

function describe(book: ShelfBook, result: SearchResult | undefined, rank: number | null): string {
  const parts: string[] = [];
  if (rank) parts.push(`Result ${rank}:`);
  parts.push(`${book.title}, by ${book.author}.`);
  if (book.genre) parts.push(`${book.genre}.`);
  if (book.atmospheres.length > 0) parts.push(`Atmosphere: ${book.atmospheres.map(atmosphereLabel).join(", ")}.`);
  const price = formatPrice(book.priceCents);
  if (price) parts.push(`${price}.`);
  if (book.stock === 0) parts.push("Out of stock.");
  if (book.note) parts.push(book.noteOrigin === "example" ? "With a sample note." : "With a bookseller’s note.");
  if (result) parts.push(`Why: ${result.reasons.map((reason) => reason.label).join("; ")}.`);
  return parts.join(" ");
}

export function Shelf({ ref, books, groups, arrangement, matches, ranks, results, reading, openId, bookseller, onOpen }: ShelfProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<number, HTMLButtonElement>());
  const rangeRef = useRef({ top: -400, bottom: 1600 });
  const previousLayout = useRef<ShelfLayout | null>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [rovingId, setRovingId] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateRange = () => {
      const rect = element.getBoundingClientRect();
      rangeRef.current = { top: -rect.top - 320, bottom: -rect.top + window.innerHeight + 320 };
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

  const identities = useMemo(() => {
    const map = new Map<number, SpineIdentity>();
    for (const book of books) map.set(book.id, spineIdentity(book));
    return map;
  }, [books]);

  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const noted = useMemo(() => new Set(books.filter((book) => book.note).map((book) => book.id)), [books]);

  const layout = useMemo(() => {
    if (width <= 0) return null;
    return layoutShelf({ groups, identities, noted, width, matches: matches ?? undefined, ranks });
  }, [groups, identities, noted, width, matches, ranks]);

  const labels = useMemo(() => {
    const map = new Map<number, string>();
    for (const book of books) {
      const rank = layout?.spines.get(book.id)?.rank ?? null;
      map.set(book.id, describe(book, results.get(book.id), rank));
    }
    return map;
  }, [books, results, layout]);

  useLayoutEffect(() => {
    if (!layout) return;
    const previous = previousLayout.current;
    const { top, bottom } = rangeRef.current;
    const resized = previous !== null && previous.width !== layout.width;
    const visible = (spine: PlacedSpine | undefined) => Boolean(spine && spine.y + spine.h >= top && spine.y <= bottom);
    let order = 0;
    for (const [id, next] of layout.spines) {
      const element = elements.current.get(id);
      if (!element) continue;
      if (!previous) {
        element.dataset.instant = "true";
        if (visible(next)) {
          element.style.setProperty("--enter-delay", `${Math.min(900, next.row * 110 + (next.x / layout.width) * 420)}ms`);
          element.classList.add("spine-enter");
        }
        continue;
      }
      const before = previous.spines.get(id);
      const moved = !before || before.x !== next.x || before.y !== next.y;
      const animate = !resized && moved && (visible(before) || visible(next));
      element.dataset.instant = animate ? "false" : "true";
      if (animate) {
        element.style.setProperty("--delay", `${Math.min(280, order * 4)}ms`);
        order += 1;
      }
    }
    previousLayout.current = layout;
  }, [layout]);

  const register = useCallback((id: number, element: HTMLButtonElement | null) => {
    if (element) elements.current.set(id, element);
    else elements.current.delete(id);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      spineElement: (id) => elements.current.get(id) ?? null,
      focusSpine: (id) => elements.current.get(id)?.focus({ preventScroll: true }),
    }),
    [],
  );

  const handleActive = useCallback((id: number | null, viaKeyboard: boolean) => {
    setActive(id);
    if (id !== null && viaKeyboard) setRovingId(id);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!layout) return;
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(".spine");
    if (!target) return;
    const currentId = Number(target.dataset.id);
    let nextId: number | null = null;
    if (event.key === "ArrowRight") nextId = neighborInDirection(layout, currentId, "right");
    else if (event.key === "ArrowLeft") nextId = neighborInDirection(layout, currentId, "left");
    else if (event.key === "ArrowDown") nextId = neighborInDirection(layout, currentId, "down");
    else if (event.key === "ArrowUp") nextId = neighborInDirection(layout, currentId, "up");
    else if (event.key === "Home") nextId = layout.order[0] ?? null;
    else if (event.key === "End") nextId = layout.order[layout.order.length - 1] ?? null;
    else return;
    event.preventDefault();
    if (nextId === null) return;
    setRovingId(nextId);
    const element = elements.current.get(nextId);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  if (books.length === 0) {
    return (
      <div className="border-t-[3px] border-ink py-16 text-center">
        <p className="display text-3xl">The shelf is still empty.</p>
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

  const tabbableId = layout ? (rovingId !== null && layout.spines.has(rovingId) ? rovingId : (layout.order[0] ?? null)) : null;
  const activeSpine = active !== null && layout ? layout.spines.get(active) : undefined;
  const activeBook = active !== null ? byId.get(active) : undefined;
  const scale = layout?.metrics.scale ?? 1;
  const searching = Boolean(matches && matches.length > 0);
  const matchCount = matches?.length ?? 0;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={
        searching
          ? `Shelf with ${countBooks(books.length)}. ${matchCount} ${matchCount === 1 ? "answers your search and comes first" : "answer your search and come first"}. Use the arrow keys to browse.`
          : `Shelf with ${countBooks(books.length)}, arranged by ${arrangement}. Use the arrow keys to browse and Enter to open.`
      }
      aria-busy={reading}
      className={`shelf ${reading ? "is-reading" : ""}`}
      style={{ height: layout ? layout.height : 720, minHeight: 320 }}
      onKeyDown={handleKeyDown}
    >
      {layout === null ? (
        <div aria-hidden className="absolute inset-0">
          {[0, 1, 2].map((row) => (
            <div key={row} className="absolute inset-x-0 h-[3px] bg-ink/25" style={{ top: 256 + row * 357 }} />
          ))}
        </div>
      ) : (
        <>
          {layout.boards.map((board) => (
            <div
              key={board.key}
              aria-hidden
              className="placed h-[3px] bg-ink"
              style={position(board.x, board.y, { width: board.w })}
            />
          ))}

          {layout.labels.map((label) => (
            <p key={label.key} className="placed eyebrow text-ink-soft" style={position(0, label.y)}>
              {label.key === "answer"
                ? `The shelf answered · ${countBooks(matchCount)}`
                : `The rest of the shelf · ${countBooks(books.length - matchCount)} in the background`}
            </p>
          ))}

          {layout.dividers.map((divider) => (
            <div
              key={`${arrangement}:${divider.key}`}
              aria-hidden
              className="placed spine-enter shelf-divider"
              style={position(divider.x, divider.y, { width: divider.w, height: divider.h })}
            >
              <span className="eyebrow whitespace-nowrap text-[9.5px] text-ink" style={{ writingMode: "vertical-rl" }}>
                {divider.label}
              </span>
              <span className="display-italic text-[0.8rem] leading-none text-ink-soft">{divider.count}</span>
            </div>
          ))}

          {books.map((book) => {
            const placed = layout.spines.get(book.id);
            const identity = identities.get(book.id);
            if (!placed || !identity) return null;
            return (
              <Spine
                key={book.id}
                book={book}
                identity={identity}
                placed={placed}
                scale={scale}
                label={labels.get(book.id) ?? book.title}
                tabbable={tabbableId === book.id}
                active={active === book.id}
                absent={openId === book.id}
                readDelay={Math.round((placed.x / layout.width) * 700 + placed.row * 90)}
                onOpen={onOpen}
                onActive={handleActive}
                register={register}
              />
            );
          })}

          {layout.talkers.map((talker) => {
            const book = byId.get(talker.id);
            if (!book?.note) return null;
            const note = noteStyle(book.id, book.note, talker.w);
            const left = Math.min(talker.w - note.width, Math.max(0, talker.anchor - note.width / 2));
            return (
              <div
                key={talker.id}
                aria-hidden
                className="placed placed-animated z-[1]"
                style={position(talker.x, talker.y, { width: talker.w })}
              >
                <div
                  className="shelf-talker"
                  data-paper={note.paper}
                  data-fixing={note.fixing}
                  data-active={active === book.id ? "true" : undefined}
                  style={
                    {
                      "--tilt": `${talker.tilt}deg`,
                      "--drop": `${note.drop}px`,
                      "--anchor": `${talker.anchor - left}px`,
                      marginLeft: left,
                      width: note.width,
                    } as CSSProperties
                  }
                  onClick={() => onOpen(book.id)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setActive(book.id);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") setActive(null);
                  }}
                >
                  <span className="shelf-talker-thread" />
                  <div className="shelf-talker-paper">
                    <p className="handwriting text-ink" style={{ fontSize: note.size }}>
                      {book.note}
                    </p>
                    <p className="shelf-talker-sign">
                      {book.noteOrigin === "example" ? "sample note" : `— ${bookseller || "the bookseller"}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <AnimatePresence>
            {layout.captions.map((caption) => {
              const book = byId.get(caption.id);
              const result = results.get(caption.id);
              if (!book) return null;
              return (
                <motion.div
                  key={caption.id}
                  aria-hidden
                  className="placed placed-animated z-[2] cursor-pointer"
                  style={position(caption.x, caption.y, { width: caption.w, height: caption.h })}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.5, delay: 0.3 + caption.rank * 0.045 } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  onClick={() => onOpen(book.id)}
                >
                  <div className="flex h-full flex-col justify-end overflow-hidden">
                    <p className="eyebrow text-vermilion">{String(caption.rank).padStart(2, "0")}</p>
                    <p className="display mt-1 line-clamp-3 text-[1.42rem] leading-[1.02]">{book.title}</p>
                    <p className="mt-1 text-[0.95rem] italic leading-tight text-ink-soft">{book.author}</p>
                    {result ? (
                      <div className="mt-2.5 border-t border-ink/25 pt-2">
                        <ul className="space-y-0.5 font-label text-[0.8rem] leading-snug text-ink">
                          {result.reasons.slice(0, 3).map((reason) => (
                            <li key={`${reason.kind}-${reason.label}`} className="line-clamp-2">
                              {reason.label}
                            </li>
                          ))}
                        </ul>
                        {result.quote ? (
                          <p className="mt-1.5 line-clamp-3 text-[0.84rem] italic leading-snug text-ink-soft">“{result.quote}”</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {activeSpine && activeBook && activeSpine.state !== "match" && openId === null ? (
            <div
              aria-hidden
              className="placed pointer-events-none z-10"
              style={position(
                Math.min(Math.max(0, layout.width - 232), Math.max(0, activeSpine.x + activeSpine.w / 2 - 116)),
                activeSpine.y - 20,
              )}
            >
              <div key={activeBook.id} className="shelf-preview">
                <p className="eyebrow text-[9px] text-ink-soft">
                  {[activeBook.genre, activeBook.year].filter(Boolean).join(" · ") || "on the shelf"}
                </p>
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
                  <span>open ↵</span>
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
