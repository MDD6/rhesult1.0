import { NextRequest } from "next/server";
import {
  proxyPatch,
  proxyPut,
  proxyDelete,
  type IdRouteContext,
} from "@/lib/api-proxy";

export async function PATCH(request: Request, context: IdRouteContext) {
  const { id } = await context.params;
  return proxyPatch(request, `/api/candidatos/${id}`);
}

export async function PUT(request: Request, context: IdRouteContext) {
  const { id } = await context.params;
  return proxyPut(request, `/api/candidatos/${id}`);
}

export async function DELETE(request: NextRequest, context: IdRouteContext) {
  const { id } = await context.params;
  return proxyDelete(request, `/api/candidatos/${id}`);
}
