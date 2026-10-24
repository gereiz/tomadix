import { NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { UserProfileService } from "@/modules/users/user-profile.service";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cineprompt_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Sessão atual não identificada." }, { status: 400 });
    }

    const { revokedCount } = await UserProfileService.revokeOtherSessions(
      user.id,
      sessionCookie
    );

    return NextResponse.json({
      message: `${revokedCount} outra(s) sessão(ões) ativa(s) encerrada(s) com sucesso.`,
      revokedCount,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao revogar outras sessões:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao revogar outras sessões." },
      { status: 500 }
    );
  }
}
