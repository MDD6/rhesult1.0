
import { clientRequest } from "@/shared/utils/clientApi";

/* ===================== TYPES ===================== */

export type OnboardingProcesso = {
  id: number;
  candidato_id: number;
  candidato_nome: string;
  vaga_id?: number;
  vaga_titulo?: string;
  responsavel_id?: number;
  colaborador_nome: string;
  colaborador_email?: string;
  data_admissao?: string;
  status: "ativo" | "concluido" | "cancelado";
  progresso_percentual: number;
  dp_integracao_status: "pendente" | "integrado" | "erro";
  assinatura_status: "pendente" | "parcial" | "concluida";
  observacoes?: string;
  created_at: string;
  updated_at: string;
  itens?: OnboardingItem[];
  documentos?: OnboardingDocumento[];
};

export type OnboardingItem = {
  id: number;
  processo_id: number;
  categoria: string;
  titulo: string;
  descricao?: string;
  obrigatorio: number;
  status: "pendente" | "em_andamento" | "concluido" | "bloqueado";
  concluido_em?: string;
  responsavel_nome?: string;
  created_at: string;
  updated_at: string;
};

export type OnboardingDocumento = {
  id: number;
  processo_id: number;
  nome: string;
  tipo?: string;
  arquivo_url?: string;
  assinatura_status: "pendente" | "assinado";
  assinado_por?: string;
  assinado_em?: string;
  dp_sync_status: "pendente" | "sincronizado" | "erro";
  created_at: string;
  updated_at: string;
};

/* ===================== PROCESSOS ===================== */

export async function fetchOnboardingProcessos(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return clientRequest<OnboardingProcesso[]>(`/api/onboarding/processos${qs}`);
}

export async function fetchOnboardingProcesso(id: number) {
  return clientRequest<OnboardingProcesso>(`/api/onboarding/processos/${id}`);
}

export async function createOnboardingProcesso(
  candidatoId: number,
  vagaId?: number,
  opts?: { data_admissao?: string; observacoes?: string }
) {
  return clientRequest<OnboardingProcesso>("/api/onboarding/processos", {
    method: "POST",
    body: JSON.stringify({
      candidato_id: candidatoId,
      vaga_id: vagaId,
      data_admissao: opts?.data_admissao,
      observacoes: opts?.observacoes,
    }),
  });
}

export async function updateProcessoStatus(
  id: number,
  data: {
    status?: string;
    dp_integracao_status?: string;
    assinatura_status?: string;
    observacoes?: string;
  }
) {
  return clientRequest<OnboardingProcesso>(
    `/api/onboarding/processos/${id}/status`,
    { method: "PATCH", body: JSON.stringify(data) }
  );
}

export async function deleteProcesso(id: number) {
  return clientRequest<{ ok: boolean }>(`/api/onboarding/processos/${id}`, {
    method: "DELETE",
  });
}

/* ===================== ITENS ===================== */

export async function createOnboardingItem(
  processoId: number,
  data: {
    titulo: string;
    categoria?: string;
    descricao?: string;
    obrigatorio?: boolean;
    responsavel_nome?: string;
  }
) {
  return clientRequest<OnboardingItem>(
    `/api/onboarding/processos/${processoId}/itens`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function updateOnboardingItem(
  itemId: number,
  data: { status?: string; responsavel_nome?: string; descricao?: string }
) {
  return clientRequest<OnboardingItem>(`/api/onboarding/itens/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteOnboardingItem(itemId: number) {
  return clientRequest<{ ok: boolean }>(`/api/onboarding/itens/${itemId}`, {
    method: "DELETE",
  });
}

/* ===================== DOCUMENTOS ===================== */

export async function createOnboardingDocumento(
  processoId: number,
  data: { nome: string; tipo?: string; arquivo_url?: string }
) {
  return clientRequest<OnboardingDocumento>(
    `/api/onboarding/processos/${processoId}/documentos`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function signDocumento(
  docId: number,
  assinado_por: string,
  dp_sync_status?: string
) {
  return clientRequest<OnboardingDocumento>(
    `/api/onboarding/documentos/${docId}/assinar`,
    {
      method: "PATCH",
      body: JSON.stringify({ assinado_por, dp_sync_status }),
    }
  );
}

export async function deleteDocumento(docId: number) {
  return clientRequest<{ ok: boolean }>(`/api/onboarding/documentos/${docId}`, {
    method: "DELETE",
  });
}
