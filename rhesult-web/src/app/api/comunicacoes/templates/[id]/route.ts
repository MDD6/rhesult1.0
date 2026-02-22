import { NextRequest } from "next/server";
import {
  proxyRequest,
  proxyPut,
  proxyDelete,
  extractToken,
  buildHeaders,
  type IdRouteContext,
} from "@/lib/api-proxy";

export async function GET(request: NextRequest, context: IdRouteContext) {
  const { id } = await context.params;
  const token = extractToken(request);
  return proxyRequest({
    method: "GET",
    path: `/api/comunicacoes/templates/${id}`,
    headers: buildHeaders({ token: token || undefined }),
  });
}

export async function PUT(request: Request, context: IdRouteContext) {
  const { id } = await context.params;
  return proxyPut(request, `/api/comunicacoes/templates/${id}`);
}

export async function DELETE(request: NextRequest, context: IdRouteContext) {
  const { id } = await context.params;
  return proxyDelete(request, `/api/comunicacoes/templates/${id}`);
}
