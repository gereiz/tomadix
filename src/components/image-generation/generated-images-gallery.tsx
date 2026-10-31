"use client";

import { useState, useEffect } from "react";
import { downloadImage } from "@/lib/utils/download-image";

interface GeneratedImageItem {
  id: string;
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
  modelId: string;
  providerId: string;
  aspectRatio?: string;
  resolution?: string;
  creditCost: number;
  createdAt: string;
  project?: { id: string; title: string } | null;
  character?: { id: string; name: string } | null;
  environment?: { id: string; name: string } | null;
  scene?: { id: string; title: string; order: number } | null;
  user?: { id: string; displayName: string | null; email: string } | null;
}

interface GeneratedImagesGalleryProps {
  projectId?: string;
  sceneId?: string;
  characterId?: string;
  environmentId?: string;
}

export function GeneratedImagesGallery({
  projectId,
  sceneId,
  characterId,
  environmentId,
}: GeneratedImagesGalleryProps) {
  const [images, setImages] = useState<GeneratedImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageItem | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "CHARACTERS" | "ENVIRONMENTS" | "SCENES">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchImages = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);

      if (filterType !== "ALL") {
        params.append("entityType", filterType);
      } else {
        if (sceneId) params.append("sceneId", sceneId);
        if (characterId) params.append("characterId", characterId);
        if (environmentId) params.append("environmentId", environmentId);
      }

      params.append("page", String(pageNum));
      params.append("limit", "18");

      const res = await fetch(`/api/images/history?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setImages(data.items || []);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de imagens:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(1);

    const handleUpdate = () => {
      fetchImages(1);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("tomadix:images-updated", handleUpdate);
      window.addEventListener("tomadix:entities-updated", handleUpdate);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("tomadix:images-updated", handleUpdate);
        window.removeEventListener("tomadix:entities-updated", handleUpdate);
      }
    };
  }, [projectId, sceneId, characterId, environmentId, filterType]);

  const handleDownload = async (url: string, id: string) => {
    await downloadImage(url, `tomadix-${id}.jpg`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🖼️</span> Galeria de Imagens Geradas
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-white/70">
              {total} imagens
            </span>
          </h4>
          <p className="text-[11px] text-white/50">
            Histórico completo de imagens criadas com IA neste projeto ou estúdio.
          </p>
        </div>

        {/* Filtros por Tipo de Criação */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-xs">
          {[
            { id: "ALL", label: "Todas", icon: "🎬" },
            { id: "CHARACTERS", label: "Personagens", icon: "👤" },
            { id: "ENVIRONMENTS", label: "Ambientes", icon: "🏙️" },
            { id: "SCENES", label: "Cenas", icon: "🎥" },
          ].map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-amber-400 text-black shadow-sm"
                    : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => fetchImages(page)}
            className="p-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/70 transition ml-1"
            title="Recarregar galeria"
          >
            🔄
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-white/50 font-mono text-xs">
          <span className="animate-spin inline-block h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full mb-2" />
          <p>Carregando galeria...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-white/5 bg-white/[0.01] space-y-2">
          <span className="text-3xl">🎨</span>
          <p className="text-xs text-white/60">Nenhuma imagem gerada ainda para esta seleção.</p>
          <p className="text-[11px] text-white/40">
            Utilize a modalidade &ldquo;Gerar imagem&rdquo; ou a ação &ldquo;Gerar imagem com este prompt&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-black/60 border border-white/10 hover:border-amber-400/50 cursor-pointer transition shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={img.prompt}
                loading="lazy"
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />

              {/* Badges de Origem */}
              <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1 pointer-events-none">
                {img.character && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/80 text-primary border border-primary/30 font-semibold backdrop-blur-sm shadow">
                    👤 {img.character.name}
                  </span>
                )}
                {img.environment && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/80 text-blue-300 border border-blue-500/30 font-semibold backdrop-blur-sm shadow">
                    🏙️ {img.environment.name}
                  </span>
                )}
                {img.scene && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/80 text-purple-300 border border-purple-500/30 font-semibold backdrop-blur-sm shadow">
                    🎥 Cena {img.scene.order + 1}
                  </span>
                )}
              </div>

              {/* Botão de Download Rápido */}
              <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(img.imageUrl, img.id);
                  }}
                  className="p-1 rounded-lg bg-black/80 hover:bg-black text-amber-400 border border-amber-400/30 text-xs shadow-md transition"
                  title="Baixar imagem"
                >
                  ⬇️
                </button>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end text-[10px]">
                <span className="font-semibold text-white truncate">{img.modelId}</span>
                <span className="text-white/60 text-[9px] line-clamp-1">{img.prompt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => fetchImages(page - 1)}
            className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-xs font-mono text-white/60">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => fetchImages(page + 1)}
            className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 disabled:opacity-30"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modal de Detalhes da Imagem */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#0d1117] border border-white/15 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Detalhes da Imagem Gerada</h3>
                <span className="text-[10px] font-mono text-white/40">
                  {new Date(selectedImage.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center bg-black/80 rounded-xl overflow-hidden max-h-[500px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.prompt}
                className="max-h-[480px] w-auto object-contain"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-white/60 bg-white/[0.02] p-3 rounded-xl border border-white/5">
              <div>
                <span className="text-white/40 block text-[9px] uppercase">Modelo</span>
                <span className="text-white font-semibold">{selectedImage.modelId}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase">Provedor</span>
                <span className="text-white font-semibold">{selectedImage.providerId}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase">Proporção</span>
                <span className="text-white font-semibold">{selectedImage.aspectRatio || "1:1"}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase">Custo</span>
                <span className="text-amber-300 font-bold">{selectedImage.creditCost} créditos</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/80 space-y-1">
              <span className="text-[10px] font-mono text-white/40 uppercase block">Prompt:</span>
              <p className="italic text-white/90 select-text">{selectedImage.prompt}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleDownload(selectedImage.imageUrl, selectedImage.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition flex items-center gap-1.5"
              >
                <span>⬇️</span> Baixar Imagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

