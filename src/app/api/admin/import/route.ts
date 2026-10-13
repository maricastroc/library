import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/guard";
import { IMPORT_MAX_BYTES, analyzeCsv, applyImportPlan } from "@/lib/catalog/import-csv";
import { ensureBackgroundEnrichment } from "@/lib/semantic/pipeline";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso restrito ao balcão da livraria." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo CSV." }, { status: 400 });
  if (file.size > IMPORT_MAX_BYTES) return NextResponse.json({ error: "O arquivo passa de 2 MB." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = buffer.toString("utf8");
  if (text.includes("�")) text = buffer.toString("latin1");
  const plan = analyzeCsv(text);

  if (form?.get("mode") !== "apply") return NextResponse.json({ plan });
  if (plan.fatal) return NextResponse.json({ plan, error: plan.fatal }, { status: 400 });

  const outcome = applyImportPlan(plan, file.name);
  if (outcome.affectedIds.length > 0) ensureBackgroundEnrichment();
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return NextResponse.json({ plan, outcome });
}
