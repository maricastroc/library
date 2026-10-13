"use client";

import { useActionState, useMemo, useState } from "react";
import { saveClassification } from "@/app/admin/actions";
import { SpineFace } from "@/components/shelf/SpineFace";
import type { BookDetail } from "@/lib/catalog/types";
import {
  ATMOSPHERES,
  DENSITY_LEVELS,
  EXPERIENCES,
  PACE_LEVELS,
  STYLES,
  type AtmosphereId,
  type ExperienceId,
  type StyleId,
} from "@/lib/semantic/taxonomy";
import { spineIdentity } from "@/lib/shelf/identity";
import { SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

function toggleLimited<T>(list: T[], value: T, limit: number): T[] {
  if (list.includes(value)) return list.filter((item) => item !== value);
  if (list.length >= limit) return [...list.slice(1), value];
  return [...list, value];
}

export function ClassificationForm({ book }: { book: BookDetail }) {
  const [state, action] = useActionState(saveClassification, INITIAL_FORM_STATE);
  const [atmospheres, setAtmospheres] = useState<AtmosphereId[]>(book.atmospheres);
  const [pace, setPace] = useState<number>(book.pace ?? 3);
  const [density, setDensity] = useState<number>(book.density ?? 2);
  const [styles, setStyles] = useState<StyleId[]>(book.styles);
  const [experiences, setExperiences] = useState<ExperienceId[]>(book.experiences);

  const preview = useMemo(
    () =>
      spineIdentity({
        ...book,
        semanticStatus: atmospheres.length > 0 ? "ready" : "pending",
        atmospheres,
        pace,
        density,
        styles,
        experiences,
      }),
    [book, atmospheres, pace, density, styles, experiences],
  );

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_auto]">
      <input type="hidden" name="id" value={book.id} />
      {atmospheres.map((id) => (
        <input key={id} type="hidden" name="atmospheres" value={id} />
      ))}
      {styles.map((id) => (
        <input key={id} type="hidden" name="styles" value={id} />
      ))}
      {experiences.map((id) => (
        <input key={id} type="hidden" name="experiences" value={id} />
      ))}
      <input type="hidden" name="pace" value={pace} />
      <input type="hidden" name="density" value={density} />

      <div className="space-y-6">
        <fieldset>
          <legend className="eyebrow text-ink-soft">Atmosphere — up to three, in order of predominance</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ATMOSPHERES.map((atmosphere) => {
              const position = atmospheres.indexOf(atmosphere.id);
              return (
                <button
                  key={atmosphere.id}
                  type="button"
                  aria-pressed={position >= 0}
                  onClick={() => setAtmospheres((current) => toggleLimited(current, atmosphere.id, 3))}
                  className={`inline-flex items-center gap-2 border px-2.5 py-1.5 font-label text-[0.88rem] ${position >= 0 ? "border-ink bg-ink text-paper" : "border-ink/35 hover:border-ink"}`}
                >
                  <span aria-hidden className="inline-block h-3.5 w-2.5" style={{ background: atmosphere.color, outline: "1px solid rgb(255 255 255 / 0.35)" }} />
                  {atmosphere.label}
                  {position >= 0 ? <span className="eyebrow text-[9px]">{["1st", "2nd", "3rd"][position]}</span> : null}
                </button>
              );
            })}
          </div>
          {atmospheres.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-[0.85rem] text-ink-soft">
              {atmospheres.map((id) => {
                const atmosphere = ATMOSPHERES.find((item) => item.id === id);
                return atmosphere ? (
                  <li key={id}>
                    <span className="font-label font-semibold text-ink">{atmosphere.label}</span>: {atmosphere.description}
                  </li>
                ) : null;
              })}
            </ul>
          ) : null}
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <fieldset>
            <legend className="eyebrow text-ink-soft">Pace</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PACE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  aria-pressed={pace === level.value}
                  onClick={() => setPace(level.value)}
                  className={`border px-2.5 py-1.5 font-label text-[0.88rem] ${pace === level.value ? "border-ink bg-ink text-paper" : "border-ink/35 hover:border-ink"}`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="eyebrow text-ink-soft">Density</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DENSITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  aria-pressed={density === level.value}
                  onClick={() => setDensity(level.value)}
                  className={`border px-2.5 py-1.5 font-label text-[0.88rem] ${density === level.value ? "border-ink bg-ink text-paper" : "border-ink/35 hover:border-ink"}`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset>
          <legend className="eyebrow text-ink-soft">Writing style — up to two</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                aria-pressed={styles.includes(style.id)}
                onClick={() => setStyles((current) => toggleLimited(current, style.id, 2))}
                className={`border px-2.5 py-1.5 font-label text-[0.88rem] ${styles.includes(style.id) ? "border-ink bg-ink text-paper" : "border-ink/35 hover:border-ink"}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="eyebrow text-ink-soft">Reading experience — up to two</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXPERIENCES.map((experience) => (
              <button
                key={experience.id}
                type="button"
                aria-pressed={experiences.includes(experience.id)}
                onClick={() => setExperiences((current) => toggleLimited(current, experience.id, 2))}
                className={`border px-2.5 py-1.5 font-label text-[0.88rem] ${experiences.includes(experience.id) ? "border-ink bg-ink text-paper" : "border-ink/35 hover:border-ink"}`}
              >
                {experience.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="themes" className="eyebrow text-ink-soft">
            Themes — separated by commas
          </label>
          <input id="themes" name="themes" className="field" defaultValue={book.themes.join(", ")} maxLength={300} />
        </div>
        <div>
          <label htmlFor="portrait" className="eyebrow text-ink-soft">
            Reading portrait — one sentence on what it feels like to read
          </label>
          <textarea id="portrait" name="portrait" className="field resize-none italic" rows={2} maxLength={300} defaultValue={book.portrait ?? ""} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton>Save my review</SubmitButton>
          <FormFeedback state={state} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 lg:w-40">
        <p className="eyebrow text-ink-soft">on the shelf</p>
        <div className="flex h-[260px] items-end border-b-[3px] border-ink px-6">
          <div style={{ width: preview.width, height: preview.height }} className="transition-[width,height] duration-300">
            <SpineFace identity={preview} className="relative block h-full w-full overflow-hidden" />
          </div>
        </div>
        <p className="max-w-[10rem] text-center text-[0.8rem] leading-snug text-ink-soft">
          The spine changes with the classification: color, height and bands.
        </p>
      </div>
    </form>
  );
}
