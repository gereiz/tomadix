"use client";

import { useMediaGeneration } from "@/components/providers/feature-flags-provider";
import type { LibraryTab, SpaceLibrary, AddLibraryItem } from "../types";

interface LibraryDrawerProps {
  canEdit: boolean;
  libraryTab: LibraryTab;
  setLibraryTab: (tab: LibraryTab) => void;
  library: SpaceLibrary;
  onClose: () => void;
  onGenerateImage: () => void;
  addLibraryItemToBoard: AddLibraryItem;
}

export function LibraryDrawer({ canEdit, libraryTab, setLibraryTab, library, onClose, onGenerateImage, addLibraryItemToBoard }: LibraryDrawerProps) {
  // Chave global do admin: sem mídia, a aba Imagens e o botão de gerar somem
  const mediaEnabled = useMediaGeneration();
  const activeTab = !mediaEnabled && libraryTab === "images" ? "prompts" : libraryTab;
  return (
    <div className="pointer-events-auto absolute inset-x-2 bottom-2 top-16 z-30 flex flex-col rounded-2xl md:inset-x-auto md:bottom-16 md:left-16 md:z-20 md:w-80 border border-outline-variant/30 bg-surface-container/95 shadow-2xl animate-in slide-in-from-left-2 duration-150">
      <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Acervo do Space
          </h3>
          <p className="text-[11px] text-on-surface-variant">
            Arraste para o board ou clique para adicionar
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        >
          ✕
        </button>
      </div>
    
      {/* Drawer Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-outline-variant/20 px-2.5 py-2 no-scrollbar">
        {(
          [
            { id: "images", label: "Imagens", icon: "🖼️", count: library.images.length },
            { id: "prompts", label: "Prompts", icon: "📜", count: library.prompts.length },
            { id: "characters", label: "Personagens", icon: "👤", count: library.characters.length },
            { id: "environments", label: "Ambientes", icon: "🏛️", count: library.environments.length },
            { id: "scenes", label: "Cenas", icon: "🎬", count: library.scenes.length },
          ] as const
        )
          .filter((t) => mediaEnabled || t.id !== "images")
          .map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setLibraryTab(t.id)}
            className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${activeTab === t.id
              ? "bg-primary/15 text-primary font-semibold"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            <span className="text-[10px] opacity-60">({t.count})</span>
          </button>
        ))}
      </div>
    
      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === "images" && (
          <>
            <button
              type="button"
              onClick={onGenerateImage}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-sm transition hover:opacity-90"
            >
              <span>🎨</span>
              <span>Gerar Nova Imagem IA</span>
            </button>
            {library.images.length === 0 ? (
              <p className="py-8 text-center text-xs text-on-surface-variant">
                Nenhuma imagem gerada neste Space ainda.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {library.images.map((img) => (
                  <div
                    key={img.id}
                    draggable={canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/tomadix-space-item",
                        JSON.stringify({ itemType: "IMAGE", item: img })
                      );
                    }}
                    onClick={() => addLibraryItemToBoard("IMAGE", img)}
                    className="group relative aspect-square cursor-grab overflow-hidden rounded-xl border border-outline-variant/30 bg-black/20 transition hover:border-primary"
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.prompt || "Imagem"}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    <div className="theme-preserve-dark absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                      <span className="text-[10px] font-semibold text-white">
                        + Adicionar ao Board
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
    
        {activeTab === "prompts" && (
          <>
            {library.prompts.length === 0 ? (
              <p className="py-8 text-center text-xs text-on-surface-variant">
                Nenhum prompt gerado nas cenas ainda.
              </p>
            ) : (
              library.prompts.map((p) => (
                <div
                  key={p.id}
                  draggable={canEdit}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/tomadix-space-item",
                      JSON.stringify({ itemType: "PROMPT", item: p })
                    );
                  }}
                  onClick={() => addLibraryItemToBoard("PROMPT", p)}
                  className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold text-primary">
                    <span>
                      Cena {p.sceneOrder}: {p.sceneTitle}
                    </span>
                    <span>v{p.version}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                    {p.promptText}
                  </p>
                </div>
              ))
            )}
          </>
        )}
    
        {activeTab === "characters" &&
          (library.characters.length === 0 ? (
            <p className="py-8 text-center text-xs text-on-surface-variant">
              Nenhum personagem cadastrado neste Space.
            </p>
          ) : (
            library.characters.map((ch) => (
              <div
                key={ch.id}
                draggable={canEdit}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/tomadix-space-item",
                    JSON.stringify({ itemType: "CHARACTER", item: ch })
                  );
                }}
                onClick={() => addLibraryItemToBoard("CHARACTER", ch)}
                className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
              >
                <div className="text-xs font-bold text-on-surface">👤 {ch.name}</div>
                {ch.description && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-on-surface-variant">
                    {ch.description}
                  </p>
                )}
              </div>
            ))
          ))}
    
        {activeTab === "environments" &&
          (library.environments.length === 0 ? (
            <p className="py-8 text-center text-xs text-on-surface-variant">
              Nenhum ambiente cadastrado neste Space.
            </p>
          ) : (
            library.environments.map((env) => (
              <div
                key={env.id}
                draggable={canEdit}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/tomadix-space-item",
                    JSON.stringify({ itemType: "ENVIRONMENT", item: env })
                  );
                }}
                onClick={() => addLibraryItemToBoard("ENVIRONMENT", env)}
                className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
              >
                <div className="text-xs font-bold text-on-surface">🏛️ {env.name}</div>
                {env.description && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-on-surface-variant">
                    {env.description}
                  </p>
                )}
              </div>
            ))
          ))}
    
        {activeTab === "scenes" &&
          (library.scenes.length === 0 ? (
            <p className="py-8 text-center text-xs text-on-surface-variant">
              Nenhuma cena cadastrada neste Space.
            </p>
          ) : (
            library.scenes.map((sc) => (
              <div
                key={sc.id}
                draggable={canEdit}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/tomadix-space-item",
                    JSON.stringify({ itemType: "SCENE", item: sc })
                  );
                }}
                onClick={() => addLibraryItemToBoard("SCENE", sc)}
                className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
              >
                <div className="text-xs font-bold text-on-surface">
                  🎬 Cena {sc.order}: {sc.title}
                </div>
                {sc.description && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-on-surface-variant">
                    {sc.description}
                  </p>
                )}
              </div>
            ))
          ))}
      </div>
    </div>
  );
}
