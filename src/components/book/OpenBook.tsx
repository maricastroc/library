"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import type { BookDetail, ShelfBook } from "@/lib/catalog/types";
import type { SearchResult } from "@/lib/search/types";
import type { SpineIdentity } from "@/lib/shelf/identity";
import { SpineFace } from "@/components/shelf/SpineFace";
import {
  RecordBlock,
  ReadingBlock,
  NoteBlock,
  WhyBlock,
  SynopsisBlock,
  TitleBlock,
  CoverPlate,
  type DetailState,
} from "./BookBlocks";
import { Cover } from "./Cover";
import { Reservation } from "./Reservation";

export type Box = { x: number; y: number; w: number; h: number };
export type OpenBookHandle = { close: (fromHistory?: boolean) => void };

type OpenBookProps = {
  ref?: Ref<OpenBookHandle>;
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

const WIDE_QUERY = "(min-width: 60rem) and (min-height: 35rem)";
const LEAF_EASE = [0.3, 0.05, 0.2, 1] as const;

function subscribeWide(callback: () => void) {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function toBox(rect: DOMRect): Box {
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
}

function onScreen(box: Box): boolean {
  return box.h > 0 && box.y + box.h > 0 && box.y < window.innerHeight && box.x + box.w > 0 && box.x < window.innerWidth;
}

function flightTransform(progress: number, origin: Box, slot: Box): string {
  const startScale = origin.h / slot.h;
  const thickness = origin.w / startScale;
  const move = easeInOut(progress);
  const turn = easeInOut(clamp01((progress - 0.08) / 0.92));
  const dx = (origin.x + origin.w / 2 - (slot.x + slot.w / 2)) * (1 - move);
  const dy = (origin.y + origin.h / 2 - (slot.y + slot.h / 2)) * (1 - move) - Math.sin(Math.PI * progress) * 44;
  const scale = startScale + (1 - startScale) * move;
  const angle = 90 * (1 - turn);
  const radians = (angle * Math.PI) / 180;
  const depth = -scale * ((slot.w / 2) * Math.sin(radians) + (thickness / 2) * Math.cos(radians));
  return `translate3d(${dx}px, ${dy}px, ${depth}px) scale(${scale}) rotateY(${angle}deg)`;
}

export function OpenBook({
  ref,
  book,
  identity,
  shopName,
  bookseller,
  result,
  query,
  initialOrigin,
  getOrigin,
  onClosed,
}: OpenBookProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const spineInnerRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const boxes = useRef<{ origin: Box; slot: Box } | null>(null);
  const closing = useRef(false);
  const finished = useRef(false);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
  const [settled, setSettled] = useState(false);
  const [detailState, setDetailState] = useState<DetailState>({ status: "loading" });

  const flight = useMotionValue(0);
  const leaf = useMotionValue(0);
  const backdrop = useMotionValue(0);
  const fade = useMotionValue(0);

  const backdropOpacity = useTransform(backdrop, [0, 1], [0, 0.95]);
  const leafRotation = useTransform(leaf, (value) => -180 * value);
  const coverShade = useTransform(leaf, [0, 0.5], [0, 0.42]);
  const versoShade = useTransform(leaf, [0.5, 1], [0.55, 0]);
  const castShadow = useTransform(leaf, [0, 0.9], [0.55, 0]);
  const pageReveal = useTransform(leaf, [0.2, 0.85], [0, 1]);
  const sheetOffset = useTransform(leaf, (value) => (1 - value) * 72);

  const applyFlight = useCallback((progress: number) => {
    const current = boxes.current;
    const flightElement = flightRef.current;
    const reveal = revealRef.current;
    const arrived = progress >= 1 || !current;
    if (flightElement) {
      flightElement.style.visibility = arrived ? "hidden" : "visible";
      if (current) flightElement.style.transform = flightTransform(progress, current.origin, current.slot);
    }
    if (reveal) reveal.style.visibility = arrived ? "visible" : "hidden";
  }, []);

  const placeFlight = useCallback(
    (origin: Box, slot: Box) => {
      boxes.current = { origin, slot };
      const flightElement = flightRef.current;
      const spineInner = spineInnerRef.current;
      if (!flightElement || !spineInner) return;
      const startScale = origin.h / slot.h;
      flightElement.style.left = `${slot.x}px`;
      flightElement.style.top = `${slot.y}px`;
      flightElement.style.width = `${slot.w}px`;
      flightElement.style.height = `${slot.h}px`;
      flightElement.style.setProperty("--thickness", `${origin.w / startScale}px`);
      flightElement.style.setProperty("--cover-width", `${slot.w}px`);
      spineInner.style.width = `${origin.w}px`;
      spineInner.style.height = `${origin.h}px`;
      spineInner.style.transform = `scale(${1 / startScale})`;
      applyFlight(flight.get());
    },
    [applyFlight, flight],
  );

  useMotionValueEvent(flight, "change", applyFlight);

  const finish = useCallback(
    (fromHistory: boolean) => {
      if (finished.current) return;
      finished.current = true;
      document.documentElement.style.overflow = "";
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      onClosed(fromHistory);
    },
    [onClosed],
  );

  const close = useCallback(
    async (fromHistory = false) => {
      if (closing.current) return;
      closing.current = true;
      const origin = getOrigin();
      const slotRect = slotRef.current?.getBoundingClientRect();
      const scrolled = (scrollRef.current?.scrollTop ?? 0) > 12;
      const canFly = !reducedMotion && origin && slotRect && onScreen(origin) && !scrolled;
      if (!canFly) {
        animate(fade, 0, { duration: 0.18 });
        await animate(backdrop, 0, { duration: 0.22 });
        finish(fromHistory);
        return;
      }
      setSettled(false);
      await nextFrame();
      await animate(leaf, 0, { duration: 0.52, ease: LEAF_EASE });
      const slotAfter = slotRef.current?.getBoundingClientRect();
      placeFlight(origin, toBox(slotAfter ?? slotRect));
      animate(backdrop, 0, { duration: 0.42, delay: 0.14 });
      await animate(flight, 0, { duration: 0.56, ease: "linear" });
      finish(fromHistory);
    },
    [backdrop, fade, finish, flight, getOrigin, leaf, placeFlight, reducedMotion],
  );

  useImperativeHandle(ref, () => ({ close }), [close]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    closing.current = false;
    finished.current = false;
    let cancelled = false;

    const slotRect = slotRef.current?.getBoundingClientRect();
    const canFly = !reducedMotion && initialOrigin && slotRect && onScreen(initialOrigin);

    if (canFly) {
      fade.set(1);
      flight.set(0);
      leaf.set(0);
      placeFlight(initialOrigin, toBox(slotRect));
      const run = async () => {
        animate(backdrop, 1, { duration: 0.5, ease: "easeOut" });
        await animate(flight, 1, { duration: 0.64, ease: "linear" });
        if (cancelled || closing.current) return;
        await animate(leaf, 1, { duration: 0.8, ease: LEAF_EASE });
        if (cancelled || closing.current) return;
        setSettled(true);
      };
      void run();
    } else {
      boxes.current = null;
      flight.set(1);
      leaf.set(1);
      applyFlight(1);
      animate(backdrop, 1, { duration: 0.22 });
      animate(fade, 1, { duration: 0.26 });
      const settle = requestAnimationFrame(() => {
        if (!cancelled) setSettled(true);
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(settle);
        document.documentElement.style.overflow = "";
      };
    }
    return () => {
      cancelled = true;
      document.documentElement.style.overflow = "";
    };
  }, [applyFlight, backdrop, fade, flight, initialOrigin, leaf, placeFlight, reducedMotion]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/books/${book.slug}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<BookDetail>) : Promise.reject(new Error(String(response.status)))))
      .then((detail) => setDetailState({ status: "ready", detail }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setDetailState({ status: "error", message: "Não foi possível carregar os detalhes deste livro. Feche e tente de novo." });
        }
      });
    return () => controller.abort();
  }, [book.slug]);

  const detail = detailState.status === "ready" ? detailState.detail : null;
  const shelfScale = initialOrigin ? initialOrigin.h / identity.height : 1;
  const cover = <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} />;

  const leftPage = (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-9 pb-8 pt-9 quiet-scroll">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <TitleBlock book={book} titleId={titleId} />
        </div>
        {detail ? <CoverPlate detail={detail} /> : null}
      </div>
      <ReadingBlock book={book} detail={detail} />
      <div className="mt-auto">
        <RecordBlock book={book} detail={detail} />
      </div>
    </div>
  );

  const rightPage = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-9 pb-8 pt-9 quiet-scroll">
      <WhyBlock result={result} query={query} detail={detail} />
      <SynopsisBlock state={detailState} />
      <NoteBlock book={book} bookseller={bookseller} />
      <div className="mt-auto pt-2">
        <Reservation book={book} query={result ? query : null} />
      </div>
    </div>
  );

  const closeButton = (
    <button
      type="button"
      onClick={() => void close()}
      className="eyebrow pointer-events-auto inline-flex min-h-11 items-center gap-2 px-2 text-paper hover:text-white"
    >
      <span aria-hidden className="text-[1.1rem] leading-none">
        ←
      </span>
      Devolver à estante
      <kbd className="ml-1 hidden border border-paper/40 px-1.5 py-0.5 text-[9px] sm:inline">Esc</kbd>
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      className="book-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        void close();
      }}
      onClose={() => finish(false)}
    >
      <motion.div className="absolute inset-0 bg-desk" style={{ opacity: backdropOpacity }} onClick={() => void close()} />

      <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: fade, perspective: 2400 }}>
        {wide ? (
          <>
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-2">
              {closeButton}
              <p className="eyebrow hidden text-paper/70 md:block">{shopName} · livro aberto</p>
            </div>
            <div
              ref={revealRef}
              className="pointer-events-auto absolute"
              style={
                {
                  "--ph": "min(100dvh - 6.5rem, 45rem)",
                  "--pw": "min((100vw - 6rem) / 2, var(--ph) * 0.77, 34rem)",
                  left: "calc(50% - var(--pw))",
                  top: "calc(50% - var(--ph) / 2 + 1rem)",
                  width: "calc(var(--pw) * 2)",
                  height: "var(--ph)",
                  perspective: 2400,
                  visibility: "hidden",
                } as React.CSSProperties
              }
            >
              <div ref={slotRef} className="page-surface absolute right-0 top-0 h-full w-1/2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)]">
                <motion.div className="h-full" style={{ opacity: pageReveal }}>
                  {rightPage}
                </motion.div>
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent"
                  style={{ opacity: castShadow }}
                />
                <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-ink/15 to-transparent" />
              </div>

              {settled ? (
                <div className="page-surface absolute left-0 top-0 h-full w-1/2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)]">
                  {leftPage}
                  <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[7%] bg-gradient-to-l from-ink/15 to-transparent" />
                </div>
              ) : (
                <motion.div
                  className="absolute left-1/2 top-0 h-full w-1/2"
                  style={{ rotateY: leafRotation, transformOrigin: "0% 50%", transformStyle: "preserve-3d" }}
                >
                  <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                    {cover}
                    <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: coverShade }} />
                  </div>
                  <div
                    aria-hidden
                    inert
                    className="page-surface absolute inset-0"
                    style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                  >
                    {leftPage}
                    <motion.div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/50 via-black/10 to-transparent"
                      style={{ opacity: versoShade }}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-[7%] bg-gradient-to-l from-ink/15 to-transparent" />
                  </div>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <div ref={scrollRef} className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-20 flex items-center bg-desk/85 px-2 py-1 backdrop-blur-sm">{closeButton}</div>
            <div ref={revealRef} className="relative z-10 mx-auto mt-3 w-[min(44vw,11rem)]" style={{ visibility: "hidden" }}>
              <div ref={slotRef} className="aspect-[0.7] w-full shadow-[0_22px_40px_-22px_rgb(0_0_0/0.9)]">
                {cover}
              </div>
            </div>
            <motion.div
              className="page-surface relative -mt-14 flex min-h-[70dvh] flex-col gap-6 px-5 pb-10 pt-20 sm:px-10"
              style={{ y: sheetOffset, opacity: leaf }}
            >
              <TitleBlock book={book} titleId={titleId} compact />
              <WhyBlock result={result} query={query} detail={detail} />
              <NoteBlock book={book} bookseller={bookseller} />
              <SynopsisBlock state={detailState} dropCap={false} />
              <ReadingBlock book={book} detail={detail} />
              <div className="flex items-end justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <RecordBlock book={book} detail={detail} />
                </div>
                {detail ? <CoverPlate detail={detail} /> : null}
              </div>
              <Reservation book={book} query={result ? query : null} />
            </motion.div>
          </div>
        )}

        <div
          ref={flightRef}
          aria-hidden
          className="absolute"
          style={{ transformStyle: "preserve-3d", visibility: "hidden", willChange: "transform" }}
        >
          <div className="absolute inset-0" style={{ transform: "translateZ(calc(var(--thickness) / 2))" }}>
            {cover}
          </div>
          <div
            className="absolute top-0 h-full overflow-hidden"
            style={{
              left: "calc((var(--cover-width) - var(--thickness)) / 2)",
              width: "var(--thickness)",
              transform: "rotateY(-90deg) translateZ(calc(var(--cover-width) / 2))",
            }}
          >
            <div ref={spineInnerRef} className="origin-top-left">
              <SpineFace identity={identity} scale={shelfScale} className="relative block h-full w-full overflow-hidden" />
            </div>
          </div>
        </div>
      </motion.div>
    </dialog>
  );
}
