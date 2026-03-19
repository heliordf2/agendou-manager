import { NextRequest, NextResponse } from "next/server";

import {
  createModelRecord,
  deleteModelRecord,
  listModelRecords,
  updateModelRecord,
} from "@/lib/manager";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

function ensureThink(request: NextRequest): NextResponse | null {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;

  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  return null;
}

function parsePkValue(pkValue: unknown): Record<string, unknown> {
  if (!pkValue || typeof pkValue !== "object" || Array.isArray(pkValue)) {
    throw new Error("Chave primária inválida");
  }

  return pkValue as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const denied = ensureThink(request);
  if (denied) return denied;

  try {
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get("model");

    if (!model) {
      return NextResponse.json({ error: "Parâmetro model é obrigatório" }, { status: 400 });
    }

    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

    const response = await listModelRecords(model, limit, offset);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar registros" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const denied = ensureThink(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      model?: string;
      pk?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };

    if (!body.model) {
      return NextResponse.json({ error: "Campo model é obrigatório" }, { status: 400 });
    }

    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: "Campo data é obrigatório" }, { status: 400 });
    }

    const updated = await updateModelRecord(body.model, parsePkValue(body.pk), body.data);

    return NextResponse.json({ record: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar registro" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = ensureThink(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      model?: string;
      data?: Record<string, unknown>;
    };

    if (!body.model) {
      return NextResponse.json({ error: "Campo model é obrigatório" }, { status: 400 });
    }

    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: "Campo data é obrigatório" }, { status: 400 });
    }

    const created = await createModelRecord(body.model, body.data);

    return NextResponse.json({ record: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar registro" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const denied = ensureThink(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      model?: string;
      pk?: Record<string, unknown>;
    };

    if (!body.model) {
      return NextResponse.json({ error: "Campo model é obrigatório" }, { status: 400 });
    }

    await deleteModelRecord(body.model, parsePkValue(body.pk));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir registro" },
      { status: 400 }
    );
  }
}
