import type { Metadata } from "next";
import { PageHead } from "@/components/admin/Counter";
import { ShopForm } from "@/components/admin/ShopForm";
import { listShelfBooks } from "@/lib/catalog/books";
import { spineIdentity } from "@/lib/shelf/identity";
import { getShopConfig } from "@/lib/shop/config";
import { listShowcases } from "@/lib/showcase";

export const metadata: Metadata = { title: "Bookshop" };

export default function ShopPage() {
  const books = listShelfBooks().filter((book) => book.semanticStatus === "ready");
  const withIdentity = books.map((book) => ({ book, identity: spineIdentity(book) }));
  const chosen = withIdentity.find(({ identity }) => identity.binding === "cloth" || identity.binding === "leather") ?? withIdentity[0] ?? null;
  const showcases = listShowcases();
  const shown = showcases.find((showcase) => showcase.published) ?? showcases[0] ?? null;

  return (
    <div className="counter-page counter-page-wide">
      <PageHead
        folio="07 · the house"
        title={
          <>
            The bookshop’s <em>imprint</em>
          </>
        }
        lede={<p>Five lines that travel with the books: in the masthead, at the foot of every cover, under your notes and on each showcase. Change them and the proofs follow.</p>}
      />
      <ShopForm
        shop={getShopConfig()}
        sample={chosen ? { title: chosen.book.title, author: chosen.book.author, genre: chosen.book.genre, identity: chosen.identity } : null}
        showcase={shown ? { title: shown.title, palette: shown.palette, count: shown.items.length } : null}
      />
    </div>
  );
}
