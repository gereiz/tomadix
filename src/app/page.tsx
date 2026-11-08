import { ActionLink } from "@/components/home/action-link";
import { PromptPreview } from "@/components/home/prompt-preview";
import { SectionHeading } from "@/components/home/section-heading";
import { SiteFooter } from "@/components/home/site-footer";
import { StepCard } from "@/components/home/step-card";
import { HOME_STEPS } from "@/config/home-content";

export default function Home() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-surface">
      <section className="grid items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <h1 className="font-display-hero text-4xl font-bold leading-[1.08] tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
            Escreva a cena.
            <br />
            <span className="text-on-surface-variant">Receba o prompt pronto.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
            Organize projetos, personagens e ambientes em um só lugar e gere prompts cinematográficos em JSON,
            com a mesma aparência em todas as cenas.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <ActionLink href="/studio" icon="camera">Analisar uma cena</ActionLink>
            <ActionLink href="/projects" icon="movie" variant="secondary">Meus projetos</ActionLink>
            <ActionLink href="/workspace" variant="ghost">Workspace</ActionLink>
          </div>
        </div>

        <div className="lg:col-span-5">
          <PromptPreview />
        </div>
      </section>

      <section
        aria-labelledby="fluxo"
        className="border-t border-outline-variant/20 px-4 py-16 sm:px-6 lg:px-8"
      >
        <SectionHeading
          id="fluxo"
          title="Da ideia ao prompt em quatro passos"
          description="Cada etapa guarda suas decisões, então você não precisa repeti-las a cada cena."
        />
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_STEPS.map((step, i) => (
            <StepCard key={step.title} step={step} position={i + 1} />
          ))}
        </ol>
      </section>

      <SiteFooter />
    </main>
  );
}
