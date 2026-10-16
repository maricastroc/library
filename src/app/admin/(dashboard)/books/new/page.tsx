import type { Metadata } from "next";
import { BookForm } from "@/components/admin/BookForm";
import { PageHead } from "@/components/admin/Counter";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Add book" };

export default function NewBookPage() {
  return (
    <div className="counter-page counter-page-wide">
      <PageHead
        folio="02 · new catalogue record"
        back={{ href: "/admin/books", label: "Books" }}
        title={
          <>
            Add a <em>book</em>
          </>
        }
        lede={<p>Once saved, it appears on the shelf right away in kraft paper, until the AI has read its synopsis.</p>}
      />
      <div className="record-single">
        <BookForm signature={getShopConfig().bookseller} />
      </div>
    </div>
  );
}
