"use client";

import { memo, type CSSProperties } from "react";
import type { ShelfBook } from "@/lib/catalog/types";
import type { SpineIdentity } from "@/lib/shelf/identity";
import type { PlacedSpine } from "@/lib/shelf/layout";
import { SpineFace } from "./SpineFace";

export type SpineProps = {
  book: ShelfBook;
  identity: SpineIdentity;
  placed: PlacedSpine;
  scale: number;
  label: string;
  tabbable: boolean;
  active: boolean;
  absent: boolean;
  readDelay: number;
  onOpen: (id: number) => void;
  onActive: (id: number | null, viaKeyboard: boolean) => void;
  register: (id: number, element: HTMLButtonElement | null) => void;
};

function SpineBase({ book, identity, placed, scale, label, tabbable, active, absent, readDelay, onOpen, onActive, register }: SpineProps) {
  const style = {
    "--x": `${placed.x}px`,
    "--y": `${placed.y}px`,
    "--read-delay": `${readDelay}ms`,
    width: placed.w,
    height: placed.h,
    zIndex: placed.state === "match" ? 2 : 1,
  } as CSSProperties;

  return (
    <button
      ref={(element) => register(book.id, element)}
      type="button"
      className="spine"
      style={style}
      data-id={book.id}
      data-state={placed.state}
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
      {book.note ? <span aria-hidden className="bookmark-flag" data-kind={book.id % 3} /> : null}
      <SpineFace identity={identity} scale={scale} />
    </button>
  );
}

export const Spine = memo(SpineBase);
