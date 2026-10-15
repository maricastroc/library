import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Stamp } from "@/components/admin/Counter";
import { StillLife } from "@/components/shelf/StillLife";
import { listShelfBooks } from "@/lib/catalog/books";
import { SHOWCASE_PALETTES, listShowcases } from "@/lib/showcase";
import { spineIdentity } from "@/lib/shelf/identity";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Showcases" };

export default function ShowcasesPage() {
  const showcases = listShowcases();
  const shop = getShopConfig();
  const books = new Map(listShelfBooks().map((book) => [book.id, book]));
  const identities = new Map([...books.values()].map((book) => [book.id, spineIdentity(book)]));
  const published = showcases.filter((showcase) => showcase.published).length;

  return (
    <div className="counter-page">
      <PageHead
        folio="04 · the bookshop’s selections"
        title={
          <>
            Showcases <em>on the table</em>
          </>
        }
        lede={
          <p>
            A showcase is your own selection around an idea, with its own page and a link to share.{" "}
            {showcases.length > 0 ? `${published} of ${showcases.length} ${showcases.length === 1 ? "is" : "are"} on display on the home page.` : ""}
          </p>
        }
        actions={
          <Link href="/admin/showcases/new" className="button">
            Put together a showcase
          </Link>
        }
      />

      {showcases.length === 0 ? (
        <div className="blank exhibit-blank">
          <span aria-hidden className="exhibit-empty-plinth" />
          <p className="blank-line">The table is empty.</p>
          <p className="blank-hint">Gather a few books around an idea, write why they belong together, and the shop gives them a page of their own.</p>
          <Link href="/admin/showcases/new" className="button">
            Put together the first one
          </Link>
        </div>
      ) : (
        <ul className="exhibits">
          {showcases.map((showcase) => {
            const palette = SHOWCASE_PALETTES[showcase.palette];
            const selection = showcase.items.map((item) => books.get(item.bookId)).filter((book) => book !== undefined);
            return (
              <li key={showcase.id} className="exhibit">
                <Link href={`/admin/showcases/${showcase.id}`} className="exhibit-frame" style={{ background: palette.background, color: palette.ink }} aria-label={`Edit the showcase ${showcase.title}`}>
                  <span className="eyebrow exhibit-frame-eyebrow" style={{ color: palette.accent }}>
                    showcase · {selection.length} {selection.length === 1 ? "book" : "books"}
                  </span>
                  <span className="exhibit-frame-title">{showcase.title}</span>
                  {selection.length > 0 ? (
                    <span className="exhibit-frame-books">
                      <StillLife books={selection} identities={identities} width={300} shopName={shop.name} />
                    </span>
                  ) : (
                    <span className="exhibit-frame-empty">no books yet</span>
                  )}
                </Link>
                <div className="exhibit-body">
                  <p className="exhibit-status">
                    <Stamp tone={showcase.published ? "ink" : "faint"}>{showcase.published ? "on display" : "draft"}</Stamp>
                    <span className="eyebrow exhibit-updated">changed {showcase.updatedAt.slice(0, 10)}</span>
                  </p>
                  <h2 className="exhibit-title">
                    <Link href={`/admin/showcases/${showcase.id}`}>{showcase.title}</Link>
                  </h2>
                  {showcase.intro ? <p className="exhibit-intro">{showcase.intro}</p> : <p className="exhibit-intro exhibit-missing">No introduction yet.</p>}
                  {selection.length > 0 ? (
                    <ol className="exhibit-list">
                      {selection.map((book, index) => (
                        <li key={book.id}>
                          <span className="exhibit-number">{String(index + 1).padStart(2, "0")}</span>
                          <span className="exhibit-book">{book.title}</span>
                          <span className="exhibit-author">{book.author}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <p className="exhibit-actions">
                    <Link href={`/admin/showcases/${showcase.id}`} className="button-quiet">
                      Arrange this showcase →
                    </Link>
                    {showcase.published ? (
                      <a href={`/showcase/${showcase.slug}`} className="button-quiet" target="_blank" rel="noreferrer">
                        Its public page ↗
                      </a>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
