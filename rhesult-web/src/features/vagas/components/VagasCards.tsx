'use client';

import React from 'react';
import { Vaga } from '../types';
import { formatSalary, getStatusBadgeClass } from '../services/vagasApi';

interface VagasCardsProps {
  vagas: Vaga[];
  onDetalhes: (vaga: Vaga, index: number) => void;
  onEditar: (vaga: Vaga, index: number) => void;
  onCandidatar: (vaga: Vaga) => void;
}

export function VagasCards({ vagas, onDetalhes, onEditar, onCandidatar }: VagasCardsProps) {
  if (vagas.length === 0) {
    return (
      <div className="col-span-full py-12 text-center">
        <p className="text-gray-400 text-base font-medium">Nenhuma vaga encontrada.</p>
        <p className="text-gray-300 text-sm mt-1">Tente ajustar os filtros de busca.</p>
      </div>
    );
  }

  return (
    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-5">
      {vagas.map((v, idx) => {
        const faixa = v.tipo_contrato || 'CLT';
        const badgeClass =
          faixa === 'PJ' ? 'bg-purple-50 text-purple-700' :
          faixa === 'Estágio' ? 'bg-orange-50 text-orange-600' :
          'bg-emerald-50 text-emerald-700';

        const faixaStatus = v.status_processo || '-';
        const salarioTexto = formatSalary(v.salario_min, v.salario_max);
        const { dot } = getStatusBadgeClass(v.status_processo);

        return (
          <article
            key={v.id}
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-xl hover:translate-y-[-2px] hover:border-orange-100 transition-all duration-300 relative overflow-hidden"
          >
            {/* Accent light effect */}
            <div className="absolute -right-12 -top-12 w-24 h-24 bg-orange-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative mb-5">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                   <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border mb-2 ${getStatusBadgeClass(faixaStatus).badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
                    {faixaStatus}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-orange-600 transition-colors line-clamp-2" title={v.titulo}>
                    {v.titulo || 'Vaga sem título'}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}>
                    {faixa}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-slate-500 font-medium mb-4">
                 <span className="flex items-center gap-1">
                   <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                   {v.area || 'Geral'}
                 </span>
                 <span className="flex items-center gap-1">
                   {v.cidade?.toLowerCase().includes('remoto') ? 
                     <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> :
                     <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   }
                   {v.cidade || 'Remoto'}
                 </span>
              </div>

              <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                {v.descricao_curta || v.descricao || 'Sem descrição disponível.'}
              </p>
            </div>

            <div className="mt-auto">
              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2 mb-4 py-3 border-t border-b border-slate-50">
                 <div className="text-center border-r border-slate-50">
                    <span className="block text-lg font-bold text-slate-900">{v.total_candidatos || 0}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Candidatos</span>
                 </div>
                 <div className="text-center">
                    <span className="block text-lg font-bold text-slate-900">{v.total_entrevistas || 0}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Entrevistas</span>
                 </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Faixa Salarial</span>
                  <span className="text-sm font-bold text-slate-900">{salarioTexto}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDetalhes(v, idx)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Ver Detalhes"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => onEditar(v, idx)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    title="Editar Vaga"
                  >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                   <button
                    onClick={() => onCandidatar(v)}
                    className="ml-2 h-9 px-4 flex items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold shadow-md shadow-slate-900/10 hover:bg-orange-600 hover:shadow-orange-500/20 transition-all"
                    title="Adicionar Candidato"
                  >
                    + Candidato
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
