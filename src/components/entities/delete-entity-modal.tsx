interface DeleteEntityModalProps {
  /** Ex.: "Personagem" */
  entityLabelCap: string;
  /** Ex.: "o personagem" */
  entityWithArticle: string;
  /** Ex.: "este personagem" */
  entityDemonstrative: string;
  name: string;
  sceneLinkCount: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmação de exclusão permanente de personagem ou ambiente. */
export function DeleteEntityModal({
  entityLabelCap,
  entityWithArticle,
  entityDemonstrative,
  name,
  sceneLinkCount,
  loading,
  onCancel,
  onConfirm,
}: DeleteEntityModalProps) {
  return (
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
      <div className="relative w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0f1218] p-6 shadow-2xl">
        <h3 className="text-base font-bold text-red-300">Excluir {entityLabelCap}?</h3>
        <p className="mt-2 text-xs text-white/70">
          Tem certeza que deseja excluir permanentemente {entityWithArticle}{" "}
          <strong className="text-white">&quot;{name}&quot;</strong>?
        </p>
        {sceneLinkCount > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs text-amber-300">
            Atenção: {entityDemonstrative[0].toUpperCase() + entityDemonstrative.slice(1)} está associado a{" "}
            {sceneLinkCount} cena(s). A exclusão removerá esses vínculos.
          </div>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
          >
            {loading ? "Excluindo..." : "Sim, Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
