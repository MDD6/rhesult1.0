import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/shared/constants/app";

const PUBLIC_PATHS = ["/", "/login", "/banco-talentos/aplicacao", "/inscricoes"];
const PUBLIC_PREFIXES = ["/api/auth/login", "/api/auth/logout", "/api/public"];

function isStaticPath(pathname: string) {
  return pathname.startsWith("/_next") || /\.[^/]+$/.test(pathname);
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((publicPath) => pathname === publicPath)) {
    return true;
  }

  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicApiRequest(pathname: string, method: string) {
  if (pathname === "/api/vagas" || pathname.startsWith("/api/vagas/")) {
    return method.toUpperCase() === "GET";
  }

  return false;
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api");
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const token = request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value;

  if (isStaticPath(pathname) || isPublicPath(pathname) || isPublicApiRequest(pathname, method)) {
    return NextResponse.next();
  }

  if (!token) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const next = `${pathname}${search}`;
    const loginUrl = new URL(`/login?next=${encodeURIComponent(next)}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
