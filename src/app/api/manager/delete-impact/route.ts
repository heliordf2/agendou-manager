import { NextRequest, NextResponse } from "next/server";

import { getDeleteImpact } from "@/lib/manager";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

function parsePkValue(pkValue: unknown): Record<string, unknown> {
  if (!pkValue || typeof pkValue !== "object" || Array.isArray(pkValue)) {
    throw new Error("Chave primária inválida");
  }

  return pkValue as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      model?: string;
      pk?: Record<string, unknown>;
    };

    if (!body.model) {
      return NextResponse.json({ error: "Campo model é obrigatório" }, { status: 400 });
    }

    const impact = await getDeleteImpact(body.model, parsePkValue(body.pk));

    return NextResponse.json({ impact });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao calcular impacto da exclusão",
      },
      { status: 400 }
    );
  }
}
