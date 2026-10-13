import { Colophon } from "@/components/shelf/Colophon";
import { ShelfExperience, type ShowcaseLink } from "@/components/shelf/ShelfExperience";
import { listShelfBooks } from "@/lib/catalog/books";
import { CHAT_MODEL, EMBED_MODEL } from "@/lib/semantic/ollama";
import { SORT_OPTIONS, type SortKey } from "@/lib/shelf/arrange";
import { getShopConfig } from "@/lib/shop/config";
import { SHOWCASE_PALETTES, listShowcases } from "@/lib/showcase";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const books = listShelfBooks();
  const shop = getShopConfig();
  const showcases: ShowcaseLink[] = listShowcases({ publishedOnly: true }).map((showcase) => ({
    slug: showcase.slug,
    title: showcase.title,
    intro: showcase.intro,
    count: showcase.items.length,
    background: SHOWCASE_PALETTES[showcase.palette].background,
    ink: SHOWCASE_PALETTES[showcase.palette].ink,
  }));
  const requestedSort = first(params.sort);
  const initialSort = SORT_OPTIONS.some((option) => option.key === requestedSort) ? (requestedSort as SortKey) : "atmosphere";

  return (
    <ShelfExperience
      books={books}
      shop={shop}
      showcases={showcases}
      initialQuery={first(params.q).replace(/\s+/g, " ").trim().slice(0, 240)}
      initialSort={initialSort}
      initialSlug={first(params.book) || null}
    >
      <Colophon embedModel={EMBED_MODEL} chatModel={CHAT_MODEL} />
    </ShelfExperience>
  );
}
