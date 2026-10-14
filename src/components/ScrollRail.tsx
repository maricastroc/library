"use client";

import { useEffect, useRef, type PointerEvent, type RefObject } from "react";

type Target = RefObject<HTMLElement | null> | undefined;
type Geometry = { scroll: number; max: number; track: number; size: number };

function measure(rail: HTMLElement | null, target: Target): Geometry | null {
  const element = target ? target.current : document.documentElement;
  if (!rail || !element) return null;
  const view = target ? element.clientHeight : window.innerHeight;
  const total = element.scrollHeight;
  const track = rail.clientHeight;
  const size = Math.min(track, Math.max(44, Math.round((track * view) / Math.max(total, 1))));
  return { scroll: target ? element.scrollTop : window.scrollY, max: Math.max(0, total - view), track, size };
}

function scrollTo(target: Target, top: number, smooth: boolean) {
  const behavior: ScrollBehavior = smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant";
  if (target) target.current?.scrollTo({ top, behavior });
  else window.scrollTo({ top, behavior });
}

export function ScrollRail({ target }: { target?: RefObject<HTMLElement | null> }) {
  const railRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; y: number; scroll: number } | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    const thumb = thumbRef.current;
    const element = target ? target.current : document.documentElement;
    if (!rail || !thumb || !element) return;
    const paint = () => {
      const current = measure(rail, target);
      if (!current) return;
      const idle = current.max <= 1;
      rail.toggleAttribute("data-idle", idle);
      if (idle) return;
      const offset = (current.scroll / current.max) * (current.track - current.size);
      thumb.style.height = `${current.size}px`;
      thumb.style.transform = `translateY(${Math.round(offset)}px)`;
    };
    const source: HTMLElement | Window = target ? element : window;
    source.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);
    const observer = new ResizeObserver(paint);
    const watch = () => {
      observer.disconnect();
      observer.observe(target ? element : document.body);
      for (const child of target ? Array.from(element.children) : []) observer.observe(child);
      paint();
    };
    const mutations = new MutationObserver(watch);
    if (target) mutations.observe(element, { childList: true, subtree: true, characterData: true });
    watch();
    return () => {
      source.removeEventListener("scroll", paint);
      window.removeEventListener("resize", paint);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [target]);

  const onThumbDown = (event: PointerEvent<HTMLDivElement>) => {
    const current = measure(railRef.current, target);
    if (!current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, y: event.clientY, scroll: current.scroll };
    railRef.current?.setAttribute("data-dragging", "true");
  };

  const onThumbMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = measure(railRef.current, target);
    const start = drag.current;
    if (!current || !start || start.pointer !== event.pointerId) return;
    const ratio = current.max / Math.max(1, current.track - current.size);
    scrollTo(target, start.scroll + (event.clientY - start.y) * ratio, false);
  };

  const onThumbUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    railRef.current?.removeAttribute("data-dragging");
  };

  const onTrackDown = (event: PointerEvent<HTMLDivElement>) => {
    const current = measure(railRef.current, target);
    const rail = railRef.current;
    if (!current || !rail || event.button !== 0 || event.target !== rail) return;
    event.preventDefault();
    const y = event.clientY - rail.getBoundingClientRect().top - current.size / 2;
    scrollTo(target, (Math.max(0, Math.min(y, current.track - current.size)) / Math.max(1, current.track - current.size)) * current.max, true);
  };

  return (
    <div ref={railRef} aria-hidden className="scroll-rail" data-scope={target ? "element" : "page"} data-idle onPointerDown={onTrackDown}>
      <div ref={thumbRef} className="scroll-rail-thumb" onPointerDown={onThumbDown} onPointerMove={onThumbMove} onPointerUp={onThumbUp} onPointerCancel={onThumbUp} />
    </div>
  );
}
