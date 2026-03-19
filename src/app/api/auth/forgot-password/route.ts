import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { sendEmail as sendEmailUtil } from "@/lib/email";
import { db as prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  console.log("[FORGOT-PASSWORD] Requisição recebida");
  try {
    const body = await request.json();
    const { email } = body;
    console.log("[FORGOT-PASSWORD] Email recebido:", email);

    if (!email) {
      console.log("[FORGOT-PASSWORD] Email vazio");
      return NextResponse.json(
        { error: "E-mail é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o usuário existe
    console.log("[FORGOT-PASSWORD] Procurando usuário...");
    const user = await prisma.user.findUnique({
      where: { email },
    });
    console.log("[FORGOT-PASSWORD] Usuário encontrado:", user ? "Sim" : "Não");

    if (!user) {
      return NextResponse.json(
        {
          error: "Usuário não encontrado",
          message: "Não existe uma conta cadastrada com este email.",
        },
        { status: 404 }
      );
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no banco
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Construir URL de reset
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;

    // Enviar e-mail
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #374151 0%, #4B5563 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">paladar</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Recuperação de Senha</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Resetar sua Senha</h2>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Olá, ${user.name}! Recebemos uma solicitação para resetar a senha da sua conta.
                      </p>
                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Clique no botão abaixo para criar uma nova senha. Este link é válido por 1 hora.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #374151 0%, #4B5563 100%); 
                                      color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                              Resetar Senha
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        Se você não solicitou a recuperação de senha, pode ignorar este e-mail. 
                        Sua senha permanecerá a mesma.
                      </p>
                      
                      <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                        Ou copie e cole este link no seu navegador:<br>
                        <a href="${resetUrl}" style="color: #374151; word-break: break-all;">${resetUrl}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; color: #999999; font-size: 14px;">
                        © ${new Date().getFullYear()} paladar. Todos os direitos reservados.
                      </p>
                      <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                        Transforme seu cardápio com IA
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    console.log("[FORGOT-PASSWORD] Enviando email para:", email);
    await sendEmailUtil({
      to: email,
      subject: "Recuperação de Senha - paladar",
      html: emailHtml,
    });
    console.log("[FORGOT-PASSWORD] Email enviado com sucesso");

    return NextResponse.json({
      success: true,
      message: "Se o e-mail existir em nossa base, você receberá instruções para resetar sua senha.",
    });

  } catch (error) {
    console.error("[FORGOT-PASSWORD] ERRO CAPTURADO:", error);
    return NextResponse.json(
      { 
        error: "Erro ao processar solicitação",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}
