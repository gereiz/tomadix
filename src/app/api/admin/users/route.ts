import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const role = searchParams.get("role") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await AdminUsersService.listUsers({
      search,
      status,
      role,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro interno ao listar usuários." },
      { status: 500 }
    );
  }
}
