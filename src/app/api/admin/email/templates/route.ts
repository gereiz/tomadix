import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { EMAIL_TEMPLATE_CATALOG, renderTemplateSample } from "@/modules/email/email-template-catalog";

export const dynamic = "force-dynamic";

/** Lista os modelos de e-mail; com ?key=... devolve a pré-visualização (assunto + HTML de exemplo). */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ templates: EMAIL_TEMPLATE_CATALOG });
    }
    const rendered = renderTemplateSample(key);
    if (!rendered) {
      return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ subject: rendered.subject, html: rendered.html });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Erro ao listar modelos de e-mail." }, { status: 500 });
  }
}
