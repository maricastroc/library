import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Wordmark } from "@/components/shelf/Masthead";
import { isAdmin } from "@/lib/auth/guard";
import { adminConfigured } from "@/lib/auth/session";
import { getShopConfig } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Sign in to the counter", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const params = await searchParams;
  const destination = typeof params.from === "string" ? params.from : "/admin";
  const configured = adminConfigured();
  const shop = getShopConfig();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="self-start text-[1.8rem]" aria-label={`${shop.name}, back to the shelf`}>
        <Wordmark name={shop.name} />
      </Link>
      <h1 className="display mt-10 text-[2.4rem] leading-none">Bookshop counter</h1>
      <p className="mt-3 text-ink-soft">For whoever looks after the catalog: importing books, writing notes, putting together showcases.</p>
      <div className="mt-8">
        {configured ? null : (
          <p role="alert" className="mb-5 border-l-2 border-vermilion pl-3 text-[0.95rem]">
            The counter doesn’t have a password yet. Set <code className="font-mono text-[0.85rem]">ADMIN_PASSWORD</code> and{" "}
            <code className="font-mono text-[0.85rem]">SESSION_SECRET</code> in the <code className="font-mono text-[0.85rem]">.env.local</code> file and
            restart the server.
          </p>
        )}
        <LoginForm destination={destination} configured={configured} />
      </div>
    </main>
  );
}
