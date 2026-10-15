"use client";

import { useActionState, useState } from "react";
import { saveShop } from "@/app/admin/actions";
import { Cover } from "@/components/book/Cover";
import { Wordmark } from "@/components/shelf/Masthead";
import type { SpineIdentity } from "@/lib/shelf/identity";
import type { ShopConfig } from "@/lib/shop/config";
import { SHOWCASE_PALETTES, type ShowcasePalette } from "@/lib/showcase/palettes";
import { Stamp } from "./Counter";
import { FormFeedback, INITIAL_FORM_STATE, SubmitButton } from "./FormParts";

type Key = keyof ShopConfig;

const FIELDS: { key: Key; mark: string; label: string; max: number; where: string; required?: boolean }[] = [
  { key: "name", mark: "a", label: "Bookshop name", max: 60, required: true, where: "The masthead, every cover and each showcase page." },
  { key: "tagline", mark: "b", label: "Tagline", max: 120, where: "Beside the masthead, and at the foot of each showcase." },
  {
    key: "bookseller",
    mark: "c",
    label: "Who signs the notes",
    max: 60,
    where: "Under the notes you write and on each showcase. Left empty, notes are signed “the bookseller” and showcases go unsigned.",
  },
  { key: "city", mark: "d", label: "City", max: 80, where: "On each showcase, after the number of books, and at its foot." },
  { key: "contact", mark: "e", label: "Public contact", max: 120, where: "At the foot of each showcase: a phone, an email or an address." },
];

export function ShopForm({
  shop,
  sample,
  showcase,
}: {
  shop: ShopConfig;
  sample: { title: string; author: string; genre: string | null; identity: SpineIdentity } | null;
  showcase: { title: string; palette: ShowcasePalette; count: number } | null;
}) {
  const [state, action] = useActionState(saveShop, INITIAL_FORM_STATE);
  const [values, setValues] = useState<ShopConfig>(shop);
  const [saved, setSaved] = useState<ShopConfig>(shop);
  const [seen, setSeen] = useState(state);
  const [focus, setFocus] = useState<Key | null>(null);

  if (state !== seen) {
    setSeen(state);
    if (state.ok) setSaved(values);
  }

  const dirty = FIELDS.some(({ key }) => values[key].trim() !== saved[key].trim());
  const name = values.name.trim() || "Your bookshop";
  const colors = SHOWCASE_PALETTES[showcase?.palette ?? "ink"];
  const foot = [values.tagline, values.city, values.contact].map((part) => part.trim()).filter(Boolean);

  return (
    <form action={action} className="imprint" data-focus={focus ?? undefined}>
      <div className="imprint-fields">
        {FIELDS.map((field) => (
          <div key={field.key} className="imprint-field">
            <label htmlFor={field.key} className="imprint-label">
              <span aria-hidden className="imprint-mark">
                {field.mark}
              </span>
              <span className="eyebrow">{field.label}</span>
            </label>
            <input
              id={field.key}
              name={field.key}
              className="field"
              value={values[field.key]}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              onFocus={() => setFocus(field.key)}
              onBlur={() => setFocus(null)}
              maxLength={field.max}
              required={field.required}
              aria-describedby={`${field.key}-where`}
              aria-invalid={field.key === "name" && state.fields?.name ? true : undefined}
            />
            <p id={`${field.key}-where`} className="counter-field-hint">
              {field.where}
            </p>
            {field.key === "name" && state.fields?.name ? <p className="counter-field-error">{state.fields.name}</p> : null}
          </div>
        ))}
        <div className="save-bar" data-dirty={dirty ? "" : undefined}>
          <SubmitButton>Save the imprint</SubmitButton>
          {dirty ? <Stamp tone="vermilion">unsaved changes</Stamp> : null}
          <FormFeedback state={state} />
        </div>
      </div>

      <aside className="imprint-proofs" aria-label="Where these details appear">
        <p className="eyebrow imprint-proofs-title">Proofs · as readers see them</p>

        <figure className="proof">
          <figcaption className="proof-caption">
            <span aria-hidden className="imprint-mark">a</span>
            <span aria-hidden className="imprint-mark">b</span>
            The masthead, on the shelf
          </figcaption>
          <div className="proof-sheet proof-masthead">
            <span className="proof-wordmark" data-field="name">
              <Wordmark name={name} />
            </span>
            <span className="eyebrow proof-tagline" data-field="tagline">
              {values.tagline.trim() || <span className="proof-empty">no tagline</span>}
            </span>
          </div>
        </figure>

        <div className="proof-pair">
          <figure className="proof">
            <figcaption className="proof-caption">
              <span aria-hidden className="imprint-mark">a</span>
              The foot of a cover
            </figcaption>
            <div className="proof-cover" data-field="name">
              {sample ? (
                <Cover title={sample.title} author={sample.author} genre={sample.genre} identity={sample.identity} shopName={name} />
              ) : (
                <p className="proof-empty">No read book to set a cover with yet.</p>
              )}
            </div>
          </figure>

          <figure className="proof">
            <figcaption className="proof-caption">
              <span aria-hidden className="imprint-mark">c</span>
              Under your notes
            </figcaption>
            <div className="proof-note">
              <span aria-hidden className="proof-note-tape" />
              <p className="handwriting proof-note-text">Your notes, in your own hand.</p>
              <p className="eyebrow proof-note-sign" data-field="bookseller">
                — {values.bookseller.trim() || "the bookseller"}
              </p>
            </div>
            <p className="counter-field-hint">Sample notes keep their own label instead.</p>
          </figure>
        </div>

        <figure className="proof">
          <figcaption className="proof-caption">
            <span aria-hidden className="imprint-mark">a</span>
            <span aria-hidden className="imprint-mark">c</span>
            <span aria-hidden className="imprint-mark">d</span>
            <span aria-hidden className="imprint-mark">b</span>
            <span aria-hidden className="imprint-mark">e</span>
            A showcase page
          </figcaption>
          <div className="proof-sheet proof-showcase" style={{ background: colors.background, color: colors.ink }}>
            <span className="proof-showcase-wordmark" data-field="name">
              <Wordmark name={name} />
            </span>
            <p className="eyebrow proof-showcase-eyebrow">
              Showcase{showcase ? ` · ${showcase.count} ${showcase.count === 1 ? "book" : "books"}` : ""}
              <span data-field="city">{values.city.trim() ? ` · ${values.city.trim()}` : ""}</span>
            </p>
            <p className="proof-showcase-title">{showcase?.title ?? "A showcase"}</p>
            <p className="handwriting proof-showcase-sign" data-field="bookseller" style={{ color: colors.accent }}>
              {values.bookseller.trim() ? `— ${values.bookseller.trim()}` : <span className="proof-empty">unsigned</span>}
            </p>
            <div className="proof-showcase-foot">
              <p className="proof-showcase-name" data-field="name">
                {name}
              </p>
              <p className="eyebrow" data-field="tagline city contact">
                {foot.length > 0 ? foot.join(" · ") : <span className="proof-empty">nothing below the name</span>}
              </p>
            </div>
          </div>
        </figure>
      </aside>
    </form>
  );
}
