import { Icon } from "@/components/ui/icon";
import type { EntityStatusFilter } from "./types";

const FILTERS: ReadonlyArray<{ id: EntityStatusFilter; label: string }> = [
  { id: "active", label: "Ativos" },
  { id: "archived", label: "Arquivados" },
  { id: "all", label: "Todos" },
];

interface EntityToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  statusFilter: EntityStatusFilter;
  onStatusFilterChange: (value: EntityStatusFilter) => void;
  onGenerateWithAi: () => void;
  aiTitle: string;
  onCreate: () => void;
  createLabel: string;
}

/** Barra superior das abas de personagens e ambientes: busca, filtro de estado e ações de criação. */
export function EntityToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  statusFilter,
  onStatusFilterChange,
  onGenerateWithAi,
  aiTitle,
  onCreate,
  createLabel,
}: EntityToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/40">
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onStatusFilterChange(filter.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === filter.id
                  ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onGenerateWithAi}
          className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-sm"
          title={aiTitle}
        >
          <span>✨</span>
          Gerar com IA
        </button>

        <button
          onClick={onCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 transition"
        >
          <Icon name="add" size={16} />
          {createLabel}
        </button>
      </div>
    </div>
  );
}
