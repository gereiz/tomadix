"use client";

import { useEffect } from "react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
  subtitle?: string;
  prompt?: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  prompt,
}: ImageLightboxModalProps) {
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
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_image.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[92vh] max-w-5xl w-full overflow-hidden rounded-3xl border border-white/15 bg-[#0a0d14] shadow-2xl">
        {/* Header da Barra de Ferramentas */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-black/40">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">🎨</span> {title}
            </h3>
            {subtitle && <p className="text-[11px] text-white/50">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition border border-white/10"
              title="Baixar imagem em resolução total"
            >
              <span>⬇️</span>
              <span>Baixar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
              title="Fechar (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Visualizador de Imagem com Proporção Preservada */}
        <div className="relative flex-1 flex items-center justify-center p-4 min-h-[300px] max-h-[70vh] bg-[#05070a] overflow-hidden group">
          {/* Fundo Blur Cinematográfico */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-20 scale-125 pointer-events-none"
          />
          {/* Imagem Central Inteira */}
          <img
            src={imageUrl}
            alt={title}
            className="relative z-10 max-h-[66vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
          />
        </div>

        {/* Rodapé com Prompt e Detalhes */}
        {prompt && (
          <div className="border-t border-white/10 px-5 py-3 bg-black/60 text-xs text-white/70">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80 font-bold block mb-1">
              Prompt de Geração
            </span>
            <p className="line-clamp-2 text-[11px] text-white/80 leading-relaxed font-sans select-all">
              {prompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
