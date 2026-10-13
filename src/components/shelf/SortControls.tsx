"use client";

import { motion } from "motion/react";
import { SORT_OPTIONS, type SortKey } from "@/lib/shelf/arrange";

export type ViewMode = "shelf" | "index";

export function SortControls({
  value,
  onChange,
  view,
  onViewChange,
}: {
  value: SortKey;
  onChange: (key: SortKey) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  const current = SORT_OPTIONS.find((option) => option.key === value);
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-ink/25 pb-2">
      <fieldset className="min-w-0">
        <legend className="eyebrow mb-1.5 text-ink-soft">Arrange the shelf by</legend>
        <div className="-mx-1 flex flex-wrap gap-x-1 gap-y-1">
          {SORT_OPTIONS.map((option) => {
            const selected = option.key === value;
            return (
              <label
                key={option.key}
                className="relative cursor-pointer px-2 py-1.5 font-label text-[0.95rem] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-vermilion"
              >
                <input
                  type="radio"
                  name="sort"
                  value={option.key}
                  checked={selected}
                  onChange={() => onChange(option.key)}
                  className="sr-only"
                />
                <span className={selected ? "text-ink" : "text-ink-soft transition-colors hover:text-ink"}>
                  {option.label}
                </span>
                {selected ? (
                  <motion.span
                    layoutId="sort-marker"
                    aria-hidden
                    className="absolute inset-x-2 -bottom-[9px] h-[3px] bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-center gap-4 pb-1">
        <p className="eyebrow hidden text-ink-soft lg:block" aria-live="polite">
          {current?.hint}
        </p>
        <div role="group" aria-label="View mode" className="eyebrow flex border border-ink">
          {(["shelf", "index"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => onViewChange(mode)}
              className={`px-2.5 py-1.5 transition-colors ${view === mode ? "bg-ink text-paper" : "text-ink hover:bg-ink/10"}`}
            >
              {mode === "shelf" ? "Shelf" : "Index"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
