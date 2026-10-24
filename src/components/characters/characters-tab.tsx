"use client";

import { useState, useEffect, useCallback } from "react";
import { EntityParametersSection } from "@/components/parameters/entity-parameters-section";

export interface CharacterItem {
  id: string;
  projectId: string;
  name: string;
  description: string;
  attributes: {
    visualIdentity?: string;
    physicalCharacteristics?: string;
    apparentAge?: string;
    hairAndFace?: string;
    costumeAndAccessories?: string;
    personalityAndBehavior?: string;
    voiceAndLanguage?: string;
    restrictions?: string;
    basePrompt?: string;
  };
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sceneLinks: number;
  };
}

interface CharactersTabProps {
  projectId: string;
  onStatsUpdate?: () => void;
}

export function CharactersTab({ projectId, onStatsUpdate }: CharactersTabProps) {
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    apparentAge: "",
    visualIdentity: "",
    physicalCharacteristics: "",
    hairAndFace: "",
    costumeAndAccessories: "",
    personalityAndBehavior: "",
    voiceAndLanguage: "",
    restrictions: "",
    basePrompt: "",
  });

  // Dynamic Parameters State
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // Modal de Visualização de Prompt JSON
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptData, setPromptData] = useState<any>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Modal de Confirmação de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<CharacterItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Carregar personagens da API
  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/projects/${projectId}/characters?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar a biblioteca de personagens.");
      const json = await res.json();
      setCharacters(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, search]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  // Abertura do Modal de Criação
  const handleOpenCreate = () => {
    setEditingCharacter(null);
    setParamValues({});
    setFormData({
      name: "",
      description: "",
      apparentAge: "",
      visualIdentity: "",
      physicalCharacteristics: "",
      hairAndFace: "",
      costumeAndAccessories: "",
      personalityAndBehavior: "",
      voiceAndLanguage: "",
      restrictions: "",
      basePrompt: "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Abertura do Modal de Edição
  const handleOpenEdit = (char: CharacterItem) => {
    setEditingCharacter(char);
    setParamValues({});
    const attrs = char.attributes || {};
    setFormData({
      name: char.name || "",
      description: char.description || "",
      apparentAge: attrs.apparentAge || "",
      visualIdentity: attrs.visualIdentity || "",
      physicalCharacteristics: attrs.physicalCharacteristics || "",
      hairAndFace: attrs.hairAndFace || "",
      costumeAndAccessories: attrs.costumeAndAccessories || "",
      personalityAndBehavior: attrs.personalityAndBehavior || "",
      voiceAndLanguage: attrs.voiceAndLanguage || "",
      restrictions: attrs.restrictions || "",
      basePrompt: attrs.basePrompt || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Salvar Personagem (Create ou Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("O nome do personagem é obrigatório.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        attributes: {
          apparentAge: formData.apparentAge.trim(),
          visualIdentity: formData.visualIdentity.trim(),
          physicalCharacteristics: formData.physicalCharacteristics.trim(),
          hairAndFace: formData.hairAndFace.trim(),
          costumeAndAccessories: formData.costumeAndAccessories.trim(),
          personalityAndBehavior: formData.personalityAndBehavior.trim(),
          voiceAndLanguage: formData.voiceAndLanguage.trim(),
          restrictions: formData.restrictions.trim(),
          basePrompt: formData.basePrompt.trim(),
        },
      };

      const endpoint = editingCharacter
        ? `/api/projects/${projectId}/characters/${editingCharacter.id}`
        : `/api/projects/${projectId}/characters`;
      const method = editingCharacter ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || "Falha ao salvar dados do personagem.");
      }

      const responseJson = await res.json();
      const savedCharId = editingCharacter?.id || responseJson.data?.id;

      // Salva os valores dos parâmetros dinâmicos se preenchidos
      if (savedCharId && Object.keys(paramValues).length > 0) {
        const paramPayload = {
          values: Object.entries(paramValues)
            .filter(([_, val]) => val !== undefined && val !== null && val !== "")
            .map(([defId, val]) => ({
              parameterDefinitionId: defId,
              targetType: "CHARACTER" as const,
              targetId: savedCharId,
              value: val,
            })),
        };

        if (paramPayload.values.length > 0) {
          await fetch(`/api/projects/${projectId}/parameters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramPayload),
          });
        }
      }

      setModalOpen(false);
      fetchCharacters();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setFormLoading(false);
    }
  };

  // Duplicar Personagem
  const handleDuplicate = async (char: CharacterItem) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/characters/${char.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erro ao duplicar o personagem.");
      fetchCharacters();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao duplicar.");
    }
  };

  // Alternar Arquivar / Restaurar
  const handleToggleArchive = async (char: CharacterItem) => {
    try {
      const action = char.isArchived ? "restore" : "archive";
      const res = await fetch(`/api/projects/${projectId}/characters/${char.id}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Erro ao ${action === "restore" ? "restaurar" : "arquivar"} o personagem.`);
      fetchCharacters();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao alterar estado.");
    }
  };

  // Excluir Personagem
  const handleConfirmDelete = async () => {
    if (!characterToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/projects/${projectId}/characters/${characterToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir o personagem.");
      }
      setDeleteModalOpen(false);
      setCharacterToDelete(null);
      fetchCharacters();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Abrir Visualização de Prompt JSON Estruturado
  const handleViewPrompt = async (char: CharacterItem) => {
    try {
      setPromptLoading(true);
      setPromptModalOpen(true);
      setCopySuccess(false);
      const res = await fetch(`/api/projects/${projectId}/characters/${char.id}/prompt`);
      if (!res.ok) throw new Error("Erro ao compilar prompt do personagem.");
      const json = await res.json();
      setPromptData(json.data);
    } catch (err) {
      setPromptData({ error: err instanceof Error ? err.message : "Falha na compilação." });
    } finally {
      setPromptLoading(false);
    }
  };

  const handleCopyPromptJson = () => {
    if (!promptData) return;
    navigator.clipboard.writeText(JSON.stringify(promptData, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Barra Superior: Busca, Filtros e Botão Novo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/40">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou características..."
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Filtro de Estado */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {(["active", "archived", "all"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === filter
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {filter === "active" && "Ativos"}
                {filter === "archived" && "Arquivados"}
                {filter === "all" && "Todos"}
              </button>
            ))}
          </div>
        </div>

        {/* Botão de Criação */}
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Personagem
        </button>
      </div>

      {/* Conteúdo Principal / Grid de Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">Nenhum personagem encontrado</h3>
          <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
            {search.trim() || statusFilter !== "active"
              ? "Tente ajustar seus filtros de busca para encontrar personagens cadastrados."
              : "Cadastre seus personagens com traços visuais permanentes para manter total consistência facial e estética em todas as tomadas."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
          >
            + Criar Primeiro Personagem
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => {
            const attrs = char.attributes || {};
            const sceneCount = char._count?.sceneLinks || 0;

            return (
              <div
                key={char.id}
                className={`flex flex-col justify-between rounded-2xl border bg-black/40 p-5 transition hover:border-emerald-500/40 ${
                  char.isArchived ? "border-amber-500/20 opacity-70" : "border-white/10"
                }`}
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{char.name}</h4>
                        {char.isArchived && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                            Arquivado
                          </span>
                        )}
                      </div>
                      {attrs.apparentAge && (
                        <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                          Idade: {attrs.apparentAge}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-mono text-white/50 border border-white/10 shrink-0">
                      {sceneCount} {sceneCount === 1 ? "cena" : "cenas"}
                    </span>
                  </div>

                  {/* Descrição Narrativa */}
                  <p className="mt-2.5 text-xs text-white/60 line-clamp-2">
                    {char.description || "Nenhuma descrição narrativa fornecida."}
                  </p>

                  {/* Badges de Atributos Visuais */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {attrs.visualIdentity && (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/20 truncate max-w-[200px]">
                        🎨 {attrs.visualIdentity}
                      </span>
                    )}
                    {attrs.hairAndFace && (
                      <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/20 truncate max-w-[200px]">
                        👤 {attrs.hairAndFace}
                      </span>
                    )}
                    {attrs.costumeAndAccessories && (
                      <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20 truncate max-w-[200px]">
                        👔 {attrs.costumeAndAccessories}
                      </span>
                    )}
                    {attrs.restrictions && (
                      <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300 border border-red-500/20 truncate max-w-[200px]">
                        ⛔ {attrs.restrictions}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Ações Inferior */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-1">
                  {/* Botão Ver Prompt JSON */}
                  <button
                    onClick={() => handleViewPrompt(char)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition"
                    title="Visualizar e exportar prompt base estruturado em JSON"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Prompt JSON
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Botão Editar */}
                    <button
                      onClick={() => handleOpenEdit(char)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Editar características"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Botão Duplicar */}
                    <button
                      onClick={() => handleDuplicate(char)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Duplicar personagem"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {/* Botão Arquivar / Restaurar */}
                    <button
                      onClick={() => handleToggleArchive(char)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-amber-300 hover:bg-amber-500/10 transition"
                      title={char.isArchived ? "Restaurar personagem" : "Arquivar personagem"}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>

                    {/* Botão Excluir */}
                    <button
                      onClick={() => {
                        setCharacterToDelete(char);
                        setDeleteModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Excluir permanentemente"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Criar / Editar Personagem */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingCharacter ? "Editar Personagem" : "Novo Personagem Cinematográfico"}
                </h3>
                <p className="text-xs text-white/50">
                  Defina os elementos visuais permanentes para assegurar consistência em múltiplos takes.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-4">
              {/* Linha 1: Nome e Idade */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Nome do Personagem <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Clara Vance, Sargento Miller..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Idade Aparente</label>
                  <input
                    type="text"
                    value={formData.apparentAge}
                    onChange={(e) => setFormData({ ...formData, apparentAge: e.target.value })}
                    placeholder="Ex: 34 anos"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Descrição Narrativa */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Descrição Narrativa</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contexto dramático, papel na história e tom geral..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Seção Visual 1: Identidade Visual & Traços Físicos */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Consistência Visual & Fisiologia
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Identidade Visual</label>
                    <input
                      type="text"
                      value={formData.visualIdentity}
                      onChange={(e) => setFormData({ ...formData, visualIdentity: e.target.value })}
                      placeholder="Ex: Estilo Neo-noir, traços nórdicos, olhar penetrante"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Cabelo e Rosto</label>
                    <input
                      type="text"
                      value={formData.hairAndFace}
                      onChange={(e) => setFormData({ ...formData, hairAndFace: e.target.value })}
                      placeholder="Ex: Cabelo curto escuro desgrenhado, cicatriz fina na sobrancelha"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Características Físicas e Altura
                  </label>
                  <input
                    type="text"
                    value={formData.physicalCharacteristics}
                    onChange={(e) => setFormData({ ...formData, physicalCharacteristics: e.target.value })}
                    placeholder="Ex: 1.80m, compleição atlética esguia, mãos calejadas"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seção Visual 2: Figurino Permanente e Personalidade */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Figurino Base & Comportamento
                </h4>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Figurino e Acessórios Permanentes
                  </label>
                  <input
                    type="text"
                    value={formData.costumeAndAccessories}
                    onChange={(e) => setFormData({ ...formData, costumeAndAccessories: e.target.value })}
                    placeholder="Ex: Sobretudo de couro escuro envelhecido, relógio de pulso militar clássico"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Personalidade e Expressão</label>
                    <input
                      type="text"
                      value={formData.personalityAndBehavior}
                      onChange={(e) => setFormData({ ...formData, personalityAndBehavior: e.target.value })}
                      placeholder="Ex: Postura calculista, olhar desconfiado, calma estóica"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Voz e Idioma (se aplicável)</label>
                    <input
                      type="text"
                      value={formData.voiceAndLanguage}
                      onChange={(e) => setFormData({ ...formData, voiceAndLanguage: e.target.value })}
                      placeholder="Ex: Tom grave e sussurrado, português com leve sotaque"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Restrições e Prompt Base */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Regras de Representação & Prompt Base
                </h4>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Restrições de Representação (O que NUNCA gerar)
                  </label>
                  <input
                    type="text"
                    value={formData.restrictions}
                    onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                    placeholder="Ex: Sem sorrisos exagerados, sem armas modernas, sem óculos"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Prompt-Base Customizado (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.basePrompt}
                    onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
                    placeholder="Trecho literal de prompt pré-otimizado para ferramentas de imagem/vídeo..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Seção Dinâmica: Parâmetros Cinematográficos */}
              <EntityParametersSection
                projectId={projectId}
                targetType="CHARACTER"
                targetId={editingCharacter?.id}
                values={paramValues}
                onChange={(defId, val) =>
                  setParamValues((prev) => ({ ...prev, [defId]: val }))
                }
              />

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50 transition"
                >
                  {formLoading && (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {editingCharacter ? "Salvar Alterações" : "Criar Personagem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Prompt JSON Estruturado */}
      {promptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/20">
                  JSON v1.0
                </span>
                <h3 className="text-base font-bold text-white">Prompt-Base Estruturado do Personagem</h3>
              </div>
              <button
                onClick={() => setPromptModalOpen(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              {promptLoading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-emerald-300 max-h-96 overflow-y-auto">
                    <pre>{JSON.stringify(promptData, null, 2)}</pre>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-white/50">
                      Compatível com Google Flow, Nano Banana e geradores cinematográficos.
                    </span>
                    <button
                      onClick={handleCopyPromptJson}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
                    >
                      {copySuccess ? (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copiado com Sucesso!
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copiar JSON (1-Clique)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Exclusão com Confirmação */}
      {deleteModalOpen && characterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0f1218] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-red-300">Excluir Personagem?</h3>
            <p className="mt-2 text-xs text-white/70">
              Tem certeza que deseja excluir permanentemente o personagem{" "}
              <strong className="text-white">&quot;{characterToDelete.name}&quot;</strong>?

            </p>
            {(characterToDelete._count?.sceneLinks || 0) > 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs text-amber-300">
                Atenção: Este personagem está associado a {characterToDelete._count?.sceneLinks} cena(s). A exclusão removerá esses vínculos.
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                {deleteLoading ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
