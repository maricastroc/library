import type { Metadata } from "next";
import { ShopForm } from "@/components/admin/ShopForm";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Bookshop" };

export default function ShopPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="display text-[2.6rem] leading-none">The bookshop</h1>
      <p className="mt-3 text-ink-soft">How the house presents itself on the public shelf and in the showcases.</p>
      <div className="mt-8">
        <ShopForm shop={getShopConfig()} />
      </div>
    </div>
  );
}
