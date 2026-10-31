"use client";

import { useEffect, useState } from "react";
import { VisualReferenceOption } from "@/modules/visual-library/visual-reference.types";

interface VisualLightboxModalProps {
  option: VisualReferenceOption | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (value: string) => void;
  isSelected?: boolean;
  isAdmin?: boolean;
  paramDefinitionId?: string;
  onImageUpdated?: (optionValue: string, newImageUrl: string) => void;
}

export function VisualLightboxModal({
  option,
  isOpen,
  onClose,
  onSelect,
  isSelected = false,
  isAdmin = false,
  paramDefinitionId,
  onImageUpdated,
}: VisualLightboxModalProps) {
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (option) {
      setCurrentImageUrl(option.imageUrl);
      setUploadError(null);
      setUploadSuccess(null);
    }
  }, [option]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !option) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      // 1. Upload do arquivo
      const formData = new FormData();
      formData.append("file", file);
      formData.append("optionValue", option.value);

      const res = await fetch("/api/admin/visual-library/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao realizar upload do arquivo.");
      }

      const uploadData = await res.json();
      const newUrl = uploadData.url;

      // 2. Salva nas opções da definição
      const saveRes = await fetch("/api/admin/visual-library/options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionValue: option.value,
          imageUrl: newUrl,
          paramDefinitionId,
        }),
      });

      if (!saveRes.ok) {
        const json = await saveRes.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao vincular nova imagem à opção.");
      }

      setCurrentImageUrl(newUrl);
      setUploadSuccess("Imagem personalizada salva com sucesso!");
      onImageUpdated?.(option.value, newUrl);
    } catch (err: any) {
      console.error("Erro no upload customizado:", err);
      setUploadError(err.message || "Falha ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !option) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#0b0f19] shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header da Modal */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-primary/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary border border-primary/30">
              {option.categoryLabel || option.category}
            </span>
            <code className="text-xs text-white/40 font-mono">{option.value}</code>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
            aria-label="Fechar visualização detalhada"
          >
            ✕
          </button>
        </div>

        {/* Imagem Ampliada */}
        <div className="relative aspect-[16/9] w-full bg-black/60 flex items-center justify-center overflow-hidden border-b border-white/10">
          <img
            src={currentImageUrl || option.imageUrl}
            alt={option.altText || option.label}
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/visual-references/placeholder.svg";
            }}
          />

          {option.license && (
            <div className="absolute bottom-2 right-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[9px] text-white/50 backdrop-blur-sm border border-white/10">
              Licença: {option.license}
            </div>
          )}
        </div>

        {/* Barra de Customização de Imagem — Apenas para Administradores */}
        {isAdmin && (
          <div className="border-b border-white/10 bg-amber-500/[0.04] px-6 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold font-mono text-amber-300 border border-amber-400/30">
                  ADMIN
                </span>
                <span className="text-xs text-white/80 font-medium">
                  Personalizar referência visual desta opção
                </span>
              </div>

              <label
                className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition shadow-sm ${
                  isUploading
                    ? "bg-white/20 text-white/50 cursor-wait"
                    : "bg-primary text-on-primary hover:opacity-90 font-bold"
                }`}
              >
                <span>{isUploading ? "⏳ Enviando imagem..." : "📷 Enviar Imagem Própria"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={isUploading}
                  className="hidden"
                  onChange={handleCustomImageUpload}
                />
              </label>
            </div>

            {uploadSuccess && (
              <p className="mt-2 text-xs font-semibold text-primary flex items-center gap-1.5 animate-in fade-in">
                <span>✓</span> {uploadSuccess}
              </p>
            )}
            {uploadError && (
              <p className="mt-2 text-xs font-semibold text-rose-400 flex items-center gap-1.5 animate-in fade-in">
                <span>⚠️</span> {uploadError}
              </p>
            )}
          </div>
        )}

        {/* Conteúdo Didático e Explicativo */}
        <div className="p-6 space-y-4 max-h-[45vh] overflow-y-auto">
          <div>
            <h2 id="lightbox-title" className="text-lg font-bold text-white flex items-center gap-2">
              {option.label}
            </h2>
            {option.originalName && option.originalName !== option.label && (
              <p className="text-xs font-mono text-amber-400/90 mt-0.5">
                Nome Internacional: <strong>{option.originalName}</strong>
              </p>
            )}
            <p className="mt-2 text-sm text-white/70 leading-relaxed">
              {option.description}
            </p>
          </div>

          {/* O Que Observar */}
          {option.whatToLookFor && (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wide">
                <span>👁️</span> O Que Observar no Enquadramento
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed">
                {option.whatToLookFor}
              </p>
            </div>
          )}

          {/* Notas Comparativas */}
          {option.comparisonNotes && (
            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wide">
                <span>⚖️</span> Diferença Conceitual com Opções Semelhantes
              </div>
              <p className="text-xs text-purple-100/80 leading-relaxed">
                {option.comparisonNotes}
              </p>
            </div>
          )}

          {/* Tags */}
          {option.tags && option.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-white/40 font-mono">Palavras-chave:</span>
              {option.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/60"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-white/[0.02]">
          <span className="text-xs text-white/40">
            Pressione <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd> para fechar
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5 transition"
            >
              Fechar
            </button>

            {onSelect && (
              <button
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className={`rounded-xl px-5 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/30"
                    : "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                }`}
              >
                {isSelected ? "✓ Opção Ativa" : "Selecionar Esta Opção ➔"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
