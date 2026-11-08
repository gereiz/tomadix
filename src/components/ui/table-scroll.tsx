import type { ReactNode } from "react";

interface TableScrollProps {
  children: ReactNode;
  /** Largura mínima (px) da tabela; abaixo dela a tabela rola na horizontal em vez de espremer as colunas. */
  minWidth?: number;
  /** Descrição lida por leitores de tela. */
  label?: string;
  className?: string;
}

/** Envolve uma `<table>` para rolar na horizontal em celulares sem estourar a página. */
export function TableScroll({ children, minWidth = 640, label = "Tabela de dados", className = "" }: TableScrollProps) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={`overflow-x-auto overscroll-x-contain ${className}`}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
