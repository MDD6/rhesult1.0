import { NextRequest, NextResponse } from "next/server";
import { buildEndpoint, extractToken, backendConnectionError, parseBody, invalidPayloadError } from "@/lib/api-proxy";

/**
 * Proxy for POST /api/candidatos/recalcular-score
 */
export async function POST(request: NextRequest) {
  const token = extractToken(request);
  const body = await parseBody(request);

  // body can be empty (recalculates all) or { candidato_id: number }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildEndpoint("/api/candidatos/recalcular-score"), {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : "{}",
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ||
          "application/json; charset=utf-8",
      },
    });
  } catch {
    return backendConnectionError();
  }
}
