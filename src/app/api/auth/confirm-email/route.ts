import { NextRequest, NextResponse } from "next/server";
import { confirmEmailSchema } from "@/modules/auth/auth.schema";
import { AuthService, ValidationError } from "@/modules/auth/auth.service";
import { getClientContext } from "@/lib/auth";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getClientContext();
    const body = await request.json();
    const validated = confirmEmailSchema.parse(body);

    const result = await AuthService.confirmEmail(validated.token, ctx);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Token de confirmação inválido." }, { status: 422 });
    }
    console.error("Erro na confirmação de email:", error);
    return NextResponse.json({ error: "Erro interno ao confirmar e-mail." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token não fornecido." }, { status: 400 });
    }

    const ctx = await getClientContext();
    const result = await AuthService.confirmEmail(token, ctx);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro na confirmação de email via GET:", error);
    return NextResponse.json({ error: "Erro interno ao confirmar e-mail." }, { status: 500 });
  }
}
