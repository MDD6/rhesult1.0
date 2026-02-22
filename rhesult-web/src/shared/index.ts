/**
 * Shared Module - Public Exports
 * Centralizes all shared resources for easy importing
 * Follows the Barrel Export pattern for cleaner imports
 */

// Export errors
export { AppError, ErrorCode, HttpStatusCode, isAppError, parseError } from "./errors/AppError";

// Export adapters
export { BaseAdapter } from "./adapters/BaseAdapter";

// Export constants
export { APP_CONFIG, API_CONFIG, AUTH_CONFIG, ENDPOINT, PAGINATION_CONFIG, ROLE, STATUS_MAP } from "./constants/app";

// Export utils
export { getToken, getClientApiBase, buildAuthHeaders, parseApiError, clientRequest } from "./utils/clientApi";

// Export types
export type {
  BaseEntity,
  User,
  AuthTokenPayload,
  Vaga,
  VagaStatus,
  PaginatedResponse,
  PaginationParams,
  ApiResponse,
  LoginRequest,
  LoginResponse,
  CreateVagaRequest,
  UpdateVagaRequest,
} from "./types/domain";

// Export context
export { AppProvider, useApp, useAuth, useUser } from "./context/AppContext";

