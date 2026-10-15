import type { Metadata } from "next";
import { PageHead } from "@/components/admin/Counter";
import { ShowcaseEditor } from "@/components/admin/ShowcaseEditor";
import { listPickerBooks } from "@/lib/showcase/picker";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "New showcase" };

export default function NewShowcasePage() {
  return (
    <div className="counter-page counter-page-wide">
      <PageHead
        folio="04 · a new showcase"
        back={{ href: "/admin/showcases", label: "Showcases" }}
        title={
          <>
            Put together a <em>showcase</em>
          </>
        }
      />
      <ShowcaseEditor showcase={null} books={listPickerBooks()} shopName={getShopConfig().name} />
    </div>
  );
}
