import type { CSSProperties } from "react";
import type { ShelfBook } from "@/lib/catalog/types";
import { COVER_RATIO, compose } from "@/lib/shelf/composition";
import type { SpineIdentity } from "@/lib/shelf/identity";
import { Cover } from "@/components/book/Cover";
import { SpineFace } from "./SpineFace";

export function StillLife({ books, identities, width, shopName }: { books: ShelfBook[]; identities: Map<number, SpineIdentity>; width: number; shopName: string }) {
  const composition = compose({ groups: [{ id: "still-life", label: "", books }], identities, width, density: "balanced" });
  const height = Math.max(0, ...[...composition.books.values()].map((placed) => placed.rect.y + placed.rect.h), ...composition.plinths.map((plinth) => plinth.y + plinth.h));
  return (
    <span aria-hidden className="still-life" style={{ width, height }}>
      {composition.plinths.map((plinth) => (
        <span key={plinth.key} className="plinth" style={{ "--x": `${plinth.x}px`, "--y": `${plinth.y}px`, width: plinth.w, height: plinth.h } as CSSProperties} />
      ))}
      {composition.shadows.map((shadow) => (
        <span key={shadow.key} className="floor-shadow" style={{ "--x": `${shadow.x}px`, "--y": `${shadow.y - 6}px`, width: shadow.w } as CSSProperties} />
      ))}
      {composition.easels.map((easel) => (
        <span key={easel.key} className="easel" style={{ "--x": `${easel.x}px`, "--y": `${easel.y - 9}px`, width: easel.w } as CSSProperties} />
      ))}
      {books.map((book) => {
        const placed = composition.books.get(book.id);
        const identity = identities.get(book.id);
        if (!placed || !identity) return null;
        const { pose } = placed;
        return (
          <span
            key={book.id}
            className="book"
            data-posture={pose.posture}
            style={
              {
                "--x": `${pose.x}px`,
                "--y": `${pose.y}px`,
                "--a": `${pose.angle}deg`,
                "--s": pose.scale,
                "--ox": `${pose.ox}px`,
                "--oy": `${pose.oy}px`,
                "--turn": `${pose.turn}deg`,
                "--thick": `${Math.max(24, identity.width)}px`,
                "--depth": `${Math.round(identity.height * COVER_RATIO)}px`,
                width: Math.max(24, identity.width),
                height: identity.height,
                zIndex: pose.posture === "lie" ? 3 : pose.posture === "face" ? 2 : 1,
              } as CSSProperties
            }
          >
            <span className="book-body">
              <span className="book-spine">
                <SpineFace identity={identity} className="relative block h-full w-full overflow-hidden" />
              </span>
              <span className="book-cover" style={{ background: identity.color }}>
                {pose.posture === "face" ? <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shopName} /> : null}
              </span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
