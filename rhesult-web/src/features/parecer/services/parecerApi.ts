export type ParecerStatus = "pendente" | "aprovado" | "reprovado" | "ajustes";

import { parseApiError as parseError } from "@/shared/utils/clientApi";

export type Parecer = {
  id: number;
  candidato_id: number;
  candidato_nome: string;
  vaga_id: number;
  vaga_titulo: string;
  avaliador_id?: number | null;
  avaliador_nome?: string | null;
  conteudo: string;
  status: ParecerStatus;
  created_at: string;
  updated_at: string;
};

export type ParecerComentario = {
  id: number;
  parecer_id: number;
  usuario_id?: number | null;
  usuario_nome?: string | null;
  texto: string;
  created_at: string;
};

export type ParecerVersao = {
  id: number;
  parecer_id: number;
  status: ParecerStatus;
  created_at: string;
  conteudo?: string;
};

export type SaveParecerInput = {
  candidato_id: number;
  vaga_id: number;
  conteudo: string;
  status: ParecerStatus;
  avaliador_id?: number;
};

function normalizeStatus(value: unknown): ParecerStatus {
  const status = String(value || "pendente").toLowerCase();
  if (status === "aprovado" || status === "reprovado" || status === "ajustes") {
    return status;
  }
  return "pendente";
}

function normalizeParecer(item: Record<string, unknown>): Parecer {
  return {
    id: Number(item.id || 0),
    candidato_id: Number(item.candidato_id || 0),
    candidato_nome: String(item.candidato_nome || "Candidato"),
    vaga_id: Number(item.vaga_id || 0),
    vaga_titulo: String(item.vaga_titulo || "Vaga"),
    avaliador_id: item.avaliador_id ? Number(item.avaliador_id) : null,
    avaliador_nome: item.avaliador_nome ? String(item.avaliador_nome) : null,
    conteudo: String(item.conteudo || ""),
    status: normalizeStatus(item.status),
    created_at: String(item.created_at || ""),
    updated_at: String(item.updated_at || item.created_at || ""),
  };
}

function normalizeComentario(item: Record<string, unknown>): ParecerComentario {
  return {
    id: Number(item.id || 0),
    parecer_id: Number(item.parecer_id || 0),
    usuario_id: item.usuario_id ? Number(item.usuario_id) : null,
    usuario_nome: item.usuario_nome ? String(item.usuario_nome) : null,
    texto: String(item.texto || ""),
    created_at: String(item.created_at || ""),
  };
}

function normalizeVersao(item: Record<string, unknown>): ParecerVersao {
  return {
    id: Number(item.id || 0),
    parecer_id: Number(item.parecer_id || 0),
    status: normalizeStatus(item.status),
    created_at: String(item.created_at || ""),
    conteudo: item.conteudo ? String(item.conteudo) : undefined,
  };
}

export async function fetchPareceres(filters?: { candidatoId?: number; vagaId?: number }): Promise<Parecer[]> {
  const search = new URLSearchParams();
  if (filters?.candidatoId) search.set("candidatoId", String(filters.candidatoId));
  if (filters?.vagaId) search.set("vagaId", String(filters.vagaId));

  const response = await fetch(search.toString() ? `/api/pareceres?${search.toString()}` : "/api/pareceres", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao carregar pareceres."));
  }

  const data = (await response.json()) as unknown;
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => normalizeParecer(item as Record<string, unknown>));
}

export async function fetchParecerById(id: number): Promise<Parecer> {
  const response = await fetch(`/api/pareceres/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao carregar parecer."));
  }

  return normalizeParecer((await response.json()) as Record<string, unknown>);
}

export async function createParecer(input: SaveParecerInput): Promise<Parecer> {
  const response = await fetch("/api/pareceres", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao criar parecer."));
  }

  return normalizeParecer((await response.json()) as Record<string, unknown>);
}

export async function updateParecer(id: number, input: Partial<SaveParecerInput>): Promise<Parecer> {
  const response = await fetch(`/api/pareceres/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao atualizar parecer."));
  }

  return normalizeParecer((await response.json()) as Record<string, unknown>);
}

export async function fetchParecerComentarios(parecerId: number): Promise<ParecerComentario[]> {
  const response = await fetch(`/api/pareceres/${parecerId}/comentarios`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao carregar comentários."));
  }

  const data = (await response.json()) as unknown;
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => normalizeComentario(item as Record<string, unknown>));
}

export async function createParecerComentario(parecerId: number, texto: string): Promise<ParecerComentario> {
  const response = await fetch(`/api/pareceres/${parecerId}/comentarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao criar comentário."));
  }

  return normalizeComentario((await response.json()) as Record<string, unknown>);
}

export async function fetchParecerVersoes(parecerId: number): Promise<ParecerVersao[]> {
  const response = await fetch(`/api/pareceres/${parecerId}/versoes`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao carregar versões."));
  }

  const data = (await response.json()) as unknown;
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => normalizeVersao(item as Record<string, unknown>));
}

export async function fetchParecerVersaoConteudo(parecerId: number, versionId: number): Promise<ParecerVersao> {
  const response = await fetch(`/api/pareceres/${parecerId}/versoes/${versionId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao carregar versão."));
  }

  return normalizeVersao((await response.json()) as Record<string, unknown>);
}

export async function deleteParecer(id: number): Promise<void> {
  const response = await fetch(`/api/pareceres/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Erro ao excluir parecer."));
  }
}
