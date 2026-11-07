import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";

interface PromptJsonModalProps {
  /** Ex.: "Prompt-Base Estruturado do Personagem" */
  title: string;
  promptData: unknown;
  loading: boolean;
  copySuccess: boolean;
  onCopy: () => void;
  onClose: () => void;
}

/** Mostra o prompt JSON compilado de uma entidade, com cópia em um clique. */
export function PromptJsonModal({ title, promptData, loading, copySuccess, onCopy, onClose }: PromptJsonModalProps) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-mono text-primary border border-primary/20">
              JSON v1.0
            </span>
            <h3 className="text-base font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6 border-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-primary max-h-96 overflow-y-auto">
                <pre>{JSON.stringify(promptData, null, 2)}</pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-white/50">
                  Compatível com Google Flow, Nano Banana e geradores cinematográficos.
                </span>
                <button
                  onClick={onCopy}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 transition"
                >
                  <Icon name={copySuccess ? "check" : "content_copy"} size={16} />
                  {copySuccess ? "Copiado com Sucesso!" : "Copiar JSON (1-Clique)"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
