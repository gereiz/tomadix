"use client";

import { CaptureStyleSelect } from "@/components/ui/capture-style-select";
import { Spinner } from "@/components/ui/spinner";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ImageAspectRatio } from "@/modules/image-generation/image-generation.types";
import { downloadImage } from "@/lib/utils/download-image";
import { ImageReferencePicker } from "./image-reference-picker";

interface ImageModelOption {
  id: string;
  name: string;
  publisher?: string;
  description?: string;
  capabilities: string[];
  supportedSizes: string[];
  supportsReferenceImage: boolean;
  supportsImageEditing?: boolean;
  pricingInfo?: any;
  isDefault: boolean;
  creditCost: number;
  quality?: {
    score: number;
    tier: string;
    tierLabel: string;
    badgeColor: string;
    stars: string;
    rationale: string;
  };
}

interface DirectImageGeneratorProps {
  projectId?: string;
  sceneId?: string;
  characterId?: string;
  environmentId?: string;
  promptVersionId?: string;
  initialPrompt?: string;
  onImageGenerated?: (image: any) => void;
  onSwitchToPromptMode?: () => void;
}

export function DirectImageGenerator({
  projectId,
  sceneId,
  characterId,
  environmentId,
  promptVersionId,
  initialPrompt = "",
  onImageGenerated,
  onSwitchToPromptMode,
}: DirectImageGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Informações do Plano e Modelos
  const [enabled, setEnabled] = useState(false);
  const [planName, setPlanName] = useState("");
  const [models, setModels] = useState<ImageModelOption[]>([]);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [limits, setLimits] = useState<{ dailyLimit: number | null; monthlyLimit: number | null }>({
    dailyLimit: null,
    monthlyLimit: null,
  });

  // Campos do formulário
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModel, setSelectedModel] = useState<string>("flux");
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("16:9");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [captureStyle, setCaptureStyle] = useState<string>("cinematic");
  const [degradeImage, setDegradeImage] = useState<boolean>(true);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Resultado da geração atual
  const [generatedImage, setGeneratedImage] = useState<any | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Atualizar prompt se prop inicial mudar (ex: ao clicar em "Gerar imagem com este prompt")
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      setPrompt(initialPrompt.trim());
    }
  }, [initialPrompt]);

  const fetchAvailableModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/images/available-models");
      const data = await res.json();

      if (res.ok && data.success) {
        setEnabled(data.enabled);
        setPlanName(data.planName || "Plano Atual");
        setModels(data.models || []);
        setCreditsBalance(data.creditsBalance ?? 0);
        setLimits({
          dailyLimit: data.imageDailyLimit,
          monthlyLimit: data.imageMonthlyLimit,
        });

        // Selecionar modelo padrão se existir
        if (data.models && data.models.length > 0) {
          const defaultMod = data.models.find((m: ImageModelOption) => m.isDefault);
          setSelectedModel(defaultMod ? defaultMod.id : data.models[0].id);
        }
      } else {
        setError(data.error || "Não foi possível consultar os modelos disponíveis.");
      }
    } catch (err: any) {
      setError("Erro de conexão ao carregar configurações de imagem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  // Calcular custo do modelo selecionado
  const currentModelObj = models.find((m) => m.id === selectedModel);
  const currentCost = currentModelObj?.creditCost ?? 10;
  const hasEnoughCredits = creditsBalance >= currentCost;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Por favor, informe uma descrição detalhada para a imagem.");
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const payload = {
        prompt: prompt.trim(),
        model: selectedModel,
        aspectRatio,
        captureStyle,
        degradeImage,
        negativePrompt: negativePrompt.trim() || undefined,
        referenceImageUrl: referenceImageUrl.trim() || undefined,
        projectId: projectId || undefined,
        characterId: characterId || undefined,
        environmentId: environmentId || undefined,
        sceneId: sceneId || undefined,
        promptVersionId: promptVersionId || undefined,
      };

      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedImage(data.image);

        // Atualizar saldo local e disparar sincronização global
        if (data.credits && typeof data.credits.newBalance === "number") {
          setCreditsBalance(data.credits.newBalance);
          window.dispatchEvent(
            new CustomEvent("credits-updated", { detail: { newBalance: data.credits.newBalance } })
          );
        }

        // Notificar galeria de imagens para recarregamento instantâneo
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("tomadix:images-updated", { detail: { projectId, imageId: data.image.id } })
          );
        }

        if (onImageGenerated) {
          onImageGenerated(data.image);
        }
      } else {
        setError(data.error || "Falha ao gerar a imagem. Tente novamente.");
      }
    } catch (err: any) {
      setError("Erro de rede ao comunicar com o servidor de geração de imagens.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (url: string, filename = "tomadix-imagem.jpg") => {
    await downloadImage(url, filename);
  };

  if (loading) {
    return (
      <div className="p-5 sm:p-8 text-center text-white/50 font-mono text-xs">
        <Spinner className="h-5 w-5 border-2 border-amber-400 mb-2" />
        <p>Verificando permissões e modelos de IA...</p>
      </div>
    );
  }

  // Se a funcionalidade não estiver habilitada para o plano do usuário
  if (!enabled) {
    return (
      <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
          🔒
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">Geração Direta de Imagens com IA</h3>
          <p className="text-xs text-white/60 max-w-md mx-auto">
            A geração direta de imagens (Pollinations / Flux) não está disponível no plano <strong>{planName}</strong>.
            Você ainda pode gerar prompts estruturados normalmente.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onSwitchToPromptMode && (
            <button
              type="button"
              onClick={onSwitchToPromptMode}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/15 transition"
            >
              Voltar para Gerar Prompt
            </button>
          )}
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition shadow-md shadow-amber-500/10"
          >
            Fazer Upgrade para Pro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulário de Geração */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h3 className="text-sm font-bold text-white">Configuração da Geração de Imagem</h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-white/40">Saldo:</span>
            <span className="text-amber-300 font-bold">{creditsBalance} créditos</span>
          </div>
        </div>

        {/* Campo do Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white/80">Descrição Cinematográfica (Prompt)</label>
            <span className="text-[10px] text-white/40 font-mono">{prompt.length} / 4000</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a cena, iluminação, enquadramento, textura e atmosfera com riqueza de detalhes..."
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none resize-none"
          />
        </div>

        {/* Seleção de Modelo & Proporção */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/80">Modelo de Imagem</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-amber-400 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-neutral-900 text-white font-mono">
                  {m.quality?.stars || "★★★★★"} {m.name} {m.supportsReferenceImage ? "• [🖼️ Ref]" : ""} — ({m.creditCost} cr)
                </option>
              ))}
            </select>

            {/* Informações de Qualidade e Capacidades do Modelo */}
            {currentModelObj?.quality && (
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${currentModelObj.quality.badgeColor}`}>
                    <span>{currentModelObj.quality.stars}</span>
                    <span>{currentModelObj.quality.tierLabel}</span>
                    <span className="opacity-75 font-mono">({currentModelObj.quality.score} pts)</span>
                  </span>

                  {/* Badges de Imagem de Referência e Tipo de Custo Pollen */}
                  {currentModelObj.supportsReferenceImage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                      <span>🖼️</span>
                      <span>Suporta Referência</span>
                    </span>
                  )}

                  {(currentModelObj.pricingInfo as any)?.requiresReferenceImage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      <span>📸</span>
                      <span>Requer Imagem Inicial</span>
                    </span>
                  )}

                  {currentModelObj.publisher && (
                    <span className="text-[10px] font-mono text-white/40">
                      Publisher: {currentModelObj.publisher}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  {currentModelObj.quality.rationale || currentModelObj.description}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/80">Proporção (Aspect Ratio)</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(["16:9", "1:1", "9:16", "4:3", "21:9"] as ImageAspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                    aspectRatio === ratio
                      ? "bg-amber-400 text-black font-bold shadow-sm shadow-amber-500/20"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/40 font-mono">
              {aspectRatio === "16:9" && "1344x768 — Cinema Widescreen / Vídeo"}
              {aspectRatio === "1:1" && "1024x1024 — Quadrado / Personagem"}
              {aspectRatio === "9:16" && "768x1344 — Vertical / Stories"}
              {aspectRatio === "4:3" && "1024x768 — Formato Clássico"}
              {aspectRatio === "21:9" && "1344x576 — Cinemascope Ultra-wide"}
            </p>
          </div>
        </div>

        <CaptureStyleSelect value={captureStyle} onChange={setCaptureStyle} />
        {captureStyle !== "cinematic" && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={degradeImage}
              onChange={(e) => setDegradeImage(e.target.checked)}
              className="rounded border-white/20 bg-white/10"
            />
            <span>Aplicar granulado e baixa resolução reais na imagem final</span>
          </label>
        )}

        {/* Componente de Imagem de Referência / Entrada */}
        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10">
          <ImageReferencePicker
            value={referenceImageUrl}
            onChange={setReferenceImageUrl}
            projectId={projectId}
            supportsReference={Boolean(currentModelObj?.supportsReferenceImage)}
            requiresReference={Boolean((currentModelObj?.pricingInfo as any)?.requiresReferenceImage)}
          />
        </div>

        {/* Opções Avançadas */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-white/50 hover:text-amber-300 font-mono flex items-center gap-1 transition"
          >
            <span>{showAdvanced ? "▼" : "▶"}</span>
            <span>Opções avançadas (Prompt Negativo)</span>
          </button>

          {showAdvanced && (
            <div className="pt-2">
              <label className="text-[11px] font-medium text-white/60 block mb-1">
                Prompt Negativo (elementos a evitar)
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Ex: blur, deformidades, baixa resolução, marcas d'água..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-xs opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Resumo de Custos e Botão de Ação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/50">Custo da operação:</span>
            <span className="font-bold text-amber-300 font-mono text-sm">{currentCost} créditos</span>
            {!hasEnoughCredits && (
              <span className="text-[10px] text-red-400 font-mono">(Saldo insuficiente)</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {onSwitchToPromptMode && (
              <button
                type="button"
                onClick={onSwitchToPromptMode}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 bg-white/5 hover:bg-white/10 transition"
              >
                Voltar
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !hasEnoughCredits || !prompt.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition shadow-md shadow-amber-500/15 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Spinner className="h-3.5 w-3.5 border-2 border-black" />
                  <span>Gerando Imagem com IA...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Gerar Imagem ({currentCost} cr)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Painel de Exibição do Resultado Gerado */}
      {generatedImage && (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                GERAÇÃO CONCLUÍDA
              </span>
              <h4 className="text-sm font-bold text-white mt-1">Resultado Visual</h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/15 transition flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span>Zoom</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownload(generatedImage.imageUrl, `tomadix-${generatedImage.id}.jpg`)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition flex items-center gap-1.5 shadow-sm shadow-amber-500/10"
              >
                <span>⬇️</span>
                <span>Baixar</span>
              </button>
            </div>
          </div>

          {/* Imagem em destaque */}
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/80 flex items-center justify-center max-h-[600px] group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async"
              src={generatedImage.imageUrl}
              alt={generatedImage.prompt}
              className="max-h-[580px] w-auto object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.01]"
              onClick={() => setLightboxOpen(true)}
            />
          </div>

          {/* Metadados Técnicos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-white/60 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Modelo</span>
              <span className="text-white font-semibold">{generatedImage.model}</span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Provedor</span>
              <span className="text-white font-semibold">{generatedImage.provider}</span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Proporção</span>
              <span className="text-white font-semibold">{generatedImage.aspectRatio || "1:1"}</span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Custo</span>
              <span className="text-amber-300 font-bold">{generatedImage.creditCost} créditos</span>
            </div>
          </div>

          {/* Prompt Utilizado */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/80 space-y-1">
            <span className="text-[10px] font-mono text-white/40 uppercase block">Prompt Utilizado:</span>
            <p className="italic text-white/90">{generatedImage.prompt}</p>
          </div>
        </div>
      )}

      {/* Modal Lightbox (Zoom em Tela Cheia) */}
      {lightboxOpen && generatedImage && (
        <div
          className="fixed inset-0 overflow-y-auto z-50 bg-black/90 flex items-center-safe justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-7xl max-h-[92dvh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async"
              src={generatedImage.imageUrl}
              alt={generatedImage.prompt}
              className="max-h-[85dvh] max-w-full object-contain rounded-xl shadow-2xl border border-white/15"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleDownload(generatedImage.imageUrl, `tomadix-${generatedImage.id}.jpg`)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition flex items-center gap-1.5"
              >
                <span>⬇️</span> Baixar Imagem Original
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

