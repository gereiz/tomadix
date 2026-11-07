import type { SpaceVisibilityType } from "./types";

const OPTIONS: ReadonlyArray<{ id: SpaceVisibilityType; icon: string; title: string; desc: string }> = [
  {
    id: "PRIVATE",
    icon: "🔒",
    title: "Privado (Somente eu)",
    desc: "Apenas você (e administradores do Workspace) podem acessar este Space.",
  },
  {
    id: "TEAM",
    icon: "👥",
    title: "Toda a equipe do Workspace",
    desc: "Todos os membros do Workspace atual podem abrir e colaborar no board.",
  },
  {
    id: "SELECTED",
    icon: "🎯",
    title: "Membros selecionados",
    desc: "Escolha exatamente quais membros da equipe visualizam ou editam este Space.",
  },
];

interface VisibilityOptionsProps {
  value: SpaceVisibilityType;
  disabled: boolean;
  onChange: (value: SpaceVisibilityType) => void;
}

export function VisibilityOptions({ value, disabled, onChange }: VisibilityOptionsProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-white/50">
        Nível de Visibilidade no Workspace
      </label>

      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
              active
                ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span className="mt-0.5 text-lg">{opt.icon}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{opt.title}</span>
                <span
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    active ? "border-primary bg-primary text-black" : "border-white/30"
                  }`}
                >
                  {active && <span className="text-[10px] font-bold">✓</span>}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/60">{opt.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
