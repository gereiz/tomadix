import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110",
  secondary:
    "border border-outline-variant/50 bg-surface-container text-on-surface hover:bg-surface-container-highest",
  ghost: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
};

interface ActionLinkProps {
  href: string;
  children: React.ReactNode;
  icon?: IconName;
  variant?: Variant;
}

/** Link com aparência de botão, reutilizável em qualquer página. */
export function ActionLink({ href, children, icon, variant = "primary" }: ActionLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${VARIANTS[variant]}`}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </Link>
  );
}
