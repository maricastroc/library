import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { removeShowcase } from "@/app/admin/actions";
import { ConfirmRemoval } from "@/components/admin/ConfirmRemoval";
import { PageHead } from "@/components/admin/Counter";
import { ShowcaseEditor } from "@/components/admin/ShowcaseEditor";
import { getShowcaseById } from "@/lib/showcase";
import { listPickerBooks } from "@/lib/showcase/picker";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Edit showcase" };

export default async function EditShowcasePage({ params, searchParams }: PageProps<"/admin/showcases/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const showcase = getShowcaseById(Number(id));
  if (!showcase) notFound();
  return (
    <div className="counter-page counter-page-wide">
      <PageHead quiet folio="04 · arranging a showcase" back={{ href: "/admin/showcases", label: "Showcases" }} title={`Arranging “${showcase.title}”`} />
      {query.created ? (
        <p role="status" className="slip slip-enter mb-6">
          Showcase created. {showcase.published ? "It’s already on display." : "It’s a draft: put it on display when you want to share it."}
        </p>
      ) : null}
      <ShowcaseEditor key={showcase.id} showcase={showcase} books={listPickerBooks()} shopName={getShopConfig().name} />
      <section aria-labelledby="delete-showcase-heading" className="counter-section cur-remove">
        <h2 id="delete-showcase-heading" className="eyebrow">
          Take the showcase down
        </h2>
        <ConfirmRemoval
          action={removeShowcase}
          id={showcase.id}
          label="Delete this showcase"
          question={`Delete the showcase “${showcase.title}”? The shared link stops working. The books stay in the catalogue.`}
        />
      </section>
    </div>
  );
}
