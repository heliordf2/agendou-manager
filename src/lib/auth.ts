import { jwtVerify } from "jose";
import { cookies } from "next/headers";

import { logger } from "./logger";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET não está definido nas variáveis de ambiente. Configure-o no arquivo .env"
  );
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  comercioId: string;
  comercioName: string;
  comercioSlug: string;
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as UserSession;
  } catch (error) {
    logger.debug("Erro ao verificar sessão", {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    return null;
  }
}
