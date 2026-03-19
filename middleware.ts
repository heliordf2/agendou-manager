import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminApiPath = pathname.startsWith("/api/manager") || pathname.startsWith("/api/storage");

  // Skip protection for static assets and framework internals.
  if (
    pathname.startsWith("/_next") ||
    (pathname.startsWith("/api") && !isAdminApiPath && pathname !== "/api/think") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/avatars") ||
    pathname.startsWith("/screens")
  ) {
    return NextResponse.next();
  }

  // Allow access to the challenge page itself.
  if (pathname === "/usuario" || pathname === "/think") {
    return NextResponse.next();
  }

  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  const hasThinkAccess = isThinkCookieValid(thinkCookie);

  if (!hasThinkAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/usuario";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
