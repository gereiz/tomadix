import Link from "next/link";

const modules = [
  { number: "01", title: "Projetos", description: "Organize ideias, estilos visuais e configurações." },
  { number: "02", title: "Personagens e ambientes", description: "Preserve identidades e elementos recorrentes." },
  { number: "03", title: "Parâmetros dinâmicos", description: "Crie campos próprios sem modificar o código." },
  { number: "04", title: "Motor de prompts", description: "Gere prompts estruturados e exportáveis em JSON." }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0d12] text-white">

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.15fr_.85fr] md:items-center md:pt-24">
        <div>
          <p className="mb-5 text-sm font-medium uppercase tracking-[.25em] text-emerald-400">
            AI-powered pre-production
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Da ideia ao prompt. <span className="text-white/45">Com direção.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
            Um estúdio para estruturar projetos audiovisuais, manter a consistência
            de personagens e ambientes e gerar prompts cinematográficos em JSON.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-black transition hover:bg-emerald-300 shadow-lg shadow-emerald-400/20">
              Acessar Painel (Dashboard)
            </Link>
            <Link href="/projects" className="rounded-xl border border-white/15 px-5 py-3 text-white/80 transition hover:bg-white/5">
              Explorar Projetos
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm text-white/45">WORKSPACE / PROJETO</p>
              <h2 className="mt-1 font-medium">O Brasil em VHS</h2>
            </div>
            <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">Rascunho</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["ESTÉTICA", "VHS anos 90"],
              ["DURAÇÃO", "30 segundos"],
              ["ÁUDIO", "Som ambiente"],
              ["SAÍDA", "JSON · pt-BR"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] tracking-[.2em] text-white/40">{label}</p>
                <p className="mt-2 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4">
            <p className="text-xs text-emerald-300">MOTOR DE PROMPTS</p>
            <div className="mt-3 space-y-2 font-mono text-xs text-white/60">
              <p><span className="text-emerald-300">{"{"}</span> &quot;type&quot;: &quot;visual_bible&quot;,</p>
              <p className="pl-4">&quot;language&quot;: &quot;pt-BR&quot;,</p>
              <p className="pl-4">&quot;output&quot;: &quot;structured_json&quot;</p>
              <p><span className="text-emerald-300">{"}"}</span></p>
            </div>
          </div>
        </div>
      </section>

      <section id="modulos" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[.2em] text-emerald-400">Arquitetura modular</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">O estúdio começa aqui.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <article key={module.number} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <p className="text-sm text-emerald-400">{module.number}</p>
              <h3 className="mt-5 text-lg font-medium">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/35">
        Tomadix · Fundação técnica
      </footer>
    </main>
  );
}
