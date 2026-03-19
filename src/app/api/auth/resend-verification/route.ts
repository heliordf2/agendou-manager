import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma";

const resendAttempts = new Map<string, number>();
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }

    const now = Date.now();
    const lastAttempt = resendAttempts.get(email);

    if (lastAttempt && now - lastAttempt < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - lastAttempt)) / 1000);
      return NextResponse.json(
        { error: `Aguarde ${remainingSeconds}s para reenviar o email.` },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Conta não encontrada para este email" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Este email já foi verificado" }, { status: 400 });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry: tokenExpiry,
      },
    });

    await sendVerificationEmail(email, verificationToken);

    resendAttempts.set(email, now);

    return NextResponse.json({
      success: true,
      message: "E-mail de verificação reenviado com sucesso",
    });
  } catch (error) {
    logger.error("Erro ao reenviar email de verificação", error, {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    return NextResponse.json(
      { error: "Erro ao reenviar email de verificação. Tente novamente." },
      { status: 500 }
    );
  }
}
