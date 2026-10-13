import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/guard";
import { catalogStats } from "@/lib/catalog/books";
import { ollamaStatus } from "@/lib/semantic/ollama";
import { enrichmentState, ensureBackgroundEnrichment } from "@/lib/semantic/pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso restrito ao balcão da livraria." }, { status: 401 });
  return NextResponse.json({ state: enrichmentState(), stats: catalogStats(), ollama: await ollamaStatus() });
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso restrito ao balcão da livraria." }, { status: 401 });
  ensureBackgroundEnrichment();
  return NextResponse.json({ state: enrichmentState(), stats: catalogStats() });
}
