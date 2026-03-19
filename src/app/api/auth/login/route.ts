import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não está definido nas variáveis de ambiente");
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Rate limiting simples (em produção, usar Redis ou similar)
const loginAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const attempts = loginAttempts.get(clientIp);

    if (attempts) {
      if (now - attempts.timestamp < WINDOW_MS) {
        if (attempts.count >= MAX_ATTEMPTS) {
          return NextResponse.json(
            { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
            { status: 429 }
          );
        }
        attempts.count++;
      } else {
        loginAttempts.set(clientIp, { count: 1, timestamp: now });
      }
    } else {
      loginAttempts.set(clientIp, { count: 1, timestamp: now });
    }

    // Buscar usuário com comércio
    const user = await db.user.findUnique({
      where: { email },
      include: {
        comercio: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      );
    }

    // Verificar se o email foi confirmado
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada." },
        { status: 403 }
      );
    }

    // Verificar senha
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      );
    }

    // Criar JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      comercioId: user.comercioId,
      comercioName: user.comercio.name,
      comercioSlug: user.comercio.slug,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Limpar tentativas de login após sucesso
    loginAttempts.delete(clientIp);

    // Configurar cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // CSRF protection
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        comercio: user.comercio,
      },
    });
  } catch (error) {
    logger.error("Erro ao fazer login", error, {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json(
      { error: "Erro ao fazer login. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}
