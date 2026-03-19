import { NextRequest, NextResponse } from "next/server";

import { getManagerModels } from "@/lib/manager";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

export async function GET(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;

  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  const models = getManagerModels();

  return NextResponse.json({ models });
}
