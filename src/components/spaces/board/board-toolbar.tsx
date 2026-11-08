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
    <div className="no-scrollbar pointer-events-auto absolute bottom-16 left-3 right-3 z-20 flex max-w-max flex-row items-center gap-1.5 overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container/95 p-1.5 shadow-2xl md:bottom-auto md:left-3.5 md:right-auto md:top-1/2 md:max-w-none md:-translate-y-1/2 md:flex-col md:overflow-visible">
      <button
        type="button"
        onClick={onToggleLibrary}
        title="Abrir Biblioteca do Space (Arrastar Imagens, Prompts, Personagens)"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-base font-bold transition ${isLibraryOpen
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        🖼️
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={onGenerateVideo}
        title="Gerar Vídeo com IA direto no Board (Pollinations)"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-sm text-purple-400 transition hover:bg-purple-500/20 hover:text-purple-300 disabled:opacity-40"
      >
        🎥
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={addVideoGeneratorNode}
        title="Adicionar Nó Gerador de Vídeos (Preparado para Vídeo IA)"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        🎬
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => addPromptNode()}
        title="Adicionar Bloco de Prompt Conectável"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        📜
      </button>
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={addNoteNode}
        title="Adicionar Nota Colaborativa"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        💬
      </button>
    
      <div className="mx-0.5 h-6 w-px shrink-0 bg-outline-variant/30 md:mx-0 md:my-0.5 md:h-px md:w-6" />
    
      <button
        type="button"
        disabled={!canEdit}
        onClick={handleAutoOrganize}
        title="Organizar e alinhar elementos automaticamente"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
      >
        ✨
      </button>
    
      <button
        type="button"
        onClick={onFitView}
        title="Centralizar visualização (Fit View)"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
      >
        🎯
      </button>
    </div>
  );
}
