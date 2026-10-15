import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/guard";
import { countNewInterests } from "@/lib/interest";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: { default: "Counter", template: "%s — Counter" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const shop = getShopConfig();
  const pending = countNewInterests();
  return (
    <div className="counter">
      <header className="counter-rail">
        <Link href="/admin" className="counter-house" aria-label={`${shop.name} counter, overview`}>
          <span className="counter-house-name">{shop.name}</span>
          <span className="eyebrow counter-house-role">counter</span>
        </Link>
        <AdminNav pending={pending} />
        <div className="eyebrow counter-rail-foot">
          <Link href="/">
            <span className="counter-rail-long">View the&nbsp;</span>shop ↗
          </Link>
          <form action={logout}>
            <button type="submit" className="eyebrow">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="counter-main">{children}</main>
    </div>
  );
}
