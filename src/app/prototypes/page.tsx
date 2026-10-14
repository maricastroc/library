import Link from "next/link";
import { Wordmark } from "@/components/shelf/Masthead";
import { PROTOTYPES, FIVE_ANSWERS } from "@/components/prototypes/shared";

const DETAILS: Record<string, { collection: string; answer: string; book: string; sample: string }> = {
  table: {
    collection: "Each group is a lot on a bookshop table: books lie flat in piles of up to twelve, spines facing you, with one cover propped face-out on top. A folded card names the lot.",
    answer: "The answers are taken off the piles and laid at the front of the table: the closest one face-out, the next four in a numbered pile, with the bookseller’s reasons beside them.",
    book: "The book’s dust jacket, taken off and laid open: back flap, back cover, spine, front cover, front flap.",
    sample: "kitchen-yoshimoto",
  },
  cabinet: {
    collection: "A cabinet of compartments, sized by how many books each group holds and packed so no row is left half empty. Inside, every book’s posture follows a rule: one faces out on an easel, short books lie flat, the last of each run leans.",
    answer: "The answers go in the window: the three closest on easels at decreasing sizes, the rest standing, each with a museum label.",
    book: "A folding display: the cover on its easel in the middle, the reading and the record on two wings that open.",
    sample: "the-hour-of-the-star-lispector",
  },
  fan: {
    collection: "Each group is a hand of covers fanned out on a card table. Only the edge of each cover shows, with its title along the side; pointing at a card spreads the fan around it.",
    answer: "The answers are dealt as a single wide hand, the closest in the middle, raised above the others.",
    book: "A catalogue record: the cover clipped to a ruled card, the bibliographic fields typed, the atmospheres stamped.",
    sample: "stoner-williams",
  },
};

export default function PrototypesIndex() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 sm:px-8">
      <header className="flex items-end justify-between gap-6 pt-8">
        <Link href="/" className="text-[1.9rem]" aria-label="Back to the live shelf">
          <Wordmark name="Subtext" />
        </Link>
        <p className="eyebrow pb-1 text-ink-soft">three directions for review · the live shelf is unchanged</p>
      </header>
      <h1 className="display mt-16 text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.92]">Three ways to show the books</h1>
      <p className="mt-6 max-w-[42rem] text-[1.15rem] leading-[1.5] text-ink-soft">
        All three keep the bindings, the notes, the editorial search and the arrangement by atmosphere, pace, genre, author, title and price. None of
        them lines the books up on horizontal shelves or opens them as a two-page book.
      </p>
      <ol className="mt-14">
        {PROTOTYPES.map((prototype, index) => {
          const detail = DETAILS[prototype.slug];
          return (
            <li key={prototype.slug} className="proto-index-card">
              <span className="display text-[3rem] leading-none text-vermilion">{index + 1}</span>
              <div>
                <h2 className="display text-[2.2rem] leading-none">{prototype.name}</h2>
                <p className="eyebrow mt-2 text-ink-soft">{prototype.note}</p>
                <p className="mt-6 flex flex-col gap-2 text-[0.98rem]">
                  <Link className="ink-link" href={`/prototypes/${prototype.slug}`}>
                    the whole collection →
                  </Link>
                  <Link className="ink-link" href={`/prototypes/${prototype.slug}?q=${encodeURIComponent(FIVE_ANSWERS)}`}>
                    a request with five answers →
                  </Link>
                  <Link className="ink-link" href={`/prototypes/${prototype.slug}?book=${detail.sample}`}>
                    one book, opened →
                  </Link>
                </p>
              </div>
              <dl className="space-y-4 text-[1rem] leading-[1.5] text-ink-soft">
                <div>
                  <dt className="eyebrow text-ink">The collection</dt>
                  <dd className="mt-1">{detail.collection}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink">A search</dt>
                  <dd className="mt-1">{detail.answer}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink">One book</dt>
                  <dd className="mt-1">{detail.book}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
