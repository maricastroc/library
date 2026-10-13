import type { ReactNode } from "react";
import type { ShelfBook } from "@/lib/catalog/types";
import { ATMOSPHERE_BY_ID } from "@/lib/semantic/taxonomy";
import { ATMOSPHERE_SPECTRUM } from "@/lib/shelf/arrange";
import { KRAFT, spineIdentity, type Binding, type SpineIdentity } from "@/lib/shelf/identity";
import { SpineFace } from "./SpineFace";

const SPECIMEN_BASE: ShelfBook = {
  id: 0,
  slug: "specimen",
  title: "",
  author: "",
  genre: "Novel",
  pages: 330,
  year: null,
  priceCents: null,
  priceIsDemo: false,
  stock: null,
  stockIsDemo: false,
  note: null,
  noteOrigin: null,
  semanticStatus: "ready",
  atmospheres: ["nostalgic"],
  pace: 3,
  density: 2,
  styles: [],
  experiences: [],
  themes: [],
};

const SPECIMENS: { binding: Binding; name: string; detail: string; book: Partial<ShelfBook>; imprints: string[] }[] = [
  { binding: "leather", name: "Leather", detail: "until 1879", book: { title: "Leather", year: 1850, atmospheres: ["intense"], pages: 520 }, imprints: ["1850"] },
  { binding: "cloth", name: "Cloth", detail: "1880 to 1934", book: { title: "Cloth", year: 1910, atmospheres: ["contemplative"] }, imprints: ["1910"] },
  { binding: "banded", name: "Three-band paperback", detail: "1935 to 1969", book: { title: "Paperback", year: 1950, atmospheres: ["comforting"] }, imprints: ["1950", "1951", "1952", "1953"] },
  { binding: "trade", name: "Trade paperback", detail: "1970 to 1999", book: { title: "Trade", year: 1985, atmospheres: ["melancholic"] }, imprints: ["1985"] },
  { binding: "minimal", name: "Plain cover", detail: "since 2000", book: { title: "Recent", year: 2015, atmospheres: ["unsettling"] }, imprints: ["2015"] },
  { binding: "wrapper", name: "Paper wrapper", detail: "poetry, theater, novellas", book: { title: "Wrapper", genre: "Poetry", year: 1950, atmospheres: ["dreamlike"], pages: 140 }, imprints: ["verse"] },
  { binding: "pocket", name: "Pocket book", detail: "science fiction, fantasy, crime", book: { title: "Pocket", genre: "Science fiction", year: 1965, atmospheres: ["tense"] }, imprints: ["1965"] },
  { binding: "jacket", name: "Dust jacket", detail: "essays, reportage, memoirs, comics", book: { title: "Jacket", genre: "Essay", year: 1990, atmospheres: ["luminous"], pages: 520 }, imprints: ["1990"] },
];

function specimen(wanted: Binding, book: Partial<ShelfBook>, imprints: string[]): SpineIdentity {
  const candidates = imprints.map((author) => spineIdentity({ ...SPECIMEN_BASE, ...book, author }));
  return candidates.find((identity) => identity.binding === wanted) ?? candidates[0];
}

function MiniSpine({ width, height, color, bands }: { width: number; height: number; color: string; bands?: number }) {
  return (
    <span aria-hidden className="relative inline-block shrink-0 align-bottom" style={{ width, height, background: color }}>
      {bands ? (
        <span className="absolute inset-x-0 bottom-1.5 flex flex-col gap-[2px]">
          {Array.from({ length: bands }, (_, index) => (
            <span key={index} className="block h-[1.5px] w-full bg-paper/80" />
          ))}
        </span>
      ) : null}
    </span>
  );
}

function Measure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legend-measure">
      <dt className="eyebrow text-ink">{title}</dt>
      <dd className="mt-3 flex items-end gap-3 text-[0.92rem] leading-snug text-ink-soft">{children}</dd>
    </div>
  );
}

export function Colophon({ embedModel, chatModel }: { embedModel: string; chatModel: string }) {
  return (
    <footer id="how-to-read" className="mt-28 scroll-mt-8 border-t-[3px] border-ink pb-20 pt-10">
      <section aria-labelledby="legend-heading">
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <div>
            <h2 id="legend-heading" className="display text-[clamp(2.2rem,3.8vw,3.5rem)] leading-[0.96]">
              How to read the shelf
            </h2>
            <p className="mt-5 max-w-[30rem] text-[1.15rem] leading-[1.45] text-ink-soft">
              No spine is decorated at random. Each one is drawn from what the catalog knows about the book.
            </p>
          </div>
          <div>
            <p className="flex items-baseline justify-between gap-4">
              <span className="eyebrow text-ink">Color is the prevailing atmosphere</span>
              <span className="handwriting hidden text-[1.25rem] text-ink-soft sm:inline">from luminous to dark</span>
            </p>
            <ul className="mt-3 grid grid-cols-4 gap-x-1.5 gap-y-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6">
              {ATMOSPHERE_SPECTRUM.map((id) => (
                <li key={id}>
                  <span aria-hidden className="swatch !h-11" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                  <span className="mt-1.5 block font-label text-[0.76rem] leading-tight">{ATMOSPHERE_BY_ID[id].label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16">
          <p className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
            <span className="eyebrow text-ink">The binding is the era and the kind of book</span>
            <span className="text-[0.92rem] italic text-ink-soft">
              Books by the same author share ornaments and imprint marks, like a uniform edition.
            </span>
          </p>
          <ul className="legend-plate mt-2">
            {SPECIMENS.map((item) => {
              const identity = specimen(item.binding, item.book, item.imprints);
              return (
                <li key={item.binding}>
                  <span aria-hidden className="legend-plate-stand">
                    <span className="block" style={{ width: identity.width, height: identity.height }}>
                      <SpineFace identity={identity} className="relative block h-full w-full overflow-hidden" />
                    </span>
                  </span>
                  <span className="mt-3 block pr-3">
                    <span className="display-italic block text-[0.95rem] leading-tight sm:text-[1.08rem]">{item.name}</span>
                    <span className="mt-1 block font-label text-[0.72rem] leading-snug text-ink-soft sm:text-[0.78rem]">{item.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <dl className="legend-measures mt-14">
          <Measure title="Thickness is the page count">
            <span aria-hidden className="flex items-end gap-1">
              <MiniSpine width={9} height={44} color="#34506b" />
              <MiniSpine width={16} height={44} color="#34506b" />
              <MiniSpine width={25} height={44} color="#34506b" />
            </span>
            <span>from 100 to 800 pages</span>
          </Measure>
          <Measure title="Height is the density of the reading">
            <span aria-hidden className="flex items-end gap-1">
              <MiniSpine width={14} height={26} color="#7b1f2e" />
              <MiniSpine width={14} height={35} color="#7b1f2e" />
              <MiniSpine width={14} height={44} color="#7b1f2e" />
            </span>
            <span>from light to demanding</span>
          </Measure>
          <Measure title="The rules count the pace">
            <span aria-hidden className="flex items-end gap-1">
              <MiniSpine width={16} height={44} color="#24483e" bands={1} />
              <MiniSpine width={16} height={44} color="#24483e" bands={3} />
              <MiniSpine width={16} height={44} color="#24483e" bands={5} />
            </span>
            <span>from slow to breakneck</span>
          </Measure>
          <Measure title="The typeface is the book’s form">
            <span className="text-[0.98rem] leading-relaxed">
              <span className="face-serif text-[0.78rem] text-ink">Novel</span>,{" "}
              <span className="face-italic text-[1.05rem] text-ink">poetry and novella</span>,{" "}
              <span className="face-grotesque text-[0.84rem] text-ink">essay</span>,{" "}
              <span className="face-mono text-[0.78rem] text-ink">science fiction</span>.
            </span>
          </Measure>
          <Measure title="A paper bookmark">
            <span aria-hidden className="relative inline-block h-11 w-[14px] shrink-0 bg-paper-light shadow-[0_0_0_0.5px_rgb(28_26_23/0.4)]">
              <span className="absolute inset-x-[3px] top-1.5 h-[1.5px] bg-vermilion shadow-[0_4px_0_var(--color-vermilion)]" />
            </span>
            <span>there is a bookseller’s note</span>
          </Measure>
          <Measure title="Kraft paper">
            <span aria-hidden className="flex items-end">
              <MiniSpine width={16} height={44} color={KRAFT} />
            </span>
            <span>the AI hasn’t read the synopsis yet</span>
          </Measure>
        </dl>
      </section>

      <div className="mt-16 grid gap-x-16 gap-y-10 border-t border-ink/25 pt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section aria-labelledby="ai-heading">
          <h2 id="ai-heading" className="eyebrow text-ink">
            How the shelf answers
          </h2>
          <div className="mt-4 gap-x-10 text-[0.98rem] leading-relaxed text-ink-soft sm:columns-2 [&>p+p]:mt-3 [&>p]:break-inside-avoid">
            <p>
              Each synopsis was read by an open model running on this computer ({chatModel}, via Ollama). It
              describes atmosphere, pace, density, style and themes, and has to point to the excerpt of the synopsis
              that supports each reading.
            </p>
            <p>
              Your question becomes a vector ({embedModel}) and is compared with those readings. When the shelf has
              no good answer, it says so.
            </p>
            <p>The bookseller can correct any classification. Personal notes are always written by people.</p>
          </div>
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="eyebrow text-ink">
            Where the data comes from
          </h2>
          <div className="mt-4 space-y-3 text-[0.98rem] leading-relaxed text-ink-soft">
            <p>
              Bibliographic data and covers:{" "}
              <a className="ink-link" href="https://openlibrary.org" target="_blank" rel="noreferrer">
                Open Library
              </a>
              . Synopses:{" "}
              <a className="ink-link" href="https://pt.wikipedia.org" target="_blank" rel="noreferrer">
                Portuguese Wikipedia
              </a>
              , translated into English, under the{" "}
              <a
                className="ink-link"
                href="https://creativecommons.org/licenses/by-sa/4.0/deed.en"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>{" "}
              license.
            </p>
            <p>Prices and stock marked as demo are not real commercial data.</p>
          </div>
        </section>
      </div>
    </footer>
  );
}
