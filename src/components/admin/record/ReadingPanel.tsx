"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useFormStatus } from "react-dom";
import { reclassifyBook, type FormState } from "@/app/admin/actions";
import { SpineFace } from "@/components/shelf/SpineFace";
import type { BookDetail } from "@/lib/catalog/types";
import type { SpineIdentity } from "@/lib/shelf/identity";
import {
  ATMOSPHERES,
  ATMOSPHERE_BY_ID,
  DENSITY_LEVELS,
  EXPERIENCES,
  PACE_LEVELS,
  STYLES,
  type AtmosphereId,
  type ExperienceId,
  type StyleId,
} from "@/lib/semantic/taxonomy";
import { Stamp } from "../Counter";
import { FormFeedback } from "../FormParts";
import { RailedTextarea } from "../RailedTextarea";
import { groupEvidence, type Reading } from "./reading";

const ORDINALS = ["1st", "2nd", "3rd"];

function toggle<T>(list: T[], value: T, limit: number): T[] {
  if (list.includes(value)) return list.filter((item) => item !== value);
  return list.length >= limit ? list : [...list, value];
}

function move<T>(list: T[], index: number, step: number): T[] {
  const target = index + step;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function Group({
  id,
  title,
  aside,
  open,
  onToggle,
  editLabel,
  children,
  className = "",
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  open: boolean;
  onToggle: () => void;
  editLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`read-group ${className}`} aria-labelledby={`${id}-title`} data-open={open ? "" : undefined}>
      <div className="read-group-head">
        <h3 id={`${id}-title`} className="eyebrow read-group-title">
          {title}
          {aside ? <span className="read-group-aside">{aside}</span> : null}
        </h3>
        <button type="button" className="read-edit" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
          {open ? "done" : editLabel}
        </button>
      </div>
      <div id={`${id}-body`} className="read-group-body">
        {children}
      </div>
    </section>
  );
}

function PaceGlyph({ value }: { value: number }) {
  return (
    <span aria-hidden className="read-rules">
      {Array.from({ length: value }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function DensityGlyph({ value }: { value: number }) {
  return <span aria-hidden className="read-height" style={{ height: `${0.5 + value * 0.26}rem` }} />;
}

function Provenance({ book, waiting }: { book: BookDetail; waiting: boolean }) {
  const status = book.semanticStatus;
  if (status === "pending" || status === "processing") {
    return (
      <div className="read-provenance" data-tone="waiting">
        <Stamp tone="kraft">{status === "processing" ? "being read now" : "in the queue"}</Stamp>
        <p>
          {status === "processing" ? "The local AI is reading the synopsis right now." : "The book is waiting for the local AI to read its synopsis."}
          {book.atmospheres.length > 0 ? " What you see below is the previous reading; it will be replaced." : ""}
          {waiting ? " This page updates by itself when it is done." : ""}
        </p>
      </div>
    );
  }
  if (status === "insufficient") {
    return (
      <div className="read-provenance" data-tone="waiting">
        <Stamp tone="kraft">too little synopsis</Stamp>
        <p>{book.semanticError ?? "The synopsis isn’t enough for a responsible reading."} You can still write the reading yourself below.</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="read-provenance" data-tone="error">
        <Stamp tone="vermilion">reading failed</Stamp>
        <p>{book.semanticError ?? "The AI could not read this book."}</p>
      </div>
    );
  }
  if (book.semanticOrigin === "bookseller") {
    return (
      <div className="read-provenance">
        <Stamp tone="vermilion">reviewed by you</Stamp>
        <p>This reading is yours. The AI leaves it alone, even when the synopsis changes, until you ask it for a new one.</p>
      </div>
    );
  }
  return (
    <div className="read-provenance">
      <Stamp tone="ink">read by the AI</Stamp>
      <p>
        <span className="read-model">{book.semanticModel ?? "local model"}</span>
        {book.confidence ? ` · ${book.confidence} confidence` : ""}. Correct anything below and it becomes your review.
      </p>
    </div>
  );
}

function ConfirmButtons({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="read-anew-buttons">
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Asking…" : "Yes, ask the AI"}
      </button>
      <button type="button" className="button-quiet" onClick={onCancel} disabled={pending} autoFocus>
        Keep this reading
      </button>
    </div>
  );
}

function NewReading({ book, readingDirty, synopsisDirty, onConfirm }: { book: BookDetail; readingDirty: boolean; synopsisDirty: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  const busy = book.semanticStatus === "pending" || book.semanticStatus === "processing";
  const reviewed = book.semanticOrigin === "bookseller" && book.semanticStatus === "ready";
  return (
    <section className="read-anew" aria-labelledby="anew-heading">
      <h3 id="anew-heading" className="read-anew-title">
        A new reading <em>from the AI</em>
      </h3>
      <div className="read-anew-body">
        <dl className="read-anew-terms">
          <div>
            <dt>Replaced</dt>
            <dd>atmosphere, pace, density, voice, good for, themes, the portrait and the quotes behind them</dd>
          </div>
          <div>
            <dt>Discarded</dt>
            <dd>
              {reviewed ? "your review of this reading" : "this reading as it stands"}
              {readingDirty ? ", and the changes you haven’t saved on this tab" : ""}
            </dd>
          </div>
          <div>
            <dt>Kept</dt>
            <dd>the record: title, author, synopsis, your note, price and stock</dd>
          </div>
          <div>
            <dt>Meanwhile</dt>
            <dd>the book stands in kraft paper on the shelf and its reading leaves the search, until the local model on this computer has read it</dd>
          </div>
        </dl>
        <p className="counter-field-hint">The AI reads the saved title, author, genre and synopsis, and the subjects from the catalogue sources.</p>
        {synopsisDirty ? (
          <p className="slip" data-tone="error">
            Your changes to the synopsis aren’t saved yet. Save the record first, or the AI reads the old one.
          </p>
        ) : null}
        {busy ? (
          <p className="slip">Already asked: the AI hasn’t finished this book yet.</p>
        ) : !book.synopsis ? (
          <p className="slip">There is no synopsis to read. Add one in Book details first.</p>
        ) : asking ? (
          <form
            action={reclassifyBook}
            className="confirm slip-enter"
            onSubmit={() => {
              onConfirm();
            }}
          >
            <input type="hidden" name="id" value={book.id} />
            <p className="read-anew-question">Replace this reading with a new one from the AI?</p>
            <ConfirmButtons onCancel={() => setAsking(false)} />
          </form>
        ) : (
          <button type="button" className="button button-outline" onClick={() => setAsking(true)}>
            Ask for a new reading…
          </button>
        )}
      </div>
    </section>
  );
}

export function ReadingPanel({
  book,
  reading,
  setReading,
  changed,
  identity,
  state,
  action,
  pending,
  waiting,
  synopsisDirty,
  onDiscard,
}: {
  book: BookDetail;
  reading: Reading;
  setReading: Dispatch<SetStateAction<Reading>>;
  changed: string[];
  identity: SpineIdentity;
  state: FormState;
  action: (data: FormData) => void;
  pending: boolean;
  waiting: boolean;
  synopsisDirty: boolean;
  onDiscard: () => void;
}) {
  const empty = reading.atmospheres.length === 0;
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ atmosphere: book.atmospheres.length === 0 }));
  const [hint, setHint] = useState<string | null>(null);
  const flip = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));
  const pace = PACE_LEVELS.find((level) => level.value === reading.pace) ?? null;
  const density = DENSITY_LEVELS.find((level) => level.value === reading.density) ?? null;
  const themes = reading.themes
    .split(/[,;\n]/)
    .map((theme) => theme.trim())
    .filter(Boolean);
  const evidence = groupEvidence(book.evidence, reading);
  const dirty = changed.length > 0;
  const describe = (text: string | null) => ({ onMouseEnter: () => setHint(text), onMouseLeave: () => setHint(null), onFocus: () => setHint(text), onBlur: () => setHint(null) });

  return (
    <div className="read">
      <div className="read-main">
        <Provenance book={book} waiting={waiting} />

        <form action={action} className="read-sheet" aria-label="The reading">
          <input type="hidden" name="id" value={book.id} />
          {reading.atmospheres.map((id) => (
            <input key={id} type="hidden" name="atmospheres" value={id} />
          ))}
          {reading.styles.map((id) => (
            <input key={id} type="hidden" name="styles" value={id} />
          ))}
          {reading.experiences.map((id) => (
            <input key={id} type="hidden" name="experiences" value={id} />
          ))}
          <input type="hidden" name="pace" value={reading.pace ?? 3} />
          <input type="hidden" name="density" value={reading.density ?? 2} />
          <input type="hidden" name="themes" value={reading.themes} />
          <input type="hidden" name="portrait" value={reading.portrait} />

          <Group
            id="read-atmosphere"
            title="Atmosphere"
            aside="up to three, in order of predominance"
            open={Boolean(open.atmosphere)}
            onToggle={() => flip("atmosphere")}
            editLabel="change"
            className="read-group-atmosphere"
          >
            {empty ? (
              <p className="read-none">No atmosphere yet: on the shelf the book stays in kraft paper.</p>
            ) : (
              <ol className="read-atmospheres">
                {reading.atmospheres.map((id, index) => {
                  const atmosphere = ATMOSPHERE_BY_ID[id];
                  return (
                    <li key={id} className="read-atmosphere">
                      <span className="read-ordinal">{ORDINALS[index]}</span>
                      <span className="read-chip" aria-describedby={`atmosphere-${id}-meaning`} {...describe(atmosphere.description)}>
                        <span aria-hidden className="read-dot" style={{ background: atmosphere.color }} />
                        {atmosphere.label}
                        <span id={`atmosphere-${id}-meaning`} className="sr-only">
                          {atmosphere.description}
                        </span>
                      </span>
                      {open.atmosphere ? (
                        <span className="read-chip-tools">
                          <button type="button" className="read-tool" disabled={index === 0} onClick={() => setReading((current) => ({ ...current, atmospheres: move(current.atmospheres, index, -1) }))} aria-label={`Make ${atmosphere.label} more predominant`}>
                            ↑
                          </button>
                          <button
                            type="button"
                            className="read-tool"
                            disabled={index === reading.atmospheres.length - 1}
                            onClick={() => setReading((current) => ({ ...current, atmospheres: move(current.atmospheres, index, 1) }))}
                            aria-label={`Make ${atmosphere.label} less predominant`}
                          >
                            ↓
                          </button>
                          <button type="button" className="read-tool" data-tone="danger" onClick={() => setReading((current) => ({ ...current, atmospheres: current.atmospheres.filter((item) => item !== id) }))} aria-label={`Remove ${atmosphere.label}`}>
                            ×
                          </button>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
            {open.atmosphere ? (
              <div className="read-palette">
                <p className="eyebrow read-palette-title">{reading.atmospheres.length >= 3 ? "three chosen · remove one to add another" : "add an atmosphere"}</p>
                <div className="read-palette-options">
                  {ATMOSPHERES.filter((atmosphere) => !reading.atmospheres.includes(atmosphere.id)).map((atmosphere) => (
                    <button
                      key={atmosphere.id}
                      type="button"
                      className="read-option"
                      disabled={reading.atmospheres.length >= 3}
                      onClick={() => setReading((current) => ({ ...current, atmospheres: toggle(current.atmospheres, atmosphere.id as AtmosphereId, 3) }))}
                      aria-describedby={`option-${atmosphere.id}-meaning`}
                      {...describe(atmosphere.description)}
                    >
                      <span aria-hidden className="read-dot" style={{ background: atmosphere.color }} />
                      {atmosphere.label}
                      <span id={`option-${atmosphere.id}-meaning`} className="sr-only">
                        {atmosphere.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="read-meaning" aria-hidden>
              {hint ?? " "}
            </p>
          </Group>

          <div className="read-band">
            <Group id="read-pace" title="Pace" aside="rules on the spine" open={Boolean(open.pace)} onToggle={() => flip("pace")} editLabel="change">
              {open.pace ? (
                <div className="read-steps" role="group" aria-label="Pace">
                  {PACE_LEVELS.map((level) => (
                    <button key={level.value} type="button" className="read-step" aria-pressed={reading.pace === level.value} onClick={() => setReading((current) => ({ ...current, pace: level.value }))}>
                      <PaceGlyph value={level.value} />
                      {level.label}
                    </button>
                  ))}
                </div>
              ) : pace ? (
                <p className="read-value">
                  <PaceGlyph value={pace.value} />
                  <span>{pace.label}</span>
                </p>
              ) : (
                <p className="read-none">not set</p>
              )}
              {pace ? <p className="read-gloss">{pace.description}</p> : null}
            </Group>

            <Group id="read-density" title="Density" aside="height of the spine" open={Boolean(open.density)} onToggle={() => flip("density")} editLabel="change">
              {open.density ? (
                <div className="read-steps" role="group" aria-label="Density">
                  {DENSITY_LEVELS.map((level) => (
                    <button key={level.value} type="button" className="read-step" aria-pressed={reading.density === level.value} onClick={() => setReading((current) => ({ ...current, density: level.value }))}>
                      <DensityGlyph value={level.value} />
                      {level.label}
                    </button>
                  ))}
                </div>
              ) : density ? (
                <p className="read-value">
                  <DensityGlyph value={density.value} />
                  <span>{density.label}</span>
                </p>
              ) : (
                <p className="read-none">not set</p>
              )}
              {density ? <p className="read-gloss">{density.description}</p> : null}
            </Group>

            <Group id="read-voice" title="Voice" aside="up to two" open={Boolean(open.voice)} onToggle={() => flip("voice")} editLabel="change">
              {open.voice ? (
                <div className="read-words" role="group" aria-label="Voice">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      className="facet-option"
                      aria-pressed={reading.styles.includes(style.id)}
                      disabled={!reading.styles.includes(style.id) && reading.styles.length >= 2}
                      onClick={() => setReading((current) => ({ ...current, styles: toggle(current.styles, style.id as StyleId, 2) }))}
                      title={style.description}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              ) : reading.styles.length > 0 ? (
                <p className="read-value read-value-words">{reading.styles.map((id) => STYLES.find((style) => style.id === id)?.label ?? id).join(" · ")}</p>
              ) : (
                <p className="read-none">none chosen</p>
              )}
              {!open.voice && reading.styles.length > 0 ? <p className="read-gloss">{STYLES.find((style) => style.id === reading.styles[0])?.description}</p> : null}
            </Group>
          </div>

          <div className="read-band read-band-pair">
            <Group id="read-good" title="Good for" aside="up to two" open={Boolean(open.good)} onToggle={() => flip("good")} editLabel="change">
              {open.good ? (
                <div className="read-words" role="group" aria-label="Good for">
                  {EXPERIENCES.map((experience) => (
                    <button
                      key={experience.id}
                      type="button"
                      className="facet-option"
                      aria-pressed={reading.experiences.includes(experience.id)}
                      disabled={!reading.experiences.includes(experience.id) && reading.experiences.length >= 2}
                      onClick={() => setReading((current) => ({ ...current, experiences: toggle(current.experiences, experience.id as ExperienceId, 2) }))}
                      title={experience.description}
                    >
                      {experience.label}
                    </button>
                  ))}
                </div>
              ) : reading.experiences.length > 0 ? (
                <ul className="read-intents">
                  {reading.experiences.map((id) => (
                    <li key={id}>{EXPERIENCES.find((experience) => experience.id === id)?.label ?? id}</li>
                  ))}
                </ul>
              ) : (
                <p className="read-none">none chosen</p>
              )}
            </Group>

            <Group id="read-themes" title="Themes" aside="separated by commas" open={Boolean(open.themes)} onToggle={() => flip("themes")} editLabel="change">
              {open.themes ? (
                <>
                  <label htmlFor="read-themes-input" className="sr-only">
                    Themes, separated by commas
                  </label>
                  <input
                    id="read-themes-input"
                    className="field"
                    value={reading.themes}
                    maxLength={300}
                    onChange={(event) => setReading((current) => ({ ...current, themes: event.target.value }))}
                  />
                </>
              ) : themes.length > 0 ? (
                <p className="read-themes">{themes.join(" · ")}</p>
              ) : (
                <p className="read-none">no themes</p>
              )}
            </Group>
          </div>

          <Group id="read-portrait" title="In one sentence" aside="the reading portrait" open={Boolean(open.portrait)} onToggle={() => flip("portrait")} editLabel="rewrite" className="read-group-portrait">
            {open.portrait ? (
              <>
                <label htmlFor="read-portrait-input" className="sr-only">
                  Reading portrait, one sentence on how it feels to read
                </label>
                <RailedTextarea
                  id="read-portrait-input"
                  className="field read-portrait-field"
                  rows={3}
                  maxLength={300}
                  value={reading.portrait}
                  onChange={(event) => setReading((current) => ({ ...current, portrait: event.target.value }))}
                />
              </>
            ) : reading.portrait.trim() ? (
              <blockquote className="read-portrait">{reading.portrait.trim()}</blockquote>
            ) : (
              <p className="read-none">No portrait yet. One sentence on how it feels to read this book.</p>
            )}
          </Group>

          {evidence.length > 0 ? (
            <details className="read-why">
              <summary>
                <span className="read-why-title">Why this reading?</span>
                <span className="eyebrow read-why-count">
                  {book.evidence.length} {book.evidence.length === 1 ? "passage" : "passages"} from the synopsis
                </span>
              </summary>
              <ul className="read-why-list">
                {evidence.map((group) => (
                  <li key={group.key} data-current={group.current ? "" : undefined}>
                    <p className="read-why-attribute">
                      {group.color ? <span aria-hidden className="read-dot" style={{ background: group.color }} /> : null}
                      <span className="eyebrow">{group.kind === "other" ? "noted" : group.kind}</span>
                      <span className="read-why-label">{group.label}</span>
                      {group.current ? null : <span className="read-why-gone">no longer in the reading</span>}
                    </p>
                    {group.quotes.map((quote) => (
                      <q key={quote} className="read-why-quote">
                        {quote}
                      </q>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="counter-field-hint">The AI keeps the passages it relied on. Your edits don’t change them; a new reading replaces them.</p>
            </details>
          ) : null}

          {dirty || state.message ? (
            <div className="save-bar read-save" data-dirty={dirty ? "true" : undefined}>
              <button type="submit" className="button" disabled={pending || empty}>
                {pending ? "Saving…" : "Save my reading"}
              </button>
              {dirty ? (
                <button type="button" className="button-quiet" onClick={onDiscard} disabled={pending}>
                  Undo changes
                </button>
              ) : null}
              {dirty ? <Stamp tone="vermilion">unsaved · {changed.join(", ")}</Stamp> : null}
              {empty && dirty ? <p className="slip" data-tone="error">Choose at least one atmosphere.</p> : <FormFeedback state={state} />}
              {dirty ? <p className="read-save-note">Saved apart from the record. It becomes your review: the AI won’t overwrite it.</p> : null}
            </div>
          ) : null}
        </form>

        <NewReading book={book} readingDirty={dirty} synopsisDirty={synopsisDirty} onConfirm={onDiscard} />
      </div>

      <figure className="read-preview" aria-label="The spine as the reading draws it">
        <div className="read-preview-shelf">
          <div style={{ width: identity.width, height: identity.height }} className="read-preview-spine">
            <SpineFace identity={identity} className="relative block h-full w-full overflow-hidden" />
          </div>
        </div>
        <figcaption>{dirty ? "With your unsaved changes." : "On the shelf: colour from the atmospheres, rules from the pace, height from the density."}</figcaption>
      </figure>
    </div>
  );
}
