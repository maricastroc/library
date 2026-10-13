"use client";

import { motion } from "motion/react";
import { RELEVANCE_OPTION, SORT_OPTIONS, type AnswerSortKey } from "@/lib/shelf/arrange";

export type ViewMode = "shelf" | "index";

function Stroke({ layoutId }: { layoutId: string }) {
  return (
    <motion.svg
      layoutId={layoutId}
      aria-hidden
      className="hand-stroke"
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      <path d="M1 5 C 18 1.5, 34 7, 52 4 S 84 2, 99 5.5" />
    </motion.svg>
  );
}

export function SortControls({
  value,
  onChange,
  searching,
  view,
  onViewChange,
}: {
  value: AnswerSortKey;
  onChange: (key: AnswerSortKey) => void;
  searching: boolean;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  const options = searching ? [RELEVANCE_OPTION, ...SORT_OPTIONS] : SORT_OPTIONS;
  const current = options.find((option) => option.key === value);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3">
      <fieldset className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
        <legend className="eyebrow float-left mr-4 pt-[0.55rem] text-ink-soft">
          {searching ? "The answers, arranged by" : "The shelf, arranged by"}
        </legend>
        <div className="flex flex-wrap items-baseline gap-x-1">
          {options.map((option) => {
            const selected = option.key === value;
            return (
              <label
                key={option.key}
                className="sort-word has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-vermilion"
                data-selected={selected ? "true" : undefined}
              >
                <input
                  type="radio"
                  name="sort"
                  value={option.key}
                  checked={selected}
                  onChange={() => onChange(option.key)}
                  className="sr-only"
                />
                <span>{option.label.toLowerCase()}</span>
                {selected ? <Stroke layoutId="sort-stroke" /> : null}
              </label>
            );
          })}
        </div>
        <p className="handwriting hidden text-[1.3rem] text-ink-soft md:block" aria-live="polite">
          {current?.hint}
        </p>
      </fieldset>
      <div role="group" aria-label="View mode" className="flex items-baseline gap-1">
        <span className="eyebrow mr-2 text-ink-soft">seen as</span>
        {(["shelf", "index"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            onClick={() => onViewChange(mode)}
            className="sort-word"
            data-selected={view === mode ? "true" : undefined}
          >
            <span>{mode === "shelf" ? "a shelf" : "an index"}</span>
            {view === mode ? <Stroke layoutId="view-stroke" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
