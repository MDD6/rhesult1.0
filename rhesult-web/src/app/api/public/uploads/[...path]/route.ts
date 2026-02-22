import { NextRequest, NextResponse } from "next/server";
import {
  getBackendBase,
  type CatchAllRouteContext,
} from "@/lib/api-proxy";

export async function GET(
  request: NextRequest,
  context: CatchAllRouteContext,
) {
  const backendBase = getBackendBase();
  const { path } = await context.params;
  const filePath = path?.join("/") || "";

  if (!filePath) {
    return NextResponse.json(
      { error: "Arquivo não informado." },
      { status: 400 },
    );
  }

  const search = request.nextUrl.search || "";
  const targetUrl = `${backendBase}/uploads/${filePath}${search}`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
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
