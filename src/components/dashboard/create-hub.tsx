"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

// Modal pesado: só entra no bundle quando o usuário pede um vídeo
const DirectVideoModal = dynamic(
  () => import("@/components/video-generation/direct-video-modal").then((m) => m.DirectVideoModal),
  { ssr: false }
);

type ToolId = "image" | "video" | "video_prompt" | "image_prompt" | "character" | "scene";

interface ToolCard {
  id: ToolId;
  icon: string;
  title: string;
  hint: string;
  placeholder: string;
}

const TOOL_CARDS: ToolCard[] = [
  { id: "image", icon: "🎨", title: "Gerar imagem", hint: "Do texto direto para a imagem", placeholder: "Descreva a imagem. Ex: carro futurista voando numa rua de ladeira, luz de fim de tarde..." },
  { id: "video", icon: "🎥", title: "Gerar vídeo", hint: "Do texto direto para o vídeo", placeholder: "" },
  { id: "video_prompt", icon: "🎬", title: "Prompt de vídeo", hint: "Para Seedance, Kling, Flow...", placeholder: "Descreva o vídeo que você quer. Ex: drone sobrevoando uma favela ao amanhecer..." },
  { id: "image_prompt", icon: "🖼️", title: "Prompt de imagem", hint: "Para Nano Banana, Midjourney...", placeholder: "Descreva a imagem que você quer. Ex: selfie com flash numa pizzaria cheia..." },
  { id: "character", icon: "👤", title: "Criar personagem", hint: "Salvo no projeto automático", placeholder: "Descreva o personagem: idade, traços, roupas e personalidade..." },
  { id: "scene", icon: "🎞️", title: "Criar cena", hint: "Salva no projeto automático", placeholder: "Descreva a ação da cena..." },
];

const TOOL_OPTIONS = [
  { value: "google_flow", label: "Google Flow" },
  { value: "nano_banana", label: "Nano Banana" },
  { value: "seedance", label: "Seedance" },
  { value: "kling", label: "Kling" },
  { value: "generic", label: "Genérico" },
];

const RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];

interface HubResult {
  kind: "prompt" | "image" | "video" | "entity";
  message: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  href?: string;
}

interface QuickCreateResponse {
  message?: string;
  error?: string;
  newBalance?: number;
  data?: {
    href?: string;
    imageUrl?: string;
    text?: string | null;
    preview?: unknown;
  };
}

function notifyCredits(newBalance: unknown) {
  if (typeof newBalance === "number") {
    window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { creditsBalance: newBalance } }));
  }
}

/**
 * Tela "Criar": um cartão por ação. Não exige projeto prévio — o quick-create
 * usa o projeto mais recente ou cria "Estúdio Principal" automaticamente.
 */
export function CreateHub({ onCreated }: { onCreated?: () => void }) {
  const [active, setActive] = useState<ToolId | null>(null);
  const [idea, setIdea] = useState("");
  const [targetTool, setTargetTool] = useState("google_flow");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HubResult | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const card = TOOL_CARDS.find((c) => c.id === active) ?? null;
  const isPrompt = active === "video_prompt" || active === "image_prompt";
  const showRatio = active === "image" || isPrompt;

  const selectTool = (id: ToolId) => {
    setError(null);
    setResult(null);
    if (id === "video") {
      setActive("video");
      setVideoOpen(true);
      return;
    }
    setActive(id);
  };

  const post = async (body: Record<string, unknown>): Promise<QuickCreateResponse> => {
    const res = await fetch("/api/studio/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as QuickCreateResponse;
    if (!res.ok) throw new Error(json.error || "Não foi possível criar o conteúdo.");
    notifyCredits(json.newBalance);
    return json;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || active === "video" || !idea.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (active === "image") {
        const json = await post({ type: "IMAGE", prompt: idea.trim(), aspectRatio });
        setResult({ kind: "image", message: json.message ?? "Imagem gerada.", imageUrl: json.data?.imageUrl, href: json.data?.href });
      } else if (active === "video_prompt" || active === "image_prompt") {
        const json = await post({
          type: "PROMPT",
          templateKey: active,
          prompt: idea.trim(),
          targetTool,
          aspectRatio,
          outputFormat: "text",
        });
        const text = json.data?.text ?? JSON.stringify(json.data?.preview ?? {}, null, 2);
        setResult({ kind: "prompt", message: json.message ?? "Prompt gerado.", text, href: json.data?.href });
      } else {
        const json = await post({ type: active === "character" ? "CHARACTER" : "SCENE", prompt: idea.trim() });
        setResult({ kind: "entity", message: json.message ?? "Criado com sucesso.", href: json.data?.href });
      }
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar a criação.");
    } finally {
      setLoading(false);
    }
  };

  // Etapa 2 do fluxo: usa o prompt gerado para criar a imagem
  const handleImageFromPrompt = async () => {
    if (!result?.text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const json = await post({ type: "IMAGE", prompt: result.text.slice(0, 3000), aspectRatio });
      setResult({ kind: "image", message: json.message ?? "Imagem gerada.", imageUrl: json.data?.imageUrl, href: json.data?.href });
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar a imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  };

  return (
    <section aria-labelledby="create-hub-title" className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="create-hub-title" className="text-lg font-bold text-white">O que você quer criar?</h2>
          <p className="text-xs text-white/50">Escolha uma ação. Não precisa criar projeto antes: o Tomadix organiza para você.</p>
        </div>
        <Link href="/studio" className="text-xs font-semibold text-primary hover:text-primary/80 transition">
          🔍 Analisar uma foto →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {TOOL_CARDS.map((c) => {
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => selectTool(c.id)}
              aria-pressed={isActive}
              className={`flex min-h-24 flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${
                isActive
                  ? "border-primary/60 bg-primary/10"
                  : "border-white/10 bg-black/30 hover:border-primary/40 hover:bg-white/5"
              }`}
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-xs font-bold text-white">{c.title}</span>
              <span className="text-[10px] leading-tight text-white/50">{c.hint}</span>
            </button>
          );
        })}
      </div>

      {card && card.id !== "video" && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={card.placeholder}
            rows={3}
            maxLength={3000}
            disabled={loading}
            className="w-full resize-none rounded-xl border border-white/10 bg-[#0f1218] p-3 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            {isPrompt && (
              <select
                value={targetTool}
                onChange={(e) => setTargetTool(e.target.value)}
                aria-label="Gerar para (ferramenta)"
                className="min-h-10 rounded-xl border border-white/10 bg-[#0f1218] px-3 text-xs text-white focus:border-primary focus:outline-none"
              >
                {TOOL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
            {showRatio && (
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                aria-label="Proporção"
                className="min-h-10 rounded-xl border border-white/10 bg-[#0f1218] px-3 text-xs text-white focus:border-primary focus:outline-none"
              >
                {RATIOS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className="ml-auto flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-on-primary transition hover:opacity-90 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Spinner className="h-3.5 w-3.5 border-2 border-current" />
                  <span>Criando...</span>
                </>
              ) : (
                <span>Criar ⚡</span>
              )}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-200">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <p className="text-xs font-semibold text-emerald-300">✓ {result.message}</p>

          {result.kind === "prompt" && result.text && (
            <>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/50 p-3 text-xs text-white/80">{result.text}</pre>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleCopy} className="min-h-10 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10">
                  {copied ? "Copiado ✓" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={handleImageFromPrompt}
                  disabled={loading}
                  className="min-h-10 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 text-xs font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-40"
                >
                  🎨 Gerar imagem com este prompt
                </button>
                <button
                  type="button"
                  onClick={() => setVideoOpen(true)}
                  className="min-h-10 rounded-xl border border-purple-400/40 bg-purple-400/10 px-3 text-xs font-bold text-purple-300 hover:bg-purple-400/20"
                >
                  🎥 Gerar vídeo com este prompt
                </button>
              </div>
            </>
          )}

          {result.kind === "image" && result.imageUrl && (
            <img loading="lazy" decoding="async" src={result.imageUrl} alt="Imagem gerada" className="max-h-96 w-auto max-w-full rounded-xl border border-white/10" />
          )}

          {result.kind === "video" && result.videoUrl && (
            <video src={result.videoUrl} controls className="max-h-96 w-auto max-w-full rounded-xl border border-white/10" />
          )}

          {result.href && (
            <Link href={result.href} className="inline-block text-xs font-semibold text-primary hover:text-primary/80">
              Abrir no projeto →
            </Link>
          )}
        </div>
      )}

      {videoOpen && (
        <DirectVideoModal
          isOpen={videoOpen}
          onClose={() => setVideoOpen(false)}
          title="Gerar vídeo com IA"
          subtitle="O vídeo fica salvo na sua conta e aparece aqui quando terminar."
          initialPrompt={result?.kind === "prompt" ? (result.text ?? "").slice(0, 3000) : idea}
          onVideoGenerated={(v) => {
            setError(null);
            setResult({ kind: "video", message: "Vídeo gerado com sucesso.", videoUrl: v.videoUrl });
            onCreated?.();
          }}
        />
      )}
    </section>
  );
}
