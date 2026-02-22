import { NextRequest, NextResponse } from "next/server";
import { proxyRequest, type IdRouteContext } from "@/lib/api-proxy";

export async function GET(req: NextRequest, context: IdRouteContext) {
  const { id } = await context.params;
  const token = req.nextUrl.searchParams.get("token") || "";

  if (!token) {
    return NextResponse.json(
      { error: "Token de confirmação é obrigatório." },
      { status: 400 },
    );
  }

  return proxyRequest({
    method: "GET",
    path: `/api/public/entrevistas/${id}/confirmar?token=${encodeURIComponent(token)}`,
  });
}
