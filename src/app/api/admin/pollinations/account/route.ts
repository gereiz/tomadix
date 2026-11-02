import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PollinationsAccountService } from "@/modules/pollinations/pollinations-account.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    const overview = await PollinationsAccountService.getAccountOverview(refresh);

    return NextResponse.json({
      success: true,
      ...overview,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar dados da conta Pollinations." },
      { status: 500 }
    );
  }
}
