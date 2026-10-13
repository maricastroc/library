import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const authorized = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/admin");

  if (isApi) {
    if (!authorized) return NextResponse.json({ error: "Access restricted to the bookshop counter." }, { status: 401 });
    if (request.method !== "GET" && request.method !== "HEAD") {
      const origin = request.headers.get("origin");
      if (origin && new URL(origin).host !== request.nextUrl.host) {
        return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  if (!authorized) {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
