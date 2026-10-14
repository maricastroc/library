"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { formatIsbn } from "@/lib/catalog/isbn";
import type { BookDetail, ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import type { SpineIdentity } from "@/lib/shelf/identity";
import { ScrollRail } from "@/components/ScrollRail";
import { SpineFace } from "@/components/shelf/SpineFace";
import { Cover } from "./Cover";
import { NoteBlock, ReadingBlock, RecordBlock, SynopsisBlock, TitleBlock, WhyBlock, type DetailState } from "./BookBlocks";
import { Reservation } from "./Reservation";

export type Box = { x: number; y: number; w: number; h: number };
export type JacketHandle = { close: (fromHistory?: boolean) => void };

type JacketProps = {
  ref?: Ref<JacketHandle>;
  book: ShelfBook;
  identity: SpineIdentity;
  shopName: string;
  bookseller: string;
  result: SearchResult | null;
  query: string | null;
  initialOrigin: Box | null;
  getOrigin: () => Box | null;
  onClosed: (fromHistory: boolean) => void;
};

const FLIGHT = 640;
const FOLD = 420;

function onScreen(box: Box) {
  return box.y + box.h > 0 && box.y < window.innerHeight && box.x + box.w > 0 && box.x < window.innerWidth;
}

function toBox(rect: DOMRect): Box {
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
}

function flightFrames(from: Box, to: Box): Keyframe[] {
  const scaleX = from.w / to.w;
  const scaleY = from.h / to.h;
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  return [
    { transform: `perspective(1600px) translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY}) rotateY(-62deg)`, opacity: 0.9 },
    { transform: `perspective(1600px) translate(${dx * 0.35}px, ${dy * 0.35 - 40}px) scale(${(scaleX + 1) / 2}, ${(scaleY + 1) / 2}) rotateY(-18deg)`, opacity: 1, offset: 0.55 },
    { transform: "perspective(1600px) translate(0, 0) scale(1, 1) rotateY(0deg)", opacity: 1 },
  ];
}

function Barcode({ isbn }: { isbn: string }) {
  const digits = isbn.replace(/\D/g, "").split("").map(Number);
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  digits.forEach((digit, index) => {
    const pattern = [(digit % 3) + 1, ((digit + index) % 2) + 1, ((digit * 7) % 3) + 1];
    pattern.forEach((width, step) => {
      if (step % 2 === 0) bars.push({ x, w: width });
      x += width + 1;
    });
  });
  return (
    <figure className="jacket-barcode" aria-label={`ISBN ${formatIsbn(isbn) ?? isbn}`}>
      <svg aria-hidden viewBox={`0 0 ${x} 30`} preserveAspectRatio="none">
        {bars.map((bar, index) => (
          <rect key={index} x={bar.x} y={0} width={bar.w} height={30} />
        ))}
      </svg>
      <figcaption>{formatIsbn(isbn) ?? isbn}</figcaption>
    </figure>
  );
}

function Flap({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={scroller} className="jacket-flap-scroll">
        {children}
      </div>
      <ScrollRail target={scroller} />
    </>
  );
}

function CoverFace({ book, identity, shopName, detail }: { book: ShelfBook; identity: SpineIdentity; shopName: string; detail: BookDetail | null }) {
  const [status, setStatus] = useState<{ url: string | null; loaded: boolean; failed: boolean }>({ url: null, loaded: false, failed: false });
  const url = detail?.coverUrl ?? null;
  const current = status.url === url ? status : { url, loaded: false, failed: false };
  return (
    <div className="jacket-cover-face">
      <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} />
      {url && !current.failed ? (
        <img
          src={`${url}?default=false`}
          alt={`Cover of an edition of ${book.title}`}
          decoding="async"
          data-loaded={current.loaded ? "true" : undefined}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setStatus({ url, loaded: naturalWidth > 8 && naturalHeight > 8, failed: naturalWidth <= 8 || naturalHeight <= 8 });
          }}
          onError={() => setStatus({ url, loaded: false, failed: true })}
        />
      ) : null}
    </div>
  );
}

export function Jacket({ ref, book, identity, shopName, bookseller, result, query, initialOrigin, getOrigin, onClosed }: JacketProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const finished = useRef(false);
  const titleId = useId();
  const [stage, setStage] = useState<"flying" | "open" | "folding">(initialOrigin ? "flying" : "open");
  const [detailState, setDetailState] = useState<DetailState>({ status: "loading" });

  const finish = useCallback(
    (fromHistory: boolean) => {
      if (finished.current) return;
      finished.current = true;
      document.documentElement.style.overflow = "";
      if (dialogRef.current?.open) dialogRef.current.close();
      onClosed(fromHistory);
    },
    [onClosed],
  );

  const close = useCallback(
    async (fromHistory = false) => {
      if (closing.current) return;
      closing.current = true;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const origin = getOrigin();
      const slot = slotRef.current?.getBoundingClientRect();
      setStage("folding");
      if (reduced || !origin || !slot || !onScreen(origin) || !flightRef.current) {
        await new Promise((resolve) => window.setTimeout(resolve, reduced ? 0 : 240));
        finish(fromHistory);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, FOLD));
      const flight = flightRef.current;
      const target = toBox(slotRef.current?.getBoundingClientRect() ?? slot);
      Object.assign(flight.style, { left: `${target.x}px`, top: `${target.y}px`, width: `${target.w}px`, height: `${target.h}px`, visibility: "visible" });
      await flight.animate([...flightFrames(origin, target)].reverse(), { duration: FLIGHT * 0.85, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" }).finished.catch(() => undefined);
      finish(fromHistory);
    },
    [finish, getOrigin],
  );

  useImperativeHandle(ref, () => ({ close }), [close]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slot = slotRef.current?.getBoundingClientRect();
    const flight = flightRef.current;
    let cancelled = false;
    if (initialOrigin && slot && flight && !reduced && onScreen(initialOrigin)) {
      const target = toBox(slot);
      Object.assign(flight.style, { left: `${target.x}px`, top: `${target.y}px`, width: `${target.w}px`, height: `${target.h}px`, visibility: "visible" });
      const animation = flight.animate(flightFrames(initialOrigin, target), { duration: FLIGHT, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
      animation.finished
        .catch(() => undefined)
        .then(() => {
          if (cancelled) return;
          flight.style.visibility = "hidden";
          setStage("open");
        });
    } else {
      const frame = requestAnimationFrame(() => setStage("open"));
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        document.documentElement.style.overflow = "";
      };
    }
    return () => {
      cancelled = true;
      document.documentElement.style.overflow = "";
    };
  }, [initialOrigin]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/books/${book.slug}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<BookDetail>) : Promise.reject(new Error(String(response.status)))))
      .then((detail) => setDetailState({ status: "ready", detail }))
      .catch(() => {
        if (!controller.signal.aborted) setDetailState({ status: "error", message: "Couldn’t load this book’s details. Fold the jacket and try again." });
      });
    return () => controller.abort();
  }, [book.slug]);

  const detail = detailState.status === "ready" ? detailState.detail : null;
  const spine = Math.max(36, Math.round(identity.width * 1.55));

  return (
    <dialog
      ref={dialogRef}
      className="jacket-dialog"
      data-stage={stage}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        void close();
      }}
      onClose={() => finish(false)}
    >
      <div aria-hidden className="jacket-backdrop" onClick={() => void close()} />
      <div className="jacket-bar">
        <button type="button" onClick={() => void close()} className="eyebrow inline-flex min-h-11 items-center gap-2 text-paper hover:text-white">
          <span aria-hidden className="text-[1.1rem] leading-none">
            ←
          </span>
          Fold the jacket back
          <kbd className="ml-1 hidden border border-paper/40 px-1.5 py-0.5 text-[9px] sm:inline">Esc</kbd>
        </button>
        <p className="eyebrow hidden text-paper/65 md:block">{shopName} · the jacket, laid open</p>
      </div>

      <div className="jacket-room">
        <div className="jacket" style={{ "--spine": `${spine}px`, "--tint": identity.color } as CSSProperties}>
          <div className="jacket-panel jacket-front" ref={slotRef}>
            <CoverFace book={book} identity={identity} shopName={shopName} detail={detail} />
          </div>

          <section className="jacket-panel jacket-front-flap" aria-label="Front flap">
            <Flap>
              <TitleBlock book={book} titleId={titleId} compact />
              <WhyBlock result={result} query={query} detail={detail} />
              <SynopsisBlock state={detailState} />
            </Flap>
          </section>

          <div aria-hidden className="jacket-panel jacket-spine">
            <SpineFace identity={identity} scale={1.55} className="relative block h-full w-full overflow-hidden" />
          </div>

          <section className="jacket-panel jacket-back" aria-label="Back cover: how it reads">
            <Flap>
              <ReadingBlock book={book} detail={detail} />
              <NoteBlock book={book} bookseller={bookseller} />
            </Flap>
            {detail?.isbn ? <Barcode isbn={detail.isbn} /> : null}
          </section>

          <section className="jacket-panel jacket-back-flap" aria-label="Back flap: the edition">
            <Flap>
              <p className="eyebrow text-ink-soft">on this edition</p>
              <RecordBlock book={book} detail={detail} />
              <Reservation book={book} query={result ? query : null} />
            </Flap>
          </section>
        </div>
      </div>

      <div ref={flightRef} aria-hidden className="jacket-flight">
        <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} />
      </div>
    </dialog>
  );
}
