import Link from "next/link";
import type { ReactNode } from "react";

export function PageHead({
  folio,
  back,
  title,
  lede,
  actions,
  quiet = false,
}: {
  folio: string;
  back?: { href: string; label: string };
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  quiet?: boolean;
}) {
  if (quiet) {
    return (
      <header className="counter-head" data-quiet="">
        <p className="eyebrow counter-head-folio">
          {back ? <Link href={back.href}>← {back.label}</Link> : null}
          <span>{folio}</span>
        </p>
        <h1 className="sr-only">{title}</h1>
      </header>
    );
  }
  return (
    <header className="counter-head">
      <p className="eyebrow counter-head-folio">
        {back ? <Link href={back.href}>← {back.label}</Link> : null}
        <span>{folio}</span>
      </p>
      <div className="counter-head-row">
        <h1 className="counter-title">{title}</h1>
        {actions ? <div className="counter-actions">{actions}</div> : null}
      </div>
      {lede ? <div className="counter-lede">{lede}</div> : null}
    </header>
  );
}

export function SectionHead({ id, title, count, aside }: { id: string; title: ReactNode; count?: number; aside?: ReactNode }) {
  return (
    <div className="counter-section-head">
      <h2 id={id} className="counter-section-title">
        {title}
        {count !== undefined ? <span className="counter-count">{count}</span> : null}
      </h2>
      {aside ? <div className="eyebrow counter-section-aside">{aside}</div> : null}
    </div>
  );
}

export function daysSince(createdAt: string): number {
  const then = new Date(`${createdAt.replace(" ", "T")}Z`).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  return Number.isNaN(days) ? 0 : Math.max(days, 0);
}

export function age(createdAt: string): string {
  const days = daysSince(createdAt);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export type StampTone = "ink" | "soft" | "faint" | "vermilion" | "kraft" | "hollow";

export function Stamp({ tone = "soft", children }: { tone?: StampTone; children: ReactNode }) {
  return (
    <span className="stamp" data-tone={tone}>
      {children}
    </span>
  );
}
