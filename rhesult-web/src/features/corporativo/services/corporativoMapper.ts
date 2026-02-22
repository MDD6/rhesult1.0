import type {
  AtividadeItem,
  CandidatoApi,
  DashboardStats,
  VagaApi,
  VagaCard,
} from "../types";

export function normalize(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseJsonArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === "object") {
    const maybeData = (payload as { data?: unknown }).data;
    if (Array.isArray(maybeData)) return maybeData as T[];
  }

  return [];
}

export function buildStats(candidatos: CandidatoApi[]): DashboardStats {
  const leadsNaoAtribuidos = candidatos.filter((cand) => !cand.vaga_id).length;

  const emAvaliacao = candidatos.filter((cand) => {
    const etapa = normalize(cand.etapa);
    return etapa.includes("triagem") || etapa.includes("entrevista") || etapa.includes("teste");
  }).length;

  const retornosPendentes = candidatos.filter((cand) => {
    const etapa = normalize(cand.etapa);
    if (!etapa) return false;
    return etapa.includes("proposta") || etapa.includes("entrevista");
  }).length;

  return {
    leadsNaoAtribuidos,
    emAvaliacao,
    retornosPendentes,
  };
}

function etapaToAtividade(etapa?: string) {
  const value = normalize(etapa);
  if (value.includes("entrevista")) return "Entrevista confirmada";
  if (value.includes("triagem")) return "Movido para triagem";
  if (value.includes("reprov")) return "Feedback enviado";
  if (value.includes("aprov")) return "Aprovado no processo";
  return "Candidatura recebida";
}

function formatoQuando(value?: string) {
  if (!value) return "agora";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH <= 0) return "agora";
  if (diffH < 24) return `há ${diffH}h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD <= 1) return "ontem";
  return `há ${diffD}d`;
}

export function mapVagasAtivas(vagas: VagaApi[], candidatos: CandidatoApi[]): VagaCard[] {
  return vagas
    .filter((vaga) => normalize(vaga.status_processo || "ativa") !== "fechada")
    .slice(0, 4)
    .map((vaga) => {
      const inscritos = candidatos.filter((cand) => String(cand.vaga_id || "") === String(vaga.id || "")).length;

      const triagem = candidatos.filter((cand) => {
        if (String(cand.vaga_id || "") !== String(vaga.id || "")) return false;
        const etapa = normalize(cand.etapa);
        return etapa.includes("triagem") || etapa.includes("entrevista");
      }).length;

      return {
        id: String(vaga.id || vaga.titulo || Math.random()),
        titulo: vaga.titulo || "Vaga sem título",
        empresa: "RHesult",
        modelo: vaga.modelo_trabalho || "Híbrido",
        inscritos,
        triagem,
        sla: inscritos > 0 ? `${Math.max(1, Math.min(5, Math.ceil(inscritos / 5)))}d` : "0d",
        fase: triagem > 0 ? "Triagem" : "Inscrições",
      };
    });
}

export function mapAtividade(candidatos: CandidatoApi[]): AtividadeItem[] {
  return [...candidatos]
    .sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime())
    .slice(0, 6)
    .map((cand) => ({
      key: String(cand.id || `${cand.nome}-${cand.criado_em}`),
      nome: cand.nome || "Candidato",
      evento: etapaToAtividade(cand.etapa),
      quando: formatoQuando(cand.criado_em),
    }));
}
