import { NextRequest, NextResponse } from "next/server";
import { buildEndpoint, extractToken } from "@/lib/api-proxy";
import { AUTH_CONFIG } from "@/shared/constants/app";

export async function POST(request: NextRequest) {
  const backendToken = extractToken(request);

  if (backendToken) {
    try {
      await fetch(buildEndpoint("/auth/logout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${decodeURIComponent(backendToken)}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      // Ignora erro de rede no backend e segue limpando cookie local
    }
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });

  response.cookies.set({
    name: AUTH_CONFIG.COOKIE_NAME,
    value: "",
    path: AUTH_CONFIG.COOKIE_PATH,
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
