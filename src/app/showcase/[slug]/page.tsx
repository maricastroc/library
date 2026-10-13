import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/shelf/Masthead";
import { SpineFace } from "@/components/shelf/SpineFace";
import { Cover } from "@/components/book/Cover";
import { CopyLink } from "@/components/showcase/CopyLink";
import { isAdmin } from "@/lib/auth/guard";
import { getBookById } from "@/lib/catalog/books";
import { formatPrice } from "@/lib/catalog/text";
import { atmosphereLabel } from "@/lib/semantic/taxonomy";
import { spineIdentity } from "@/lib/shelf/identity";
import { getShopConfig } from "@/lib/shop/config";
import { SHOWCASE_PALETTES, getShowcaseBySlug } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/showcase/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const showcase = getShowcaseBySlug(slug);
  if (!showcase || !showcase.published) return { title: "Showcase" };
  const description = showcase.intro ?? `A selection of ${showcase.items.length} ${showcase.items.length === 1 ? "book" : "books"} from the bookshop.`;
  return { title: showcase.title, description, openGraph: { title: showcase.title, description, type: "article" } };
}

export default async function ShowcasePage({ params }: PageProps<"/showcase/[slug]">) {
  const { slug } = await params;
  const showcase = getShowcaseBySlug(slug);
  if (!showcase) notFound();
  if (!showcase.published && !(await isAdmin())) notFound();

  const shop = getShopConfig();
  const palette = SHOWCASE_PALETTES[showcase.palette];
  const entries = showcase.items
    .map((item) => {
      const book = getBookById(item.bookId);
      return book ? { book, caption: item.caption, identity: spineIdentity(book) } : null;
    })
    .filter((entry) => entry !== null);

  return (
    <div className="min-h-dvh overflow-x-clip" style={{ background: palette.background, color: palette.ink }}>
      <div className="mx-auto w-full max-w-[1320px] px-5 pb-24 sm:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-6">
          <Link href="/" className="text-[1.6rem]" aria-label={`${shop.name}, go to the shelf`}>
            <Wordmark name={shop.name} />
          </Link>
          <CopyLink className="eyebrow border border-current px-3 py-2 hover:opacity-70" />
        </header>

        {showcase.published ? null : (
          <p role="status" className="eyebrow mt-6 inline-block border border-current px-3 py-2">
            draft — only you can see this page
          </p>
        )}

        <section aria-labelledby="showcase-heading" className="pt-16 sm:pt-24">
          <p className="eyebrow opacity-80">
            Showcase · {entries.length} {entries.length === 1 ? "book" : "books"}
            {shop.city ? ` · ${shop.city}` : ""}
          </p>
          <h1 id="showcase-heading" className="display-italic mt-4 max-w-[16ch] text-balance text-[clamp(3rem,10.5vw,9.5rem)] leading-[0.9]">
            {showcase.title}
          </h1>
          {showcase.intro ? (
            <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,38rem)_1fr]">
              <p className="text-[1.3rem] leading-[1.5]">{showcase.intro}</p>
            </div>
          ) : null}
          {shop.bookseller ? (
            <p className="handwriting mt-6 text-[1.7rem]" style={{ color: palette.accent }}>
              — {shop.bookseller}
            </p>
          ) : null}
        </section>

        <nav aria-label="Books in this showcase" className="mt-16 overflow-x-auto pb-2">
          <ul className="flex min-w-max items-end gap-[3px] border-b-[3px] border-current pt-4">
            {entries.map(({ book, identity }, index) => (
              <li key={book.id} style={{ width: identity.width * 1.1, height: identity.height * 1.1 }}>
                <a
                  href={`#book-${index + 1}`}
                  aria-label={`${book.title}, by ${book.author}`}
                  className="block h-full w-full transition-transform duration-300 hover:-translate-y-2 focus-visible:-translate-y-2"
                >
                  <SpineFace identity={identity} scale={1.1} className="relative block h-full w-full overflow-hidden outline outline-1 outline-black/10" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ol className="mt-20 space-y-24 sm:space-y-32">
          {entries.map(({ book, caption, identity }, index) => {
            const note = caption ?? (book.note && book.noteOrigin === "bookseller" ? book.note : null);
            const exampleNote = !caption && book.note && book.noteOrigin === "example" ? book.note : null;
            const price = formatPrice(book.priceCents);
            return (
              <li
                key={book.id}
                id={`book-${index + 1}`}
                className={`flex scroll-mt-10 flex-col gap-x-12 gap-y-8 md:items-end ${index % 2 === 1 ? "md:ml-[12%] md:flex-row-reverse" : "md:mr-[12%] md:flex-row"}`}
              >
                <div className="flex shrink-0 items-end gap-5">
                  <span
                    aria-hidden
                    className="display text-[5.5rem] leading-[0.8] sm:text-[8rem]"
                    style={{ WebkitTextStroke: `1.5px ${palette.ink}`, color: "transparent" }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="aspect-[0.7] w-[11.5rem] shrink-0 shadow-[0_30px_50px_-28px_rgb(0_0_0/0.75)] sm:w-[15rem]">
                    <Cover title={book.title} author={book.author} genre={book.genre} identity={identity} shopName={shop.name} />
                  </div>
                </div>
                <div className="min-w-0 max-w-[34rem] flex-1">
                  <h2 className="display text-balance text-[clamp(1.9rem,3.6vw,3rem)] leading-[1]">{book.title}</h2>
                  <p className="display-italic mt-2 text-[1.3rem] opacity-85">{book.author}</p>
                  {note ? (
                    <p className="handwriting mt-5 text-[1.9rem]" style={{ color: palette.accent }}>
                      {note}
                    </p>
                  ) : null}
                  {exampleNote ? (
                    <p className="mt-5">
                      <span className="handwriting text-[1.9rem]" style={{ color: palette.accent }}>
                        {exampleNote}
                      </span>
                      <span className="eyebrow mt-1 block text-[9px] opacity-70">sample note for the demo</span>
                    </p>
                  ) : null}
                  {book.atmospheres.length > 0 ? (
                    <p className="eyebrow mt-5 opacity-80">
                      {book.atmospheres.map(atmosphereLabel).join(" · ")}
                      {book.pages ? ` · ${book.pages} ${book.pages === 1 ? "page" : "pages"}` : ""}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    <Link href={`/?book=${book.slug}`} className="eyebrow border-b border-current pb-0.5 hover:opacity-70">
                      Open the book on the shelf →
                    </Link>
                    <span className="eyebrow opacity-80">
                      {book.stock === 0 ? "out of stock" : (price ?? "price on request")}
                      {book.priceIsDemo && price && book.stock !== 0 ? " · demo" : ""}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <footer className="mt-28 flex flex-wrap items-end justify-between gap-6 border-t border-current pt-6">
          <div>
            <p className="display-italic text-[1.6rem] leading-none">{shop.name}</p>
            <p className="eyebrow mt-2 opacity-80">{[shop.tagline, shop.city, shop.contact].filter(Boolean).join(" · ")}</p>
          </div>
          <Link href="/" className="eyebrow border border-current px-4 py-3 hover:opacity-70">
            See the whole shelf
          </Link>
        </footer>
      </div>
    </div>
  );
}
