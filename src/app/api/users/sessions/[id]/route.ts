import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { UserProfileService } from "@/modules/users/user-profile.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    await UserProfileService.revokeSession(user.id, id);

    return NextResponse.json({
      message: "Sessão encerrada com sucesso.",
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao revogar sessão:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao revogar sessão." },
      { status: 400 }
    );
  }
}
