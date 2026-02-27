import { NextRequest, NextResponse } from "next/server";
import { buildEndpoint, extractToken, backendConnectionError } from "@/lib/api-proxy";

/**
 * Proxies the multipart/form-data CV upload to the backend.
 * We forward the raw body+headers so multer on the backend can parse it.
 */
export async function POST(request: NextRequest) {
  const token = extractToken(request);

  try {
    const body = await request.arrayBuffer();
    const contentType = request.headers.get("content-type") || "";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(buildEndpoint("/api/candidatos/parse-cv"), {
      method: "POST",
      headers,
      body,
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
