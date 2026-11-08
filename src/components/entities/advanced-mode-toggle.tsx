"use client";

interface AdvancedModeToggleProps {
  advanced: boolean;
  onChange: (value: boolean) => void;
  /** Quantidade de campos avançados já preenchidos (aviso quando o modo está desligado). */
  hiddenCount?: number;
}

/** Switch "Modo avançado": mostra câmera, iluminação, ângulos e demais campos técnicos. */
export function AdvancedModeToggle({ advanced, onChange, hiddenCount = 0 }: AdvancedModeToggleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">Modo avançado</p>
        <p className="text-[11px] text-white/50">
          {advanced
            ? "Mostrando câmera, iluminação, ângulos e opções técnicas."
            : hiddenCount > 0
              ? `${hiddenCount} campo${hiddenCount > 1 ? "s" : ""} avançado${hiddenCount > 1 ? "s" : ""} preenchido${hiddenCount > 1 ? "s" : ""} (ativo, mas oculto${hiddenCount > 1 ? "s" : ""}).`
              : "Ative para ajustar câmera, iluminação, ângulos e opções técnicas."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={advanced}
        aria-label="Modo avançado"
        onClick={() => onChange(!advanced)}
        className="flex min-h-11 min-w-11 items-center justify-center"
      >
        <span className={`relative inline-flex h-6 w-11 rounded-full transition ${advanced ? "bg-primary" : "bg-white/20"}`}>
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${advanced ? "left-[1.375rem]" : "left-0.5"}`}
          />
        </span>
      </button>
    </div>
  );
}
