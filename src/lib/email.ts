import * as nodemailer from "nodemailer";

import { logger } from "./logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    console.log("[SENDMAIL] Iniciando envio de email", {
      to,
      subject,
      smtp_host: process.env.SMTP_HOST,
      smtp_port: process.env.SMTP_PORT,
      smtp_user: process.env.SMTP_USER?.substring(0, 5) + "***",
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"paladar" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[SENDMAIL] Email enviado com sucesso", {
      messageId: info.messageId,
      to,
    });
    logger.info("Email enviado com sucesso", { 
      messageId: info.messageId,
      destination: "***REDACTED***" 
    });
    return { success: true };
  } catch (error) {
    console.error("[SENDMAIL] Erro ao enviar email:", error);
    logger.error("Erro ao enviar email", error, {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      throw new Error(`Falha ao enviar email: ${error.message}`);
    }
    throw new Error("Falha ao enviar email");
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  // Criar transporter dentro da função para evitar problemas de inicialização...
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const verificationUrl = `${process.env.URL_PROD || "http://localhost:3000"}/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"paladar" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Confirme seu e-mail - paladar",
    html: `
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
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Confirmação de conta</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Confirme seu Email</h2>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Obrigado por se cadastrar na paladar! Para começar a usar o produto,
                        precisamos confirmar seu endereço de email.
                      </p>
                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Clique no botão abaixo para verificar seu email e ativar sua conta:
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #374151 0%, #4B5563 100%); 
                                      color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                              Confirmar Email
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        Se você não criou uma conta na paladar, pode ignorar este email.
                      </p>
                      
                      <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                        Ou copie e cole este link no seu navegador:<br>
                        <a href="${verificationUrl}" style="color: #374151; word-break: break-all;">${verificationUrl}</a>
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
                        Plataforma paladar
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info("Email de verificação enviado", {
      destination: "***REDACTED***",
    });
    return { success: true };
  } catch (error) {
    logger.error("Erro ao enviar email de verificação", error, {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    // Mostrar o erro real para debug apenas em desenvolvimento
    if (error instanceof Error) {
      throw new Error(`Falha ao enviar email. Tente novamente.`);
    }
    throw new Error("Falha ao enviar email de verificação");
  }
}
