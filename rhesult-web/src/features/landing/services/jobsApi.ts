import type { Job, JobApplication } from "../types";
import { getClientApiBase } from "@/shared/utils/clientApi";

function getApiBase() {
  return getClientApiBase();
}

export async function fetchJobsRequest(): Promise<Job[]> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}/vagas` : "/api/vagas";

  try {
    const response = await fetch(`${url}?_t=${Date.now()}`, {
      cache: "no-store",
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    const list = Array.isArray(data)
      ? data
      : (data as { data?: unknown[] })?.data || [];

    return list.map((item) => ({
      id: (item as Record<string, unknown>).id,
      titulo: String((item as Record<string, unknown>).titulo || ""),
      descricao: String((item as Record<string, unknown>).descricao || ""),
      descricao_curta: String((item as Record<string, unknown>).descricao_curta || ""),
      tipo_contrato: String((item as Record<string, unknown>).tipo_contrato || ""),
      senioridade: String((item as Record<string, unknown>).senioridade || ""),
      created_at: String((item as Record<string, unknown>).created_at || ""),
      data_criacao: String((item as Record<string, unknown>).data_criacao || ""),
      cidade: String((item as Record<string, unknown>).cidade || ""),
      modelo_trabalho: String((item as Record<string, unknown>).modelo_trabalho || ""),
      area: String((item as Record<string, unknown>).area || ""),
      salario_min: (item as Record<string, unknown>).salario_min,
      salario_max: (item as Record<string, unknown>).salario_max,
      status: String((item as Record<string, unknown>).status || "Ativa"),
    })) as Job[];
  } catch (error) {
    console.error("[fetchJobsRequest] Erro ao buscar vagas:", error);
    throw error;
  }
}

export async function submitApplicationRequest(
  payload: JobApplication,
  file: File | null,
): Promise<void> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}/public/candidatos` : "/api/public/candidatos";

  try {
    let body: BodyInit;
    const headers: Record<string, string> = {};

    if (file) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, typeof value === "boolean" ? String(value) : String(value));
        }
      });

      formData.append("curriculum_file", file);
      body = formData;
    } else {
      const jsonPayload: Record<string, unknown> = {};
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          jsonPayload[key] = value;
        }
      });

      body = JSON.stringify(jsonPayload);
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { 
      method: "POST", 
      body,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (!response.ok) {
      let message = `Erro HTTP ${response.status}`;
      try {
        const data = (await response.json()) as { error?: string };
        if (data.error) {
          message = data.error;
        }
      } catch {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch {
          // Silent fallback
        }
      }
      throw new Error(message);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(`Erro ao enviar candidatura: ${errorMsg}`);
  }
}
