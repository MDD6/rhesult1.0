import { NextRequest } from "next/server";
import {
  proxyRequest,
  parseBody,
  buildPathWithQuery,
  buildHeaders,
  type CatchAllRouteContext,
} from "@/lib/api-proxy";

function resolvePath(request: NextRequest, segments: string[]) {
  return buildPathWithQuery(request, `/api/pareceres/${segments.join("/")}`);
}

async function proxy(method: string, request: NextRequest, segments: string[]) {
  const path = resolvePath(request, segments);
  const authHeader = request.headers.get("Authorization");
  const hasBody = method !== "GET" && method !== "DELETE";

  let body: unknown = undefined;
  if (hasBody) {
    body = await parseBody(request);
  }

  return proxyRequest({
    method,
    path,
    body: body ?? undefined,
    headers: buildHeaders({
      contentType: "application/json",
      token: authHeader?.replace("Bearer ", "").trim(),
    }),
    defaultResponse: method === "GET" ? "[]" : "{}",
  });
}

export async function GET(request: NextRequest, context: CatchAllRouteContext) {
  const { path } = await context.params;
  return proxy("GET", request, path);
}

export async function POST(request: NextRequest, context: CatchAllRouteContext) {
  const { path } = await context.params;
  return proxy("POST", request, path);
}

export async function PUT(request: NextRequest, context: CatchAllRouteContext) {
  const { path } = await context.params;
  return proxy("PUT", request, path);
}

export async function PATCH(request: NextRequest, context: CatchAllRouteContext) {
  const { path } = await context.params;
  return proxy("PATCH", request, path);
}

export async function DELETE(request: NextRequest, context: CatchAllRouteContext) {
  const { path } = await context.params;
  return proxy("DELETE", request, path);
}
