interface SpinnerProps {
  /** Classes de tamanho e cor, ex.: "h-6 w-6 border-2 border-primary". */
  className?: string;
  /** Usa `display: block` em vez de `inline-block`. */
  block?: boolean;
  label?: string;
}

/** Indicador de carregamento leve (CSS puro), usado em todo o sistema. */
export function Spinner({ className = "h-5 w-5 border-2 border-primary", block = false, label = "Carregando" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`${block ? "block" : "inline-block"} animate-spin rounded-full border-t-transparent ${className}`}
    />
  );
}
