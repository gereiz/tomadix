import type { ButtonHTMLAttributes, ReactNode } from "react";

interface TouchIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Obrigatório: botões só com ícone precisam de nome acessível. */
  label: string;
  children: ReactNode;
}

/** Botão de ícone com área de toque de 40px no celular (36px a partir de `md`). */
export function TouchIconButton({ label, children, className = "", type = "button", ...rest }: TouchIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 md:h-9 md:w-9 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
