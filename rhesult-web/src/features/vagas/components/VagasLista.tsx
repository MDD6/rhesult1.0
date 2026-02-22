'use client';

import React from 'react';
import { Vaga } from '../types';
import { getStatusBadgeClass } from '../services/vagasApi';

interface VagasListaProps {
  vagas: Vaga[];
  paginaAtual: number;
  vagasPorPagina: number;
  onPageChange: (page: number) => void;
  onDetalhes: (vaga: Vaga) => void;
  onEditar: (vaga: Vaga) => void;
  onExcluir: (vaga: Vaga) => void;
  onCandidatar: (vaga: Vaga) => void;
}

export function VagasLista({
  vagas,
  paginaAtual,
  vagasPorPagina,
  onPageChange,
  onDetalhes,
  onEditar,
  onExcluir,
  onCandidatar
}: VagasListaProps) {
  const inicio = (paginaAtual - 1) * vagasPorPagina;
  const vagasPagina = vagas.slice(inicio, inicio + vagasPorPagina);
  const totalPages = Math.ceil(vagas.length / vagasPorPagina);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="py-3 px-4 text-left">Título</th>
              <th className="py-3 px-4 text-left">Área</th>
              <th className="py-3 px-4 text-left">Cidade</th>
              <th className="py-3 px-4 text-left">Modelo</th>
              <th className="py-3 px-4 text-left">Responsável</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Abertura</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vagasPagina.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  Nenhuma vaga encontrada.
                </td>
              </tr>
            ) : (
              vagasPagina.map((v) => {
                const { badge } = getStatusBadgeClass(v.status_processo);
                return (
                  <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{v.titulo || '-'}</td>
                    <td className="py-3 px-4">{v.area || '-'}</td>
                    <td className="py-3 px-4">{v.cidade || '-'}</td>
                    <td className="py-3 px-4">{v.modelo_trabalho || '-'}</td>
                    <td className="py-3 px-4">{v.responsavel || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${badge}`}>
                        {v.status_processo || 'Sem status'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {v.data_abertura ? new Date(v.data_abertura).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onDetalhes(v)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50"
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => onCandidatar(v)}
                        className="text-xs px-3 py-1.5 rounded-full border border-emerald-400 text-emerald-600 hover:bg-emerald-50"
                      >
                        Candidatar
                      </button>
                      <button
                        onClick={() => onEditar(v)}
                        className="text-xs px-3 py-1.5 rounded-full border border-[#F58634] text-[#F58634] hover:bg-[#F58634]/5"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onExcluir(v)}
                        className="text-xs px-3 py-1.5 rounded-full border border-red-400 text-red-500 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-4 text-xs">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                page === paginaAtual
                  ? 'bg-[#F58634] text-white font-semibold'
                  : 'bg-white border border-gray-300 text-[#0A2725] hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
