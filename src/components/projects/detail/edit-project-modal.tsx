"use client";

import type { ProjectDetailTabState } from "./use-project-detail";

interface EditProjectModalProps {
  s: ProjectDetailTabState;
}

export function EditProjectModal({ s }: EditProjectModalProps) {
  const { isEditModalOpen, setIsEditModalOpen, editFormData, setEditFormData, editSaving, editError, handleSaveProjectEdit, project } = s;
  if (!project) return null;

  return (
    <>
    {isEditModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d111c] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Editar Dados Essenciais do Projeto</h3>
              <p className="text-xs text-white/50 mt-0.5">
                Atualize os metadados cinematográficos para enriquecer o contexto e a Bíblia Visual.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>
    
          <form onSubmit={handleSaveProjectEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Nome / Título do Projeto *
              </label>
              <input
                type="text"
                required
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
              />
            </div>
    
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Sinopse / Premissa Dramática * (Mínimo de 10 caracteres)
              </label>
              <textarea
                required
                rows={4}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Descreva o enredo central, tema dramático, tom narrativo e atmosfera pretendida..."
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white focus:border-primary focus:outline-none resize-none"
              />
            </div>
    
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Gênero Cinematográfico *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.genre}
                  onChange={(e) => setEditFormData({ ...editFormData, genre: e.target.value })}
                  placeholder="Ex: Sci-Fi, Cyberpunk, Noir, Drama..."
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Proporção de Tela (Aspect Ratio)
                </label>
                <select
                  value={editFormData.aspectRatio}
                  onChange={(e) => setEditFormData({ ...editFormData, aspectRatio: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none cursor-pointer"
                >
                  <option value="16:9">16:9 (Widescreen Padrão)</option>
                  <option value="9:16">9:16 (Vertical / Reels / TikTok)</option>
                  <option value="2.39:1">2.39:1 (Cinemascope Anamórfico)</option>
                  <option value="4:3">4:3 (Academia / Retrô)</option>
                  <option value="1:1">1:1 (Quadrado)</option>
                </select>
              </div>
            </div>
    
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Color Grading / Tratamento Cromático (Opcional)
              </label>
              <input
                type="text"
                value={editFormData.colorGrade}
                onChange={(e) => setEditFormData({ ...editFormData, colorGrade: e.target.value })}
                placeholder="Ex: Teal and Orange, Bleach Bypass, Monocromático de alto contraste..."
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
              />
            </div>
    
            {editError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {editError}
              </div>
            )}
    
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {editSaving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
