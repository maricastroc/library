import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="eyebrow text-ink-soft">Page not found</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,7vw,4.5rem)] leading-[0.98]">This book isn’t on the shelf.</h1>
      <p className="mt-5 max-w-[32rem] text-[1.1rem] text-ink-soft">
        The address may have changed, or the showcase you’re looking for has been taken down by the bookshop.
      </p>
      <div className="mt-8">
        <Link href="/" className="button">
          Back to the shelf
        </Link>
      </div>
    </main>
  );
}
