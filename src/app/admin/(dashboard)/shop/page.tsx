import type { Metadata } from "next";
import { ShopForm } from "@/components/admin/ShopForm";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Livraria" };

export default function ShopPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="display text-[2.6rem] leading-none">A livraria</h1>
      <p className="mt-3 text-ink-soft">Como a casa se apresenta na estante pública e nas vitrines.</p>
      <div className="mt-8">
        <ShopForm shop={getShopConfig()} />
      </div>
    </div>
  );
}
