import type { CSSProperties, ReactNode } from "react";
import type { ReadingSpecimen } from "@/lib/catalog/books";
import type { ShelfBook } from "@/lib/catalog/types";
import { RETENTION_DAYS } from "@/lib/demand/report";
import { ATMOSPHERE_BY_ID, type AtmosphereId } from "@/lib/semantic/taxonomy";
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

const BY_ERA = 5;

const CONTENTS = [
  { id: "howto-binding", numeral: "I", label: "the binding" },
  { id: "howto-colour", numeral: "II", label: "the colour" },
  { id: "howto-shelf", numeral: "III", label: "the rules" },
  { id: "howto-reader", numeral: "IV", label: "the AI" },
];

const RECIPE: { atmospheres: AtmosphereId[]; label: string }[] = [
  { atmospheres: ["contemplative"], label: "contemplative" },
  { atmospheres: ["contemplative", "melancholic"], label: "+ melancholic" },
  { atmospheres: ["contemplative", "melancholic", "ironic"], label: "+ ironic" },
];

function specimen(wanted: Binding, book: Partial<ShelfBook>, imprints: string[]): SpineIdentity {
  const candidates = imprints.map((author) => spineIdentity({ ...SPECIMEN_BASE, ...book, author }));
  return candidates.find((identity) => identity.binding === wanted) ?? candidates[0];
}

function Spine({ identity }: { identity: SpineIdentity }) {
  return (
    <span aria-hidden className="block" style={{ width: identity.width, height: identity.height }}>
      <SpineFace identity={identity} className="relative block h-full w-full overflow-hidden" />
    </span>
  );
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

function PartHead({ numeral, id, children }: { numeral: string; id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="howto-part-title">
      <span aria-hidden className="howto-numeral">
        {numeral}
      </span>
      <span>{children}</span>
    </h3>
  );
}

function Rule({ glyph, title, children }: { glyph: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="howto-rule">
      <dt className="howto-rule-glyph" aria-hidden>
        {glyph}
      </dt>
      <dd>
        <span className="howto-rule-title">{title}</span>
        <span className="howto-rule-text">{children}</span>
      </dd>
    </div>
  );
}

export function Colophon({ embedModel, chatModel, reading }: { embedModel: string; chatModel: string; reading: ReadingSpecimen | null }) {
  const specimens = SPECIMENS.map((item) => ({ ...item, identity: specimen(item.binding, item.book, item.imprints) }));
  const stand = Math.max(...specimens.map((item) => item.identity.height)) + 10;
  const recipe = RECIPE.map((step) => ({ ...step, identity: spineIdentity({ ...SPECIMEN_BASE, title: "Rain", author: "Specimen", year: 1985, pages: 260, atmospheres: step.atmospheres }) }));
  const anatomy = spineIdentity({ ...SPECIMEN_BASE, title: "A spine, read closely", author: "Subtext", year: 1985, pages: 380, pace: 4, density: 3, atmospheres: ["contemplative", "melancholic"] });

  return (
    <footer id="how-to-read" data-running-title="how to read the collection" className="howto">
      <div className="howto-opening">
      <header className="howto-head">
        <h2 id="legend-heading" className="howto-title">
          How to read the collection
        </h2>
        <p className="howto-lede">Nothing on these shelves is decorated at random. Every spine is drawn from what the catalogue knows about the book, and every niche follows a few rules.</p>
        <nav aria-label="Parts of this guide" className="howto-contents">
          <ol>
            {CONTENTS.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>
                  <span aria-hidden className="howto-contents-numeral">
                    {item.numeral}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <section aria-labelledby="howto-binding" data-running-title="how to read · the binding" className="howto-part howto-binding">
        <PartHead numeral="I" id="howto-binding">
          The binding is the book’s <em>era and kind</em>
        </PartHead>
        <div className="howto-exhibit" style={{ "--stand": `${stand}px` } as CSSProperties}>
          <p aria-hidden className="howto-groups">
            <span className="handwriting" style={{ gridColumn: `span ${BY_ERA}` }}>
              by era
            </span>
            <span className="handwriting" style={{ gridColumn: `span ${SPECIMENS.length - BY_ERA}` }}>
              by kind of book
            </span>
          </p>
          <ul className="howto-plate">
            {specimens.map((item) => (
              <li key={item.binding}>
                <span aria-hidden className="howto-stand">
                  <Spine identity={item.identity} />
                </span>
                <span className="howto-caption">
                  <span className="howto-caption-name">{item.name}</span>
                  <span className="howto-caption-detail">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      </div>

      <section aria-labelledby="howto-colour" data-running-title="how to read · the colour" className="howto-part howto-colour">
        <div className="howto-colour-text">
          <PartHead numeral="II" id="howto-colour">
            The colour is the <em>atmosphere</em>
          </PartHead>
          <p className="howto-text">Each book has up to three, in order. The first colours the spine, the second tints it, the third gives the accent.</p>
        </div>
        <figure className="howto-recipe" aria-label="The same spine with one, two and three atmospheres">
            {recipe.map((step) => (
              <span key={step.label} className="howto-recipe-step">
                <Spine identity={step.identity} />
                <span className="howto-recipe-dots">
                  {step.atmospheres.map((id) => (
                    <span key={id} aria-hidden style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                  ))}
                  <span className="sr-only">{step.label}</span>
                </span>
              </span>
            ))}
        </figure>
        <div className="howto-spectrum-wrap">
          <p aria-hidden className="handwriting howto-spectrum-note">
            from luminous to dark
          </p>
          <ul className="howto-spectrum" aria-label="The twelve atmospheres, from luminous to dark">
            {ATMOSPHERE_SPECTRUM.map((id) => (
              <li key={id}>
                <span aria-hidden className="swatch howto-swatch" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                <span className="howto-swatch-label">{ATMOSPHERE_BY_ID[id].label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="howto-shelf" data-running-title="how to read · the rules" className="howto-part howto-shelf">
        <PartHead numeral="III" id="howto-shelf">
          The shelf <em>follows rules</em>
        </PartHead>
        <div className="howto-shelf-body">
          <figure className="anatomy" aria-label="One spine, read closely" style={{ "--spine-w": `${anatomy.width}px`, "--spine-h": `${anatomy.height}px` } as CSSProperties}>
            <div className="anatomy-plate">
              <div className="anatomy-left">
                <p className="anatomy-note anatomy-note-face">
                  <span className="anatomy-term">Typeface</span>
                  <span className="anatomy-gloss">the form</span>
                  <span className="anatomy-sample">
                    <span className="face-serif">Novel</span> <span className="face-italic">poetry</span> <span className="face-grotesque">essay</span> <span className="face-mono">sci-fi</span>
                  </span>
                </p>
                <p className="anatomy-note anatomy-note-rules">
                  <span className="anatomy-term">Rules</span>
                  <span className="anatomy-gloss">the pace</span>
                  <span aria-hidden className="anatomy-sample">
                    <MiniSpine width={12} height={30} color="#24483e" bands={1} />
                    <MiniSpine width={12} height={30} color="#24483e" bands={3} />
                    <MiniSpine width={12} height={30} color="#24483e" bands={5} />
                  </span>
                  <span className="anatomy-range">slow → breakneck</span>
                </p>
              </div>
              <div className="anatomy-spine">
                <Spine identity={anatomy} />
              </div>
              <div className="anatomy-right">
                <p className="anatomy-note anatomy-note-height">
                  <span className="anatomy-term">Height</span>
                  <span className="anatomy-gloss">the density</span>
                  <span aria-hidden className="anatomy-sample">
                    <MiniSpine width={10} height={18} color="#7b1f2e" />
                    <MiniSpine width={10} height={25} color="#7b1f2e" />
                    <MiniSpine width={10} height={32} color="#7b1f2e" />
                  </span>
                  <span className="anatomy-range">light → demanding</span>
                </p>
              </div>
              <p className="anatomy-note anatomy-note-width">
                <span className="anatomy-term">Thickness</span>
                <span className="anatomy-gloss">the page count</span>
                <span aria-hidden className="anatomy-sample">
                  <MiniSpine width={6} height={24} color="#34506b" />
                  <MiniSpine width={11} height={24} color="#34506b" />
                  <MiniSpine width={17} height={24} color="#34506b" />
                </span>
                <span className="anatomy-range">100 → 800 pages</span>
              </p>
            </div>
          </figure>

          <div className="howto-together">
            <p className="howto-subhead">Books together</p>
            <dl className="howto-rules">
              <Rule
                title="One faces you"
                glyph={
                  <span className="flex items-end gap-1">
                    <MiniSpine width={26} height={38} color="#c56a45" />
                    <MiniSpine width={8} height={34} color="#34506b" />
                    <MiniSpine width={10} height={38} color="#34506b" />
                  </span>
                }
              >
                the book with a bookseller’s note, or else the first of its group
              </Rule>
              <Rule
                title="Slim books lie flat"
                glyph={
                  <span className="flex flex-col items-start gap-[2px]">
                    <MiniSpine width={30} height={7} color="#24483e" />
                    <MiniSpine width={36} height={6} color="#7b1f2e" />
                    <MiniSpine width={40} height={8} color="#34506b" />
                  </span>
                }
              >
                poetry, theatre and books up to 170 pages, the largest at the bottom
              </Rule>
              <Rule
                title="The last one leans"
                glyph={
                  <span className="flex items-end gap-1">
                    <MiniSpine width={9} height={38} color="#5c4a6b" />
                    <MiniSpine width={9} height={35} color="#5c4a6b" />
                    <span className="inline-block origin-bottom-left rotate-[14deg]">
                      <MiniSpine width={9} height={36} color="#5c4a6b" />
                    </span>
                  </span>
                }
              >
                and leans further when the group reads fast
              </Rule>
              <Rule
                title="An answer is a staircase"
                glyph={
                  <span className="flex items-end gap-1">
                    <span className="block h-[28px] w-3.5 bg-ink/25" />
                    <span className="block h-[18px] w-3.5 bg-ink/25" />
                    <span className="block h-[10px] w-3.5 bg-ink/25" />
                  </span>
                }
              >
                the closest stands highest; sorted any other way, the books stand level
              </Rule>
            </dl>

            <p className="howto-subhead howto-subhead-signs">Small signs</p>
            <dl className="howto-rules howto-signs">
              <Rule
                title="A paper bookmark"
                glyph={
                  <span className="relative inline-block h-10 w-[13px] shrink-0 bg-paper-light shadow-[0_0_0_0.5px_rgb(28_26_23/0.4)]">
                    <span className="absolute inset-x-[3px] top-1.5 h-[1.5px] bg-vermilion shadow-[0_4px_0_var(--color-vermilion)]" />
                  </span>
                }
              >
                the bookseller left a note inside
              </Rule>
              <Rule title="Kraft paper" glyph={<MiniSpine width={15} height={40} color={KRAFT} />}>
                the AI hasn’t read the synopsis yet
              </Rule>
              <Rule
                title="Shared ornaments"
                glyph={
                  <span className="flex items-end gap-1">
                    <span className="howto-ornament" style={{ background: "#34506b" }} />
                    <span className="howto-ornament" style={{ background: "#7b1f2e" }} />
                  </span>
                }
              >
                books by one author, bound like a uniform edition
              </Rule>
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="howto-reader" data-running-title="how to read · the AI" className="howto-part howto-reader">
        <div className="howto-reader-text">
          <PartHead numeral="IV" id="howto-reader">
            The AI reads, <em>the bookseller decides</em>
          </PartHead>
          <ol className="howto-steps">
            <li>
              <span className="howto-step-title">It reads every synopsis.</span> A model on this computer notes atmosphere, pace, density, voice and themes, and quotes the passage behind each.
            </li>
            <li>
              <span className="howto-step-title">It searches by meaning.</span> “Melancholic but comforting” is compared with those readings, not matched word for word.
            </li>
            <li>
              <span className="howto-step-title">It says when nothing fits.</span> If the collection has no good answer, it tells you so instead of inventing one.
            </li>
            <li>
              <span className="howto-step-title">People have the last word.</span> The bookseller can correct any reading, and every note is written by a person.
            </li>
          </ol>
        </div>
        <div className="howto-reader-side">
          {reading ? (
            <figure className="howto-proof">
              <figcaption className="howto-proof-head">
                Quoted by the AI from the synopsis of{" "}
                <a href={`/?book=${reading.slug}`} className="howto-proof-title">
                  {reading.title}
                </a>
              </figcaption>
              <ul className="howto-proof-list">
                {reading.passages.map((passage) => (
                  <li key={passage.atmosphere}>
                    <span className="howto-proof-attribute">
                      <span aria-hidden className="howto-proof-dot" style={{ background: ATMOSPHERE_BY_ID[passage.atmosphere].color }} />
                      {ATMOSPHERE_BY_ID[passage.atmosphere].label}
                    </span>
                    <q className="howto-proof-quote">{passage.quote}</q>
                  </li>
                ))}
              </ul>
            </figure>
          ) : null}
          <p className="howto-models">
            <span>{chatModel}</span> reads the synopses · <span>{embedModel}</span> compares meanings · both run through Ollama, on this computer
          </p>
          <p className="howto-models">The words of each search stay on this computer for {RETENTION_DAYS} days, without who made them, so the bookshop knows what readers look for.</p>
        </div>
      </section>

      <section aria-labelledby="sources-heading" className="howto-sources">
        <h3 id="sources-heading" className="howto-sources-title">
          Sources
        </h3>
        <p>
          Bibliographic data and covers:{" "}
          <a className="ink-link" href="https://openlibrary.org" target="_blank" rel="noreferrer">
            Open Library
          </a>
          . Synopses:{" "}
          <a className="ink-link" href="https://pt.wikipedia.org" target="_blank" rel="noreferrer">
            Portuguese Wikipedia
          </a>
          , translated into English, and{" "}
          <a className="ink-link" href="https://en.wikipedia.org" target="_blank" rel="noreferrer">
            English Wikipedia
          </a>{" "}
          for books written in English, under the{" "}
          <a className="ink-link" href="https://creativecommons.org/licenses/by-sa/4.0/deed.en" target="_blank" rel="noreferrer">
            CC BY-SA 4.0
          </a>{" "}
          license.
        </p>
        <p>Prices and stock marked as demo are not real commercial data.</p>
      </section>
    </footer>
  );
}
