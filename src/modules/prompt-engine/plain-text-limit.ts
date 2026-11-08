import { formatPromptToPlainText } from "./format-plain-text";
import { PLAIN_TEXT_LIMIT } from "./tool-profiles";

/** Tamanho mínimo que uma linha longa (ex.: o prompt compilado) mantém antes de começarmos a descartar linhas finais. */
const MIN_LONG_LINE = 400;
const ELLIPSIS = "…";

/** Corta o texto no último fim de frase (ou vírgula/espaço) que caiba em `max`, sem partir palavras. */
export function truncateAtBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const budget = Math.max(0, max - ELLIPSIS.length);
  const slice = text.slice(0, budget);
  const sentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "), slice.lastIndexOf("\n"));
  if (sentence >= budget * 0.6) return slice.slice(0, sentence + 1).trimEnd();
  const comma = Math.max(slice.lastIndexOf(", "), slice.lastIndexOf("; "));
  if (comma >= budget * 0.6) return slice.slice(0, comma).trimEnd() + ELLIPSIS;
  const space = slice.lastIndexOf(" ");
  return (space > 0 ? slice.slice(0, space) : slice).trimEnd() + ELLIPSIS;
}

/**
 * Garante que um texto simples caiba em `limit` caracteres.
 * Primeiro encolhe a linha mais longa (normalmente o prompt compilado), preservando
 * cabeçalhos e demais seções; só se não bastar descarta as últimas linhas.
 */
export function fitPlainText(text: string, limit: number = PLAIN_TEXT_LIMIT): string {
  if (text.length <= limit) return text;

  const lines = text.split("\n");
  const total = () => lines.reduce((sum, l) => sum + l.length, 0) + Math.max(0, lines.length - 1);

  while (total() > limit) {
    const overflow = total() - limit;
    let longestIdx = 0;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].length > lines[longestIdx].length) longestIdx = i;
    }
    const longest = lines[longestIdx];
    if (longest.length <= MIN_LONG_LINE) break;
    const target = Math.max(MIN_LONG_LINE, longest.length - overflow);
    const shrunk = truncateAtBoundary(longest, target);
    if (shrunk.length >= longest.length) break;
    lines[longestIdx] = shrunk;
  }

  // Último recurso: descarta as linhas finais (menor prioridade) e, se preciso, corta a última.
  while (total() > limit && lines.length > 1) lines.pop();
  let result = lines.join("\n");
  if (result.length > limit) result = truncateAtBoundary(result, limit);
  return result.trimEnd();
}

/**
 * Texto Simples final: aplica o limite de caracteres (somente aqui — o JSON mantém o conteúdo completo).
 * Na sequência de cenas o limite vale por cena.
 */
export function formatPlainTextWithLimit(data: unknown, templateKey: string, limit: number = PLAIN_TEXT_LIMIT): string {
  const text = formatPromptToPlainText(data, templateKey);
  if (!text) return text;
  if (templateKey === "scene_sequence") {
    return text
      .split(/\n(?=CENA #)/)
      .map((chunk) => fitPlainText(chunk, limit))
      .join("\n");
  }
  return fitPlainText(text, limit);
}
