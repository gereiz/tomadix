"use client";

import { useCallback, useEffect, useState } from "react";
import type { BaseEntity, EntityLabels, EntityResource, EntityStatusFilter } from "./types";

interface UseEntityLibraryOptions {
  projectId: string;
  resource: EntityResource;
  labels: EntityLabels;
  onStatsUpdate?: () => void;
}

/**
 * Lista, filtros e ações comuns de personagens e ambientes: duplicar, arquivar,
 * excluir e visualizar o prompt JSON compilado.
 */
export function useEntityLibrary<T extends BaseEntity>({
  projectId,
  resource,
  labels,
  onStatsUpdate,
}: UseEntityLibraryOptions) {
  const base = `/api/projects/${projectId}/${resource}`;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EntityStatusFilter>("active");

  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptData, setPromptData] = useState<unknown>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`${base}?${params.toString()}`);
      if (!res.ok) throw new Error(`Erro ao carregar a biblioteca de ${resource}.`);
      const json = await res.json();
      setItems(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [base, resource, statusFilter, search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const afterChange = useCallback(() => {
    refetch();
    onStatsUpdate?.();
  }, [refetch, onStatsUpdate]);

  const duplicate = useCallback(
    async (item: T) => {
      try {
        const res = await fetch(`${base}/${item.id}/duplicate`, { method: "POST" });
        if (!res.ok) throw new Error(`Erro ao duplicar ${labels.withArticle}.`);
        afterChange();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao duplicar.");
      }
    },
    [base, labels.withArticle, afterChange]
  );

  const toggleArchive = useCallback(
    async (item: T) => {
      try {
        const action = item.isArchived ? "restore" : "archive";
        const res = await fetch(`${base}/${item.id}/${action}`, { method: "POST" });
        if (!res.ok) {
          throw new Error(`Erro ao ${action === "restore" ? "restaurar" : "arquivar"} ${labels.withArticle}.`);
        }
        afterChange();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao alterar estado.");
      }
    },
    [base, labels.withArticle, afterChange]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`${base}/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Erro ao excluir ${labels.withArticle}.`);
      }
      setDeleteTarget(null);
      afterChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteLoading(false);
    }
  }, [base, deleteTarget, labels.withArticle, afterChange]);

  const viewPrompt = useCallback(
    async (item: T) => {
      try {
        setPromptLoading(true);
        setPromptOpen(true);
        setCopySuccess(false);
        const res = await fetch(`${base}/${item.id}/prompt`);
        if (!res.ok) throw new Error(`Erro ao compilar prompt ${labels.ofThe}.`);
        const json = await res.json();
        setPromptData(json.data);
      } catch (err) {
        setPromptData({ error: err instanceof Error ? err.message : "Falha na compilação." });
      } finally {
        setPromptLoading(false);
      }
    },
    [base, labels.ofThe]
  );

  const copyPromptJson = useCallback(() => {
    if (!promptData) return;
    navigator.clipboard.writeText(JSON.stringify(promptData, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  }, [promptData]);

  return {
    items,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refetch,
    afterChange,
    duplicate,
    toggleArchive,
    deleteTarget,
    deleteLoading,
    requestDelete: setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete,
    promptOpen,
    promptData,
    promptLoading,
    copySuccess,
    viewPrompt,
    closePrompt: () => setPromptOpen(false),
    copyPromptJson,
  };
}
