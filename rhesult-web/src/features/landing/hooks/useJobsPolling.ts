"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJobsRequest } from "../services/jobsApi";
import type { Job } from "../types";

const ACTIVE_STATUSES = [
  "Ativa",
  "Aberta",
  "Recebendo Currículos",
  "Triagem",
  "Entrevista RH",
  "Entrevista Gestor",
];

export function useJobsPolling(intervalMs = 15000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await fetchJobsRequest();
      setJobs(data || []);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      console.warn("[useJobsPolling] Erro ao buscar vagas:", errorMsg);
      setError("Sistema de vagas indisponível no momento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
    const id = window.setInterval(fetchJobs, intervalMs);
    return () => window.clearInterval(id);
  }, [fetchJobs, intervalMs]);

  const activeJobs = useMemo(
    () => jobs.filter((job) => (job.status ? ACTIVE_STATUSES.includes(job.status) : true)),
    [jobs],
  );

  return {
    jobs: activeJobs,
    loading,
    error,
    refetch: fetchJobs,
  };
}

export function getTimeAgo(dateStr?: string) {
  if (!dateStr) return "";

  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias atrás`;
  return "";
}

export function isNewJob(job: Job) {
  const createdAt = job.created_at || job.data_criacao;
  if (!createdAt) return false;
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 5 * 24 * 60 * 60 * 1000;
}
