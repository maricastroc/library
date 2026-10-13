import type { Metadata } from "next";
import Link from "next/link";
import { SHOWCASE_PALETTES, listShowcases } from "@/lib/showcase";

export const metadata: Metadata = { title: "Vitrines" };

export default function ShowcasesPage() {
  const showcases = listShowcases();
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[2.6rem] leading-none">Vitrines</h1>
        <Link href="/admin/showcases/new" className="button">
          Montar uma vitrine
        </Link>
      </div>
      <p className="mt-3 max-w-[44rem] text-ink-soft">
        Uma vitrine é uma seleção sua em torno de uma ideia. Cada uma tem página própria e um link para compartilhar.
      </p>
      {showcases.length === 0 ? (
        <p className="mt-10 border-t border-ink/30 py-10 text-ink-soft">Ainda não há vitrines. Que tal começar por “Livros para dias de chuva”?</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {showcases.map((showcase) => {
            const palette = SHOWCASE_PALETTES[showcase.palette];
            return (
              <li key={showcase.id}>
                <Link
                  href={`/admin/showcases/${showcase.id}`}
                  className="flex min-h-[9.5rem] flex-col justify-between p-5 outline-offset-2 hover:outline hover:outline-2 hover:outline-vermilion"
                  style={{ background: palette.background, color: palette.ink }}
                >
                  <span className="eyebrow opacity-80">
                    {showcase.published ? "publicada" : "rascunho"} · {showcase.items.length} {showcase.items.length === 1 ? "livro" : "livros"}
                  </span>
                  <span className="display-italic text-balance text-[1.7rem] leading-[1.04]">{showcase.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
