import { NextRequest, NextResponse } from "next/server";

import { THINK_COOKIE_KEY, THINK_TTL_SECONDS } from "@/lib/think";

function normalizeCredential(value: string | undefined): string {
  if (!value) {
    return "";
  }

  // Handles common .env/input cases like quoted values, accidental spaces,
  // and invisible unicode spacing chars copied from password managers.
  return value
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { think?: string; next?: string };
  const expectedCredential = normalizeCredential(process.env.THINK);
  const receivedCredential = normalizeCredential(body?.think);

  if (!expectedCredential) {
    return NextResponse.json(
      { error: "Variável de usuário não configurada no ambiente" },
      { status: 500 },
    );
  }

  if (!receivedCredential) {
    return NextResponse.json({ error: "Informe o usuário" }, { status: 401 });
  }

  if (receivedCredential !== expectedCredential) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const sanitizedNext =
    typeof body.next === "string" && body.next.startsWith("/")
      ? body.next
      : "/";

  const response = NextResponse.json({ ok: true, next: sanitizedNext });
  const now = Math.floor(Date.now() / 1000);

  response.cookies.set(THINK_COOKIE_KEY, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THINK_TTL_SECONDS,
  });

  return response;
}
