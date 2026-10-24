import { NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { UserProfileService } from "@/modules/users/user-profile.service";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cineprompt_session")?.value;

    const sessions = await UserProfileService.listSessions(user.id, sessionCookie);

    return NextResponse.json({
      data: sessions,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao listar sessões:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a listagem de sessões." },
      { status: 500 }
    );
  }
}
