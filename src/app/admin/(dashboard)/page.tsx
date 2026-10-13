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
    { label: "livros no catálogo", value: stats.total, href: "/admin/books" },
    { label: "com nota", value: stats.withNote, href: "/admin/books?filter=with-note" },
    { label: "sem sinopse", value: stats.withoutSynopsis, href: "/admin/books?filter=without-synopsis" },
    { label: "esgotados", value: stats.outOfStock, href: "/admin/books?filter=out-of-stock" },
    { label: "vitrines publicadas", value: showcases.filter((showcase) => showcase.published).length, href: "/admin/showcases" },
  ];
  return (
    <div className="space-y-10">
      <div>
        <h1 className="display text-[2.6rem] leading-none">Painel</h1>
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
            Reservas e avisos novos
          </h2>
          <Link href="/admin/reservations" className="eyebrow ink-link">
            ver todos
          </Link>
        </div>
        {interests.length === 0 ? (
          <p className="mt-3 text-ink-soft">Nenhum pedido aguardando resposta.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/20 border-y border-ink/20">
            {interests.map((interest) => (
              <li key={interest.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
                <span>
                  <span className="font-label font-semibold">{interest.name}</span>{" "}
                  <span className="text-ink-soft">{interest.kind === "reservation" ? "reservou" : "quer ser avisada(o) de"}</span>{" "}
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
          Atalhos
        </h2>
        {[
          { href: "/admin/import", title: "Importar catálogo", text: "Envie um CSV com ISBN, título, autor, sinopse, preço e estoque." },
          { href: "/admin/showcases/new", title: "Montar uma vitrine", text: "Reúna livros em torno de uma ideia e compartilhe o link." },
          { href: "/admin/books?filter=without-note", title: "Escrever notas", text: "Deixe uma recomendação sua nos livros que você mais indica." },
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
