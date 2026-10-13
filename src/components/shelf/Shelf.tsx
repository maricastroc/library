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
import { formatPrice } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import { atmosphereLabel } from "@/lib/semantic/taxonomy";
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
  results: Map<number, SearchResult>;
  reading: boolean;
  openId: number | null;
  bookseller: string;
  onOpen: (id: number) => void;
};

const position = (x: number, y: number, extra?: CSSProperties) =>
  ({ "--x": `${x}px`, "--y": `${y}px`, ...extra }) as CSSProperties;

function describe(book: ShelfBook, result: SearchResult | undefined, rank: number | null): string {
  const parts: string[] = [];
  if (rank) parts.push(`Resultado ${rank}:`);
  parts.push(`${book.title}, de ${book.author}.`);
  if (book.genre) parts.push(`${book.genre}.`);
  if (book.atmospheres.length > 0) parts.push(`Atmosfera ${book.atmospheres.map(atmosphereLabel).join(", ")}.`);
  const price = formatPrice(book.priceCents);
  if (price) parts.push(`${price}.`);
  if (book.stock === 0) parts.push("Esgotado.");
  if (book.note) parts.push(book.noteOrigin === "example" ? "Com nota de exemplo." : "Com nota da livreira.");
  if (result) parts.push(`Por quê: ${result.reasons.map((reason) => reason.label).join("; ")}.`);
  return parts.join(" ");
}

export function Shelf({ ref, books, groups, arrangement, matches, results, reading, openId, bookseller, onOpen }: ShelfProps) {
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
    return layoutShelf({ groups, identities, noted, width, matches: matches ?? undefined });
  }, [groups, identities, noted, width, matches]);

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
        <p className="display text-3xl">A estante ainda está vazia.</p>
        <p className="mt-3 text-ink-soft">
          Importe um catálogo no{" "}
          <a className="ink-link" href="/admin/import">
            balcão da livraria
          </a>{" "}
          para começar.
        </p>
      </div>
    );
  }

  const tabbableId = layout ? (rovingId !== null && layout.spines.has(rovingId) ? rovingId : (layout.order[0] ?? null)) : null;
  const activeSpine = active !== null && layout ? layout.spines.get(active) : undefined;
  const activeBook = active !== null ? byId.get(active) : undefined;
  const scale = layout?.metrics.scale ?? 1;
  const searching = Boolean(matches && matches.length > 0);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={
        searching
          ? `Estante com ${books.length} livros. ${matches?.length ?? 0} respondem à sua busca e vêm primeiro. Use as setas para percorrer.`
          : `Estante com ${books.length} livros, arrumada por ${arrangement}. Use as setas para percorrer e Enter para abrir.`
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
                ? `A estante respondeu · ${matches?.length ?? 0} ${matches?.length === 1 ? "livro" : "livros"}`
                : `O restante da estante · ${books.length - (matches?.length ?? 0)} livros em segundo plano`}
            </p>
          ))}

          {layout.dividers.map((divider) => (
            <div
              key={`${arrangement}:${divider.key}`}
              aria-hidden
              className="placed spine-enter flex flex-col items-center justify-between border-x border-t border-ink/30 bg-paper-light py-2"
              style={position(divider.x, divider.y, { width: divider.w, height: divider.h })}
            >
              <span className="eyebrow whitespace-nowrap text-[9.5px] text-ink" style={{ writingMode: "vertical-rl" }}>
                {divider.label}
              </span>
              <span className="eyebrow text-[9px] text-ink-soft">{divider.count}</span>
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
            return (
              <div
                key={talker.id}
                aria-hidden
                className="placed placed-animated z-[1] cursor-pointer pt-[7px]"
                style={position(talker.x, talker.y, { width: talker.w })}
                onClick={() => onOpen(book.id)}
              >
                <div className="shelf-talker relative px-3 pb-2 pt-2.5" style={{ rotate: `${talker.tilt}deg` }}>
                  <p className="handwriting line-clamp-3 text-[19px] text-ink">{book.note}</p>
                  <p className="eyebrow mt-1.5 text-[8.5px] text-ink-soft">
                    {book.noteOrigin === "example" ? "nota de exemplo" : `— ${bookseller || "a livreira"}`}
                  </p>
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
              <div className="w-[232px] -translate-y-full bg-ink px-3 py-2 text-paper">
                <p className="display-italic text-[1.05rem] leading-tight">{activeBook.title}</p>
                <p className="eyebrow mt-1 text-[9.5px] text-paper/80">
                  {activeBook.author}
                  {formatPrice(activeBook.priceCents) ? ` · ${formatPrice(activeBook.priceCents)}` : ""}
                  {activeBook.stock === 0 ? " · esgotado" : ""}
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
