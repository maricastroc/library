"use client";

import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from "react";
import { Cover } from "@/components/book/Cover";
import type { ShelfBook } from "@/lib/catalog/types";
import { COVER_RATIO, type Pose } from "@/lib/shelf/composition";
import type { SpineIdentity } from "@/lib/shelf/identity";
import type { AtmosphereId } from "@/lib/semantic/taxonomy";
import { SpineFace } from "./SpineFace";

export type HeroStillHandle = { bookElement: (id: number) => HTMLElement | null; focusBook: (id: number) => void };
type Piece = { book: ShelfBook; identity: SpineIdentity };
type Placed = { piece: Piece; pose: Pose; z: number };

const TABLE: { atmosphere: AtmosphereId; lying?: boolean; prefer?: string }[] = [
  { atmosphere: "dreamlike", lying: true },
  { atmosphere: "melancholic", lying: true },
  { atmosphere: "luminous", prefer: "harry-potter-and-the-philosopher-s-stone-rowling" },
  { atmosphere: "comforting" },
  { atmosphere: "intense", prefer: "the-song-of-achilles-miller" },
];
const GROUND = 230;
const SCALE = 0.82;
const TITLE_SIZE = 110;
const BOOK_REACH = 1.2;

export function pickHeroBooks(books: ShelfBook[], identities: Map<number, SpineIdentity>): Piece[] {
  const chosen: Piece[] = [];
  const bindings = new Set<string>();
  for (const { atmosphere, lying, prefer } of TABLE) {
    const candidates = books.filter((book) => {
      const identity = identities.get(book.id);
      const pages = book.pages ?? 0;
      return identity?.classified && book.atmospheres[0] === atmosphere && pages >= 160 && pages <= 480 && !chosen.some((piece) => piece.book.id === book.id);
    });
    const fresh = (book: ShelfBook) => !bindings.has(identities.get(book.id)!.binding) && (!lying || book.title.length <= 16);
    const pick =
      candidates.find((book) => book.slug === prefer) ??
      candidates.find((book) => book.note && fresh(book)) ??
      candidates.find(fresh) ??
      candidates[0];
    if (!pick) return [];
    const identity = identities.get(pick.id)!;
    bindings.add(identity.binding);
    chosen.push({ book: pick, identity });
  }
  return chosen;
}

const thick = (piece: Piece) => Math.max(24, piece.identity.width);
const radians = (degrees: number) => (degrees * Math.PI) / 180;

function lie(piece: Piece, left: number, top: number, scale: number): Pose {
  const length = piece.identity.height * scale;
  const t = thick(piece) * scale;
  return piece.identity.orientation === "up"
    ? { posture: "lie", x: left + length, y: top, angle: 90, scale, ox: 0, oy: 0, turn: 0 }
    : { posture: "lie", x: left, y: top + t, angle: -90, scale, ox: 0, oy: 0, turn: 0 };
}

function arrange([bottom, top, topper, upright, leaning]: Piece[]): { width: number; placed: Placed[] } {
  const s = SCALE;
  const t1 = thick(bottom) * s;
  const t2 = thick(top) * s;
  const pileTop = GROUND - t1 - t2;
  const lengthTop = top.identity.height * s;
  const fs = s * 0.74;
  const coverWidth = topper.identity.height * COVER_RATIO * fs;
  const topperLeft = 9 + lengthTop / 2 - coverWidth / 2;
  let x = Math.max(bottom.identity.height * s, 9 + lengthTop, topperLeft + coverWidth) + 16;
  const placed: Placed[] = [
    { piece: bottom, pose: lie(bottom, 0, GROUND - t1, s), z: 2 },
    { piece: top, pose: lie(top, 9, pileTop, s), z: 3 },
    {
      piece: topper,
      pose: { posture: "face", x: topperLeft + coverWidth / 2 - (thick(topper) * fs) / 2, y: pileTop, angle: 0, scale: fs, ox: 0, oy: -topper.identity.height, turn: -90 },
      z: 4,
    },
    { piece: upright, pose: { posture: "stand", x, y: GROUND, angle: 0, scale: s, ox: 0, oy: -upright.identity.height, turn: 0 }, z: 1 },
  ];
  x += thick(upright) * s + 1;
  const angle = 13;
  const pivot = x + leaning.identity.height * s * Math.sin(radians(angle));
  placed.push({ piece: leaning, pose: { posture: "lean", x: pivot, y: GROUND, angle: -angle, scale: s, ox: 0, oy: -leaning.identity.height, turn: 0 }, z: 1 });
  return { width: Math.ceil(pivot + thick(leaning) * s * Math.cos(radians(angle))), placed };
}

export function HeroStill({ ref, pieces, shopName, onOpen }: { ref?: Ref<HeroStillHandle>; pieces: Piece[]; shopName: string; onOpen: (id: number) => void }) {
  const elements = useRef(new Map<number, HTMLButtonElement>());
  const box = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  useImperativeHandle(ref, () => ({
    bookElement: (id) => elements.current.get(id) ?? null,
    focusBook: (id) => elements.current.get(id)?.focus(),
  }));

  useEffect(() => {
    const node = box.current;
    const form = node?.closest("form");
    const lead = form?.querySelector<HTMLElement>(".hero-lead");
    if (!node || !form || !lead) return;
    const apply = () => {
      const size = Number.parseFloat(getComputedStyle(lead).fontSize);
      const stillWidth = Number.parseFloat(node.style.getPropertyValue("--still-w")) || 1;
      const inline = window.matchMedia("(min-width: 48rem)").matches;
      let k = (BOOK_REACH * Math.min(size, TITLE_SIZE)) / TITLE_SIZE;
      if (inline) {
        const range = document.createRange();
        range.selectNodeContents(lead);
        const natural = Array.from(range.getClientRects()).reduce((sum, line) => sum + line.width, 0);
        const room = form.getBoundingClientRect().width - natural - 48;
        k = Math.min(k, room / stillWidth);
        node.style.setProperty("--baseline", `-${(size * 0.09).toFixed(1)}px`);
      } else {
        k = Math.min(0.62, (form.getBoundingClientRect().width * 0.55) / stillWidth);
      }
      node.style.setProperty("--k", Math.max(0.3, k).toFixed(3));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  if (pieces.length < 5) return null;
  const { width, placed } = arrange(pieces);
  const order = [...placed].sort((a, b) => a.pose.x - b.pose.x).map((item) => item.piece.book.id);
  const move = (event: KeyboardEvent<HTMLButtonElement>, id: number) => {
    const index = order.indexOf(id);
    const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? index + 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? order.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = Math.max(0, Math.min(order.length - 1, next));
    setCurrent(target);
    elements.current.get(order[target])?.focus();
  };

  return (
    <div ref={box} className="hero-still" role="group" aria-label="Five books from the shelf" style={{ "--still-w": `${width}px`, "--still-h": `${GROUND}px` } as CSSProperties}>
      <p aria-hidden className="handwriting hero-still-note">
        or pick up a book —
      </p>
      <div className="hero-still-stage">
        <span aria-hidden className="hero-still-shadow" />
        {placed.map(({ piece, pose, z }) => {
          const { book, identity } = piece;
          const t = thick(piece);
          return (
            <button
              key={book.id}
              ref={(element) => {
                if (element) elements.current.set(book.id, element);
                else elements.current.delete(book.id);
              }}
              type="button"
              className="book"
              data-posture={pose.posture}
              aria-label={`${book.title}, by ${book.author}`}
              tabIndex={order[current] === book.id ? 0 : -1}
              onKeyDown={(event) => move(event, book.id)}
              onFocus={() => setCurrent(order.indexOf(book.id))}
              onClick={() => onOpen(book.id)}
              style={
                {
                  "--x": `${pose.x}px`,
                  "--y": `${pose.y}px`,
                  "--a": `${pose.angle}deg`,
                  "--s": pose.scale,
                  "--ox": `${pose.ox}px`,
                  "--oy": `${pose.oy}px`,
                  "--turn": `${pose.turn}deg`,
                  "--thick": `${t}px`,
                  "--depth": `${Math.round(identity.height * COVER_RATIO)}px`,
                  width: t,
                  height: identity.height,
                  zIndex: z,
                } as CSSProperties
              }
            >
              <span className="book-body">
                <span className="book-spine">
                  <SpineFace identity={identity} className="relative block h-full w-full overflow-hidden" />
                </span>
                <span className="book-cover" style={{ background: identity.color }}>
                  <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} />
                </span>
              </span>
              {book.note && pose.posture === "stand" ? <span aria-hidden className="bookmark-flag" data-kind={book.id % 3} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
