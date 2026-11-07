import { HOME_PROMPT_SAMPLE } from "@/config/home-content";

/** Exemplo estático: uma cena em texto virando o JSON que o estúdio entrega. */
export function PromptPreview() {
  const { file, scene, json } = HOME_PROMPT_SAMPLE;
  return (
    <figure className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
      <figcaption className="border-b border-outline-variant/30 px-4 py-2 text-xs text-on-surface-variant">
        Exemplo de cena e do prompt gerado
      </figcaption>
      <div className="border-b border-outline-variant/30 p-4">
        <p className="text-xs text-on-surface-variant">Cena</p>
        <p className="mt-1 text-sm leading-6 text-on-surface">{scene}</p>
      </div>
      <div className="p-4">
        <p className="font-label-code text-xs text-primary">{file}</p>
        <pre className="mt-2 overflow-x-auto font-label-code text-xs leading-6 text-on-surface-variant">
          <code>{json.join("\n")}</code>
        </pre>
      </div>
    </figure>
  );
}
