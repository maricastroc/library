import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="eyebrow text-ink-soft">Página não encontrada</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,7vw,4.5rem)] leading-[0.98]">Este livro não está na estante.</h1>
      <p className="mt-5 max-w-[32rem] text-[1.1rem] text-ink-soft">
        O endereço pode ter mudado, ou a vitrine que você procura foi recolhida pela livraria.
      </p>
      <div className="mt-8">
        <Link href="/" className="button">
          Voltar à estante
        </Link>
      </div>
    </main>
  );
}
