import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { Wordmark } from "@/components/shelf/Masthead";
import { requireAdmin } from "@/lib/auth/guard";
import { countNewInterests } from "@/lib/interest";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: { default: "Balcão", template: "%s — Balcão" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const shop = getShopConfig();
  const pending = countNewInterests();
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-24 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pt-6">
        <div className="flex items-end gap-4">
          <Link href="/admin" className="text-[1.5rem]" aria-label="Balcão, início">
            <Wordmark name={shop.name} />
          </Link>
          <p className="eyebrow pb-1 text-vermilion">balcão</p>
        </div>
        <div className="eyebrow flex items-center gap-5 pb-1">
          <Link href="/" className="ink-link">
            Ver a estante
          </Link>
          <form action={logout}>
            <button type="submit" className="eyebrow ink-link">
              Sair
            </button>
          </form>
        </div>
      </header>
      <AdminNav pending={pending} />
      <main className="pt-8">{children}</main>
    </div>
  );
}
