/**
 * Domain Types - Core business entities
 * Defines the main entities of the application
 */

/**
 * Base entity with common fields
 * Implements consistency across all domain models
 */
export interface BaseEntity {
  id: string | number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User/Authentication Domain
 */
export interface User extends BaseEntity {
  nome: string;
  email: string;
  role: "admin" | "rh" | "recruiter" | "candidate";
  ativo: boolean;
  avatar_url?: string;
  cargo?: string;
}

export interface AuthTokenPayload {
  userId: string | number;
  email: string;
  role: User["role"];
}

/**
 * Vaga (Job Posting) Domain
 */
export type VagaStatus = "ativa" | "pausada" | "fechada";

export interface Vaga extends BaseEntity {
  titulo: string;
  descricao: string;
  status: VagaStatus;
  salario_minimo: number;
  salario_maximo: number;
  dataAberta: Date;
  dataFechada?: Date;
  responsavel: string;
  categoria: string;
  localizacao: string;
  tipoContrato?: string;
}

/**
 * Pagination
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Common Response Format
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  traceId?: string;
}

/**
 * Request/Response DTOs
 */
export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  accessToken?: string;
  user: User;
}

export interface CreateVagaRequest {
  titulo: string;
  descricao: string;
  salario_minimo: number;
  salario_maximo: number;
  responsavel: string;
  categoria: string;
  localizacao: string;
  tipoContrato?: string;
}

export interface UpdateVagaRequest extends Partial<CreateVagaRequest> {
  status?: VagaStatus;
}
