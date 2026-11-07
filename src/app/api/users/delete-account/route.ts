import { parseJsonBody, deleteAccountBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { UserProfileService } from "@/modules/users/user-profile.service";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const parsed = await parseJsonBody(request, deleteAccountBodySchema);
    if (parsed.response) return parsed.response;
    const { passwordConfirmation } = parsed.data;

    await UserProfileService.deleteAccount(user.id, passwordConfirmation);

    // Limpa os cookies de sessão
    const cookieStore = await cookies();
    cookieStore.delete("cineprompt_session");
    cookieStore.delete("cineprompt_active_workspace");

    return NextResponse.json({
      message: "Sua conta e estúdios pessoais foram excluídos com sucesso.",
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao excluir conta:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar exclusão de conta." },
      { status: 400 }
    );
  }
}
