import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

export async function GET(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  const comercios = await db.comercio.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      ativo: true,
      plano: true,
      users: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          email: true,
          emailVerified: true,
        },
      },
    },
  });

  const { searchParams } = new URL(request.url);
  const selectedComercioId = searchParams.get("comercioId")?.trim();

  const comercio = comercios.find((item) => item.id === selectedComercioId) ?? comercios[0] ?? null;
  const user = comercio?.users?.[0] ?? null;

  if (!comercio) {
    return NextResponse.json({ error: "Nenhum comércio encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    comercio: {
      id: comercio.id,
      name: comercio.name,
      slug: comercio.slug,
      phone: comercio.phone,
      ativo: comercio.ativo,
      plano: comercio.plano,
    },
    user,
    comercios: comercios.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      ativo: item.ativo,
      plano: item.plano,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      comercioId?: string;
      comercio?: {
        name?: string;
        slug?: string;
        phone?: string;
        ativo?: boolean;
        plano?: string;
      };
      user?: {
        email?: string;
        emailVerified?: boolean;
      };
      newPassword?: string;
    };

    const updateComercio: Record<string, unknown> = {};
    const updateUser: Record<string, unknown> = {};
    const targetComercioId = body.comercioId?.trim();

    if (!targetComercioId) {
      return NextResponse.json({ error: "comercioId é obrigatório" }, { status: 400 });
    }

    const targetComercio = await db.comercio.findUnique({
      where: { id: targetComercioId },
      select: {
        id: true,
        users: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!targetComercio) {
      return NextResponse.json({ error: "Comércio selecionado não encontrado" }, { status: 404 });
    }

    const targetUserId = targetComercio.users[0]?.id;

    if (body.comercio) {
      if (typeof body.comercio.name === "string") {
        updateComercio.name = body.comercio.name.trim();
      }
      if (typeof body.comercio.slug === "string") {
        updateComercio.slug = body.comercio.slug.trim();
      }
      if (typeof body.comercio.phone === "string") {
        updateComercio.phone = body.comercio.phone.trim();
      }
      if (typeof body.comercio.ativo === "boolean") {
        updateComercio.ativo = body.comercio.ativo;
      }
      if (typeof body.comercio.plano === "string" && body.comercio.plano.trim()) {
        updateComercio.plano = body.comercio.plano.trim();
      }
    }

    if (body.user) {
      if (typeof body.user.email === "string") {
        updateUser.email = body.user.email.trim().toLowerCase();
      }
      if (typeof body.user.emailVerified === "boolean") {
        updateUser.emailVerified = body.user.emailVerified;
      }
    }

    if (typeof body.newPassword === "string" && body.newPassword.trim()) {
      if (!targetUserId) {
        return NextResponse.json(
          { error: "Não existe usuário vinculado ao comércio selecionado" },
          { status: 400 }
        );
      }

      const password = body.newPassword.trim();
      if (password.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter pelo menos 6 caracteres" },
          { status: 400 }
        );
      }
      updateUser.password = await bcrypt.hash(password, 10);
    }

    await db.$transaction(async (tx) => {
      if (Object.keys(updateComercio).length) {
        await tx.comercio.update({
          where: { id: targetComercioId },
          data: updateComercio,
        });
      }

      if (Object.keys(updateUser).length) {
        if (!targetUserId) {
          throw new Error("Não existe usuário vinculado ao comércio selecionado");
        }

        await tx.user.update({
          where: { id: targetUserId },
          data: updateUser,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "E-mail ou slug já está em uso" }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar dados" },
      { status: 400 }
    );
  }
}
