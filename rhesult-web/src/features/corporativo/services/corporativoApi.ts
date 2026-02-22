import type { CandidatoApi, VagaApi } from "../types";
import { parseJsonArray } from "./corporativoMapper";

type CorporativoData = {
  vagas: VagaApi[];
  candidatos: CandidatoApi[];
};

export async function fetchCorporativoData(): Promise<CorporativoData> {
  const [vagasRes, candidatosRes] = await Promise.all([
    fetch("/api/vagas", { cache: "no-store" }),
    fetch("/api/candidatos", { cache: "no-store" }),
  ]);

  if (!vagasRes.ok || !candidatosRes.ok) {
    throw new Error("Não foi possível carregar dados do painel.");
  }

  const vagasPayload = (await vagasRes.json()) as unknown;
  const candidatosPayload = (await candidatosRes.json()) as unknown;

  return {
    vagas: parseJsonArray<VagaApi>(vagasPayload),
    candidatos: parseJsonArray<CandidatoApi>(candidatosPayload),
  };
}
