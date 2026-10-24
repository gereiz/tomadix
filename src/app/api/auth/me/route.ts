import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailConfirmed: user.emailConfirmed,
        platformRole: user.platformRole,
        isPlatformAdmin: user.platformRole === "ADMIN" || user.platformRole === "SUPER_ADMIN",
        memberships: user.memberships.map((m) => ({
          workspaceId: m.workspaceId,
          workspaceName: m.workspace.name,
          workspaceSlug: m.workspace.slug,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    console.error("Erro ao verificar sessão do usuário:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
