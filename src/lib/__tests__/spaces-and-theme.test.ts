import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertSpaceAccess, AuthorizationError, NotFoundError } from "@/lib/auth";
import { resolveEffectiveTheme } from "@/lib/theme-utils";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findFirst: vi.fn(),
    },
  },
}));

describe("Spaces Access Control (assertSpaceAccess)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when project does not exist in workspace", async () => {
    (db.project.findFirst as any).mockResolvedValue(null);

    await expect(
      assertSpaceAccess("proj-1", "ws-1", "user-1", "MEMBER", "view")
    ).rejects.toThrow(NotFoundError);
  });

  it("allows PRIVATE space for its creator (ownerUserId) and blocks other regular members", async () => {
    (db.project.findFirst as any).mockResolvedValue({
      id: "proj-priv",
      workspaceId: "ws-1",
      ownerUserId: "user-creator",
      visibility: "PRIVATE",
      spaceMembers: [],
    });

    // Creator has access
    const allowed = await assertSpaceAccess("proj-priv", "ws-1", "user-creator", "MEMBER", "edit");
    expect(allowed.id).toBe("proj-priv");

    // Workspace OWNER has access
    const adminAllowed = await assertSpaceAccess("proj-priv", "ws-1", "user-boss", "OWNER", "edit");
    expect(adminAllowed.id).toBe("proj-priv");

    // Other regular member is blocked
    await expect(
      assertSpaceAccess("proj-priv", "ws-1", "user-other", "MEMBER", "view")
    ).rejects.toThrow(AuthorizationError);
  });

  it("enforces SELECTED space membership and granular edit permissions", async () => {
    (db.project.findFirst as any).mockResolvedValue({
      id: "proj-sel",
      workspaceId: "ws-1",
      ownerUserId: "user-creator",
      visibility: "SELECTED",
      spaceMembers: [
        { userId: "user-editor", canEdit: true },
        { userId: "user-viewer", canEdit: false },
      ],
    });

    // Selected editor can view and edit
    await expect(
      assertSpaceAccess("proj-sel", "ws-1", "user-editor", "MEMBER", "edit")
    ).resolves.toMatchObject({ id: "proj-sel" });

    // Selected viewer can view, but cannot edit
    await expect(
      assertSpaceAccess("proj-sel", "ws-1", "user-viewer", "MEMBER", "view")
    ).resolves.toMatchObject({ id: "proj-sel" });

    await expect(
      assertSpaceAccess("proj-sel", "ws-1", "user-viewer", "MEMBER", "edit")
    ).rejects.toThrow(AuthorizationError);

    // Unselected member cannot view
    await expect(
      assertSpaceAccess("proj-sel", "ws-1", "user-outsider", "MEMBER", "view")
    ).rejects.toThrow(AuthorizationError);
  });

  it("allows all workspace members to view TEAM spaces and blocks VIEWER role from editing", async () => {
    (db.project.findFirst as any).mockResolvedValue({
      id: "proj-team",
      workspaceId: "ws-1",
      ownerUserId: "user-creator",
      visibility: "TEAM",
      spaceMembers: [],
    });

    await expect(
      assertSpaceAccess("proj-team", "ws-1", "user-any", "MEMBER", "edit")
    ).resolves.toMatchObject({ id: "proj-team" });

    await expect(
      assertSpaceAccess("proj-team", "ws-1", "user-readonly", "VIEWER", "view")
    ).resolves.toMatchObject({ id: "proj-team" });

    await expect(
      assertSpaceAccess("proj-team", "ws-1", "user-readonly", "VIEWER", "edit")
    ).rejects.toThrow(AuthorizationError);
  });
});

describe("Theme Mode Resolution", () => {
  it("resolves explicit light and dark modes accurately", () => {
    expect(resolveEffectiveTheme("light")).toBe("light");
    expect(resolveEffectiveTheme("dark")).toBe("dark");
  });
});
