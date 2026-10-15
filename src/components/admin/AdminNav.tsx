"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/showcases", label: "Showcases" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/evaluation", label: "Search evaluation" },
  { href: "/admin/shop", label: "Bookshop" },
];

export function AdminNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const scroller = nav.current;
    const active = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollLeft = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav ref={nav} aria-label="Counter" className="counter-nav">
      <ol>
        {ITEMS.map((item, index) => {
          const current = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={current ? "page" : undefined} className="counter-nav-link">
                <span aria-hidden className="counter-nav-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="counter-nav-label">{item.label}</span>
                {item.href === "/admin/reservations" && pending > 0 ? (
                  <span className="counter-nav-badge" aria-label={`${pending} awaiting a reply`}>
                    {pending}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
