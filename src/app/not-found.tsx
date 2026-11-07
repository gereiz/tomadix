import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-black/60 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl text-amber-400 mb-4 border border-amber-500/20">
          🔍
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Página Não Encontrada</h1>
        <p className="text-xs text-white/60 mb-6 leading-relaxed">
          A página ou recurso solicitado não existe ou foi movido.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-400"
        >
          Retornar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
