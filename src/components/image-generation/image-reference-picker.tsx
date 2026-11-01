"use client";

import { useState, useRef } from "react";

interface ImageReferencePickerProps {
  value: string;
  onChange: (url: string) => void;
  projectId?: string;
  supportsReference?: boolean;
  requiresReference?: boolean;
}

export function ImageReferencePicker({
  value,
  onChange,
  projectId,
  supportsReference = true,
  requiresReference = false,
}: ImageReferencePickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido (PNG, JPG ou WEBP).");
      return;
    }

    // Limite de 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("A imagem selecionada excede o limite de 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Resetar input
    e.target.value = "";
  };

  const handleOpenGallery = async () => {
    setModalOpen(true);
    if (galleryLoaded) return;

    try {
      setLoadingGallery(true);
      const url = projectId
        ? `/api/images/history?projectId=${encodeURIComponent(projectId)}&limit=36`
        : `/api/images/history?limit=36`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setGalleryImages(data.images || []);
        setGalleryLoaded(true);
      }
    } catch (err) {
      console.warn("Falha ao carregar imagens da galeria:", err);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleSelectFromGallery = (imageUrl: string) => {
    onChange(imageUrl);
    setModalOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Input de arquivo invisível */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
          <span>🖼️</span> Imagem de Referência / Entrada
          {requiresReference ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
              OBRIGATÓRIO
            </span>
          ) : supportsReference ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
              OPCIONAL
            </span>
          ) : null}
        </label>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] text-red-400 hover:text-red-300 font-medium transition"
          >
            ✕ Remover referência
          </button>
        )}
      </div>

      {/* Caso já haja imagem de referência selecionada */}
      {value ? (
        <div className="relative flex items-center gap-3.5 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 group">
          <div className="h-16 w-16 rounded-lg overflow-hidden border border-white/20 bg-black/60 shrink-0">
            <img src={value} alt="Referência" className="h-full w-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-xs font-bold text-amber-300 block truncate">
              Imagem de Referência Vinculada
            </span>
            <p className="text-[10px] text-white/50 line-clamp-2">
              Esta imagem será enviada ao provedor como guia de composição, iluminação e fisionomia.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition"
              title="Trocar por arquivo do computador"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs transition"
              title="Remover imagem de referência"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Caso não haja imagem selecionada ainda */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-dashed border-white/20 text-white/70 hover:text-white hover:border-amber-400/50 hover:bg-white/10 text-xs font-medium transition"
          >
            <span>📁</span>
            <span>Upload do Computador</span>
          </button>

          <button
            type="button"
            onClick={handleOpenGallery}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-dashed border-white/20 text-white/70 hover:text-white hover:border-amber-400/50 hover:bg-white/10 text-xs font-medium transition"
          >
            <span>🎨</span>
            <span>Escolher da Galeria</span>
          </button>
        </div>
      )}

      {/* Modal / Gaveta de Seleção da Galeria */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#0f1218] border border-white/15 p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🎨</span> Selecionar da Galeria do Projeto
                </h3>
                <p className="text-[11px] text-white/50">
                  Clique sobre qualquer imagem gerada anteriormente para usá-la como referência.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 min-h-[250px] max-h-[55vh]">
              {loadingGallery ? (
                <div className="p-12 text-center text-xs text-white/50">
                  <span className="animate-spin inline-block h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full mb-2" />
                  <p>Carregando imagens do estúdio...</p>
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="p-12 text-center text-xs text-white/40 space-y-2">
                  <p>Nenhuma imagem gerada ainda neste projeto.</p>
                  <p className="text-[11px] text-white/30">
                    Você também pode fazer upload de uma imagem do seu computador.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {galleryImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => handleSelectFromGallery(img.imageUrl)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                    >
                      <img
                        src={img.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-2 py-1 rounded-md bg-amber-400 text-black text-[10px] font-bold shadow">
                          Usar
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-[11px] text-white/40">
                {galleryImages.length} imagens disponíveis
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

