import { ATMOSPHERE_BY_ID } from "@/lib/semantic/taxonomy";
import { ATMOSPHERE_SPECTRUM } from "@/lib/shelf/arrange";
import { KRAFT } from "@/lib/shelf/identity";

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

export function Colophon({ embedModel, chatModel }: { embedModel: string; chatModel: string }) {
  return (
    <footer id="how-to-read" className="mt-24 scroll-mt-8 border-t-[3px] border-ink pb-16 pt-8">
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[1.25fr_1fr_1fr]">
        <section aria-labelledby="legend-heading">
          <h2 id="legend-heading" className="display text-[2rem] leading-none">
            How to read the shelf
          </h2>
          <p className="mt-3 max-w-[34rem] text-ink-soft">
            No spine is decorated at random. Each one is drawn from what the catalog knows about the book.
          </p>
          <dl className="mt-6 space-y-5">
            <div>
              <dt className="eyebrow text-ink">Color is the prevailing atmosphere</dt>
              <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {ATMOSPHERE_SPECTRUM.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 font-label text-[0.82rem]">
                    <span aria-hidden className="inline-block h-4 w-2.5" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                    {ATMOSPHERE_BY_ID[id].label}
                  </span>
                ))}
              </dd>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="eyebrow text-ink">Thickness is the page count</dt>
                <dd className="mt-2 flex items-end gap-1 text-[0.9rem] text-ink-soft">
                  <MiniSpine width={8} height={34} color="#34506b" />
                  <MiniSpine width={14} height={34} color="#34506b" />
                  <MiniSpine width={22} height={34} color="#34506b" />
                  <span className="ml-2">from 100 to 800 pages</span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink">Height is the density of the reading</dt>
                <dd className="mt-2 flex items-end gap-1 text-[0.9rem] text-ink-soft">
                  <MiniSpine width={12} height={22} color="#7b1f2e" />
                  <MiniSpine width={12} height={28} color="#7b1f2e" />
                  <MiniSpine width={12} height={34} color="#7b1f2e" />
                  <span className="ml-2">from light to demanding</span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink">The bands are the pace</dt>
                <dd className="mt-2 flex items-end gap-1 text-[0.9rem] text-ink-soft">
                  <MiniSpine width={14} height={34} color="#24483e" bands={1} />
                  <MiniSpine width={14} height={34} color="#24483e" bands={3} />
                  <MiniSpine width={14} height={34} color="#24483e" bands={5} />
                  <span className="ml-2">from slow to breakneck</span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink">The typeface is the book’s form</dt>
                <dd className="mt-2 text-[0.9rem] leading-snug text-ink-soft">
                  <span className="face-serif text-[0.72rem] text-ink">Novel</span>,{" "}
                  <span className="face-italic text-ink">poetry and novella</span>,{" "}
                  <span className="face-grotesque text-[0.78rem] text-ink">essay</span>,{" "}
                  <span className="face-mono text-[0.72rem] text-ink">science fiction</span>.
                </dd>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-[0.9rem] text-ink-soft">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="relative inline-block h-5 w-[11px] bg-paper-light shadow-[0_0_0_0.5px_rgb(28_26_23/0.4)]">
                  <span className="absolute inset-x-[2.5px] top-1 h-[1.5px] bg-vermilion" />
                </span>
                paper bookmark: there is a bookseller’s note
              </span>
              <span className="inline-flex items-center gap-2">
                <MiniSpine width={12} height={20} color={KRAFT} />
                kraft paper: the AI hasn’t read the synopsis yet
              </span>
            </div>
          </dl>
        </section>

        <section aria-labelledby="ai-heading">
          <h2 id="ai-heading" className="eyebrow text-ink">
            How the shelf answers
          </h2>
          <div className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-ink-soft">
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
          <div className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-ink-soft">
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
