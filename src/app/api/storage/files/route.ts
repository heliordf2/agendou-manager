import { NextRequest, NextResponse } from "next/server";

import {
  deleteStorageImage,
  listStorageImages,
  renameStorageImage,
} from "@/lib/storage";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

export async function GET(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  try {
    const files = await listStorageImages();
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao listar imagens do storage",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { fileKey?: string };

    if (!body.fileKey) {
      return NextResponse.json(
        { error: "Campo fileKey é obrigatório" },
        { status: 400 }
      );
    }

    await deleteStorageImage(body.fileKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao excluir imagem do storage",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      fileKey?: string;
      newName?: string;
    };

    if (!body.fileKey || !body.newName) {
      return NextResponse.json(
        { error: "Campos fileKey e newName são obrigatórios" },
        { status: 400 }
      );
    }

    await renameStorageImage(body.fileKey, body.newName);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao renomear imagem do storage",
      },
      { status: 400 }
    );
  }
}
