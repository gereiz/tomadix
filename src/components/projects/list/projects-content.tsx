"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { ProjectsListTabState } from "./use-projects-list";

interface ProjectsContentProps {
  s: ProjectsListTabState;
}

export function ProjectsContent({ s }: ProjectsContentProps) {
  const { projects, loading, error, search, setSearch, statusFilter, setStatusFilter, viewMode, setIsCreateModalOpen, setIsPresetsModalOpen, starredProjectIds, setProjectToDelete, setProjectToTransfer, setProjectToShare, duplicatingId, fetchProjects, toggleStarProject, resetForm, handleOpenEdit, handleDuplicate, handleToggleArchive, formatDate } = s;


  return (
    <>
    {loading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl bg-surface-container/40 border border-outline-variant/20 overflow-hidden flex flex-col justify-between"
          >
            <div className="aspect-[16/9] w-full bg-surface-container-lowest" />
            <div className="p-5 flex flex-col gap-3">
              <div className="h-5 w-3/4 bg-surface-container-high rounded" />
              <div className="h-3 w-full bg-surface-container-low rounded" />
              <div className="h-10 w-full bg-surface-container-low rounded-xl mt-2" />
            </div>
          </div>
        ))}
      </div>
    ) : error ? (
      <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5 sm:p-8 text-center">
        <Icon name="error" className="text-red-400 text-4xl mb-2" />
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchProjects}
          className="mt-4 rounded-xl border border-outline-variant/30 px-4 py-2 text-xs text-on-surface hover:bg-surface-container transition"
        >
          Tentar novamente
        </button>
      </div>
    ) : projects.length === 0 ? (
      /* Estado Vazio */
      <div className="rounded-3xl border border-dashed border-outline-variant/30 bg-surface-container/20 p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Icon name="movie" className="text-3xl" />
        </div>
        <h3 className="mt-5 text-xl font-bold text-on-surface">
          {search || statusFilter !== "active"
            ? "Nenhum projeto encontrado com estes filtros"
            : "Seu estúdio ainda não possui projetos"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
          {search || statusFilter !== "active"
            ? "Tente ajustar o termo de busca ou redefinir os filtros de estado."
            : "Crie o seu primeiro projeto cinematográfico ou selecione um preset para estruturar personagens, consistência de iluminação, cenas e gerar prompts prontos para IA."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {search || statusFilter !== "active" ? (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("active");
              }}
              className="rounded-xl border border-outline-variant/30 px-5 py-2.5 text-xs text-on-surface hover:bg-surface-container transition"
            >
              Limpar filtros
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPresetsModalOpen(true)}
                className="rounded-xl border border-outline-variant/40 px-5 py-2.5 text-xs text-on-surface hover:bg-surface-container transition flex items-center gap-2"
              >
                <Icon name="tune" className="text-[16px] text-secondary" />
                <span>Usar Preset</span>
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-on-primary transition hover:bg-primary-fixed shadow-md shadow-primary/20"
              >
                Criar Primeiro Projeto
              </button>
            </div>
          )}
        </div>
      </div>
    ) : viewMode === "cards" ? (
      /* GRID DE QUADROS DO SPACES (ESTILO MAGNIFIC SPACES BOARD PREVIEW) */
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => {
          const isStarred = starredProjectIds.has(project.id);
          const previewImages = project.generatedImages || [];
          const vis = project.visibility || "TEAM";
          const visBadge =
            vis === "PRIVATE"
              ? { icon: "🔒", label: "Privado", cls: "text-amber-400 bg-amber-500/10 border-amber-500/25" }
              : vis === "SELECTED"
              ? {
                  icon: "🎯",
                  label: `${project._count?.spaceMembers || project.spaceMembers?.length || 0} membro(s)`,
                  cls: "text-purple-400 bg-purple-500/10 border-purple-500/25",
                }
              : { icon: "👥", label: "Equipe", cls: "text-primary bg-primary/10 border-primary/25" };
    
          return (
            <article
              key={project.id}
              className="group flex flex-col gap-2.5"
            >
              {/* Mini-Board Visual Preview Box (Estilo Magnific Spaces) */}
              <div
                className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-surface-container-low transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-0.5 ${
                  project.isArchived
                    ? "border-amber-500/30 opacity-75"
                    : "border-outline-variant/30 group-hover:border-primary/50"
                }`}
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="absolute inset-0 z-10 flex items-center justify-center p-5"
                >
                  {previewImages.length >= 3 ? (
                    /* Collage estilo fluxo de nós com linhas conectoras */
                    <div className="relative flex h-full w-full items-center justify-center gap-3">
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
                        viewBox="0 0 300 200"
                      >
                        <path
                          d="M 75 100 C 115 100, 115 65, 150 65"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                        />
                        <path
                          d="M 75 100 C 115 100, 115 135, 150 135"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                        />
                        <path
                          d="M 190 65 C 215 65, 215 100, 240 100"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                        />
                      </svg>
    
                      <div className="relative z-10 h-28 w-20 overflow-hidden rounded-xl border border-white/20 shadow-lg">
                        <img loading="lazy" decoding="async"
                          src={previewImages[0].imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
    
                      <div className="relative z-10 flex flex-col gap-2">
                        <div className="h-16 w-24 overflow-hidden rounded-xl border border-white/20 shadow-lg">
                          <img loading="lazy" decoding="async"
                            src={previewImages[1].imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="h-16 w-24 overflow-hidden rounded-xl border border-white/20 shadow-lg">
                          <img loading="lazy" decoding="async"
                            src={previewImages[2].imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
    
                      {previewImages[3] && (
                        <div className="relative z-10 h-32 w-20 overflow-hidden rounded-xl border border-white/20 shadow-lg">
                          <img loading="lazy" decoding="async"
                            src={previewImages[3].imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ) : previewImages.length > 0 ? (
                    <div className="relative flex h-full w-full items-center justify-center gap-3">
                      {previewImages.slice(0, 2).map((img, i) => (
                        <div
                          key={img.id}
                          className={`overflow-hidden rounded-xl border border-white/20 shadow-xl ${
                            i === 0 ? "h-36 w-28" : "h-28 w-36"
                          }`}
                        >
                          <img loading="lazy" decoding="async"
                            src={img.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Mini diagrama de nós estilizado quando o Space ainda não tem imagens */
                    <div className="relative flex h-full w-full items-center justify-center">
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
                        viewBox="0 0 300 200"
                      >
                        <path
                          d="M 90 100 C 130 100, 130 75, 175 75"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />
                        <path
                          d="M 90 100 C 130 100, 130 130, 175 130"
                          fill="none"
                          stroke="#4edea3"
                          strokeWidth="2"
                        />
                      </svg>
                      <div className="flex items-center gap-5">
                        <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-2.5 shadow-md">
                          <span className="text-base">📜</span>
                          <span className="mt-1 text-[9px] font-mono text-on-surface-variant">
                            {project._count.scenes} Cenas
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-2 shadow-md">
                            <span className="text-xs">👤</span>
                            <span className="text-[9px] font-mono text-on-surface-variant">
                              {project._count.characters} Personagens
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 shadow-md">
                            <span className="text-xs">🎬</span>
                            <span className="text-[9px] font-mono text-purple-400">
                              Vídeo & Imagem
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
    
                {/* Top-Right Hover Quick Actions */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => toggleStarProject(project.id, e)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container/90 text-xs text-on-surface-variant hover:text-primary"
                    title={isStarred ? "Remover dos favoritos" : "Favoritar Space"}
                  >
                    {isStarred ? "★" : "☆"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProjectToShare(project);
                    }}
                    className="flex h-7 items-center gap-1 rounded-lg border border-outline-variant/30 bg-surface-container/90 px-2 text-[10px] font-semibold text-on-surface hover:border-primary hover:text-primary"
                    title="Configurar compartilhamento deste Space com a equipe"
                  >
                    <span>🔗</span>
                    <span>Compartilhar</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenEdit(project);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container/90 text-xs text-on-surface-variant hover:text-on-surface"
                    title="Editar configurações"
                  >
                    ✎
                  </button>
                </div>
    
                {/* Bottom Status & Visibility Pill inside Canvas Box (Magnific style) */}
                <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container/90 px-2.5 py-1 text-[10px] font-medium text-on-surface-variant shadow-sm">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        project.isArchived ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                    <span>{project.isArchived ? "Arquivado" : "Status"}</span>
                    <span className="opacity-40">•</span>
                    <span>📄 {project._count.boards || 1}</span>
                  </div>
    
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProjectToShare(project);
                    }}
                    className={`pointer-events-auto inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition hover:opacity-90 ${visBadge.cls}`}
                    title="Alterar quem pode visualizar este Space"
                  >
                    <span>{visBadge.icon}</span>
                    <span>{visBadge.label}</span>
                  </button>
                </div>
              </div>
    
              {/* Abaixo do Card: Título, Tempo e Ações Secundárias (Magnific style) */}
              <div className="flex items-start justify-between gap-2 px-1">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${project.id}`}
                    className="block truncate text-sm font-bold text-on-surface hover:text-primary transition-colors"
                  >
                    {project.title || "Sem título"}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-on-surface-variant">
                    <span>{formatDate(project.updatedAt)}</span>
                    {project.genre && (
                      <>
                        <span>•</span>
                        <span className="truncate">{project.genre}</span>
                      </>
                    )}
                  </div>
                </div>
    
                {/* Menu compacto de ações */}
                <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(project)}
                    disabled={duplicatingId === project.id}
                    title="Duplicar Space"
                    className="rounded-lg p-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(project)}
                    title={project.isArchived ? "Restaurar Space" : "Arquivar Space"}
                    className="rounded-lg p-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-amber-400"
                  >
                    📦
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectToDelete(project)}
                    title="Excluir Space"
                    className="rounded-lg p-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-error"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    ) : (
      /* TABELA DETALHADA CINEMATOGRÁFICA */
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low/70 shadow-md">
        <table className="w-full text-left text-sm text-on-surface min-w-[660px]">
          <thead className="border-b border-outline-variant/30 bg-surface-container-lowest/80 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-6 py-4">Projeto</th>
              <th className="px-4 py-4">Gênero</th>
              <th className="px-4 py-4">Formato / IA</th>
              <th className="px-4 py-4">Módulos</th>
              <th className="px-4 py-4">Última Atualização</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 font-body-sm text-xs">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-surface-container/60 transition">
                <td className="px-6 py-4">
                  <Link href={`/projects/${project.id}`} className="font-semibold text-on-surface hover:text-primary flex items-center gap-2">
                    <span>{project.title}</span>
                    {project.isArchived && (
                      <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px]">
                        Arquivado
                      </span>
                    )}
                  </Link>
                  <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{project.description}</p>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/20 text-[11px]">
                    {project.genre || "Geral"}
                  </span>
                </td>
                <td className="px-4 py-4 font-mono text-[11px] text-on-surface-variant">
                  {project.configuration?.aspectRatio || "16:9"} · {project.configuration?.targetPlatform || "Google Flow"}
                </td>
                <td className="px-4 py-4 font-label-code text-[11px]">
                  {project._count.characters}P · {project._count.environments}A · {project._count.scenes}C · {project._count.parameterValues}V
                </td>
                <td className="px-4 py-4 text-on-surface-variant text-[11px]">{formatDate(project.updatedAt)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/projects/${project.id}`}
                      className="rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary px-3 py-1 font-semibold text-xs transition"
                    >
                      Abrir
                    </Link>
                    <button
                      onClick={() => handleOpenEdit(project)}
                      className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                      title="Editar"
                    >
                      <Icon name="edit" className="text-[16px]" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(project)}
                      className="p-1 rounded text-on-surface-variant hover:text-primary"
                      title="Duplicar"
                    >
                      <Icon name="content_copy" className="text-[16px]" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(project)}
                      className="p-1 rounded text-on-surface-variant hover:text-amber-400"
                      title={project.isArchived ? "Restaurar" : "Arquivar"}
                    >
                      <Icon name={project.isArchived ? "unarchive" : "archive"} className="text-[16px]" />
                    </button>
                    <button
                      onClick={() => setProjectToTransfer(project)}
                      className="p-1 rounded text-on-surface-variant hover:text-secondary"
                      title="Transferir Workspace"
                    >
                      <Icon name="swap_horiz" className="text-[16px]" />
                    </button>
                    <button
                      onClick={() => setProjectToDelete(project)}
                      className="p-1 rounded text-on-surface-variant hover:text-error"
                      title="Excluir"
                    >
                      <Icon name="delete" className="text-[16px]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    </>
  );
}
