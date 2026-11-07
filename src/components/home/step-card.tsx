import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { HomeStep } from "@/config/home-content";

interface StepCardProps {
  step: HomeStep;
  position: number;
}

/** Etapa do fluxo de pré-produção; o número reflete a ordem real do processo. */
export function StepCard({ step, position }: StepCardProps) {
  return (
    <li>
      <Link
        href={step.href}
        className="group flex h-full flex-col gap-3 border-t-2 border-outline-variant/40 pt-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        <span className="flex items-center gap-2 font-label-code text-sm text-primary">
          <Icon name={step.icon} size={20} />
          {position}
        </span>
        <h3 className="font-headline-sm text-lg font-bold text-on-surface">{step.title}</h3>
        <p className="text-sm leading-6 text-on-surface-variant">{step.description}</p>
      </Link>
    </li>
  );
}
