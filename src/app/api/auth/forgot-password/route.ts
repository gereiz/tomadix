import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { checkRateLimit } from "@/lib/security";
import { getClientContext } from "@/lib/auth";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getClientContext();
    const rateLimitKey = `forgot:${ctx.ipAddress || "unknown"}`;
    const rateLimit = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 60 * 1000 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Muitas solicitações. Aguarde um minuto antes de tentar novamente." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = forgotPasswordSchema.parse(body);

    const result = await AuthService.requestPasswordReset(validated.email, ctx);

    return NextResponse.json({
      message: result.message,
      resetToken: result.resetToken, // Disponível para ambiente de testes e desenvolvimento
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "E-mail inválido.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }
    console.error("Erro na recuperação de senha:", error);
    return NextResponse.json({ error: "Erro interno ao processar recuperação." }, { status: 500 });
  }
}
