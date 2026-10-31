"use client";

import { useState, useEffect } from "react";
import { ImageAspectRatio } from "@/modules/image-generation/image-generation.types";

interface ImageModelOption {
  id: string;
  name: string;
  publisher?: string;
  creditCost: number;
  isDefault: boolean;
}

interface DirectEntityImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  entityType: "CHARACTER" | "ENVIRONMENT" | "SCENE_START" | "SCENE_END";
  projectId?: string;
  characterId?: string;
  environmentId?: string;
  sceneId?: string;
  initialPrompt: string;
  currentImageUrl?: string | null;
  defaultAspectRatio?: ImageAspectRatio;
  onImageGenerated: (result: { imageUrl: string; imageId: string }) => void;
}

export function DirectEntityImageModal({
  isOpen,
  onClose,
  title,
  subtitle,
  entityType,
  projectId,
  characterId,
  environmentId,
  sceneId,
  initialPrompt,
  currentImageUrl,
  defaultAspectRatio = "16:9",
  onImageGenerated,
}: DirectEntityImageModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModel, setSelectedModel] = useState<string>("flux");
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>(defaultAspectRatio);
  const [models, setModels] = useState<ImageModelOption[]>([]);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [loadingModels, setLoadingModels] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(currentImageUrl || null);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (currentImageUrl) {
      setGeneratedUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadModels() {
      try {
        setLoadingModels(true);
        setError(null);
        const res = await fetch("/api/images/available-models");
        const data = await res.json();
        if (res.ok && data.success) {
          setModels(data.models || []);
          setCreditsBalance(data.creditsBalance ?? 0);
          if (data.models && data.models.length > 0) {
            const def = data.models.find((m: any) => m.isDefault);
            setSelectedModel(def ? def.id : data.models[0].id);
          }
        }
      } catch (err: any) {
        console.warn("Erro ao buscar modelos:", err);
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentModelObj = models.find((m) => m.id === selectedModel);
  const cost = currentModelObj?.creditCost ?? 10;
  const hasEnoughCredits = creditsBalance >= cost;

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;

    try {
      setGenerating(true);
      setError(null);

      const frameType = entityType === "SCENE_END" ? "END_FRAME" : "START_FRAME";

      const payload = {
        prompt: prompt.trim(),
        model: selectedModel,
        aspectRatio,
        projectId: projectId || undefined,
        characterId: characterId || undefined,
        environmentId: environmentId || undefined,
        sceneId: sceneId || undefined,
        metadata: {
          frameType,
          entityType,
        },
      };

      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedUrl(data.image.imageUrl);

        if (data.credits && typeof data.credits.newBalance === "number") {
          setCreditsBalance(data.credits.newBalance);
          window.dispatchEvent(
            new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.credits.newBalance } })
          );
        }

        onImageGenerated({
          imageUrl: data.image.imageUrl,
          imageId: data.image.id,
        });
      } else {
        setError(data.error || "Falha na geração da imagem. Tente novamente.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao gerar imagem.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl space-y-5 my-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 text-lg">
              🎨
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-white/50">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Preview da Imagem (se já houver) */}
        {generatedUrl && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 group">
            <img
              src={generatedUrl}
              alt="Imagem Gerada"
              className="w-full max-h-72 object-contain mx-auto"
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <a
                href={generatedUrl}
                download="tomadix-frame.jpg"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-semibold text-white border border-white/20 hover:bg-black transition flex items-center gap-1.5"
              >
                <span>⬇️</span> Baixar
              </a>
            </div>
            <div className="absolute bottom-2 left-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                ✓ Imagem vinculada com sucesso
              </span>
            </div>
          </div>
        )}

        {/* Prompt Textual */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/80">
            Prompt Cinematográfico da Imagem
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={generating}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
            placeholder="Descreva a composição visual, iluminação, lente, cores e detalhes..."
          />
        </div>

        {/* Controles de Proporção e Modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white/80">
              Proporção (Aspect Ratio)
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(["16:9", "1:1", "9:16", "4:3", "21:9"] as ImageAspectRatio[]).map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setAspectRatio(ar)}
                  className={`py-1.5 rounded-lg text-xs font-mono transition border ${
                    aspectRatio === ar
                      ? "bg-amber-400 text-black border-amber-300 font-bold"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white/80">
              Modelo de Geração
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={generating || loadingModels}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0f1218]">
                  {m.name} ({m.creditCost} cr)
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Rodapé com Créditos e Botão de Ação */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-amber-400 font-bold flex items-center gap-1 font-mono">
              <span>🪙</span> {cost} créditos
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/50 text-[11px]">
              Saldo atual: <strong className="text-white">{creditsBalance} cr</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || !hasEnoughCredits}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 disabled:opacity-40"
            >
              {generating ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Gerando Imagem com IA...</span>
                </>
              ) : (
                <>
                  <span>🎨</span>
                  <span>{generatedUrl ? "Regenerar Imagem" : "Gerar Imagem com IA"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

