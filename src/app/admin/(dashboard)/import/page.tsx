import type { Metadata } from "next";
import { CsvImporter } from "@/components/admin/CsvImporter";
import { listImportRuns } from "@/lib/catalog/import-csv";

export const metadata: Metadata = { title: "Importar catálogo" };

export default function ImportPage() {
  const runs = listImportRuns();
  return (
    <div className="max-w-5xl">
      <h1 className="display text-[2.6rem] leading-none">Importar catálogo</h1>
      <p className="mt-3 max-w-[46rem] text-ink-soft">
        Envie a planilha da livraria em CSV. Antes de gravar, você vê o que entra, o que atualiza e o que tem problema.
        Colunas aceitas: ISBN, Título, Autor, Sinopse, Gênero, Preço, Estoque, Nota da livreira, Páginas, Ano e Editora.
        Só Título e Autor são obrigatórias.{" "}
        <a className="ink-link" href="/catalog-template.csv" download>
          Baixar modelo
        </a>
        .
      </p>
      <div className="mt-8">
        <CsvImporter />
      </div>
      {runs.length > 0 ? (
        <section aria-labelledby="import-history-heading" className="mt-14">
          <h2 id="import-history-heading" className="eyebrow border-b border-ink pb-2 text-ink">
            Importações anteriores
          </h2>
          <ul className="divide-y divide-ink/15 text-[0.95rem]">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2">
                <span className="font-label">{run.filename ?? "arquivo sem nome"}</span>
                <span className="eyebrow text-ink-soft">
                  {run.createdAt.replace("T", " ").slice(0, 16)} · {run.inserted} novos · {run.updated} atualizados · {run.skipped} fora
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
