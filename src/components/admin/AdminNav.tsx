"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/books", label: "Livros" },
  { href: "/admin/import", label: "Importar" },
  { href: "/admin/showcases", label: "Vitrines" },
  { href: "/admin/reservations", label: "Reservas" },
  { href: "/admin/evaluation", label: "Avaliação da busca" },
  { href: "/admin/shop", label: "Livraria" },
];

export function AdminNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Balcão" className="mt-5 border-y border-ink">
      <ul className="-mx-1 flex flex-wrap gap-x-1">
        {ITEMS.map((item) => {
          const current = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 font-label text-[0.92rem] font-semibold ${current ? "bg-ink text-paper" : "text-ink hover:bg-ink/10"}`}
              >
                {item.label}
                {item.href === "/admin/reservations" && pending > 0 ? (
                  <span className={`eyebrow px-1.5 py-0.5 text-[9px] ${current ? "bg-paper text-ink" : "bg-vermilion text-paper"}`}>
                    {pending}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
