import { useEffect, useMemo, useState } from "react";
import type { CandidatoApi, VagaApi } from "../types";
import { fetchCorporativoData } from "../services/corporativoApi";
import { buildStats, mapAtividade, mapVagasAtivas } from "../services/corporativoMapper";

export function useCorporativoData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vagas, setVagas] = useState<VagaApi[]>([]);
  const [candidatos, setCandidatos] = useState<CandidatoApi[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchCorporativoData();
        setVagas(data.vagas);
        setCandidatos(data.candidatos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const stats = useMemo(() => buildStats(candidatos), [candidatos]);
  const vagasAtivas = useMemo(() => mapVagasAtivas(vagas, candidatos), [vagas, candidatos]);
  const atividade = useMemo(() => mapAtividade(candidatos), [candidatos]);

  return {
    loading,
    error,
    stats,
    vagasAtivas,
    atividade,
  };
}
