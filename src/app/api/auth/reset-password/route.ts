import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/modules/auth/auth.schema";
import { AuthService, ValidationError } from "@/modules/auth/auth.service";
import { setSessionCookie } from "@/lib/session";
import { checkRateLimit } from "@/lib/security";
import { getClientContext } from "@/lib/auth";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getClientContext();
    const rateLimitKey = `reset:${ctx.ipAddress || "unknown"}`;
    const rateLimit = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 60 * 1000 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde um minuto e tente novamente." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = resetPasswordSchema.parse(body);

    const result = await AuthService.resetPassword(validated.token, validated.password, ctx);

    // Grava cookie de sessão com a nova sessão criada
    await setSessionCookie(result.sessionToken);

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso!",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro na redefinição de senha:", error);
    return NextResponse.json({ error: "Erro interno ao redefinir senha." }, { status: 500 });
  }
}
