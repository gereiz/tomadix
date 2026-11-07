import type { SelectedMap, WorkspaceMemberOption } from "./types";

interface MemberPickerProps {
  members: WorkspaceMemberOption[];
  ownerUserId: string;
  selectedMap: SelectedMap;
  search: string;
  disabled: boolean;
  onSearchChange: (value: string) => void;
  onToggle: (userId: string) => void;
  onPermissionChange: (userId: string, canEdit: boolean) => void;
}

export function MemberPicker({
  members,
  ownerUserId,
  selectedMap,
  search,
  disabled,
  onSearchChange,
  onToggle,
  onPermissionChange,
}: MemberPickerProps) {
  return (
    <div className="space-y-2.5 rounded-xl border border-white/10 bg-black/30 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-white/80">
          Membros com acesso ({Object.keys(selectedMap).length} selecionados)
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar membro..."
          className="w-44 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
        />
      </div>

      <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {members.length === 0 ? (
          <div className="py-4 text-center text-xs text-white/40">Nenhum membro encontrado na equipe.</div>
        ) : (
          members.map((member) => {
            const isAdmin = member.workspaceRole === "OWNER" || member.workspaceRole === "ADMIN";
            const isOwnerOrAdmin = member.userId === ownerUserId || isAdmin;
            const isChecked = isOwnerOrAdmin || Boolean(selectedMap[member.userId]);
            const canEdit = isOwnerOrAdmin ? true : (selectedMap[member.userId]?.canEdit ?? true);

            return (
              <div
                key={member.userId}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${
                  isChecked ? "border-primary/30 bg-primary/5" : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isOwnerOrAdmin || disabled}
                    onChange={() => onToggle(member.userId)}
                    className="h-4 w-4 rounded border-white/20 accent-emerald-400"
                  />
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold uppercase text-white">
                    {member.displayName.substring(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-xs font-semibold text-white">
                      <span className="truncate">{member.displayName}</span>
                      {member.userId === ownerUserId && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-300">
                          Criador
                        </span>
                      )}
                      {isAdmin && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-white/70">
                          {member.workspaceRole}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-white/50">{member.email}</div>
                  </div>
                </label>

                {isChecked && !isOwnerOrAdmin && (
                  <select
                    value={canEdit ? "edit" : "view"}
                    disabled={disabled}
                    onChange={(e) => onPermissionChange(member.userId, e.target.value === "edit")}
                    className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-[11px] font-medium text-white focus:border-primary focus:outline-none"
                  >
                    <option value="edit">Pode editar</option>
                    <option value="view">Somente ver</option>
                  </select>
                )}

                {isOwnerOrAdmin && <span className="text-[11px] font-medium text-white/40">Acesso total</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
