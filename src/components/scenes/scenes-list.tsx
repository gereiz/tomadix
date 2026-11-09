"use client";

import { downloadImage } from "@/lib/utils/download-image";
import { useMediaGeneration } from "@/components/providers/feature-flags-provider";
import type { ScenesTabState } from "./use-scenes-tab";

interface ScenesListProps {
  s: ScenesTabState;
}

export function ScenesList({ s }: ScenesListProps) {
  const { onOpenPromptEngine, scenes, loading, filterMode, setDeleteModalOpen, setSceneToDelete, setLightboxImage, handleOpenSceneImage, checkSceneReadiness, handleOpenCreate, handleOpenEdit, handleMoveScene, handleDuplicate, handleOpenExpand, filteredScenes } = s;
  // Chave global do admin: sem mídia, somem keyframes e botões de imagem
  const mediaEnabled = useMediaGeneration();


  return (
    <>
    {loading ? (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
        ))}
      </div>
    ) : filteredScenes.length === 0 ? (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-white">Nenhuma cena na sequência</h3>
        <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
          {filterMode !== "all"
            ? "Nenhuma cena atende ao filtro selecionado."
            : "Estruture sua narrativa em tomadas cinematográficas com enquadramento, ação e continuidade."}
        </p>
        <button
          onClick={handleOpenCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
        >
          + Criar Primeira Cena
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {filteredScenes.map((scene, index) => {
          const config = scene.configuration || {};
          const { isReady, missing } = checkSceneReadiness(scene);
    
          return (
            <div
              key={scene.id}
              className="flex flex-col md:flex-row md:items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-primary/30"
            >
              {/* Lado Esquerdo: Sequenciador e Dados da Cena */}
              <div className="flex items-start gap-4 flex-1">
                {/* Controles de Reordenação e Número */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <button
                    onClick={() => handleMoveScene(index, "up")}
                    disabled={index === 0}
                    className="rounded-lg p-1 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                    title="Mover para cima"
                  >
                    ▲
                  </button>
                  <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-mono font-bold text-primary border border-primary/20">
                    #{scene.order}
                  </span>
                  <button
                    onClick={() => handleMoveScene(index, "down")}
                    disabled={index === scenes.length - 1}
                    className="rounded-lg p-1 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                    title="Mover para baixo"
                  >
                    ▼
                  </button>
                </div>
    
                {/* Informações Centrais da Cena */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{scene.title}</h4>
    
                    {/* Status de Prontidão */}
                    {isReady ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                        ✓ Pronta para Geração
                      </span>
                    ) : (
                      <span
                        className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20"
                        title={`Faltando: ${missing.join(", ")}`}
                      >
                        ⚠ Incompleta ({missing[0]})
                      </span>
                    )}
    
                    {/* Duração com tag de planejamento */}
                    {scene.durationSeconds ? (
                      <span
                        className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/60 border border-white/10"
                        title="Duração planejada (estimativa de roteiro)"
                      >
                        ⏱️ ~{scene.durationSeconds}s
                      </span>
                    ) : null}
                  </div>
    
                  {/* Descrição Narrativa */}
                  {scene.description && (
                    <p className="text-xs text-white/60 line-clamp-2">{scene.description}</p>
                  )}
    
                  {/* Ação Principal */}
                  {config.mainAction && (
                    <div className="text-xs bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-white/80">
                      <span className="font-semibold text-primary">Ação:</span>{" "}
                      {config.mainAction}
                    </div>
                  )}
    
                  {/* Badges Cinematográficos */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {config.framing && (
                      <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20">
                        🎥 {config.framing}
                      </span>
                    )}
                    {config.cameraMovement && (
                      <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300 border border-indigo-500/20">
                        🔄 {config.cameraMovement}
                      </span>
                    )}
                    {config.lighting && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20 truncate max-w-[200px]">
                        💡 {config.lighting}
                      </span>
                    )}
                    {config.dialogue?.enabled && (
                      <span className="rounded-md bg-pink-500/10 px-2 py-0.5 text-[10px] text-pink-300 border border-pink-500/20">
                        💬 Diálogo ({config.dialogue.language || "pt-BR"})
                      </span>
                    )}
                    {config.music?.enabled && (
                      <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-300 border border-teal-500/20">
                        🎵 Música
                      </span>
                    )}
                  </div>
    
                  {/* Vínculos de Personagens e Ambientes */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                    {scene.characters.map((sc) => (
                      <span
                        key={sc.characterId}
                        className="rounded-md bg-white/5 px-2 py-0.5 text-white/70 border border-white/10"
                      >
                        👤 {sc.character.name}
                      </span>
                    ))}
                    {scene.environments.map((se) => (
                      <span
                        key={se.environmentId}
                        className="rounded-md bg-white/5 px-2 py-0.5 text-white/70 border border-white/10"
                      >
                        📍 {se.environment.name}
                      </span>
                    ))}
                  </div>
    
                  {mediaEnabled && (
                  <div className="pt-2.5 mt-2 border-t border-white/5 flex flex-wrap items-center gap-3">
                    {/* Quadro Inicial (Start Frame) */}
                    <div className="flex items-center gap-2">
                      {config.startFrameUrl ? (
                        <div className="relative group/frame overflow-hidden rounded-xl border border-amber-400/40 bg-[#07090e] h-20 w-36 shrink-0 shadow-lg cursor-zoom-in">
                          <img loading="lazy" decoding="async"
                            src={config.startFrameUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
                          />
                          <img loading="lazy" decoding="async"
                            src={config.startFrameUrl}
                            alt="Quadro Inicial"
                            className="relative z-10 h-full w-full object-contain transition duration-300 group-hover/frame:scale-105"
                          />
                          <div className="absolute inset-0 z-20 bg-black/60 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center gap-2 transition">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({
                                  url: config.startFrameUrl!,
                                  title: `Quadro Inicial: ${scene.title}`,
                                  subtitle: `Cena ${scene.order + 1}`,
                                  prompt: scene.description,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition"
                              title="Visualizar em tamanho real"
                            >
                              🔍
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(config.startFrameUrl!, `cena-${scene.order + 1}-start.jpg`);
                              }}
                              className="p-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition"
                              title="Baixar imagem inicial"
                            >
                              ⬇️
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSceneImage(scene, "SCENE_START");
                              }}
                              className="p-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition"
                              title="Regenerar Imagem Inicial"
                            >
                              🔄
                            </button>
                          </div>
                          <span className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 text-[8px] text-amber-300 font-mono text-center py-0.5 truncate border-t border-amber-500/20">
                            Start Frame
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenSceneImage(scene, "SCENE_START")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 text-[11px] font-semibold text-amber-300 hover:bg-amber-400/20 transition shadow-sm shadow-amber-500/10"
                          title="Gerar imagem inicial (start frame) desta cena com IA"
                        >
                          <span>🎨</span>
                          <span>Criar Imagem Inicial</span>
                        </button>
                      )}
                    </div>
    
                    {/* Quadro Final (End Frame / Opcional) */}
                    <div className="flex items-center gap-2">
                      {config.endFrameUrl ? (
                        <div className="relative group/frame overflow-hidden rounded-xl border border-purple-400/40 bg-[#07090e] h-20 w-36 shrink-0 shadow-lg cursor-zoom-in">
                          <img loading="lazy" decoding="async"
                            src={config.endFrameUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
                          />
                          <img loading="lazy" decoding="async"
                            src={config.endFrameUrl}
                            alt="Quadro Final"
                            className="relative z-10 h-full w-full object-contain transition duration-300 group-hover/frame:scale-105"
                          />
                          <div className="absolute inset-0 z-20 bg-black/60 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center gap-2 transition">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({
                                  url: config.endFrameUrl!,
                                  title: `Quadro Final: ${scene.title}`,
                                  subtitle: `Cena ${scene.order + 1}`,
                                  prompt: scene.description,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition"
                              title="Visualizar em tamanho real"
                            >
                              🔍
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(config.endFrameUrl!, `cena-${scene.order + 1}-end.jpg`);
                              }}
                              className="p-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition"
                              title="Baixar imagem final"
                            >
                              ⬇️
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSceneImage(scene, "SCENE_END");
                              }}
                              className="p-1.5 rounded-lg bg-purple-400 text-black text-xs font-bold hover:bg-purple-300 transition"
                              title="Regenerar Imagem Final"
                            >
                              🔄
                            </button>
                          </div>
                          <span className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 text-[8px] text-purple-300 font-mono text-center py-0.5 truncate border-t border-purple-500/20">
                            End Frame
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenSceneImage(scene, "SCENE_END")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition"
                          title="Criar keyframe final para transição / interpolação de vídeo"
                        >
                          <span>➕</span>
                          <span>Imagem Final (Opcional)</span>
                        </button>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </div>
    
              {/* Lado Direito: Ações */}
              <div className="flex md:flex-col items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-4">
                {/* Botão Central de Prompts */}
                <button
                  onClick={() => {
                    if (onOpenPromptEngine) {
                      onOpenPromptEngine(scene.id);
                    } else {
                      handleOpenEdit(scene);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/20 transition w-full justify-center"
                  title="Configurar geração de prompt"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Gerar Prompt
                </button>
    
                {mediaEnabled && (
                <button
                  type="button"
                  onClick={() => handleOpenSceneImage(scene, "SCENE_START")}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-300 border border-amber-400/30 hover:bg-amber-400/25 transition w-full justify-center shadow-sm shadow-amber-500/10"
                  title="Gerar imagem ou keyframe cinematográfico desta cena com IA"
                >
                  <span>🎨</span>
                  <span>Gerar Imagem</span>
                </button>
                )}
    
                <div className="flex items-center gap-1 w-full justify-end">
                  {/* Botão Expandir com IA (EXPAND_SCENE) */}
                  <button
                    onClick={() => handleOpenExpand(scene)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-primary hover:bg-primary/10 transition"
                    title="Expandir cena com IA (sub-planos, ângulos e detalhes)"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
    
                  {/* Botão Editar */}
                  <button
                    onClick={() => handleOpenEdit(scene)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Editar cena"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
    
                  {/* Botão Duplicar */}
                  <button
                    onClick={() => handleDuplicate(scene)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Duplicar cena"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
    
                  {/* Botão Excluir */}
                  <button
                    onClick={() => {
                      setSceneToDelete(scene);
                      setDeleteModalOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Excluir cena"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
    </>
  );
}
