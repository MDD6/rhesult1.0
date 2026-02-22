'use client';

import React from 'react';
import { Vaga, STATUS_ORDER } from '../types';

interface VagasDashboardProps {
  vagas: Vaga[];
}

export function VagasDashboard({ vagas }: VagasDashboardProps) {
  const totalVagas = vagas.length;
  const ativas = vagas.filter(v => v.status_processo !== 'Encerrada').length;

  let totalCandidatos = 0;
  let vagasComCandidatos = 0;
  vagas.forEach(v => {
    if (typeof v.total_candidatos === 'number') {
      totalCandidatos += v.total_candidatos;
      vagasComCandidatos++;
    }
  });
  const media = vagasComCandidatos ? (totalCandidatos / vagasComCandidatos) : 0;

  const agora = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(agora.getDate() - 30);
  const ultimos30 = vagas.filter(v => {
    if (!v.data_abertura) return false;
    const d = new Date(v.data_abertura);
    return d >= trintaDiasAtras;
  }).length;

  const totalEntrevistas = vagas.reduce((acc, vaga) => acc + Number(vaga.total_entrevistas || 0), 0);
  const totalContratadas = vagas.filter(v => (v.status_processo || v.status) === 'Contratado').length;
  const taxaEntrevista = totalCandidatos > 0 ? (totalEntrevistas / totalCandidatos) * 100 : 0;
  const taxaContratacao = totalVagas > 0 ? (totalContratadas / totalVagas) * 100 : 0;

  const quinzeDiasAtras = new Date();
  quinzeDiasAtras.setDate(agora.getDate() - 15);
  const emRiscoSla = vagas.filter(v => {
    const status = v.status_processo || v.status;
    if (status === 'Encerrada' || status === 'Contratado' || status === 'Reprovado') return false;
    if (!v.data_abertura) return false;
    const abertura = new Date(v.data_abertura);
    return abertura < quinzeDiasAtras;
  }).length;

  // Por status
  const porStatus: Record<string, number> = {};
  vagas.forEach(v => {
    const st = v.status_processo || 'Sem status';
    porStatus[st] = (porStatus[st] || 0) + 1;
  });

  // Por cidade
  const porCidade: Record<string, number> = {};
  vagas.forEach(v => {
    const cid = v.cidade || 'Não informado';
    porCidade[cid] = (porCidade[cid] || 0) + 1;
  });

  const topCidades = Object.entries(porCidade)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <section className="space-y-6">
      {/* Cards métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Vagas totais</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{totalVagas}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Vagas ativas (não encerradas)</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{ativas}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Média de candidatos por vaga</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{media.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Abertas nos últimos 30 dias</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{ultimos30}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Entrevistas totais</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{totalEntrevistas}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Taxa de entrevista</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{taxaEntrevista.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Taxa de contratação</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{taxaContratacao.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500 font-semibold uppercase">Vagas em risco SLA</p>
          <p className="mt-2 text-2xl font-bold text-[#0A2725]">{emRiscoSla}</p>
        </div>
      </div>

      {/* Resumos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-[#0A2725] mb-2 text-sm">Vagas por status do processo</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {Object.keys(porStatus).length === 0 ? (
              <li className="text-gray-400 text-sm">Nenhum dado disponível.</li>
            ) : (
              STATUS_ORDER.concat(Object.keys(porStatus).filter(s => !STATUS_ORDER.includes(s))).map(st => {
                if (!porStatus[st]) return null;
                return (
                  <li key={st}>
                    {st} – {porStatus[st]} vaga(s)
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-[#0A2725] mb-2 text-sm">Principais cidades</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {topCidades.length === 0 ? (
              <li className="text-gray-400 text-sm">Nenhum dado disponível.</li>
            ) : (
              topCidades.map(([cid, qtd]) => (
                <li key={cid}>
                  {cid} – {qtd} vaga(s)
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-[#0A2725] mb-2 text-sm">Performance do funil</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Candidatos totais: {totalCandidatos}</li>
            <li>Entrevistas realizadas: {totalEntrevistas}</li>
            <li>Contratações: {totalContratadas}</li>
            <li>Conversão candidato → entrevista: {taxaEntrevista.toFixed(1)}%</li>
            <li>Conversão vaga → contratação: {taxaContratacao.toFixed(1)}%</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
