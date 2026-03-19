import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token de verificação não fornecido" },
        { status: 400 }
      );
    }

    // Buscar usuário pelo token
    const user = await db.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 400 }
      );
    }

    // Verificar se o token expirou
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "Token de verificação expirado. Solicite um novo email de verificação." },
        { status: 400 }
      );
    }

    // Verificar se já está verificado
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email já verificado anteriormente" },
        { status: 200 }
      );
    }

    // Atualizar usuário para verificado e ativar comércio
    await db.$transaction(async (tx) => {
      // Atualizar usuário
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null, // Remove o token após verificação
          verificationTokenExpiry: null,
        },
      });

      // Ativar comércio associado
      await tx.comercio.update({
        where: { id: user.comercioId },
        data: {
          ativo: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email verificado com sucesso! Você já pode fazer login.",
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Erro ao verificar email", error);
    return NextResponse.json(
      { error: "Erro ao processar verificação. Tente novamente." },
      { status: 500 }
    );
  }
}
