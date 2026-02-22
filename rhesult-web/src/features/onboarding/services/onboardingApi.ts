
import { clientRequest } from "@/shared/utils/clientApi";

export type OnboardingProcesso = {
  id: number;
  candidato_id: number;
  candidato_nome: string;
  vaga_id?: number;
  vaga_titulo?: string;
  data_inicio: string;
  data_previsao_fim?: string;
  status: 'ativo' | 'concluido' | 'cancelado';
  progresso_percentual: number;
  itens?: OnboardingItem[];
  documentos?: OnboardingDocumento[];
};

export type OnboardingItem = {
  id: number;
  titulo: string;
  descricao?: string;
  responsavel?: string;
  prazo_dias?: number;
  concluido: boolean;
  concluido_em?: string;
  concluido_por?: number;
};

export type OnboardingDocumento = {
  id: number;
  titulo: string;
  tipo: string;
  status_assinatura: 'pendente' | 'assinado';
  url_arquivo?: string;
};

export async function fetchOnboardingProcessos() {
  return clientRequest<OnboardingProcesso[]>('/api/onboarding/processos');
}

export async function fetchOnboardingProcesso(id: number) {
  return clientRequest<OnboardingProcesso>(`/api/onboarding/processos/${id}`);
}

export async function updateOnboardingItem(itemId: number, data: Partial<OnboardingItem>) {
  const payload: Record<string, string | boolean | number | undefined> = {};

  if (data.concluido !== undefined) {
    payload.status = data.concluido ? 'concluido' : 'pendente';
  }

  if (data.responsavel !== undefined) {
    payload.responsavel_nome = data.responsavel;
  }

  if (data.descricao !== undefined) {
    payload.descricao = data.descricao;
  }

  return clientRequest<OnboardingItem>(`/api/onboarding/itens/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createOnboardingProcesso(candidatoId: number, vagaId?: number) {
  return clientRequest<OnboardingProcesso>('/api/onboarding/processos', {
    method: 'POST',
    body: JSON.stringify({ candidato_id: candidatoId, vaga_id: vagaId }),
  });
}
