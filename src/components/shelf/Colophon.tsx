import { ATMOSPHERE_BY_ID } from "@/lib/semantic/taxonomy";
import { ATMOSPHERE_SPECTRUM } from "@/lib/shelf/arrange";
import { KRAFT } from "@/lib/shelf/identity";

function MiniSpine({ width, height, color, bands }: { width: number; height: number; color: string; bands?: number }) {
  return (
    <span aria-hidden className="relative inline-block shrink-0 align-bottom" style={{ width, height, background: color }}>
      {bands ? (
        <span className="absolute inset-x-0 bottom-1.5 flex flex-col gap-[2px]">
          {Array.from({ length: bands }, (_, index) => (
            <span key={index} className="block h-[1.5px] w-full bg-paper/80" />
          ))}
        </span>
      ) : null}
    </span>
  );
}

export function Colophon({ embedModel, chatModel }: { embedModel: string; chatModel: string }) {
  return (
    <footer id="how-to-read" className="mt-24 scroll-mt-8 border-t-[3px] border-ink pb-16 pt-8">
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[1.25fr_1fr_1fr]">
        <section aria-labelledby="legend-heading">
          <h2 id="legend-heading" className="display text-[2rem] leading-none">
            Como ler a estante
          </h2>
          <p className="mt-3 max-w-[34rem] text-ink-soft">
            Nenhuma lombada é decorada ao acaso. Cada uma é desenhada a partir do que o catálogo sabe sobre o livro.
          </p>
          <dl className="mt-6 space-y-5">
            <div>
              <dt className="eyebrow text-ink">A cor é a atmosfera predominante</dt>
              <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {ATMOSPHERE_SPECTRUM.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 font-label text-[0.82rem]">
                    <span aria-hidden className="inline-block h-4 w-2.5" style={{ background: ATMOSPHERE_BY_ID[id].color }} />
                    {ATMOSPHERE_BY_ID[id].label}
                  </span>
                ))}
              </dd>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="eyebrow text-ink">A espessura são as páginas</dt>
                <dd className="mt-2 flex items-end gap-1 text-[0.9rem] text-ink-soft">
                  <MiniSpine width={8} height={34} color="#34506b" />
                  <MiniSpine width={14} height={34} color="#34506b" />
                  <MiniSpine width={22} height={34} color="#34506b" />
                  <span className="ml-2">de 100 a 800 páginas</span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink">A altura é a densidade da leitura</dt>
                <dd className="mt-2 flex items-end gap-1 text-[0.9rem] text-ink-soft">
                  <MiniSpine width={12} height={22} color="#7b1f2e" />
                  <MiniSpine width={12} height={28} color="#7b1f2e" />
                  <MiniSpine width={12} height={34} color="#7b1f2e" />
                  <span className="ml-2">de leve a exigente</span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink">As faixas são o ritmo</dt>
                <dd className="mt-2 flex items-end gap-1 text-[0.9rem] text-ink-soft">
                  <MiniSpine width={14} height={34} color="#24483e" bands={1} />
                  <MiniSpine width={14} height={34} color="#24483e" bands={3} />
                  <MiniSpine width={14} height={34} color="#24483e" bands={5} />
                  <span className="ml-2">de lento a vertiginoso</span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink">A letra é a forma do livro</dt>
                <dd className="mt-2 text-[0.9rem] leading-snug text-ink-soft">
                  <span className="face-serif text-[0.72rem] text-ink">Romance</span>,{" "}
                  <span className="face-italic text-ink">poesia e novela</span>,{" "}
                  <span className="face-grotesque text-[0.78rem] text-ink">ensaio</span>,{" "}
                  <span className="face-mono text-[0.72rem] text-ink">ficção científica</span>.
                </dd>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-[0.9rem] text-ink-soft">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="relative inline-block h-5 w-[11px] bg-paper-light shadow-[0_0_0_0.5px_rgb(28_26_23/0.4)]">
                  <span className="absolute inset-x-[2.5px] top-1 h-[1.5px] bg-vermilion" />
                </span>
                marcador de papel: há uma nota da livreira
              </span>
              <span className="inline-flex items-center gap-2">
                <MiniSpine width={12} height={20} color={KRAFT} />
                papel pardo: a IA ainda não leu a sinopse
              </span>
            </div>
          </dl>
        </section>

        <section aria-labelledby="ai-heading">
          <h2 id="ai-heading" className="eyebrow text-ink">
            Como a estante responde
          </h2>
          <div className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-ink-soft">
            <p>
              Cada sinopse foi lida por um modelo aberto que roda neste computador ({chatModel}, via Ollama). Ele
              descreve atmosfera, ritmo, densidade, estilo e temas, e precisa apontar o trecho da sinopse que sustenta
              cada leitura.
            </p>
            <p>
              Sua pergunta vira um vetor ({embedModel}) e é comparada com essas leituras. Quando a estante não tem uma
              boa resposta, ela diz.
            </p>
            <p>A livreira pode corrigir qualquer classificação. Notas pessoais são sempre escritas por gente.</p>
          </div>
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="eyebrow text-ink">
            De onde vêm os dados
          </h2>
          <div className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-ink-soft">
            <p>
              Dados bibliográficos e capas:{" "}
              <a className="ink-link" href="https://openlibrary.org" target="_blank" rel="noreferrer">
                Open Library
              </a>
              . Sinopses:{" "}
              <a className="ink-link" href="https://pt.wikipedia.org" target="_blank" rel="noreferrer">
                Wikipédia
              </a>
              , sob licença{" "}
              <a
                className="ink-link"
                href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
              .
            </p>
            <p>Preços e estoque marcados como demonstrativos não são dados comerciais reais.</p>
          </div>
        </section>
      </div>
    </footer>
  );
}
