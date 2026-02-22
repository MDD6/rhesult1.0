export type EntrevistaStatus = "Agendada" | "Confirmada" | "Reagendada" | "Cancelada" | "Realizada";
export type EntrevistaTipo = "RH" | "Tecnica" | "Gestor";

import { parseApiError as parseError } from "@/shared/utils/clientApi";

export type Entrevista = {
  id: number;
  candidato_id: number;
  candidato_nome: string;
  candidato_telefone?: string | null;
  vaga_id: number;
  vaga_titulo: string;
  recrutador_id?: number | null;
  tipo: EntrevistaTipo;
  status: EntrevistaStatus;
  data_inicio: string;
  data_fim: string;
  observacoes?: string | null;
  meet_link?: string | null;
  google_event_id?: string | null;
};

type SaveEntrevistaInput = {
  candidato_id: number;
  vaga_id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  tipo: EntrevistaTipo;
  status: EntrevistaStatus;
  observacoes?: string;
  recrutador_id?: number;
  meet_link?: string;
};

function normalizeEntrevista(item: Record<string, unknown>): Entrevista {
  return {
    id: Number(item.id || 0),
    candidato_id: Number(item.candidato_id || 0),
    candidato_nome: String(item.candidato_nome || "Candidato"),
    candidato_telefone: item.candidato_telefone ? String(item.candidato_telefone) : null,
    vaga_id: Number(item.vaga_id || 0),
    vaga_titulo: String(item.vaga_titulo || "Vaga"),
    recrutador_id: item.recrutador_id ? Number(item.recrutador_id) : null,
    tipo: (String(item.tipo || "RH") as EntrevistaTipo),
    status: (String(item.status || "Agendada") as EntrevistaStatus),
    data_inicio: String(item.data_inicio || ""),
    data_fim: String(item.data_fim || ""),
    observacoes: item.observacoes ? String(item.observacoes) : null,
    meet_link: item.meet_link ? String(item.meet_link) : null,
    google_event_id: item.google_event_id ? String(item.google_event_id) : null,
  };
}

export async function fetchEntrevistas(params?: { start?: string; end?: string }): Promise<Entrevista[]> {
  const search = new URLSearchParams();
  if (params?.start) search.set("start", params.start);
  if (params?.end) search.set("end", params.end);
  const query = search.toString();

  const response = await fetch(query ? `/api/entrevistas?${query}` : "/api/entrevistas", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao carregar entrevistas."));
  }

  const data = (await response.json()) as unknown;
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => normalizeEntrevista(item as Record<string, unknown>));
}

export async function createEntrevista(input: SaveEntrevistaInput): Promise<Entrevista> {
  const response = await fetch("/api/entrevistas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao criar entrevista."));
  }

  return normalizeEntrevista((await response.json()) as Record<string, unknown>);
}

export async function updateEntrevista(id: number, input: Partial<SaveEntrevistaInput>): Promise<Entrevista> {
  const response = await fetch(`/api/entrevistas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao atualizar entrevista."));
  }

  return normalizeEntrevista((await response.json()) as Record<string, unknown>);
}

export async function deleteEntrevista(id: number): Promise<void> {
  const response = await fetch(`/api/entrevistas/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao remover entrevista."));
  }
}
