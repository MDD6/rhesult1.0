import { NextResponse } from "next/server";
import { buildEndpoint } from "@/lib/api-proxy";
import { AUTH_CONFIG } from "@/shared/constants/app";

type LoginBody = {
  email?: string;
  senha?: string;
};

function getTokenFromPayload(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const payload = data as {
    token?: unknown;
    access_token?: unknown;
    accessToken?: unknown;
    data?: { token?: unknown; access_token?: unknown; accessToken?: unknown };
  };

  const token =
    payload.token ||
    payload.access_token ||
    payload.accessToken ||
    payload.data?.token ||
    payload.data?.access_token ||
    payload.data?.accessToken;

  return typeof token === "string" ? token : "";
}

export async function POST(request: Request) {
  let payload: LoginBody;

  try {
    payload = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Payload de login inválido." }, { status: 400 });
  }

  if (!payload?.email || !payload?.senha) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  const endpoints = ["/auth/login", "/api/auth/login", "/login", "/api/login"];
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    const url = buildEndpoint(endpoint);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const text = await response.text();
      let data: unknown = {};

      try {
        data = text ? (JSON.parse(text) as unknown) : {};
      } catch {
        data = { message: text };
      }

      if (response.ok) {
        const nextResponse = NextResponse.json(data, { status: 200 });
        const token = getTokenFromPayload(data);

        if (token) {
          nextResponse.cookies.set({
            name: AUTH_CONFIG.COOKIE_NAME,
            value: token,
            path: AUTH_CONFIG.COOKIE_PATH,
            maxAge: AUTH_CONFIG.COOKIE_MAX_AGE,
            sameSite: "lax",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
          });
        }

        return nextResponse;
      }

      if (response.status !== 404) {
        return NextResponse.json(
          typeof data === "object" && data
            ? (data as Record<string, unknown>)
            : { error: typeof data === "string" ? data : "Falha no login." },
          { status: response.status },
        );
      }

      const message =
        (typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : undefined) ||
        (typeof data === "object" && data && "message" in data && typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : undefined) ||
        `Falha no endpoint ${endpoint} (${response.status})`;

      errors.push(message);
    } catch {
      errors.push(`Não foi possível conectar ao endpoint ${endpoint}.`);
    }
  }

  return NextResponse.json(
    {
      error: "Não foi possível autenticar no backend.",
      details: errors,
    },
    { status: 502 },
  );
}
