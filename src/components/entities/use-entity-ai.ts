"use client";

import { useCallback, useState } from "react";
import type { EntityLabels, EntityResource } from "./types";

interface UseEntityAiOptions<F extends Record<string, string>> {
  projectId: string;
  resource: EntityResource;
  labels: EntityLabels;
  /** Campos extras além do briefing (ex.: arquétipo e papel; tipo de local). */
  initialFields: F;
  /** Mensagem exibida quando o briefing está vazio. */
  emptyPromptMessage: string;
  /** Monta o corpo enviado a /<recurso>/generate. */
  buildBody: (prompt: string, fields: F) => Record<string, unknown>;
  /** Chamado depois que a geração termina (recarrega a lista, atualiza contadores). */
  onGenerated: () => void | Promise<void>;
}

/** Geração de personagem ou ambiente com IA: briefing, campos extras, créditos e eventos globais. */
export function useEntityAi<F extends Record<string, string>>({
  projectId,
  resource,
  labels,
  initialFields,
  emptyPromptMessage,
  buildBody,
  onGenerated,
}: UseEntityAiOptions<F>) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [fields, setFields] = useState<F>(initialFields);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = useCallback(() => {
    setPrompt("");
    setFields(initialFields);
    setError(null);
    setOpen(true);
  }, [initialFields]);

  const close = useCallback(() => setOpen(false), []);

  const setField = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const submit = useCallback(async () => {
    if (!prompt.trim()) {
      setError(emptyPromptMessage);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/${resource}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(prompt, fields)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Falha ao conceber ${labels.singular} com IA.`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.newBalance } }));
        window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: resource, projectId } }));
      }
      setOpen(false);
      await onGenerated();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : `Erro ao gerar ${labels.singular} com IA.`);
    } finally {
      setLoading(false);
    }
  }, [buildBody, emptyPromptMessage, fields, labels.singular, onGenerated, projectId, prompt, resource]);

  return { open, prompt, setPrompt, fields, setField, loading, error, openModal, close, submit };
}

export type EntityAiState<F extends Record<string, string>> = ReturnType<typeof useEntityAi<F>>;
