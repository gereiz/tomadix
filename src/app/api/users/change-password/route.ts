import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { UserProfileService } from "@/modules/users/user-profile.service";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Senha atual e nova senha são obrigatórias." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cineprompt_session")?.value;

    await UserProfileService.changePassword(
      user.id,
      currentPassword,
      newPassword,
      sessionCookie
    );

    return NextResponse.json({
      message: "Senha alterada com sucesso! As demais sessões foram encerradas por segurança.",
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Erro ao alterar senha." },
      { status: 400 }
    );
  }
}
