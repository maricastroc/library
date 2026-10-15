"use client";

import type { ReactNode } from "react";
import { Cover } from "@/components/book/Cover";
import { SpineFace } from "@/components/shelf/SpineFace";
import { formatPrice } from "@/lib/catalog/text";
import type { BookDetail, ShelfBook } from "@/lib/catalog/types";
import { SPINE_MAX_HEIGHT, SPINE_MIN_HEIGHT, type Binding, type SpineIdentity, type SpineTypeface } from "@/lib/shelf/identity";
import { ATMOSPHERE_BY_ID, DENSITY_LEVELS, PACE_LEVELS } from "@/lib/semantic/taxonomy";
import { ShelfFields } from "./fields";

export type Destination = "details" | "reading";

const BINDINGS: Record<Binding, string> = {
  leather: "Leather",
  cloth: "Cloth",
  banded: "Three-band paperback",
  trade: "Trade paperback",
  minimal: "Plain cover",
  wrapper: "Paper wrapper",
  pocket: "Pocket book",
  jacket: "Dust jacket",
  kraft: "Kraft paper",
};

const FACES: Record<SpineTypeface, string> = {
  serif: "a book serif",
  italic: "an italic",
  grotesque: "a grotesque",
  mono: "a typewriter face",
  soft: "a rounded face",
  hand: "handwriting",
};

function bindingStory(binding: Binding, genre: string | null, year: number | null): string {
  const kind = genre ? genre.toLowerCase() : "this genre";
  switch (binding) {
    case "kraft":
      return "Not read yet: unread books wait in kraft paper until they have a reading.";
    case "leather":
      return `Published in ${year}: books from before 1880 are bound in leather.`;
    case "wrapper":
      return `A ${kind}: poetry, theatre and novellas come in paper wrappers.`;
    case "pocket":
      return `A ${kind} book: science fiction, fantasy and crime come as numbered pocket books.`;
    case "jacket":
      return `A ${kind} book: essays, memoirs, reportage and comics wear a dust jacket.`;
    case "cloth":
      if (year === null) return "No year recorded, so the author’s edition decides: cloth.";
      if (year < 1935) return `Published in ${year}: cloth, from 1880 to 1934.`;
      return `Published in ${year}: most books of 1935 to 1969 are paperbacks, but this author’s edition is in cloth.`;
    case "banded":
      return `Published in ${year}: three-band paperbacks, from 1935 to 1969.`;
    case "trade":
      return year === null ? "No year recorded, so the author’s edition decides: trade paperback." : `Published in ${year}: trade paperbacks, from 1970 to 1999.`;
    case "minimal":
      return `Published in ${year}: plain covers, since 2000.`;
  }
}

function Trait({ name, value, glyph, children, onGo, where }: { name: string; value: ReactNode; glyph?: ReactNode; children: ReactNode; onGo?: () => void; where?: string }) {
  return (
    <div className="trait">
      <dt className="eyebrow trait-name">{name}</dt>
      <dd className="trait-value">
        {glyph ? <span aria-hidden className="trait-glyph">{glyph}</span> : null}
        <span>{value}</span>
      </dd>
      <dd className="trait-story">
        {children}
        {onGo && where ? (
          <>
            {" "}
            <button type="button" className="trait-go" onClick={onGo}>
              change it in {where} →
            </button>
          </>
        ) : null}
      </dd>
    </div>
  );
}

function parsePreviewPrice(value: string): number | null {
  const clean = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!clean) return null;
  const normalised = clean.includes(",") && !clean.includes(".") ? clean.replace(",", ".") : clean.replace(/,/g, "");
  const amount = Number(normalised);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export function PresentationPanel({
  book,
  draft,
  identity,
  price,
  stock,
  shopName,
  errors,
  unsaved,
  onGo,
  saveBar,
}: {
  book: BookDetail;
  draft: ShelfBook;
  identity: SpineIdentity;
  price: string;
  stock: string;
  shopName: string;
  errors: Record<string, string>;
  unsaved: boolean;
  onGo: (destination: Destination, field?: string) => void;
  saveBar: ReactNode;
}) {
  const classified = identity.classified;
  const [first, second, third] = draft.atmospheres;
  const height = (identity.height - SPINE_MIN_HEIGHT) / (SPINE_MAX_HEIGHT - SPINE_MIN_HEIGHT);
  const pace = PACE_LEVELS.find((level) => level.value === draft.pace);
  const density = DENSITY_LEVELS.find((level) => level.value === (draft.density ?? 2));
  const cents = parsePreviewPrice(price);
  const shownPrice = formatPrice(cents);
  const copies = stock.trim() === "" ? null : Number.parseInt(stock, 10);
  const available = copies === null || Number.isNaN(copies) ? null : copies > 0;
  const priceDemo = book.priceIsDemo && price.trim() === (book.priceCents === null ? "" : (book.priceCents / 100).toFixed(2));
  const stockDemo = book.stockIsDemo && stock.trim() === (book.stock === null ? "" : String(book.stock));

  return (
    <div className="present">
      <section className="present-stage" aria-labelledby="present-stage-title">
        <h3 id="present-stage-title" className="eyebrow present-stage-title">
          As it stands in the shop{unsaved ? " · with your unsaved changes" : ""}
        </h3>
        <div className="present-objects">
          <div className="present-cover">
            <Cover title={draft.title} author={draft.author} genre={draft.genre} identity={identity} shopName={shopName} />
          </div>
          <div className="present-spine" style={{ width: identity.width, height: identity.height }}>
            <SpineFace identity={identity} className="relative block h-full w-full overflow-hidden" />
          </div>
        </div>
        <div aria-hidden className="present-board" />
        <a href={`/?book=${book.slug}`} className="button-quiet present-open" target="_blank" rel="noreferrer">
          Open its jacket in the shop ↗
        </a>
      </section>

      <section className="present-traits" aria-labelledby="present-traits-title">
        <h3 id="present-traits-title" className="present-heading">
          How the reading <em>becomes the object</em>
        </h3>
        <dl className="traits">
          <Trait
            name="Binding"
            value={BINDINGS[identity.binding]}
            onGo={() => onGo(classified ? "details" : "reading", classified ? (["wrapper", "pocket", "jacket"].includes(identity.binding) ? "genre" : "year") : undefined)}
            where={classified ? "Book details" : "AI reading"}
          >
            {bindingStory(identity.binding, draft.genre, draft.year)}
          </Trait>
          <Trait
            name="Colour"
            value={classified && first ? `${ATMOSPHERE_BY_ID[first].label}${second ? `, with ${ATMOSPHERE_BY_ID[second].label}` : ""}` : "kraft"}
            glyph={
              <>
                <span className="trait-swatch" style={{ background: identity.color }} />
                {classified ? <span className="trait-swatch trait-swatch-small" style={{ background: identity.accent }} /> : null}
              </>
            }
            onGo={() => onGo("reading")}
            where="AI reading"
          >
            {classified && first
              ? `From the first atmosphere${second ? `, mixed with a little ${ATMOSPHERE_BY_ID[second].label}` : ""}; the accent comes from ${ATMOSPHERE_BY_ID[third ?? second ?? first].label}.`
              : "No atmosphere yet, so no colour of its own."}
          </Trait>
          <Trait
            name="Rules on the spine"
            value={identity.bands > 0 ? `${identity.bands} ${identity.bands === 1 ? "rule" : "rules"}` : "none"}
            glyph={
              <span className="trait-rules">
                {Array.from({ length: Math.max(identity.bands, 0) }, (_, index) => (
                  <span key={index} />
                ))}
              </span>
            }
            onGo={() => onGo("reading")}
            where="AI reading"
          >
            {identity.bands > 0 && pace ? `One rule per step of pace: ${pace.label}.` : "The rules count the pace once the book has a reading."}
          </Trait>
          <Trait
            name="Height"
            value={height < 0.34 ? "short" : height < 0.67 ? "medium" : "tall"}
            glyph={<span className="trait-height" style={{ height: `${0.5 + height * 1.1}rem` }} />}
            onGo={() => onGo("reading")}
            where="AI reading"
          >
            {`From the density (${density?.label ?? "balanced"}) and the form${draft.genre ? ` (${draft.genre.toLowerCase()})` : ""}: denser reads stand taller, poetry and novellas shorter.`}
          </Trait>
          <Trait name="Thickness" value={draft.pages ? `${draft.pages} pages` : "average"} glyph={<span className="trait-width" style={{ width: `${identity.width / 7}px` }} />} onGo={() => onGo("details", "pages")} where="Book details">
            {draft.pages ? "The spine widens with the page count." : "No page count recorded, so it gets an average thickness."}
          </Trait>
          <Trait name="Typeface" value={FACES[identity.face]} onGo={() => onGo("details", "genre")} where="Book details">
            {identity.face === "hand" ? "Kraft spines are labelled by hand." : `Chosen by the genre${draft.genre ? `: ${draft.genre.toLowerCase()}` : ""}.`}
          </Trait>
          <Trait name="Ornament and imprint" value={`${identity.ornament}, ${identity.mark}`}>
            {`Drawn from the author’s name, so every book by ${draft.author || "the same author"} looks like one uniform edition.`}
          </Trait>
        </dl>
      </section>

      <section className="present-trade" aria-labelledby="present-trade-title">
        <h3 id="present-trade-title" className="present-heading">
          On sale <em>in the shop</em>
        </h3>
        <div className="present-trade-grid">
          <ShelfFields book={book} errors={errors} />
          <figure className="present-flap" aria-label="How the price and availability appear in the jacket">
            <p className="eyebrow present-flap-title">in the jacket, the reader sees</p>
            <p className="present-flap-price">{shownPrice ?? "Price on request"}</p>
            <p className="eyebrow present-flap-stock">
              {priceDemo && shownPrice ? "demo price · " : ""}
              {available === null ? "availability on request" : available ? `${copies} ${copies === 1 ? "copy" : "copies"} in the shop` : "out of stock for now"}
              {stockDemo && available !== null ? " · demo stock" : ""}
            </p>
            <span aria-hidden className="button present-flap-button">
              {available === false ? "Notify me when it arrives" : "Reserve a copy"}
            </span>
            <figcaption className="counter-field-hint">
              {available === false
                ? "With no copies, readers can only ask to be told when it returns. Their requests reach Reservations."
                : "Readers reserve from the jacket; nothing is charged on the site. Their requests reach Reservations."}
            </figcaption>
          </figure>
        </div>
        {saveBar}
      </section>
    </div>
  );
}
