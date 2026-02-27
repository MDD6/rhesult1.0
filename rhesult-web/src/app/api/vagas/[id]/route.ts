import { NextRequest } from "next/server";
import { createItemRoute, proxyGet, IdRouteContext } from "@/lib/api-proxy";

export async function GET(request: NextRequest, context: IdRouteContext) {
  const { id } = await context.params;
  return proxyGet(request, `/api/vagas/${id}`, { defaultResponse: "{}" });
}

export const { PUT, DELETE } = createItemRoute("/api/vagas");
