import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma";

// Rate limiting para registro
const registerAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_REGISTER_ATTEMPTS = 3;
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 hora

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, restaurantName, restaurantSlug, restaurantDescription, restaurantPhone, plan } = body;

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const attempts = registerAttempts.get(clientIp);

    if (attempts) {
      if (now - attempts.timestamp < REGISTER_WINDOW_MS) {
        if (attempts.count >= MAX_REGISTER_ATTEMPTS) {
          return NextResponse.json(
            { error: "Muitas tentativas de registro. Tente novamente em 1 hora." },
            { status: 429 }
          );
        }
        attempts.count++;
      } else {
        registerAttempts.set(clientIp, { count: 1, timestamp: now });
      }
    } else {
      registerAttempts.set(clientIp, { count: 1, timestamp: now });
    }

    // Validar dados do usuário
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar dados do restaurante
    if (!restaurantName || !restaurantSlug) {
      return NextResponse.json(
        { error: "Nome e slug do restaurante são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Validar senha com requisitos fortes
    if (password.length < 8) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 8 caracteres" },
        { status: 400 }
      );
    }

    // Verificar complexidade da senha
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return NextResponse.json(
        { error: "A senha deve conter letras maiúsculas, minúsculas e números" },
        { status: 400 }
      );
    }

    // Validar slug (apenas letras minúsculas, números e hífens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(restaurantSlug)) {
      return NextResponse.json(
        { error: "Slug do restaurante deve conter apenas letras minúsculas, números e hífens" },
        { status: 400 }
      );
    }

    // Validar plano
    const validPlans = ["STARTER", "PRO", "PLUS"];
    if (plan && !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: "Plano inválido" },
        { status: 400 }
      );
    }

    // Verificar se o email já existe
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    // Verificar se o slug já existe
    const existingSlug = await db.comercio.findUnique({
      where: { slug: restaurantSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "Este slug já está em uso. Escolha outro." },
        { status: 400 }
      );
    }

    // Gerar hash da senha com 12 rounds (mais seguro)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Gerar token de verificação
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Criar comércio e usuário em uma transação
    const result = await db.$transaction(async (tx) => {
      // Criar o restaurante
      const comercio = await tx.comercio.create({
        data: {
          name: restaurantName,
          slug: restaurantSlug,
          description: restaurantDescription || "Bem-vindo ao nosso restaurante!",
          phone: restaurantPhone || "",
          avatarImageUrl: "/default-avatar.svg", // Imagem padrão
          coverImageUrl: "/default-cover.svg", // Imagem padrão
          ativo: false, // Inativo até confirmar email
          plan: plan || "STARTER", // Plano padrão STARTER
        },
      });

      // Criar o usuário associado ao restaurante
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          comercioId: comercio.id,
          emailVerified: false,
          verificationToken,
          verificationTokenExpiry: tokenExpiry,
        },
      });

      return { user, comercio };
    });

    // Enviar email de verificação
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      logger.error("Erro ao enviar email de verificação", emailError);
      // Não retorna erro, pois o usuário foi criado com sucesso
    }

    return NextResponse.json(
      {
        success: true,
        message: "Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.",
        userId: result.user.id,
        restaurantSlug: result.comercio.slug,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Erro ao registrar usuário", error, {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json(
      { error: "Erro ao processar cadastro. Tente novamente." },
      { status: 500 }
    );
  }
}
