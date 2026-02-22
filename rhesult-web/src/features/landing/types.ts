export type TeamMember = {
  name: string;
  role: string;
  image: string;
  quote: string;
  linkedin: string;
};

export type ServiceTab = {
  tag: string;
  title: string;
  desc: string;
  list: string[];
  bg: string;
  content?: string;
};

export type LeadershipTab = {
  tag: string;
  title: string;
  desc: string;
  list: string[];
  bg: string;
  content?: string;
};

export type Job = {
  id?: string | number;
  titulo: string;
  descricao?: string;
  descricao_curta?: string;
  tipo_contrato?: string;
  senioridade?: string;
  created_at?: string;
  data_criacao?: string;
  cidade?: string;
  modelo_trabalho?: string;
  area?: string;
  salario_min?: number | string;
  salario_max?: number | string;
  status?: string;
};

export type JobApplication = {
  vaga_id?: string;
  nome: string;
  telefone: string;
  email: string;
  cidade?: string;
  senioridade: string;
  cargo_desejado?: string;
  historico?: string;
  linkedin?: string;
  curriculum_url?: string;
  pretensao?: string;
  consentimento: boolean;
};
