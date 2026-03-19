import { NextRequest, NextResponse } from "next/server";

import { generateBackup } from "@/lib/manager";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

type BackupFormat = "json" | "csv" | "xls";

function parseFormat(value: string | null): BackupFormat {
  if (value === "csv" || value === "xls") {
    return value;
  }
  return "json";
}

export async function GET(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const format = parseFormat(searchParams.get("format"));
    const model = searchParams.get("model") ?? undefined;

    const backup = await generateBackup(format, model);

    return new NextResponse(backup.content, {
      status: 200,
      headers: {
        "Content-Type": backup.contentType,
        "Content-Disposition": `attachment; filename=\"${backup.filename}\"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao gerar backup" },
      { status: 400 }
    );
  }
}
