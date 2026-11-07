"use client";

import { downloadImage } from "@/lib/utils/download-image";
import type { EntityStatusFilter, LightboxImage } from "@/components/entities/types";
import type { EnvironmentItem } from "./types";

interface EnvironmentGridProps {
  environments: EnvironmentItem[];
  loading: boolean;
  search: string;
  statusFilter: EntityStatusFilter;
  handleOpenCreate: () => void;
  handleOpenEdit: (env: EnvironmentItem) => void;
  handleOpenImageGen: (env: EnvironmentItem) => void;
  handleDuplicate: (env: EnvironmentItem) => void;
  handleToggleArchive: (env: EnvironmentItem) => void;
  handleViewPrompt: (env: EnvironmentItem) => void;
  onRequestDelete: (env: EnvironmentItem) => void;
  setLightboxImage: (image: LightboxImage) => void;
}

export function EnvironmentGrid({
  environments,
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
}: EnvironmentGridProps) {
  return (
    <>
    {loading ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
        ))}
      </div>
    ) : environments.length === 0 ? (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-white">Nenhum ambiente encontrado</h3>
        <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
          {search.trim() || statusFilter !== "active"
            ? "Tente ajustar seus filtros de busca para encontrar ambientes cadastrados."
            : "Defina locações, arquitetura e iluminação base para manter coerência espacial em todas as tomadas."}
        </p>
        <button
          onClick={handleOpenCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
        >
          + Criar Primeiro Ambiente
        </button>
      </div>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {environments.map((env) => {
          const attrs = env.attributes || {};
          const sceneCount = env._count?.sceneLinks || 0;
    
          return (
            <div
              key={env.id}
              className={`flex flex-col justify-between rounded-2xl border bg-black/40 p-5 transition hover:border-primary/40 ${
                env.isArchived ? "border-amber-500/20 opacity-70" : "border-white/10"
              }`}
            >
              <div>
                {/* Imagem Panorâmica do Ambiente (se gerada) */}
                {attrs.imageUrl && (
                  <div className="relative mb-3.5 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07090e] shadow-xl group aspect-[16/10] sm:aspect-video">
                    {/* Imagem Principal Centralizada e Completa */}
                    <img loading="lazy" decoding="async"
                      src={attrs.imageUrl}
                      alt={env.name}
                      className="relative z-10 h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.02]"
                    />
    
                    {/* Vinheta Gradiente */}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20" />
    
                    {/* Badge Superior */}
                    <div className="absolute top-2 left-2 z-30 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-400/20">
                      <span>🏙️</span>
                      <span>Cenário IA</span>
                    </div>
    
                    {/* Ações no Hover da Imagem */}
                    <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition duration-200 bg-black/40-[2px]">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: attrs.imageUrl!,
                            title: env.name,
                            subtitle: attrs.locationContext || undefined,
                            prompt: attrs.basePrompt || env.description,
                          })
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white border border-white/20 transition shadow-lg"
                        title="Visualizar cenário em tamanho real"
                      >
                        <span>🔍</span>
                        <span>Ampliar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadImage(attrs.imageUrl!, `${env.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.jpg`)}
                        className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white border border-white/20 transition shadow-lg"
                        title="Baixar imagem no computador"
                      >
                        <span>⬇️</span>
                        <span>Baixar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenImageGen(env)}
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
                      <h4 className="font-bold text-sm text-white">{env.name}</h4>
                      {env.isArchived && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                          Arquivado
                        </span>
                      )}
                    </div>
                    {attrs.locationContext && (
                      <p className="text-[11px] font-mono text-primary mt-0.5">
                        📍 {attrs.locationContext}
                      </p>
                    )}
                  </div>
    
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-mono text-white/50 border border-white/10 shrink-0">
                    {sceneCount} {sceneCount === 1 ? "cena" : "cenas"}
                  </span>
                </div>
    
                {/* Descrição */}
                <p className="mt-2.5 text-xs text-white/60 line-clamp-2">
                  {env.description || "Nenhuma descrição fornecida para este ambiente."}
                </p>
    
                {/* Badges de Atributos Arquiteturais & Iluminação */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {attrs.architecture && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary border border-primary/20 truncate max-w-[200px]">
                      🏛️ {attrs.architecture}
                    </span>
                  )}
                  {attrs.lighting && (
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20 truncate max-w-[200px]">
                      💡 {attrs.lighting}
                    </span>
                  )}
                  {attrs.colorPalette && (
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20 truncate max-w-[200px]">
                      🎨 {attrs.colorPalette}
                    </span>
                  )}
                  {attrs.weatherAndAtmosphere && (
                    <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-300 border border-teal-500/20 truncate max-w-[200px]">
                      🌫️ {attrs.weatherAndAtmosphere}
                    </span>
                  )}
                  {attrs.historicalEra && (
                    <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/20 truncate max-w-[200px]">
                      ⏳ {attrs.historicalEra}
                    </span>
                  )}
                </div>
              </div>
    
              {/* Barra de Ações Inferior */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  {/* Botão Ver Prompt JSON */}
                  <button
                    onClick={() => handleViewPrompt(env)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary border border-primary/20 hover:bg-primary/20 transition"
                    title="Visualizar e exportar prompt base estruturado em JSON"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Prompt JSON
                  </button>
    
                  {/* Botão Gerar Imagem com IA */}
                  <button
                    onClick={() => handleOpenImageGen(env)}
                    className="flex items-center gap-1 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 border border-amber-400/30 hover:bg-amber-400/25 transition shadow-sm shadow-amber-500/10"
                    title="Gerar conceito visual cinematográfico com IA deste ambiente"
                  >
                    <span>🎨</span>
                    <span>Gerar Imagem</span>
                  </button>
                </div>
    
                <div className="flex items-center gap-1">
                  {/* Botão Editar */}
                  <button
                    onClick={() => handleOpenEdit(env)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Editar ambiente"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
    
                  {/* Botão Duplicar */}
                  <button
                    onClick={() => handleDuplicate(env)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Duplicar ambiente"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
    
                  {/* Botão Arquivar / Restaurar */}
                  <button
                    onClick={() => handleToggleArchive(env)}
                    className="rounded-lg p-1.5 text-white/60 hover:text-amber-300 hover:bg-amber-500/10 transition"
                    title={env.isArchived ? "Restaurar ambiente" : "Arquivar ambiente"}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
    
                  {/* Botão Excluir */}
                  <button
                    onClick={() => onRequestDelete(env)}
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
