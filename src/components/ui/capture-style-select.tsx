"use client";

import { listCaptureStyles } from "@/modules/prompt-engine/capture-styles";

interface CaptureStyleSelectProps {
  value: string;
  onChange: (key: string) => void;
}

/** Seletor "Estilo de Captura" (cinematográfico, amador/celular, segurança, found footage). */
export function CaptureStyleSelect({ value, onChange }: CaptureStyleSelectProps) {
  const styles = listCaptureStyles();
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/80">Estilo de Captura</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {styles.map((st) => (
          <button
            key={st.key}
            type="button"
            title={st.description}
            onClick={() => onChange(st.key)}
            className={`min-h-11 rounded-lg px-2 py-1.5 text-xs font-medium transition border ${
              value === st.key
                ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                : "bg-white/5 text-white/60 border-white/10 hover:text-white"
            }`}
          >
            <span className="mr-1">{st.icon}</span>
            {st.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-white/40">{styles.find((st) => st.key === value)?.description}</p>
    </div>
  );
}
