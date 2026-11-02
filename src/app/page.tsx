import Link from "next/link";

const modules = [
  {
    number: "01",
    title: "Projetos Cinematográficos",
    description: "Organize universos narrativos, proporção de tela, paletas e direção de arte centralizada.",
    icon: "movie_creation",
    tag: "Container",
  },
  {
    number: "02",
    title: "Personagens & Ambientes",
    description: "Preserve traços anatômicos, consistência de figurino, texturas cenográficas e raccord de luz.",
    icon: "person_celebrate",
    tag: "Consistência",
  },
  {
    number: "03",
    title: "Parâmetros Dinâmicos",
    description: "Controle lentes, sensores, câmeras, estilos luminotécnicos e granulação de película.",
    icon: "tune",
    tag: "Direção Técnica",
  },
  {
    number: "04",
    title: "Motor de Prompts & IA Vision",
    description: "Gere prompts otimizados para Midjourney v6, Flux e SDXL com engenharia reversa multimodal.",
    icon: "auto_awesome",
    tag: "Engine v2.4",
  },
];

export default function Home() {
  return (
    <main className="w-full bg-surface min-h-[calc(100vh-4rem)]">
      {/* Subtle top ambient light spot */}
      <div className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-primary/10 rounded-full blur-[140px]" />

        {/* HERO SECTION */}
        <section className="relative w-full px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Copy & Actions */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Micro Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high/80 border border-outline-variant/30 backdrop-blur-md w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-label-code text-xs text-primary uppercase tracking-wider font-semibold">
                  AI-Powered Pre-Production • Engine v2.4
                </span>
              </div>

              {/* Main Headline */}
              <div className="flex flex-col gap-1">
                <h1 className="font-display-hero text-4xl sm:text-5xl lg:text-6xl font-bold text-on-surface tracking-tight leading-[1.1]">
                  Da ideia ao prompt.
                </h1>
                <span className="font-display-hero text-4xl sm:text-5xl lg:text-6xl font-bold text-on-surface-variant/80 tracking-tight leading-[1.1]">
                  Com direção cinematográfica.
                </span>
              </div>

              {/* Subtitle */}
              <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
                Um estúdio de IA para estruturar projetos audiovisuais, manter a consistência estética de personagens e cenários, decupar referências visuais com visão computacional e gerar prompts cinematográficos prontos para produção.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-headline-sm font-semibold transition-all shadow-lg shadow-primary/35 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">camera</span>
                  <span>Análise Cinematográfica</span>
                </Link>

                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container-high/70 hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface font-headline-sm font-semibold transition-all backdrop-blur-md active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">folder_special</span>
                  <span>Workspace & Acervo</span>
                </Link>

                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface font-headline-sm transition-colors text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">movie</span>
                  <span>Projetos</span>
                </Link>
              </div>

              {/* Social Proof / Engine Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-on-surface-variant text-xs font-body-sm border-t border-outline-variant/20">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                  <span>Mais de <strong className="text-on-surface font-semibold">12.000 takes</strong> estruturados</span>
                </div>
                <span className="text-outline-variant hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5 font-label-code">
                  <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface">Midjourney v6.1</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface">Flux Pro</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface">Runway Gen-3</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Workspace Preview Card */}
            <div className="lg:col-span-5 relative">
              {/* Ambient glow backing the card */}
              <div className="pointer-events-none absolute inset-0 bg-primary/10 rounded-2xl blur-2xl transform rotate-1" />
              <div className="relative bg-surface-container-low/90 border border-outline-variant/40 backdrop-blur-xl rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xl">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-outline-variant/30 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label-caps text-[11px] text-primary tracking-wider uppercase flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      Workspace / Projeto Ativo
                    </span>
                    <h3 className="font-headline-md text-lg sm:text-xl font-bold text-on-surface">
                      O Brasil em VHS • Cinema Noir
                    </h3>
                  </div>
                  <span className="font-label-code text-xs px-2.5 py-1 rounded-lg bg-secondary-container/80 text-secondary-fixed border border-secondary/30 font-semibold">
                    Rascunho v1.4
                  </span>
                </div>

                {/* Cinematic Metadata Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-0.5">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Estética</span>
                    <span className="font-body-md text-xs sm:text-sm text-on-surface font-medium">VHS anos 90 • 35mm</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-0.5">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Duração</span>
                    <span className="font-body-md text-xs sm:text-sm text-on-surface font-medium">30s • 2.39:1 Anamórfico</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-0.5">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Áudio & Luz</span>
                    <span className="font-body-md text-xs sm:text-sm text-on-surface font-medium truncate">Som ambiente • Neon 3200K</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-0.5">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Saída</span>
                    <span className="font-body-md text-xs sm:text-sm text-primary font-label-code font-semibold">JSON • pt-BR</span>
                  </div>
                </div>

                {/* Terminal / Prompt Engine Block */}
                <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 font-label-code text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-on-surface-variant text-[11px] border-b border-outline-variant/20 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-error" />
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="ml-2 font-mono text-on-surface-variant">prompt_compiler.json</span>
                    </div>
                    <span className="text-primary font-semibold">Gemini Flash 2.5</span>
                  </div>
                  <div className="pt-1 space-y-1 font-mono text-[11px] text-on-surface-variant">
                    <p><span className="text-primary">&#123;</span></p>
                    <p className="pl-3">&quot;type&quot;: &quot;visual_bible&quot;,</p>
                    <p className="pl-3">&quot;language&quot;: &quot;pt-BR&quot;,</p>
                    <p className="pl-3">&quot;camera_rig&quot;: &quot;anamorphic_65mm&quot;,</p>
                    <p className="pl-3">&quot;lighting&quot;: &quot;chiaroscuro_neon&quot;,</p>
                    <p className="pl-3">&quot;color_harmony&quot;: &quot;teal_and_orange&quot;</p>
                    <p><span className="text-primary">&#125;</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* MODULAR ARCHITECTURE SECTION */}
      <section id="modulos" className="w-full px-4 sm:px-6 lg:px-8 pb-20 pt-4 border-t border-outline-variant/20">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
            Arquitetura Modular
          </div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold font-headline-lg tracking-tight text-on-surface">
            O estúdio cinematográfico começa aqui.
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant max-w-2xl">
            Cada módulo atua como uma camada na esteira de pré-produção, garantindo que nada se perca entre o conceito e a renderização.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <article
              key={module.number}
              className="group relative flex flex-col justify-between rounded-2xl border border-outline-variant/30 bg-surface-container/40 p-5 hover:bg-surface-container/70 hover:border-primary/40 transition-all duration-300 shadow-md hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-label-code text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {module.number}
                  </span>
                  <span className="text-[10px] font-label-caps uppercase text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/20">
                    {module.tag}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    {module.icon}
                  </span>
                  <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                    {module.title}
                  </h3>
                </div>

                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  {module.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs font-medium text-primary opacity-80 group-hover:opacity-100 transition">
                <span>Ver módulo</span>
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-outline-variant/30 px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-on-surface-variant/60 bg-surface-container-lowest/60">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-md bg-primary font-mono text-[10px] font-extrabold text-on-primary flex items-center justify-center">T</span>
            <span className="font-headline-sm text-xs font-bold uppercase tracking-wider text-on-surface">TOMADIX</span>
            <span className="text-outline-variant">•</span>
            <span>Estúdio de Pré-Produção Audiovisual & IA Generativa</span>
          </div>
          <div>Tomadix Engine v2.4 • Produção de alta fidelidade cinematográfica</div>

          <a href="https://pollinations.ai/?ref=badge">
            <img
              src="https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg"
              alt="Made with pollinations.ai"
            />
          </a>
        </div>
      </footer>
    </main>
  );
}
