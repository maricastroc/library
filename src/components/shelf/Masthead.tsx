import Link from "next/link";

export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span aria-hidden className="block h-px w-full bg-current" />
      <span className="display-italic px-0.5 py-[0.18em] leading-none">{name}</span>
      <span aria-hidden className="block h-px w-full bg-current" />
    </span>
  );
}

export function Masthead({
  name,
  tagline,
  total,
  showcaseCount,
}: {
  name: string;
  tagline: string;
  total: number;
  showcaseCount: number;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-6 sm:pt-8">
      <div className="flex items-end gap-5">
        <Link href="/" aria-label={`${name}, home page`} className="text-[1.9rem] sm:text-[2.3rem]">
          <Wordmark name={name} />
        </Link>
        <p className="eyebrow hidden max-w-[16rem] pb-1 text-ink-soft sm:block">{tagline}</p>
      </div>
      <nav aria-label="Sections" className="eyebrow flex items-center gap-5 pb-1 text-ink">
        <span className="hidden text-ink-soft md:inline">{total} {total === 1 ? "book" : "books"} on the shelf</span>
        {showcaseCount > 0 ? (
          <a className="ink-link" href="#showcases">
            Showcases
          </a>
        ) : null}
        <a className="ink-link" href="#how-to-read">
          How to read the shelf
        </a>
        <Link className="ink-link" href="/admin">
          Counter
        </Link>
      </nav>
    </header>
  );
}
