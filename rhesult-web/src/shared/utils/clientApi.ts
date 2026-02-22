/**
 * Shared Client-Side API Utilities
 *
 * Consolidates duplicated helper functions that were scattered across
 * talentBankApi.ts, onboardingApi.ts, agendaApi.ts, parecerApi.ts, and jobsApi.ts.
 *
 * Usage:
 *   import { getToken, getClientApiBase, buildAuthHeaders, parseApiError, clientRequest } from "@/shared/utils/clientApi";
 */

import { AUTH_CONFIG } from "../constants/app";

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/** Reads the auth token from localStorage (safe for SSR). */
export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_CONFIG.TOKEN_STORAGE_KEY) || "";
}

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------

function normalizeBase(raw?: string): string {
  const value = (raw || "").trim();
  if (!value || value === "/api") return "";
  return value.replace(/\/$/, "");
}

/**
 * Resolves the client-side API base, checking `window.RhesultAuth.apiBase()`
 * first (set by the corporate embed flow) then `NEXT_PUBLIC_API_BASE`.
 */
export function getClientApiBase(): string {
  if (typeof window !== "undefined") {
    const globalAuth = (
      window as Window & { RhesultAuth?: { apiBase?: () => string } }
    ).RhesultAuth;
    if (globalAuth?.apiBase) {
      return normalizeBase(globalAuth.apiBase());
    }
  }
  return normalizeBase(process.env.NEXT_PUBLIC_API_BASE);
}

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

/** Builds a headers object with Authorization if a token is present. */
export function buildAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

// ---------------------------------------------------------------------------
// Error parsing
// ---------------------------------------------------------------------------

/** Extracts an error message from a failed response or falls back to `fallback`. */
export async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === "object") {
    const msg =
      (payload as { mensagem?: string }).mensagem ||
      (payload as { error?: string }).error;
    if (msg) return msg;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Generic client-side request helper
// ---------------------------------------------------------------------------

/**
 * Performs an authenticated fetch against `getClientApiBase() + endpoint`,
 * returning the parsed JSON body typed as `T`.
 *
 * Automatically sets `Content-Type: application/json` and the `Authorization`
 * header when a token is available.
 */
export async function clientRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const base = getClientApiBase();
  const token = getToken();

  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `Erro na requisição: ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}
