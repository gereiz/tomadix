"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SelectedMap,
  SelectedMemberEntry,
  SpaceVisibilityType,
  WorkspaceMemberOption,
} from "./types";

interface UseSpaceSharingOptions {
  projectId: string;
  projectTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (result: { visibility: SpaceVisibilityType; selectedCount: number }) => void;
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Estado e chamadas à API de compartilhamento de um Space. */
export function useSpaceSharing({ projectId, projectTitle, isOpen, onClose, onUpdated }: UseSpaceSharingOptions) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [title, setTitle] = useState(projectTitle || "Space");
  const [visibility, setVisibility] = useState<SpaceVisibilityType>("TEAM");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [canManageSharing, setCanManageSharing] = useState(true);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberOption[]>([]);
  const [selectedMap, setSelectedMap] = useState<SelectedMap>({});
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (!isOpen || !projectId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/projects/${projectId}/sharing`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Não foi possível carregar opções de compartilhamento.");
        }
        return json.data;
      })
      .then((data) => {
        setTitle(data.title || projectTitle || "Space");
        setVisibility(data.visibility || "TEAM");
        setOwnerUserId(data.ownerUserId || "");
        setCanManageSharing(Boolean(data.canManageSharing));
        setWorkspaceMembers(data.workspaceMembers || []);

        const initialSelected: SelectedMap = {};
        for (const sm of (data.selectedMembers || []) as SelectedMemberEntry[]) {
          initialSelected[sm.userId] = { canEdit: sm.canEdit ?? true };
        }
        setSelectedMap(initialSelected);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(messageOf(err, "Erro ao carregar compartilhamento."));
        setLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, projectId, projectTitle]);

  const toggleMember = useCallback(
    (userId: string) => {
      if (!canManageSharing) return;
      setSelectedMap((prev) => {
        const next = { ...prev };
        if (next[userId]) delete next[userId];
        else next[userId] = { canEdit: true };
        return next;
      });
    },
    [canManageSharing]
  );

  const setMemberPermission = useCallback(
    (userId: string, canEdit: boolean) => {
      if (!canManageSharing) return;
      setSelectedMap((prev) => ({ ...prev, [userId]: { canEdit } }));
    },
    [canManageSharing]
  );

  const copyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}/projects/${projectId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [projectId]);

  const save = useCallback(async () => {
    if (!canManageSharing) return;
    setSaving(true);
    setError(null);

    try {
      const members = Object.entries(selectedMap).map(([userId, cfg]) => ({ userId, canEdit: cfg.canEdit }));
      const res = await fetch(`/api/projects/${projectId}/sharing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility, members }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao salvar compartilhamento.");

      onUpdated?.({ visibility, selectedCount: members.length });
      onClose();
    } catch (err: unknown) {
      setError(messageOf(err, "Erro ao salvar compartilhamento."));
    } finally {
      setSaving(false);
    }
  }, [canManageSharing, onClose, onUpdated, projectId, selectedMap, visibility]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return workspaceMembers;
    return workspaceMembers.filter(
      (m) => m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [workspaceMembers, memberSearch]);

  return {
    loading, saving, error, copiedLink,
    title, visibility, setVisibility, ownerUserId, canManageSharing,
    selectedMap, memberSearch, setMemberSearch, filteredMembers,
    toggleMember, setMemberPermission, copyLink, save,
  };
}
