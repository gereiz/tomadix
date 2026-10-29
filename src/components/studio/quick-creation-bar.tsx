"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectOption {
  id: string;
  title: string;
}

interface QuickCreationBarProps {
  availableProjects?: ProjectOption[];
  currentProjectId?: string;
  currentProjectTitle?: string;
  onItemCreated?: (item: any) => void;
  onOpenFullForm?: (type: string) => void;
}

export function QuickCreationBar({
  availableProjects = [],
  currentProjectId,
  currentProjectTitle,
  onItemCreated,
  onOpenFullForm,
}: QuickCreationBarProps) {
  const router = useRouter();
  const [contentType, setContentType] = useState<"PROJECT" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "PROMPT">(
    currentProjectId ? "CHARACTER" : "PROJECT"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || "");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const ALL_TYPE_OPTIONS = [
    { id: "PROJECT", label: "Projeto", icon: "🎬", placeholder: "Descreva a premissa, gênero e estilo do novo filme..." },
    { id: "CHARACTER", label: "Personagem", icon: "👤", placeholder: "Descreva o personagem (idade, traços, roupas e personalidade) para este projeto..." },
    { id: "ENVIRONMENT", label: "Ambiente", icon: "🏙️", placeholder: "Descreva o cenário, iluminação, arquitetura e atmosfera para este projeto..." },
    { id: "SCENE", label: "Cena", icon: "🎥", placeholder: "Descreva a ação dramática, enquadramento e movimentação da cena para este projeto..." },
    { id: "PROMPT", label: "Prompt IA", icon: "✨", placeholder: "Instruções adicionais para a IA compor o prompt cinematográfico neste projeto..." },
  ];

  // Quando dentro de um projeto (/projects/[id]), não exibe a opção de criar projetos
  const TYPE_OPTIONS = currentProjectId
    ? ALL_TYPE_OPTIONS.filter((opt) => opt.id !== "PROJECT")
    : ALL_TYPE_OPTIONS;

  const currentOption = TYPE_OPTIONS.find((t) => t.id === contentType) || TYPE_OPTIONS[0];

  const handleQuickCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    try {
      setLoading(true);
      setFeedback(null);

      const effectiveType = currentProjectId && contentType === "PROJECT" ? "CHARACTER" : contentType;
      const effectiveProjectId = currentProjectId || selectedProjectId || undefined;

      const res = await fetch("/api/studio/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: effectiveType,
          prompt: prompt.trim(),
          projectId: effectiveProjectId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Não foi possível criar o conteúdo.");
      }

      setFeedback({ text: json.message || "Conteúdo criado com sucesso!", type: "success" });
      setPrompt("");

      if (onItemCreated) {
        onItemCreated(json.data);
      }

      // Se for criação de projeto direto e não estamos na galeria com callback, redireciona
      if (contentType === "PROJECT" && json.data?.href && !onItemCreated) {
        router.push(json.data.href);
      }

      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err: any) {
      setFeedback({ text: err.message || "Erro ao processar criação.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-5 pointer-events-none">
      <div className="w-full px-1 sm:px-3 pointer-events-auto">
        {/* Feedback flutuante */}
        {feedback && (
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
              feedback.type === "success"
                ? "bg-lime-950/90 text-lime-300 border border-lime-500/30"
                : "bg-red-950/90 text-red-300 border border-red-500/30"
            }`}
          >
            <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Container Principal da Barra Rápida */}
        <div className="rounded-2xl border border-white/10 bg-[#12151E]/95 p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* Linha 1: Seletores de Tipo e Projeto */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
            {/* Abas de Tipos de Conteúdo */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {TYPE_OPTIONS.map((opt) => {
                const isActive = contentType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setContentType(opt.id as any)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Contexto do Projeto Atual ou Seletor de Projeto */}
            {currentProjectId && currentProjectTitle ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white/60">
                <span>🎬</span>
                <span className="hidden sm:inline text-white/40">Contexto:</span>
                <span className="font-semibold text-lime-300 truncate max-w-[180px]">
                  {currentProjectTitle}
                </span>
              </div>
            ) : (
              contentType !== "PROJECT" &&
              !currentProjectId &&
              availableProjects.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40 hidden sm:inline">Projeto:</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#181C28] px-2 py-1 text-xs font-medium text-white/80 focus:border-lime-400 focus:outline-none"
                  >
                    <option value="">(Projeto Mais Recente)</option>
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}
          </div>

          {/* Linha 2: Input de Linguagem Natural + Botão de Disparo */}
          <form onSubmit={handleQuickCreate} className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={currentOption.placeholder}
              className="flex-1 rounded-xl border border-white/5 bg-[#181C28]/90 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 focus:border-lime-400/50 focus:bg-[#181C28] focus:outline-none transition"
              disabled={loading}
            />

            {/* Botão de Envio / Criação */}
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-black transition hover:bg-lime-300 disabled:opacity-40 disabled:hover:bg-lime-400 flex-shrink-0 shadow-[0_0_20px_rgba(163,230,53,0.2)]"
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span className="hidden sm:inline">Processando...</span>
                </>
              ) : (
                <>
                  <span>Criar</span>
                  <span className="text-xs">⚡</span>
                </>
              )}
            </button>

            {/* Acesso ao Formulário Completo Estruturado */}
            {onOpenFullForm && (
              <button
                type="button"
                onClick={() => onOpenFullForm(contentType)}
                title="Configuração detalhada estruturada"
                className="hidden sm:flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/60 hover:border-white/20 hover:text-white transition"
              >
                <span className="text-sm">⚙️</span>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
