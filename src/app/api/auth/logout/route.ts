import { NextResponse } from "next/server";
import { getSessionCookie, clearSessionCookie } from "@/lib/session";
import { AuthService } from "@/modules/auth/auth.service";

export async function POST() {
  try {
    const sessionToken = await getSessionCookie();

    if (sessionToken) {
      await AuthService.logout(sessionToken);
    }

    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: "Sessão encerrada com sucesso.",
    });
  } catch (error) {
    console.error("Erro no logout:", error);
    await clearSessionCookie();
    return NextResponse.json({ success: true, message: "Sessão encerrada." });
  }
}
