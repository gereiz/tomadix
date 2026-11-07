"use client";


interface BoardToolbarProps {
  canEdit: boolean;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
  addVideoGeneratorNode: () => void;
  addPromptNode: () => void;
  addNoteNode: () => void;
  handleAutoOrganize: () => void;
  onFitView: () => void;
}

export function BoardToolbar({ canEdit, isLibraryOpen, onToggleLibrary, onGenerateImage, onGenerateVideo, addVideoGeneratorNode, addPromptNode, addNoteNode, handleAutoOrganize, onFitView }: BoardToolbarProps) {
  return (
    <div className="pointer-events-auto absolute left-3.5 top-1/2 z-20 -translate-y-1/2 flex flex-col items-center gap-1.5 rounded-2xl border border-outline-variant/30 bg-surface-container/95 p-1.5 shadow-2xl">
      <button
        type="button"
        onClick={onToggleLibrary}
        title="Abrir Biblioteca do Space (Arrastar Imagens, Prompts, Personagens)"
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold transition ${isLibraryOpen
          ? "bg-primary text-on-primary shadow-md shadow-primary/30"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          }`}
      >
        +
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={onGenerateImage}
        title="Gerar Nova Imagem com IA direto no Board"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        🖼️
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={onGenerateVideo}
        title="Gerar Vídeo com IA direto no Board (Pollinations)"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-purple-400 transition hover:bg-purple-500/20 hover:text-purple-300 disabled:opacity-40"
      >
        🎥
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={addVideoGeneratorNode}
        title="Adicionar Nó Gerador de Vídeos (Preparado para Vídeo IA)"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        🎬
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => addPromptNode()}
        title="Adicionar Bloco de Prompt Conectável"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        📜
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={addNoteNode}
        title="Adicionar Nota Colaborativa"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        💬
      </button>
    
      <div className="my-0.5 h-[1px] w-6 bg-outline-variant/30" />
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={handleAutoOrganize}
        title="Organizar e alinhar elementos automaticamente"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        ✨
      </button>
    
      <button
        type="button"
        onClick={onFitView}
        title="Centralizar visualização (Fit View)"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
      >
        🎯
      </button>
    </div>
  );
}
