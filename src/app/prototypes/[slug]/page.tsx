import { notFound } from "next/navigation";
import { CabinetPrototype } from "@/components/prototypes/CabinetPrototype";
import { FanPrototype } from "@/components/prototypes/FanPrototype";
import { TablePrototype } from "@/components/prototypes/TablePrototype";
import { listShelfBooks } from "@/lib/catalog/books";
import { getShopConfig } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function PrototypePage({ params, searchParams }: PageProps<"/prototypes/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const props = {
    books: listShelfBooks(),
    shop: getShopConfig(),
    initialQuery: first(query.q).replace(/\s+/g, " ").trim().slice(0, 240),
    initialSlug: first(query.book) || null,
  };
  if (slug === "table") return <TablePrototype {...props} />;
  if (slug === "cabinet") return <CabinetPrototype {...props} />;
  if (slug === "fan") return <FanPrototype {...props} />;
  notFound();
}
