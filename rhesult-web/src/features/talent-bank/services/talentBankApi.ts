export type Candidato = {
  id: string | number;
  nome: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  senioridade?: string;
  cargo_desejado?: string;
  etapa?: string;
  criado_em?: string;
  vaga_id?: string | number | null;
  vaga_titulo?: string | null;
  origem?: string | null;
  historico?: string;
  linkedin?: string;
  curriculum_url?: string;
  // Score fields
  score_total?: number;
  score_tecnico?: number;
  score_comportamental?: number;
  score_salarial?: number;
  score_prioridade?: string; // 'Alta', 'Media', 'Baixa'
};

export type Vaga = {
  id: string | number;
  titulo: string;
};

export type ParsedCV = {
    nome: string;
    email: string;
    telefone: string;
    senioridade: string;
    cargo_desejado: string;
    linkedin: string;
    historico: string;
    curriculum_url: string; 
};

export async function parseCVFile(file: File): Promise<ParsedCV> {
    const formData = new FormData();
    formData.append('curriculo', file);

    const response = await fetch('/api/candidatos/parse-cv', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Falha ao processar currículo.');
    }

    return response.json();
}

export type CreateCandidatoInput = {
  nome: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  senioridade?: string;
  cargo_desejado?: string;
  etapa?: string;
  vaga_id?: string | number | null;
  origem?: string | null;
  historico?: string;
  linkedin?: string;
  curriculum_url?: string;
};

export type UpdateCandidatoInput = Partial<CreateCandidatoInput>;

type FetchCandidatosFilters = {
  vagaId?: string | number;
};

import { getClientApiBase as getApiBase, buildAuthHeaders as buildHeaders } from "@/shared/utils/clientApi";

function normalizeCandidate(input: Record<string, unknown>): Candidato {
  return {
    id: (input.id ?? input.candidato_id ?? crypto.randomUUID()) as string | number,
    nome: String(input.nome ?? input.name ?? "").trim(),
    email: String(input.email ?? "").trim() || undefined,
    telefone: String(input.telefone ?? input.phone ?? "").trim() || undefined,
    cidade: String(input.cidade ?? "").trim() || undefined,
    senioridade: String(input.senioridade ?? "").trim() || undefined,
    cargo_desejado: String(input.cargo_desejado ?? input.cargo ?? "").trim() || undefined,
    etapa: String(input.etapa ?? input.status ?? "Inscricao").trim(),
    criado_em: String(input.criado_em ?? input.created_at ?? "").trim() || undefined,
    vaga_id: (input.vaga_id ?? null) as string | number | null,
    vaga_titulo: String(input.vaga_titulo ?? "").trim() || null,
    origem: String(input.origem ?? "").trim() || null,
    historico: String(input.historico ?? "").trim() || undefined,
    linkedin: String(input.linkedin ?? "").trim() || undefined,
    curriculum_url: String(input.curriculum_url ?? "").trim() || undefined,
    // Map score fields
    score_total: typeof input.score_total === 'number' ? input.score_total : undefined,
    score_tecnico: typeof input.score_tecnico === 'number' ? input.score_tecnico : undefined,
    score_comportamental: typeof input.score_comportamental === 'number' ? input.score_comportamental : undefined,
    score_salarial: typeof input.score_salarial === 'number' ? input.score_salarial : undefined,
    score_prioridade: String(input.score_prioridade || '').trim() || undefined,
  };
}

export async function fetchCandidatos(filters?: FetchCandidatosFilters): Promise<Candidato[]> {
  const apiBase = getApiBase();
  const baseUrl = apiBase ? `${apiBase}/api/candidatos` : "/api/candidatos";
  const searchParams = new URLSearchParams();

  if (filters?.vagaId !== undefined && filters.vagaId !== null && String(filters.vagaId).trim() !== "") {
    searchParams.set("vaga_id", String(filters.vagaId));
  }

  const query = searchParams.toString();
  const url = query ? `${baseUrl}?${query}` : baseUrl;

  const response = await fetch(url, {
    cache: "no-store",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error("Erro ao carregar candidatos.");
  }

  const data = (await response.json()) as unknown;
  const list = Array.isArray(data)
    ? data
    : (data as { data?: unknown[] })?.data || [];

  return list.map((item) => normalizeCandidate(item as Record<string, unknown>));
}

export async function fetchVagas(): Promise<Vaga[]> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}/api/vagas` : "/api/vagas";

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: buildHeaders(),
    });

    if (!response.ok) {
      console.warn(`[fetchVagas] Server responded with status ${response.status}`);
      return [];
    }

    const data = (await response.json()) as unknown;
    const list = Array.isArray(data)
      ? data
      : (data as { data?: unknown[] })?.data || [];

    return list
      .map((item) => item as Record<string, unknown>)
      .filter((item) => item.id && item.titulo)
      .map((item) => ({ id: item.id as string | number, titulo: String(item.titulo) }));
  } catch (error) {
    console.error("[fetchVagas] Failed to fetch vagas:", error);
    return [];
  }
}

export async function patchCandidatoEtapa(id: string | number, etapa: string) {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}/api/candidatos/${id}` : `/api/candidatos/${id}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders(),
    },
    body: JSON.stringify({ etapa }),
  });

  if (!response.ok) {
    throw new Error("Erro ao atualizar etapa do candidato.");
  }
}

export async function createCandidato(input: CreateCandidatoInput): Promise<Candidato> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}/api/candidatos` : "/api/candidatos";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Erro ao criar candidato.");
  }

  const data = (await response.json()) as unknown;
  const payload = (data as { data?: unknown })?.data ?? data;
  return normalizeCandidate(payload as Record<string, unknown>);
}

export async function updateCandidato(
  id: string | number,
  input: UpdateCandidatoInput
): Promise<Candidato> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}/api/candidatos/${id}` : `/api/candidatos/${id}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Erro ao atualizar candidato.");
  }

  const data = (await response.json()) as unknown;
  const payload = (data as { data?: unknown })?.data ?? data;
  return normalizeCandidate(payload as Record<string, unknown>);
}

export async function deleteCandidato(id: string | number): Promise<void> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}/api/candidatos/${id}` : `/api/candidatos/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error("Erro ao excluir candidato.");
  }
}
