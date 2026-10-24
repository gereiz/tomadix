import { NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { UserProfileService } from "@/modules/users/user-profile.service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const data = await UserProfileService.exportUserData(user.id);

    const jsonString = JSON.stringify(data, null, 2);
    const filename = `tomadix-dados-usuario-${user.email.replace(/[^a-zA-Z0-9]/g, "_")}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao exportar dados do usuário:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar exportação de dados." },
      { status: 500 }
    );
  }
}
