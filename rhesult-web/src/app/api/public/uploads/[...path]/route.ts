import { NextRequest, NextResponse } from "next/server";
import {
  getBackendBase,
  extractToken,
  type CatchAllRouteContext,
} from "@/lib/api-proxy";

export async function GET(
  request: NextRequest,
  context: CatchAllRouteContext,
) {
  const backendBase = getBackendBase();
  const { path } = await context.params;
  const filePath = path?.join("/") || "";
  const normalizedPath = filePath.replace(/^\/+/, "");
  const lowerPath = normalizedPath.toLowerCase();
  const isCurriculum = lowerPath.startsWith("curriculos/");
  const token = extractToken(request);

  if (!filePath || normalizedPath.includes("..") || normalizedPath.includes("\\")) {
    return NextResponse.json(
      { error: "Arquivo não informado." },
      { status: 400 },
    );
  }

  if (isCurriculum && !token) {
    return NextResponse.json(
      { error: "Não autenticado." },
      { status: 401 },
    );
  }

  const search = request.nextUrl.search || "";
  const targetUrl = `${backendBase}/uploads/${normalizedPath}${search}`;
  console.log("[avatar-proxy] targetUrl:", targetUrl, "| normalizedPath:", normalizedPath);

  try {
    const requestHeaders = new Headers();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: requestHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || "Não foi possível abrir o currículo." },
        { status: response.status },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const headers = new Headers();

    const contentType = response.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) headers.set("content-disposition", contentDisposition);

    return new NextResponse(arrayBuffer, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível conectar ao backend para baixar o currículo." },
      { status: 502 },
    );
  }
}
