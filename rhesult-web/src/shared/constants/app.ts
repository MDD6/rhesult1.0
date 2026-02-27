/**
 * Application-wide Constants
 * Centralizes magic strings and numbers following DRY principle
 */

export const APP_CONFIG = {
  APP_NAME: "Rhesult",
  VERSION: "1.0.0",
  ENVIRONMENT: process.env.NODE_ENV || "development",
} as const;

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000",
  BACKEND_URL: process.env.API_BASE || "http://localhost:4000",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const AUTH_CONFIG = {
  TOKEN_STORAGE_KEY: "rhesult_token",
  USER_STORAGE_KEY: "rhesult_user",
  COOKIE_NAME: "rhesult_token",
  COOKIE_MAX_AGE: 60 * 60 * 24, // 24 hours — must match backend TOKEN_TTL_HOURS
  COOKIE_PATH: "/",
  REDIRECT_DELAY_MS: 500,
} as const;

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

export const ENDPOINT = {
  // Auth
  AUTH_LOGIN: "/auth/login",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_VERIFY: "/auth/verify",

  // Vagas
  VAGAS_LIST: "/api/vagas",
  VAGAS_BY_ID: (id: string) => `/api/vagas/${id}`,
  VAGAS_CREATE: "/api/vagas",
  VAGAS_UPDATE: (id: string) => `/api/vagas/${id}`,
  VAGAS_DELETE: (id: string) => `/api/vagas/${id}`,
} as const;

export const ROLE = {
  ADMIN: "admin",
  RH: "rh",
  RECRUITER: "recruiter",
  CANDIDATE: "candidate",
} as const;

export const STATUS_MAP = {
  ATIVA: "ativa",
  PAUSADA: "pausada",
  FECHADA: "fechada",
} as const;

export const HTTP_HEADERS = {
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  ACCEPT: "Accept",
} as const;

export const TOAST_DURATION = {
  SHORT: 3000,
  DEFAULT: 5000,
  LONG: 7000,
} as const;
