"use client";

import { Icon } from "@/components/ui/icon";
import type { ProjectsListTabState } from "./use-projects-list";

interface ProjectsFiltersProps {
  s: ProjectsListTabState;
}

export function ProjectsFilters({ s }: ProjectsFiltersProps) {
  const { projects, search, setSearch, statusFilter, setStatusFilter, boardFilter, setBoardFilter, sortOrder, setSortOrder, viewMode, setViewMode, searchInputRef } = s;


  return (
    <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-container-low/70 border border-outline-variant/30 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Campo de Busca com Atalho ⌘K */}
      <div className="relative flex-1 group">
        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant group-focus-within:text-primary transition-colors" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar por nome, tag, estilo ou sinopse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-16 py-2 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/30 text-on-surface placeholder:text-outline font-body-sm text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest/70 font-label-code text-[11px] text-on-surface-variant border border-outline-variant/20">
            ⌘K
          </kbd>
        </div>
      </div>
    
      <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
        {/* Abas estilo Magnific Spaces: Meus quadros / Compartilhado / Todos / Arquivados */}
        <div className="flex items-center p-1 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/20 overflow-x-auto no-scrollbar" role="tablist">
          <button
            onClick={() => {
              setStatusFilter("active");
              setBoardFilter("mine");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "active" && boardFilter === "mine"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>👤</span>
            <span>Meus quadros do Spaces</span>
          </button>
          <button
            onClick={() => {
              setStatusFilter("active");
              setBoardFilter("shared");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "active" && boardFilter === "shared"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>👥</span>
            <span>Compartilhado</span>
          </button>
          <button
            onClick={() => {
              setStatusFilter("active");
              setBoardFilter("all");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "active" && boardFilter === "all"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Todos <span className="ml-1 opacity-70 font-label-code text-[10px]">{projects.filter((p) => !p.isArchived).length}</span>
          </button>
          <button
            onClick={() => {
              setStatusFilter("archived");
              setBoardFilter("all");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "archived"
                ? "bg-surface-container-high text-amber-300 shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Arquivados
          </button>
        </div>
    
        <div className="h-5 w-[1px] bg-outline-variant/30 hidden sm:block" />
    
        {/* Ordenação */}
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/20 text-on-surface font-body-sm text-xs focus:outline-none focus:border-primary transition-all cursor-pointer"
          >
            <option value="updatedAt_desc">Mais recentes</option>
            <option value="updatedAt_asc">Mais antigos</option>
            <option value="title_asc">Alfabético (A-Z)</option>
            <option value="title_desc">Alfabético (Z-A)</option>
            <option value="createdAt_desc">Data de criação</option>
          </select>
        </div>
    
        {/* Alternância de Visualização */}
        <div className="flex items-center p-1 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/20">
          <button
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "cards"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Visualização em Grade 16:9"
          >
            <Icon name="grid_view" className="text-[18px]" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "table"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Visualização em Tabela Detalhada"
          >
            <Icon name="view_agenda" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
