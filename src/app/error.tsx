"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="eyebrow text-vermilion">Something slipped out of place</p>
      <h1 className="display mt-3 text-[clamp(2.2rem,6vw,4rem)] leading-[0.98]">The shelf couldn’t put itself in order.</h1>
      <p className="mt-5 max-w-[32rem] text-[1.1rem] text-ink-soft">
        Something went wrong while putting this page together. Try again; if it keeps happening, the catalog may be mid-update.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="button" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="button button-outline">
          Back to the collection
        </Link>
      </div>
    </main>
  );
}
