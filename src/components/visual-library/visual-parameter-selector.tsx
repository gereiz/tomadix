"use client";

import { useState, useMemo, useEffect } from "react";
import { VisualReferenceOption, VisualCategory } from "@/modules/visual-library/visual-reference.types";
import { VisualReferenceResolver } from "@/modules/visual-library/visual-reference.resolver";
import { VisualOptionCard } from "./visual-option-card";
import { VisualLightboxModal } from "./visual-lightbox-modal";

interface VisualParameterSelectorProps {
  label: string;
  description?: string | null;
  value: string;
  onChange: (value: string) => void;
  category?: VisualCategory;
  options?: Array<{ value: string; label: string; [key: string]: any }>;
  required?: boolean;
  disabled?: boolean;
  compactInitial?: boolean;
  isAdmin?: boolean;
  paramDefinitionId?: string;
  hideHeader?: boolean;
}

export function VisualParameterSelector({
  label,
  description,
  value,
  onChange,
  category,
  options,
  required = false,
  disabled = false,
  compactInitial = false,
  isAdmin: propIsAdmin,
  paramDefinitionId,
  hideHeader = false,
}: VisualParameterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [inspectingOption, setInspectingOption] = useState<VisualReferenceOption | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(propIsAdmin ?? false);

  // Auto-detecta papel administrativo caso não seja injetado via prop
  useEffect(() => {
    if (propIsAdmin !== undefined) {
      setIsAdmin(propIsAdmin);
      return;
    }
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          const u = data.user;
          const isPlatform = Boolean(
            u.isPlatformAdmin || u.platformRole === "ADMIN" || u.platformRole === "SUPER_ADMIN"
          );
          const isWpAdmin = Boolean(
            u.memberships?.some((m: any) => m.role === "OWNER" || m.role === "ADMIN")
          );
          setIsAdmin(isPlatform || isWpAdmin);
        }
      })
      .catch(() => setIsAdmin(false));
  }, [propIsAdmin]);

  const handleImageUpdated = (optionValue: string, newImageUrl: string) => {
    setImageOverrides((prev) => ({ ...prev, [optionValue]: newImageUrl }));
    if (inspectingOption && inspectingOption.value === optionValue) {
      setInspectingOption({ ...inspectingOption, imageUrl: newImageUrl });
    }
  };

  // Normaliza a lista de opções mesclando o catálogo mestre e as opções customizadas
  const resolvedOptions: VisualReferenceOption[] = useMemo(() => {
    let baseList: VisualReferenceOption[] = [];
    if (options && options.length > 0) {
      baseList = options.map((opt) =>
        VisualReferenceResolver.resolveVisualReference(category || "FRAMING", opt.value, options)
      );
    } else if (category) {
      baseList = VisualReferenceResolver.getCatalogOptions(category);
    } else {
      baseList = VisualReferenceResolver.getCatalogOptions();
    }

    if (Object.keys(imageOverrides).length === 0) return baseList;

    return baseList.map((opt) =>
      imageOverrides[opt.value] ? { ...opt, imageUrl: imageOverrides[opt.value] } : opt
    );
  }, [options, category, imageOverrides]);

  // Opção atualmente selecionada
  const currentSelectedOption = useMemo(() => {
    if (!value) return null;
    const match =
      resolvedOptions.find((o) => o.value === value) ||
      VisualReferenceResolver.resolveVisualReference(category || "", value, options);

    if (imageOverrides[match.value]) {
      return { ...match, imageUrl: imageOverrides[match.value] };
    }
    return match;
  }, [value, resolvedOptions, category, options, imageOverrides]);

  // Filtra opções por busca e categoria
  const filteredOptions = useMemo(() => {
    return resolvedOptions.filter((opt) => {
      const matchSearch =
        search.trim() === "" ||
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.originalName && opt.originalName.toLowerCase().includes(search.toLowerCase())) ||
        opt.value.toLowerCase().includes(search.toLowerCase()) ||
        opt.description.toLowerCase().includes(search.toLowerCase()) ||
        (opt.tags && opt.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));

      const matchCategory =
        selectedCategory === "ALL" || opt.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [resolvedOptions, search, selectedCategory]);

  return (
    <div className="space-y-3">
      {/* Header do Campo */}
      {hideHeader ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition flex items-center gap-1.5"
          >
            <span>{isOpen ? "▲ Recolher" : "🖼️ Ver Galeria Visual"}</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300 font-mono">
              {resolvedOptions.length}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>🎬</span> {label}
              {required && <span className="text-emerald-400 font-bold">*</span>}
            </label>
            {description && <p className="text-[11px] text-white/50">{description}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition flex items-center gap-1.5"
            >
              <span>{isOpen ? "▲ Recolher" : "🖼️ Ver Galeria Visual"}</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300 font-mono">
                {resolvedOptions.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Card da Opção Atualmente Selecionada (Quando fechado ou recolhido) */}
      {currentSelectedOption && !isOpen && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition">
          <div className="flex items-center gap-3.5">
            <div className="relative h-14 w-24 flex-shrink-0 rounded-xl overflow-hidden bg-black border border-white/10">
              <img
                src={currentSelectedOption.imageUrl}
                alt={currentSelectedOption.label}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/visual-references/placeholder.svg";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white">{currentSelectedOption.label}</h4>
                <code className="text-[10px] text-amber-400/80 font-mono">
                  {currentSelectedOption.value}
                </code>
              </div>
              <p className="text-[11px] text-white/60 line-clamp-1 mt-0.5">
                {currentSelectedOption.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setInspectingOption(currentSelectedOption)}
                className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1 shadow-sm"
                title="Enviar imagem personalizada para este parâmetro (Administrador)"
              >
                <span>📷</span> Enviar Imagem
              </button>
            )}
            <button
              type="button"
              onClick={() => setInspectingOption(currentSelectedOption)}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              🔍 Ampliar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
            >
              Trocar Opção
            </button>
          </div>
        </div>
      )}

      {/* Seletor Compacto Fallback (se não houver seleção e estiver fechado) */}
      {!currentSelectedOption && !isOpen && (
        <div className="flex items-center gap-2">
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">
              {required ? "Selecione uma opção obrigatória..." : "Padrão / Não especificado"}
            </option>
            {resolvedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex-shrink-0 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
          >
            Galeria Visual ➔
          </button>
        </div>
      )}

      {/* Painel Expandido: Busca, Filtros e Grade de Cards Visuais */}
      {isOpen && (
        <div className="rounded-3xl border border-white/15 bg-[#090d16] p-4 sm:p-5 space-y-4 animate-in fade-in duration-200 shadow-2xl">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            {/* Input de Pesquisa */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Buscar por nome, técnica em inglês ou palavra-chave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 py-2 pl-9 pr-8 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Alternância de Visualização */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "GRID" ? "bg-white/15 text-white shadow" : "text-white/50 hover:text-white"
                }`}
              >
                Cards (Visual)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "LIST" ? "bg-white/15 text-white shadow" : "text-white/50 hover:text-white"
                }`}
              >
                Lista Rápida
              </button>
            </div>
          </div>

          {/* Grade de Cards Visuais */}
          {filteredOptions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-white/50">Nenhuma opção visual encontrada para &quot;{search}&quot;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                }}
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                Limpar filtros de busca
              </button>
            </div>
          ) : viewMode === "GRID" ? (
            <div
              role="radiogroup"
              aria-label={label}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[58vh] overflow-y-auto p-1"
            >
              {filteredOptions.map((opt) => (
                <VisualOptionCard
                  key={opt.value}
                  option={opt}
                  isSelected={value === opt.value}
                  onSelect={(v) => {
                    onChange(v);
                    setIsOpen(false);
                  }}
                  onOpenDetails={(o) => setInspectingOption(o)}
                />
              ))}
            </div>
          ) : (
            /* Modo Lista Rápida com Miniatura */
            <div className="space-y-1.5 max-h-[58vh] overflow-y-auto p-1">
              {filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/20"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={opt.imageUrl}
                        alt={opt.label}
                        className="h-9 w-14 rounded-lg object-cover bg-black"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/visual-references/placeholder.svg";
                        }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{opt.label}</span>
                          {opt.originalName && (
                            <span className="text-[10px] text-white/40 font-mono">
                              ({opt.originalName})
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/50 line-clamp-1">{opt.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingOption(opt);
                        }}
                        className="rounded-lg p-1 text-white/40 hover:text-white"
                        title="Ampliar detalhes"
                      >
                        🔍
                      </button>
                      {isSelected ? (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/40 hover:text-emerald-400 font-semibold">
                          Escolher
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé do Painel */}
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/40">
            <span>
              Exibindo <strong>{filteredOptions.length}</strong> de{" "}
              <strong>{resolvedOptions.length}</strong> opções cinematográficas
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-white/70 hover:text-white"
            >
              Fechar Painel ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal Lightbox de Alta Resolução e Didática com Upload para Admin */}
      <VisualLightboxModal
        option={inspectingOption}
        isOpen={Boolean(inspectingOption)}
        onClose={() => setInspectingOption(null)}
        onSelect={(val) => {
          onChange(val);
          setIsOpen(false);
        }}
        isSelected={inspectingOption ? inspectingOption.value === value : false}
        isAdmin={isAdmin}
        paramDefinitionId={paramDefinitionId}
        onImageUpdated={handleImageUpdated}
      />
    </div>
  );
}
