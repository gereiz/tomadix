"use client";

import { useState, useEffect } from "react";

interface VideoModelOption {
  id: string;
  name: string;
  publisher?: string;
  description?: string;
  creditCost: number;
  isDefault: boolean;
  supportedDurations: number[];
  supportedAspectRatios: string[];
}

interface DirectVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  projectId?: string;
  sceneId?: string;
  initialPrompt?: string;
  startFrameUrl?: string;
  onVideoGenerated: (result: { videoUrl: string; videoId: string; prompt: string; duration: number }) => void;
}

export function DirectVideoModal({
  isOpen,
  onClose,
  title = "Gerar Vídeo com IA no Space Board",
  subtitle = "O vídeo gerado será inserido como um nó interativo com player no board",
  projectId,
  sceneId,
  initialPrompt = "",
  startFrameUrl,
  onVideoGenerated,
}: DirectVideoModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [models, setModels] = useState<VideoModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("bytedance/seedance-2.0-fast");
  const [duration, setDuration] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [audio, setAudio] = useState<boolean>(true);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [loadingModels, setLoadingModels] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadModels() {
      try {
        setLoadingModels(true);
        setError(null);
        const res = await fetch("/api/videos/available-models");
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
        console.warn("Erro ao buscar modelos de vídeo:", err);
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentModel = models.find((m) => m.id === selectedModel);
  const cost = currentModel?.creditCost ?? 25;
  const hasEnoughCredits = creditsBalance >= cost;

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;

    try {
      setGenerating(true);
      setError(null);

      const payload = {
        prompt: prompt.trim(),
        model: selectedModel,
        durationSeconds: duration,
        aspectRatio,
        audio,
        startFrameUrl: startFrameUrl || undefined,
        projectId: projectId || undefined,
        sceneId: sceneId || undefined,
      };

      const res = await fetch("/api/videos/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.credits && typeof data.credits.newBalance === "number") {
          setCreditsBalance(data.credits.newBalance);
          window.dispatchEvent(
            new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.credits.newBalance } })
          );
        }

        onVideoGenerated({
          videoUrl: data.video.videoUrl,
          videoId: data.video.id,
          prompt: data.video.prompt,
          duration: data.video.durationSeconds,
        });
        onClose();
      } else {
        setError(data.error || "Falha na geração do vídeo. Tente novamente.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao gerar vídeo.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-lg">
              🎥
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

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
            <span>Prompt de Movimento Cinematográfico</span>
            <span className="text-[11px] text-white/40">{prompt.length}/3000</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Ex: Drone shot over misty pine forest at sunrise, camera flies forward smoothly, volumetric sun rays, hyper-realistic, 4k..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-white placeholder-white/30 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50"
          />
        </div>

        {/* Start Frame Preview if present */}
        {startFrameUrl && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
            <img src={startFrameUrl} alt="Frame inicial" className="h-12 w-16 object-cover rounded-lg border border-white/10" />
            <div className="text-xs">
              <span className="font-semibold text-white">Frame de Referência Inicial</span>
              <p className="text-[10px] text-white/50">O movimento do vídeo partirá desta imagem de referência.</p>
            </div>
          </div>
        )}

        {/* Model, Duration, Aspect Ratio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Modelo */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-white/80">Modelo de Vídeo</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#161b26] px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.publisher}) — {m.creditCost} cr
                </option>
              ))}
            </select>
          </div>

          {/* Duração */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80">Duração</label>
            <div className="grid grid-cols-3 gap-1">
              {[4, 5, 8].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                    duration === sec
                      ? "bg-purple-500 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Aspect Ratio & Audio */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Proporção:</span>
            {["16:9", "9:16", "1:1"].map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  aspectRatio === ratio
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-white/5 text-white/50 border border-white/10 hover:text-white"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
            <input
              type="checkbox"
              checked={audio}
              onChange={(e) => setAudio(e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-0"
            />
            <span>Áudio / Efeitos Sonoros</span>
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Footer & Generate Button */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-400 font-bold">🪙 {cost} créditos</span>
            <span className="text-white/40">|</span>
            <span className="text-white/60">Saldo: {creditsBalance} cr</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={generating}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              Cancelar
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || !hasEnoughCredits}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/25 hover:from-purple-400 hover:to-indigo-500 transition disabled:opacity-50"
            >
              {generating ? "Renderizando Vídeo com IA..." : `🚀 Gerar Vídeo (${cost} cr)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

