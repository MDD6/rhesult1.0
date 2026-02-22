import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/shared/constants/app";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BACKEND_BASE = "http://localhost:4000";

// ---------------------------------------------------------------------------
// Backend URL helpers
// ---------------------------------------------------------------------------

/**
 * Normalises raw env values into a usable backend base URL.
 * Falls back to `http://localhost:4000` when the value is empty, relative,
 * or points to port 3000 (the Next.js dev server itself).
 */
function normalizeBackendBase(raw?: string): string {
  const value = (raw || "").trim();

  if (!value || value.startsWith("/")) return DEFAULT_BACKEND_BASE;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.port === "3000") return DEFAULT_BACKEND_BASE;
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return DEFAULT_BACKEND_BASE;
  }
}

/** Resolved backend base URL (reads `API_BASE` / `NEXT_PUBLIC_API_BASE`). */
export function getBackendBase(): string {
  return normalizeBackendBase(
    process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE,
  );
}

/** Concatenates the backend base with a path, ensuring no double slashes. */
export function buildEndpoint(path: string): string {
  const base = getBackendBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

/** Safely parses JSON body – returns `null` when the body is missing / invalid. */
export async function parseBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Extracts the bearer token from the `Authorization` header or the
 * `rhesult_token` cookie, whichever is available first.
 */
export function extractToken(request: NextRequest): string {
  const authHeader = request.headers.get("Authorization") || "";
  const tokenFromHeader = authHeader.replace("Bearer ", "").trim();
  const tokenFromCookie =
    request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value || "";
  return tokenFromHeader || tokenFromCookie;
}

/**
 * Appends the query-string of the incoming request to `basePath`.
 *
 * ```
 * buildPathWithQuery(request, "/api/vagas")
 * // => "/api/vagas?status=active"
 * ```
 */
export function buildPathWithQuery(
  request: NextRequest,
  basePath: string,
): string {
  const query = request.nextUrl.searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

// ---------------------------------------------------------------------------
// Header helpers
// ---------------------------------------------------------------------------

export function buildHeaders(options?: {
  token?: string;
  contentType?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options?.contentType) headers["Content-Type"] = options.contentType;
  if (options?.token) headers["Authorization"] = `Bearer ${options.token}`;
  return headers;
}

// ---------------------------------------------------------------------------
// Standard error responses
// ---------------------------------------------------------------------------

export function backendConnectionError() {
  return NextResponse.json(
    { error: "Não foi possível conectar ao backend." },
    { status: 502 },
  );
}

export function invalidPayloadError() {
  return NextResponse.json(
    { error: "Payload inválido." },
    { status: 400 },
  );
}

// ---------------------------------------------------------------------------
// Generic proxy
// ---------------------------------------------------------------------------

export interface ProxyOptions {
  /** HTTP method (GET, POST, PUT, PATCH, DELETE). */
  method: string;
  /** Backend path (e.g. `/api/vagas`). Query-strings are preserved. */
  path: string;
  /** Body to send (will be `JSON.stringify`'d). */
  body?: unknown;
  /** Extra headers to send. */
  headers?: HeadersInit;
  /** Fallback body when the backend returns an empty response. Default `"{}"`. */
  defaultResponse?: string;
}

/**
 * Proxies a single request to the backend, forwarding the response
 * (status + content-type) back to the client.
 */
export async function proxyRequest(options: ProxyOptions): Promise<NextResponse> {
  const {
    method,
    path,
    body,
    headers = {},
    defaultResponse = "{}",
  } = options;

  try {
    const response = await fetch(buildEndpoint(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text || defaultResponse, {
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

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/** GET proxy – forwards query-string and auth token automatically. */
export function proxyGet(
  request: NextRequest,
  basePath: string,
  options?: { defaultResponse?: string },
) {
  const token = extractToken(request);
  return proxyRequest({
    method: "GET",
    path: buildPathWithQuery(request, basePath),
    headers: buildHeaders({ token: token || undefined }),
    defaultResponse: options?.defaultResponse ?? "[]",
  });
}

/** POST proxy – parses body, validates, forwards auth token. */
export async function proxyPost(
  request: Request,
  basePath: string,
  options?: { headers?: Record<string, string> },
) {
  const body = await parseBody(request);
  if (!body) return invalidPayloadError();

  const token = extractToken(request as NextRequest);
  return proxyRequest({
    method: "POST",
    path: basePath,
    body,
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders({ token: token || undefined }),
      ...options?.headers,
    },
  });
}

/** PUT proxy – parses body, validates, forwards auth token. */
export async function proxyPut(
  request: Request,
  path: string,
  options?: { headers?: Record<string, string> },
) {
  const body = await parseBody(request);
  if (!body) return invalidPayloadError();

  const token = extractToken(request as NextRequest);
  return proxyRequest({
    method: "PUT",
    path,
    body,
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders({ token: token || undefined }),
      ...options?.headers,
    },
  });
}

/** PATCH proxy – parses body, validates, forwards auth token. */
export async function proxyPatch(
  request: Request,
  path: string,
  options?: { headers?: Record<string, string> },
) {
  const body = await parseBody(request);
  if (!body) return invalidPayloadError();

  const token = extractToken(request as NextRequest);
  return proxyRequest({
    method: "PATCH",
    path,
    body,
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders({ token: token || undefined }),
      ...options?.headers,
    },
  });
}

/** DELETE proxy – forwards auth token. */
export function proxyDelete(
  request: Request,
  path: string,
  options?: { headers?: Record<string, string> },
) {
  const token = extractToken(request as NextRequest);
  return proxyRequest({
    method: "DELETE",
    path,
    headers: {
      ...buildHeaders({ token: token || undefined }),
      ...options?.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Route-context helpers (Next.js App Router)
// ---------------------------------------------------------------------------

export type IdRouteContext = { params: Promise<{ id: string }> };
export type CatchAllRouteContext = { params: Promise<{ path: string[] }> };

// ---------------------------------------------------------------------------
// Route factories – eliminate boiler-plate in collection / item route files
// ---------------------------------------------------------------------------

/**
 * Creates GET + POST handlers for a collection endpoint.
 *
 * ```ts
 * // app/api/candidatos/route.ts
 * export const { GET, POST } = createCollectionRoute("/api/candidatos");
 * ```
 */
export function createCollectionRoute(basePath: string) {
  return {
    GET: (request: NextRequest) => proxyGet(request, basePath),
    POST: (request: Request) => proxyPost(request, basePath),
  };
}

/**
 * Creates PUT + DELETE handlers for an item endpoint.
 *
 * ```ts
 * // app/api/vagas/[id]/route.ts
 * export const { PUT, DELETE } = createItemRoute("/api/vagas");
 * ```
 */
export function createItemRoute(basePath: string) {
  return {
    PUT: async (request: Request, context: IdRouteContext) => {
      const { id } = await context.params;
      return proxyPut(request, `${basePath}/${id}`);
    },
    DELETE: async (request: Request, context: IdRouteContext) => {
      const { id } = await context.params;
      return proxyDelete(request, `${basePath}/${id}`);
    },
  };
}
