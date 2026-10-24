import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/modules/auth/auth.schema";
import { AuthService, AuthenticationError } from "@/modules/auth/auth.service";
import { setSessionCookie } from "@/lib/session";
import { checkRateLimit } from "@/lib/security";
import { getClientContext } from "@/lib/auth";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getClientContext();
    const rateLimitKey = `login:${ctx.ipAddress || "unknown"}`;
    const rateLimit = checkRateLimit(rateLimitKey, { limit: 10, windowMs: 60 * 1000 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Aguarde um minuto e tente novamente." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = loginSchema.parse(body);

    const result = await AuthService.login(validated, ctx);

    // Grava o cookie de sessão HTTP-only
    await setSessionCookie(result.sessionToken);

    return NextResponse.json({
      message: "Login efetuado com sucesso.",
      user: result.user,
      workspaces: result.workspaces,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Credenciais inválidas.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno ao processar login." }, { status: 500 });
  }
}
