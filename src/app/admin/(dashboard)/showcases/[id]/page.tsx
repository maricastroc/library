import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removeShowcase } from "@/app/admin/actions";
import { ConfirmRemoval } from "@/components/admin/ConfirmRemoval";
import { ShowcaseEditor } from "@/components/admin/ShowcaseEditor";
import { getShowcaseById } from "@/lib/showcase";
import { listPickerBooks } from "@/lib/showcase/picker";

export const metadata: Metadata = { title: "Editar vitrine" };

export default async function EditShowcasePage({ params, searchParams }: PageProps<"/admin/showcases/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const showcase = getShowcaseById(Number(id));
  if (!showcase) notFound();
  return (
    <div className="max-w-5xl">
      <Link href="/admin/showcases" className="eyebrow ink-link">
        ← Vitrines
      </Link>
      <h1 className="display mt-3 text-balance text-[2.6rem] leading-[1.02]">{showcase.title}</h1>
      {query.created ? (
        <p role="status" className="mt-4 border-l-2 border-ink pl-3">
          Vitrine criada. {showcase.published ? "Ela já está no ar." : "Ela está como rascunho: publique quando quiser compartilhar."}
        </p>
      ) : null}
      <div className="mt-8">
        <ShowcaseEditor key={showcase.id} showcase={showcase} books={listPickerBooks()} />
      </div>
      <section aria-labelledby="delete-showcase-heading" className="mt-14 border-t border-ink/30 pt-6">
        <h2 id="delete-showcase-heading" className="eyebrow text-ink">
          Apagar vitrine
        </h2>
        <ConfirmRemoval action={removeShowcase} id={showcase.id} label="Apagar esta vitrine" question={`Apagar a vitrine "${showcase.title}"? O link compartilhado deixa de funcionar. Os livros continuam no catálogo.`} />
      </section>
    </div>
  );
}
