import { FeatureItem, HeroCard, ModuleItem, ScoreItem } from "./types";

export const HERO_CARDS: HeroCard[] = [
  {
    label: "Banco de Talentos",
    title: "Pipeline completo de candidatos",
    subtitle: "Triagem • Tags • Score • Histórico",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    gradient: "from-slate-950",
    size: "large",
  },
  {
    label: "Agenda",
    title: "Entrevistas sem caos",
    subtitle: "Horários • links • lembretes",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
    gradient: "from-blue-950",
    size: "small",
  },
  {
    label: "Pareceres",
    title: "Decisão com critério",
    subtitle: "Scorecards • evidências • recomendação",
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
    gradient: "from-purple-950",
    size: "small",
  },
];

export const FEATURE_ITEMS: FeatureItem[] = [
  { icon: "⚡", name: "Triagem rápida", description: "Tags, filtros e ranking por aderência para acelerar decisões." },
  { icon: "📌", name: "Histórico completo", description: "Registro de interações, avaliações e evolução do candidato." },
  { icon: "🧠", name: "Parecer inteligente", description: "Modelo padronizado com resumo, hard skills e comportamento." },
  { icon: "🔒", name: "Organização e controle", description: "Tudo no lugar certo, sem depender de mil planilhas soltas." },
];

export const MODULE_ITEMS: ModuleItem[] = [
  { label: "Vagas", description: "Status • prioridades • SLA", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop" },
  { label: "Candidatos", description: "Filtros • tags • pipeline", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop" },
  { label: "Parecer", description: "Resumo • skills • fit", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop" },
  { label: "Relatórios", description: "Funil • fontes • conversão", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop" },
];

export const SATISFACTION_SCORES: ScoreItem[] = [
  { label: "Organização", value: 92 },
  { label: "Velocidade", value: 88 },
  { label: "Clareza", value: 94 },
];
