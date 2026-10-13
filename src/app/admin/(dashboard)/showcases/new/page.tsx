import type { Metadata } from "next";
import Link from "next/link";
import { ShowcaseEditor } from "@/components/admin/ShowcaseEditor";
import { listPickerBooks } from "@/lib/showcase/picker";

export const metadata: Metadata = { title: "Nova vitrine" };

export default function NewShowcasePage() {
  return (
    <div className="max-w-5xl">
      <Link href="/admin/showcases" className="eyebrow ink-link">
        ← Vitrines
      </Link>
      <h1 className="display mt-3 text-[2.6rem] leading-none">Montar uma vitrine</h1>
      <div className="mt-8">
        <ShowcaseEditor showcase={null} books={listPickerBooks()} />
      </div>
    </div>
  );
}
