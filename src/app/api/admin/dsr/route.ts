import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PrivacyService } from "@/modules/privacy/privacy.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await PrivacyService.listDataSubjectRequests({ status, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao consultar solicitações." }, { status: 500 });
  }
}
