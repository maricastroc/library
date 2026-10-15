import type { BookDetail } from "@/lib/catalog/types";
import { ATMOSPHERE_BY_ID, type AtmosphereId } from "@/lib/semantic/taxonomy";
import { ATMOSPHERE_SPECTRUM } from "@/lib/shelf/arrange";
import { SPINE_MAX_HEIGHT, spineIdentity } from "@/lib/shelf/identity";

type Slice = { id: number; label: string; state: "read" | "waiting" | "insufficient" | "error"; color: string | null; height: number };

const STATE_ORDER = { read: 0, waiting: 1, insufficient: 2, error: 3 } as const;

function sliceOf(book: BookDetail): Slice {
  const identity = spineIdentity(book);
  const height = Math.round((identity.height / SPINE_MAX_HEIGHT) * 100);
  const label = `${book.title} — ${book.author}`;
  if (book.semanticStatus === "ready" && book.atmospheres[0]) return { id: book.id, label, state: "read", color: ATMOSPHERE_BY_ID[book.atmospheres[0]].color, height };
  if (book.semanticStatus === "insufficient") return { id: book.id, label, state: "insufficient", color: null, height };
  if (book.semanticStatus === "error") return { id: book.id, label, state: "error", color: null, height };
  return { id: book.id, label, state: "waiting", color: null, height };
}

export function CatalogBand({ books }: { books: BookDetail[] }) {
  const position = (book: BookDetail) => {
    const primary = book.atmospheres[0] as AtmosphereId | undefined;
    const secondary = book.atmospheres[1] as AtmosphereId | undefined;
    return [primary ? ATMOSPHERE_SPECTRUM.indexOf(primary) : 99, secondary ? ATMOSPHERE_SPECTRUM.indexOf(secondary) : 99];
  };
  const slices = [...books]
    .sort((a, b) => {
      const state = STATE_ORDER[sliceOf(a).state] - STATE_ORDER[sliceOf(b).state];
      if (state !== 0) return state;
      const [a1, a2] = position(a);
      const [b1, b2] = position(b);
      return a1 - b1 || a2 - b2 || a.title.localeCompare(b.title, "en");
    })
    .map(sliceOf);

  const counts = new Map<AtmosphereId, number>();
  for (const book of books) {
    const primary = book.semanticStatus === "ready" ? (book.atmospheres[0] as AtmosphereId | undefined) : undefined;
    if (primary) counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  const waiting = slices.filter((slice) => slice.state === "waiting").length;
  const insufficient = slices.filter((slice) => slice.state === "insufficient").length;
  const errors = slices.filter((slice) => slice.state === "error").length;
  const summary = ATMOSPHERE_SPECTRUM.filter((id) => counts.get(id))
    .map((id) => `${counts.get(id)} ${ATMOSPHERE_BY_ID[id].label}`)
    .join(", ");

  return (
    <figure className="band">
      <div className="band-strip" role="img" aria-label={`The collection by predominant atmosphere: ${summary}. ${waiting} waiting for the AI, ${insufficient} with too little synopsis, ${errors} with errors.`}>
        {slices.map((slice) => (
          <span
            key={slice.id}
            className="band-slice"
            data-state={slice.state}
            title={slice.label}
            style={{ height: `${slice.height}%`, background: slice.color ?? undefined }}
          />
        ))}
      </div>
      <figcaption className="band-legend">
        {ATMOSPHERE_SPECTRUM.filter((id) => counts.get(id)).map((id) => (
          <span key={id} className="band-key">
            <span aria-hidden className="band-dot" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
            {ATMOSPHERE_BY_ID[id].label}
            <span className="band-key-count">{counts.get(id)}</span>
          </span>
        ))}
        {waiting > 0 ? (
          <span className="band-key">
            <span aria-hidden className="band-dot" data-state="waiting" />
            waiting for the AI<span className="band-key-count">{waiting}</span>
          </span>
        ) : null}
        {insufficient > 0 ? (
          <span className="band-key">
            <span aria-hidden className="band-dot" data-state="insufficient" />
            too little synopsis<span className="band-key-count">{insufficient}</span>
          </span>
        ) : null}
        {errors > 0 ? (
          <span className="band-key">
            <span aria-hidden className="band-dot" data-state="error" />
            reading failed<span className="band-key-count">{errors}</span>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
