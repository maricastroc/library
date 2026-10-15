import type { CSSProperties } from "react";
import { LEVEL, SYSTEMS, type Outcome, type Rival, type SystemName } from "@/lib/search/bench";

export function Track({ values, against, label }: { values: Partial<Record<SystemName, number | null>>; against?: Rival; label?: string }) {
  const shelf = values.full;
  const rival = against ? values[against] : undefined;
  const span =
    shelf !== undefined && shelf !== null && rival !== undefined && rival !== null && Math.abs(shelf - rival) > 0.005
      ? { from: Math.min(shelf, rival), to: Math.max(shelf, rival), tone: shelf - rival >= LEVEL ? "ahead" : rival - shelf >= LEVEL ? "behind" : "level" }
      : null;
  return (
    <span className="bench-track" aria-hidden title={label}>
      {span ? <span className="bench-span" data-tone={span.tone} style={{ "--from": span.from, "--to": span.to } as CSSProperties} /> : null}
      {SYSTEMS.map((system) => {
        const value = values[system.key];
        if (value === undefined || value === null) return null;
        return <span key={system.key} className="bench-dot" data-engine={system.key} data-faded={against && system.key !== "full" && system.key !== against ? "" : undefined} style={{ "--at": value } as CSSProperties} />;
      })}
    </span>
  );
}

export function Grade({ value }: { value: number }) {
  return (
    <span className="bench-grade" data-grade={value} aria-label={`graded ${value} of 2`}>
      <span />
      <span />
    </span>
  );
}

const ORDER: Outcome[] = ["better", "level", "worse"];

export function Tally({ marks, size = "large" }: { marks: Outcome[]; size?: "large" | "small" }) {
  return (
    <span className="bench-tally" data-size={size} aria-hidden>
      {[...marks]
        .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
        .map((mark, index) => (
          <span key={index} data-mark={mark} />
        ))}
    </span>
  );
}

export function EngineKey({ engine }: { engine: SystemName }) {
  return <span aria-hidden className="bench-dot bench-dot-key" data-engine={engine} />;
}
