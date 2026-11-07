import { parseJsonBody, updateProfileBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { UserProfileService } from "@/modules/users/user-profile.service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const profile = await UserProfileService.getProfile(user.id);
    return NextResponse.json({ data: profile });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao obter perfil:", error);
    return NextResponse.json({ error: "Erro interno ao processar a requisição." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const parsed = await parseJsonBody(request, updateProfileBodySchema);
    if (parsed.response) return parsed.response;

    const updated = await UserProfileService.updateProfile(user.id, {
      displayName: parsed.data.displayName,
      preferences: parsed.data.preferences,
    });

    return NextResponse.json({
      message: "Perfil atualizado com sucesso.",
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao atualizar perfil." },
      { status: 500 }
    );
  }
}
