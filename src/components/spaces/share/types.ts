export type SpaceVisibilityType = "PRIVATE" | "TEAM" | "SELECTED";

export interface WorkspaceMemberOption {
  userId: string;
  displayName: string;
  email: string;
  workspaceRole: string;
}

export interface SelectedMemberEntry {
  userId: string;
  canEdit: boolean;
  displayName?: string;
  email?: string;
}

/** Permissões dos membros selecionados, indexadas por userId. */
export type SelectedMap = Record<string, { canEdit: boolean }>;
