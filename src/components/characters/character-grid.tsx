"use client";

import { downloadImage } from "@/lib/utils/download-image";
import { useMediaFlags } from "@/components/providers/feature-flags-provider";
import type { EntityStatusFilter, LightboxImage } from "@/components/entities/types";
import type { CharacterItem } from "./types";

interface CharacterGridProps {
  characters: CharacterItem[];
  loading: boolean;
  search: string;
  statusFilter: EntityStatusFilter;
  handleOpenCreate: () => void;
  handleOpenEdit: (char: CharacterItem) => void;
  handleOpenImageGen: (char: CharacterItem) => void;
  handleDuplicate: (char: CharacterItem) => void;
  handleToggleArchive: (char: CharacterItem) => void;
  handleViewPrompt: (char: CharacterItem) => void;
  onRequestDelete: (char: CharacterItem) => void;
  setLightboxImage: (image: LightboxImage) => void;
}

export function CharacterGrid({
  characters,
  loading,
  search,
  statusFilter,
  handleOpenCreate,
  handleOpenEdit,
  handleOpenImageGen,
  handleDuplicate,
  handleToggleArchive,
  handleViewPrompt,
  onRequestDelete,
  setLightboxImage,
}: CharacterGridProps) {
  // Chave global do admin: sem mídia, somem retratos gerados e botões de imagem
  const { image: mediaEnabled } = useMediaFlags(); // imagens ligadas
  return (
    <>
    {loading ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
        ))}
      </div>
    ) : characters.length === 0 ? (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-white">Nenhum personagem encontrado</h3>
        <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
          {search.trim() || statusFilter !== "active"
            ? "Tente ajustar seus filtros de busca para encontrar personagens cadastrados."
            : "Cadastre seus personagens com traços visuais permanentes para manter total consistência facial e estética em todas as tomadas."}
        </p>
        <button
          onClick={handleOpenCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
        >
          + Criar Primeiro Personagem
        </button>
      </div>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((char) => {
          const attrs = char.attributes || {};
          const sceneCount = char._count?.sceneLinks || 0;
    
          return (
            <div
              key={char.id}
              className={`flex flex-col justify-between rounded-2xl border bg-black/40 p-5 transition hover:border-primary/40 ${
                char.isArchived ? "border-amber-500/20 opacity-70" : "border-white/10"
              }`}
            >
              <div>
                {/* Imagem Cinematográfica do Personagem (se gerada) */}
                {mediaEnabled && attrs.imageUrl && (
                  <div className="relative mb-3.5 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07090e] shadow-xl group aspect-[16/10] sm:aspect-video">
                    {/* Imagem Principal Centralizada e Completa (Sem Cortes de Rosto/Cabelo) */}
                    <img loading="lazy" decoding="async"
                      src={attrs.imageUrl}
                      alt={char.name}
                      className="relative z-10 h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.02]"
                    />
    
                    {/* Vinheta Gradiente */}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20" />
    
                    {/* Badge Superior */}
                    <div className="absolute top-2 left-2 z-30 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-400/20">
                      <span>🎨</span>
                      <span>Retrato IA</span>
                    </div>
    
                    {/* Ações no Hover da Imagem */}
                    <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition duration-200 bg-black/40-[2px]">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: attrs.imageUrl!,
                            title: char.name,
                            subtitle: attrs.apparentAge ? `Idade: ${attrs.apparentAge}` : undefined,
                            prompt: attrs.basePrompt || attrs.physicalCharacteristics || char.description,
                          })
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white border border-white/20 transition shadow-lg"
                        title="Visualizar retrato em tamanho real"
                      >
                        <span>🔍</span>
                        <span>Ampliar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadImage(attrs.imageUrl!, `${char.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.jpg`)}
                        className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white border border-white/20 transition shadow-lg"
                        title="Baixar imagem no computador"
                      >
                        <span>⬇️</span>
                        <span>Baixar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenImageGen(char)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-400 text-black hover:bg-amber-300 px-3 py-1.5 text-xs font-bold transition shadow-lg"
                        title="Gerar uma nova variação de imagem"
                      >
                        <span>🔄</span>
                        <span>Regenerar</span>
                      </button>
                    </div>
                  </div>
                )}
    
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{char.name}</h4>
                      {char.isArchived && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                          Arquivado
                        </span>
                      )}
                    </div>
                    {attrs.apparentAge && (
                      <p className="text-[11px] font-mono text-primary mt-0.5">
                        Idade: {attrs.apparentAge}
                      </p>
                    )}
                  </div>
    
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-mono text-white/50 border border-white/10 shrink-0">
                    {sceneCount} {sceneCount === 1 ? "cena" : "cenas"}
                  </span>
                </div>
    
                {/* Descrição Narrativa */}
                <p className="mt-2.5 text-xs text-white/60 line-clamp-2">
                  {char.description || "Nenhuma descrição narrativa fornecida."}
                </p>
    
                {/* Badges de Atributos Visuais */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {attrs.visualIdentity && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary border border-primary/20 truncate max-w-[200px]">
                      🎨 {attrs.visualIdentity}
                    </span>
                  )}
                  {attrs.hairAndFace && (
                    <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/20 truncate max-w-[200px]">
                      👤 {attrs.hairAndFace}
                    </span>
                  )}
                  {attrs.costumeAndAccessories && (
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20 truncate max-w-[200px]">
                      👔 {attrs.costumeAndAccessories}
                    </span>
                  )}
                  {attrs.restrictions && (
                    <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300 border border-red-500/20 truncate max-w-[200px]">
                      ⛔ {attrs.restrictions}
                    </span>
                  )}
                </div>
              </div>
    
              {/* Barra de Ações Inferior */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  {/* Botão Ver Prompt JSON */}
                  <button
                    onClick={() => handleViewPrompt(char)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary border border-primary/20 hover:bg-primary/20 transition"
                    title="Visualizar e exportar prompt base estruturado em JSON"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Prompt JSON
                  </button>
    
                  {mediaEnabled && (
                  <button
                    onClick={() => handleOpenImageGen(char)}
                    className="flex items-center gap-1 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 border border-amber-400/30 hover:bg-amber-400/25 transition shadow-sm shadow-amber-500/10"
                    title="Gerar retrato visual cinematográfico com IA deste personagem"
                  >
                    <span>🎨</span>
                    <span>Gerar Imagem</span>
                  </button>
                  )}
                </div>
    
                <div className="flex items-center gap-1">
                  {/* Botão Editar */}
                  <button
                    onClick={() => handleOpenEdit(char)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Editar características"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
    
                  {/* Botão Duplicar */}
                  <button
                    onClick={() => handleDuplicate(char)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Duplicar personagem"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
    
                  {/* Botão Arquivar / Restaurar */}
                  <button
                    onClick={() => handleToggleArchive(char)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-amber-300 hover:bg-amber-500/10 transition"
                    title={char.isArchived ? "Restaurar personagem" : "Arquivar personagem"}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
    
                  {/* Botão Excluir */}
                  <button
                    onClick={() => onRequestDelete(char)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Excluir permanentemente"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
