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
    <main className="door">
      <div className="door-leaf">
        <Link href="/" className="door-wordmark" aria-label={`${shop.name}, back to the shelf`}>
          <Wordmark name={shop.name} />
        </Link>
        <p className="eyebrow door-folio">the counter · for the bookshop’s staff</p>
        <h1 className="counter-title">
          Behind the <em>counter</em>
        </h1>
        <p className="counter-lede">Where the catalogue is kept: importing books, writing notes, arranging showcases and answering readers.</p>
        {configured ? null : (
          <p role="alert" className="slip door-unset" data-tone="error">
            The counter doesn’t have a password yet. Set <code className="bench-code">ADMIN_PASSWORD</code> and <code className="bench-code">SESSION_SECRET</code> in{" "}
            <code className="bench-code">.env.local</code> and restart the server.
          </p>
        )}
        <LoginForm destination={destination} configured={configured} />
        <Link href="/" className="eyebrow door-back">
          ← Back to the shelf
        </Link>
      </div>
    </main>
  );
}
