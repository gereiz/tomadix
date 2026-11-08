"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { StudioContentCard } from "./studio-content-card";
import { StudioFeedItem } from "@/app/api/studio/feed/route";

interface StudioGalleryProps {
  initialProjectId?: string;
  refreshTrigger?: number;
}

export function StudioGallery({ initialProjectId, refreshTrigger }: StudioGalleryProps) {
  const [items, setItems] = useState<StudioFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e busca
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("updatedAt_desc");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; title: string }>>([]);

  const [isPending, startTransition] = useTransition();

  const FILTER_TABS = [
    { id: "all", label: "Todos", icon: "✨" },
    { id: "projects", label: "Projetos", icon: "🎬" },
    { id: "characters", label: "Personagens", icon: "👤" },
    { id: "environments", label: "Ambientes", icon: "🏙️" },
    { id: "scenes", label: "Cenas", icon: "🎥" },
    { id: "prompts", label: "Prompts", icon: "📝" },
  ];

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("type", typeFilter);
      if (initialProjectId) params.set("projectId", initialProjectId);
      if (search.trim()) params.set("search", search.trim());
      params.set("sort", sortOrder);
      params.set("page", String(page));
      params.set("limit", "24");

      const res = await fetch(`/api/studio/feed?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Não foi possível carregar a galeria de conteúdos.");
      }
      const data = await res.json();
      setItems(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
      if (data.availableProjects) {
        setAvailableProjects(data.availableProjects);
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao carregar galeria.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, initialProjectId, search, sortOrder, page]);

  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        fetchFeed();
      });
    }, 200);
    return () => clearTimeout(handler);
  }, [fetchFeed, refreshTrigger]);

  return (
    <div className="w-full pb-36">
      {/* Barra de Controles: Abas de Tipo, Pesquisa e Ordenação */}
      <div className="sticky top-[60px] z-20 border-b border-white/5 bg-[#0B0D12]/95 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Abas de Tipos de Conteúdo */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            {FILTER_TABS.map((tab) => {
              const isActive = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setTypeFilter(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/30 shadow-sm shadow-primary/20"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Busca Textual e Ordenação */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <span className="absolute left-3 top-2.5 text-xs text-white/40">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar na galeria..."
                className="w-full rounded-xl border border-white/10 bg-[#12151E] pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-primary/50 focus:outline-none transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2 text-xs text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Ordenação */}
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-[#12151E] px-2.5 py-1.5 text-xs font-medium text-white/80 focus:border-primary focus:outline-none"
            >
              <option value="updatedAt_desc">Mais Recentes</option>
              <option value="createdAt_asc">Mais Antigos</option>
              <option value="title_asc">Ordem A-Z</option>
            </select>
          </div>
        </div>

        {/* Resumo de resultados */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-white/40">
          <span>
            {loading ? "Carregando conteúdos..." : `${totalCount} item(s) encontrado(s)`}
          </span>
          {initialProjectId && (
            <span className="text-primary font-mono">Modo: Estúdio Contextual de Projeto</span>
          )}
        </div>
      </div>

      {/* Grid Principal da Galeria */}
      <div className="mt-6">
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-white/5 bg-[#12151E]/60 p-4"
              >
                <div className="flex justify-between">
                  <div className="h-5 w-20 rounded-full bg-white/10" />
                  <div className="h-4 w-12 rounded bg-white/5" />
                </div>
                <div className="mt-3 aspect-video w-full rounded-xl bg-white/5" />
                <div className="mt-3 h-4 w-3/4 rounded bg-white/10" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5 sm:p-8 text-center">
            <p className="text-sm font-semibold text-red-300">{error}</p>
            <button
              onClick={fetchFeed}
              className="mt-4 rounded-xl bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              Tentar Novamente
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-[#12151E]/40 p-12 text-center">
            <span className="text-4xl">🎬</span>
            <h3 className="mt-3 text-base font-bold text-white">Nenhum conteúdo encontrado</h3>
            <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
              {search
                ? `Nenhum resultado corresponde a "${search}". Tente outro termo.`
                : "Utilize a barra de criação rápida abaixo para gerar seu primeiro projeto, personagem ou cena."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <StudioContentCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-white/10 bg-[#12151E] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30 hover:border-primary transition"
            >
              ← Anterior
            </button>
            <span className="text-xs text-white/60 font-mono px-3">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-white/10 bg-[#12151E] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30 hover:border-primary transition"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
