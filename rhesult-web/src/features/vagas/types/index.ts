export interface Vaga {
  id: number | string;
  titulo: string;
  area?: string;
  cidade?: string;
  tipo_contrato?: string;
  modelo_trabalho?: string;
  status_processo?: string;
  status?: string;
  nivel?: string;
  senioridade?: string;
  salario_min?: number;
  salario_max?: number;
  data_abertura?: string;
  data_fechamento?: string | null;
  descricao_curta?: string;
  descricao?: string;
  responsavel?: string;
  total_candidatos?: number;
  total_entrevistas?: number;
}

export interface VagaFilters {
  texto: string;
  cidade: string;
  status: string;
  modelo: string;
  tipoContrato: string;
  senioridade: string;
  salarioMin: string;
  salarioMax: string;
  dataAberturaInicio: string;
  dataAberturaFim: string;
  apenasAtivas: string;
}

export interface VagaPaginationState {
  paginaAtual: number;
  vagasPorPagina: number;
}

export type VagaView = "dashboard" | "lista" | "cards";

export const STATUS_ORDER = [
  "Recebendo Currículos",
  "Triagem",
  "Entrevista RH",
  "Entrevista Gestor",
  "Proposta",
  "Contratado",
  "Reprovado",
  "Encerrada"
];

export const STATUS_META: Record<string, { dot: string; badge: string; card: string }> = {
  "Recebendo Currículos": { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200", card: "border-amber-200/70" },
  "Triagem": { dot: "bg-sky-400", badge: "bg-sky-50 text-sky-700 border-sky-200", card: "border-sky-200/70" },
  "Entrevista RH": { dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", card: "border-indigo-200/70" },
  "Entrevista Gestor": { dot: "bg-violet-400", badge: "bg-violet-50 text-violet-700 border-violet-200", card: "border-violet-200/70" },
  "Proposta": { dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700 border-orange-200", card: "border-orange-200/70" },
  "Contratado": { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", card: "border-emerald-200/70" },
  "Reprovado": { dot: "bg-rose-400", badge: "bg-rose-50 text-rose-700 border-rose-200", card: "border-rose-200/70" },
  "Encerrada": { dot: "bg-slate-400", badge: "bg-slate-50 text-slate-700 border-slate-200", card: "border-slate-200/70" }
};

export const DEMO_VAGAS: Vaga[] = [
  {
    id: 1,
    titulo: "Analista Fiscal Pleno",
    area: "Fiscal",
    cidade: "Fortaleza",
    tipo_contrato: "CLT",
    modelo_trabalho: "Presencial",
    status_processo: "Entrevista RH",
    nivel: "Pleno",
    salario_min: 4500,
    salario_max: 5500,
    data_abertura: "2025-11-15T10:00:00",
    data_fechamento: null,
    descricao_curta: "Atuação em rotina fiscal com foco em tributos indiretos.",
    descricao: "Responsável pela apuração de ICMS, PIS/COFINS, obrigações acessórias e suporte à área contábil.",
    responsavel: "João Silva",
    total_candidatos: 23,
    total_entrevistas: 8
  },
  {
    id: 2,
    titulo: "Desenvolvedor Frontend Júnior",
    area: "Tecnologia",
    cidade: "Fortaleza",
    tipo_contrato: "PJ",
    modelo_trabalho: "Remoto",
    status_processo: "Recebendo Currículos",
    nivel: "Júnior",
    salario_min: 3500,
    salario_max: 4500,
    data_abertura: "2025-12-01T09:00:00",
    data_fechamento: null,
    descricao_curta: "Desenvolvimento de interfaces em React.",
    descricao: "Atuação em squad de produtos digitais, usando React, Tailwind e integrações com APIs REST.",
    responsavel: "Maria Souza",
    total_candidatos: 18,
    total_entrevistas: 3
  },
  {
    id: 3,
    titulo: "Coordenador de RH",
    area: "Recursos Humanos",
    cidade: "Recife",
    tipo_contrato: "CLT",
    modelo_trabalho: "Híbrido",
    status_processo: "Proposta",
    nivel: "Sênior",
    salario_min: 8000,
    salario_max: 10000,
    data_abertura: "2025-10-20T14:00:00",
    data_fechamento: null,
    descricao_curta: "Gestão da área de RH generalista.",
    descricao: "Responsável por R&S, T&D, clima, engajamento e apoio à diretoria.",
    responsavel: "Ana Lima",
    total_candidatos: 12,
    total_entrevistas: 5
  },
  {
    id: 4,
    titulo: "Assistente Administrativo (Temporário)",
    area: "Administrativo",
    cidade: "São Paulo",
    tipo_contrato: "Temporário",
    modelo_trabalho: "Presencial",
    status_processo: "Encerrada",
    nivel: "Júnior",
    salario_min: 2300,
    salario_max: 2600,
    data_abertura: "2025-08-01T10:00:00",
    data_fechamento: "2025-09-15T18:00:00",
    descricao_curta: "Cobertura de férias no administrativo.",
    descricao: "Atendimento, controles de planilhas, suporte geral à equipe.",
    responsavel: "Carlos Souza",
    total_candidatos: 40,
    total_entrevistas: 10
  }
];
