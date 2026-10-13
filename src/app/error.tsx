"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="eyebrow text-vermilion">Algo saiu do lugar</p>
      <h1 className="display mt-3 text-[clamp(2.2rem,6vw,4rem)] leading-[0.98]">A estante não conseguiu se arrumar.</h1>
      <p className="mt-5 max-w-[32rem] text-[1.1rem] text-ink-soft">
        Houve um erro ao montar esta página. Tente de novo; se continuar, o catálogo pode estar sendo atualizado.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="button" onClick={() => reset()}>
          Tentar de novo
        </button>
        <Link href="/" className="button button-outline">
          Voltar à estante
        </Link>
      </div>
    </main>
  );
}
