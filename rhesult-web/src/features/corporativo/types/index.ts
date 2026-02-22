export type VagaApi = {
  id?: number | string;
  titulo?: string;
  modelo_trabalho?: string;
  status_processo?: string;
};

export type CandidatoApi = {
  id?: number | string;
  nome?: string;
  etapa?: string;
  vaga_id?: number | string | null;
  criado_em?: string;
};

export type DashboardStats = {
  leadsNaoAtribuidos: number;
  emAvaliacao: number;
  retornosPendentes: number;
};

export type VagaCard = {
  id: string;
  titulo: string;
  empresa: string;
  modelo: string;
  inscritos: number;
  triagem: number;
  sla: string;
  fase: string;
};

export type AtividadeItem = {
  key: string;
  nome: string;
  evento: string;
  quando: string;
};

export type CorporativoViewModel = {
  loading: boolean;
  error: string;
  stats: DashboardStats;
  vagasAtivas: VagaCard[];
  atividade: AtividadeItem[];
};
