import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/modules/auth/auth.schema";
import { AuthService, ValidationError } from "@/modules/auth/auth.service";
import { setSessionCookie } from "@/lib/session";
import { checkRateLimit } from "@/lib/security";
import { getClientContext } from "@/lib/auth";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getClientContext();
    const rateLimitKey = `register:${ctx.ipAddress || "unknown"}`;
    const rateLimit = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 60 * 1000 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas de registro. Aguarde alguns instantes antes de tentar novamente." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = registerSchema.parse(body);

    const result = await AuthService.register(validated, ctx);

    // Grava o cookie de sessão HTTP-only
    await setSessionCookie(result.sessionToken);

    return NextResponse.json(
      {
        message: "Conta criada com sucesso!",
        user: result.user,
        workspace: result.workspace,
        confirmationToken: result.confirmationToken,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados de registro inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro no cadastro:", error);
    return NextResponse.json({ error: "Erro interno ao processar cadastro." }, { status: 500 });
  }
}
