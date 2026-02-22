import { NextResponse, NextRequest } from "next/server";
import { buildEndpoint, extractToken, buildHeaders } from "@/lib/api-proxy";

async function parseResponsePayload(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

/** GET /api/auth/me – Fetch current authenticated user profile */
export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request);
    const url = buildEndpoint("/auth/me");
    const headers = buildHeaders({ token, contentType: "application/json" });

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await parseResponsePayload(response);

    if (!response.ok) {
      return NextResponse.json(
        typeof data === "object" && data
          ? (data as Record<string, unknown>)
          : { error: "Failed to fetch user profile" },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 },
    );
  }
}

/** PUT /api/auth/me – Update current authenticated user profile */
export async function PUT(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: BodyInit;
    const headers: Record<string, string> = {};

    if (contentType.includes("multipart/form-data")) {
      console.log("[PUT /api/auth/me] Received multipart/form-data");
      body = await request.formData();
      console.log("[PUT /api/auth/me] Parsed FormData:", Array.from(body.keys()));
      // Do NOT set Content-Type for FormData, fetch will set it automatically with the correct boundary
    } else {
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
      headers["Content-Type"] = "application/json";
    }

    const token = extractToken(request);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = buildEndpoint("/auth/me");

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body,
      cache: "no-store",
    });

    console.log(`[PUT /api/auth/me] Backend response status: ${response.status}`);
    const data = await parseResponsePayload(response);
    console.log(`[PUT /api/auth/me] Backend response data:`, data);

    if (!response.ok) {
      return NextResponse.json(
        typeof data === "object" && data
          ? (data as Record<string, unknown>)
          : { error: "Failed to update user profile" },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[PUT /api/auth/me]", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 },
    );
  }
}
