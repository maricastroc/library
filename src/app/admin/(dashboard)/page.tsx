import Link from "next/link";
import { EnrichmentPanel } from "@/components/admin/EnrichmentPanel";
import { catalogStats } from "@/lib/catalog/books";
import { listInterests } from "@/lib/interest";
import { ollamaStatus } from "@/lib/semantic/ollama";
import { enrichmentState } from "@/lib/semantic/pipeline";
import { listShowcases } from "@/lib/showcase";

export default async function DashboardPage() {
  const stats = catalogStats();
  const interests = listInterests().filter((interest) => interest.status === "new").slice(0, 5);
  const showcases = listShowcases();
  const ollama = await ollamaStatus();
  const numbers = [
    { label: "books in the catalog", value: stats.total, href: "/admin/books" },
    { label: "with note", value: stats.withNote, href: "/admin/books?filter=with-note" },
    { label: "without synopsis", value: stats.withoutSynopsis, href: "/admin/books?filter=without-synopsis" },
    { label: "out of stock", value: stats.outOfStock, href: "/admin/books?filter=out-of-stock" },
    { label: "published showcases", value: showcases.filter((showcase) => showcase.published).length, href: "/admin/showcases" },
  ];
  return (
    <div className="space-y-10">
      <div>
        <h1 className="display text-[2.6rem] leading-none">Dashboard</h1>
        <ul className="mt-6 grid grid-cols-2 gap-px bg-ink/25 sm:grid-cols-3 lg:grid-cols-5">
          {numbers.map((item) => (
            <li key={item.label} className="bg-paper">
              <Link href={item.href} className="block p-4 hover:bg-paper-light">
                <span className="display block text-[2.4rem] leading-none">{item.value}</span>
                <span className="eyebrow mt-2 block text-ink-soft">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <EnrichmentPanel initial={{ state: enrichmentState(), stats, ollama }} />

      <section aria-labelledby="new-requests-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="new-requests-heading" className="display text-[1.5rem] leading-none">
            New reservations and notification requests
          </h2>
          <Link href="/admin/reservations" className="eyebrow ink-link">
            view all
          </Link>
        </div>
        {interests.length === 0 ? (
          <p className="mt-3 text-ink-soft">No requests awaiting a reply.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/20 border-y border-ink/20">
            {interests.map((interest) => (
              <li key={interest.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
                <span>
                  <span className="font-label font-semibold">{interest.name}</span>{" "}
                  <span className="text-ink-soft">{interest.kind === "reservation" ? "reserved" : "wants to be notified about"}</span>{" "}
                  <span className="italic">{interest.bookTitle}</span>
                </span>
                <span className="eyebrow text-ink-soft">{interest.contact}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="shortcuts-heading" className="grid gap-4 sm:grid-cols-3">
        <h2 id="shortcuts-heading" className="sr-only">
          Shortcuts
        </h2>
        {[
          { href: "/admin/import", title: "Import catalog", text: "Upload a CSV with ISBN, title, author, synopsis, price and stock." },
          { href: "/admin/showcases/new", title: "Put together a showcase", text: "Gather books around an idea and share the link." },
          { href: "/admin/books?filter=without-note", title: "Write notes", text: "Leave your own recommendation on the books you suggest most." },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="group border border-ink p-5 hover:bg-ink hover:text-paper">
            <span className="display block text-[1.35rem] leading-tight">{item.title}</span>
            <span className="mt-2 block text-[0.95rem] text-ink-soft group-hover:text-paper/80">{item.text}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
