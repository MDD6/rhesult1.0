export interface User {
  id?: string;
  nome: string;
  email: string;
  cargo: 'ADMIN' | 'RH' | 'GESTOR' | 'COLABORADOR' | string;
  avatar_url?: string;
  role?: string;
}

export interface ProfileResponse {
  ok: boolean;
  mensagem?: string;
  data?: User;
}
