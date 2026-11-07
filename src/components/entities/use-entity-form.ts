"use client";

import { useCallback, useState } from "react";
import type { BaseEntity, EntityLabels, EntityResource } from "./types";

type FormFields = { name: string; description: string } & Record<string, string>;

interface UseEntityFormOptions<T extends BaseEntity, F extends FormFields> {
  projectId: string;
  resource: EntityResource;
  /** Tipo usado ao gravar parâmetros dinâmicos da entidade. */
  targetType: "CHARACTER" | "ENVIRONMENT";
  labels: EntityLabels;
  emptyForm: F;
  /** Converte a entidade carregada nos campos do formulário. */
  toForm: (entity: T) => F;
  /** Chamado depois de salvar com sucesso. */
  onSaved: () => void;
}

/**
 * Formulário de criação/edição de personagem ou ambiente: campos livres em `attributes`
 * e, opcionalmente, valores de parâmetros dinâmicos gravados logo após a entidade.
 */
export function useEntityForm<T extends BaseEntity, F extends FormFields>({
  projectId,
  resource,
  targetType,
  labels,
  emptyForm,
  toForm,
  onSaved,
}: UseEntityFormOptions<T, F>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [formData, setFormData] = useState<F>(emptyForm);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setParamValues({});
    setFormData(emptyForm);
    setError(null);
    setOpen(true);
  }, [emptyForm]);

  const openEdit = useCallback(
    (entity: T) => {
      setEditing(entity);
      setParamValues({});
      setFormData(toForm(entity));
      setError(null);
      setOpen(true);
    },
    [toForm]
  );

  const close = useCallback(() => setOpen(false), []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        setError(`O nome ${labels.ofThe} é obrigatório.`);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { name, description, ...rest } = formData;
        const attributes = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, value.trim()]));
        const payload = { name: name.trim(), description: description.trim(), attributes };

        const base = `/api/projects/${projectId}/${resource}`;
        const res = await fetch(editing ? `${base}/${editing.id}` : base, {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorJson = await res.json();
          throw new Error(errorJson.error || `Falha ao salvar dados ${labels.ofThe}.`);
        }

        const responseJson = await res.json();
        const savedId: string | undefined = editing?.id || responseJson.data?.id;

        if (savedId && Object.keys(paramValues).length > 0) {
          const values = Object.entries(paramValues)
            .filter(([, val]) => val !== undefined && val !== null && val !== "")
            .map(([defId, val]) => ({
              parameterDefinitionId: defId,
              targetType,
              targetId: savedId,
              value: val,
            }));

          if (values.length > 0) {
            await fetch(`/api/projects/${projectId}/parameters`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ values }),
            });
          }
        }

        setOpen(false);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      } finally {
        setLoading(false);
      }
    },
    [editing, formData, labels.ofThe, onSaved, paramValues, projectId, resource, targetType]
  );

  return {
    open,
    editing,
    formData,
    setFormData,
    paramValues,
    setParamValues,
    loading,
    error,
    openCreate,
    openEdit,
    close,
    submit,
  };
}

export type EntityFormState<T extends BaseEntity, F extends FormFields> = ReturnType<typeof useEntityForm<T, F>>;
