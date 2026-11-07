"use client";

import { VisualReferenceOption } from "@/modules/visual-library/visual-reference.types";

interface VisualOptionCardProps {
  option: VisualReferenceOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
  onOpenDetails: (option: VisualReferenceOption) => void;
  compact?: boolean;
}

export function VisualOptionCard({
  option,
  isSelected,
  onSelect,
  onOpenDetails,
  compact = false,
}: VisualOptionCardProps) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(option.value);
        }
      }}
      onClick={() => onSelect(option.value)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
        isSelected
          ? "border-primary bg-primary/10 ring-2 ring-primary/50 shadow-lg shadow-primary/20"
          : "border-white/10 bg-[#0d121c] hover:border-white/25 hover:bg-[#121824]"
      }`}
    >
      {/* Miniatura da Imagem */}
      <div className={`relative w-full bg-black/40 overflow-hidden ${compact ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
        <img
          src={option.imageUrl}
          alt={option.altText || option.label}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/visual-references/placeholder.svg";
          }}
        />

        {/* Gradiente de proteção */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d121c] via-transparent to-transparent opacity-80" />

        {/* Badge da Categoria */}
        <div className="absolute top-2 left-2.5">
          <span className="rounded-md bg-black/70 px-2 py-0.5 text-[9px] font-mono font-semibold uppercase text-white/80 border border-white/10">
            {option.categoryLabel || option.category}
          </span>
        </div>

        {/* Indicador de Selecionado */}
        {isSelected && (
          <div className="absolute top-2 right-2.5 rounded-full bg-primary p-1 text-on-primary shadow-md shadow-primary/50">
            <svg className="h-3 w-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Botão de Lupa para Ampliar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(option);
          }}
          className="absolute bottom-2 right-2 rounded-lg bg-black/75 px-2 py-1 text-[10px] font-medium text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black hover:text-white transition border border-white/15 flex items-center gap-1 shadow-md"
          title="Ver imagem ampliada e explicação completa"
        >
          <span>🔍</span> Detalhes
        </button>
      </div>

      {/* Textos Informativos */}
      <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-primary transition">
              {option.label}
            </h4>
          </div>

          {option.originalName && option.originalName !== option.label && (
            <p className="text-[10px] font-mono text-amber-400/80 truncate">
              {option.originalName}
            </p>
          )}

          <p className="mt-1 text-[11px] text-white/60 line-clamp-2 leading-relaxed">
            {option.description}
          </p>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
          <code className="text-white/40 font-mono">{option.value}</code>
          <span
            className={`font-semibold ${
              isSelected ? "text-primary" : "text-white/40 group-hover:text-white/70"
            }`}
          >
            {isSelected ? "Selecionado" : "Clique para escolher"}
          </span>
        </div>
      </div>
    </div>
  );
}
