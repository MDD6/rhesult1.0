'use client';

import React from 'react';
import { Vaga, STATUS_ORDER, STATUS_META } from '../types';

interface VagasKanbanProps {
  vagas: Vaga[];
  onDetalhes: (vaga: Vaga, index: number) => void;
}

export function VagasKanban({ vagas, onDetalhes }: VagasKanbanProps) {
  return (
    <div className="overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
      <div className="flex gap-4 w-full min-w-[920px]">
        {STATUS_ORDER.map(status => {
          const meta = STATUS_META[status] || {
            dot: 'bg-slate-400',
            badge: 'bg-slate-50 text-slate-700 border-slate-200',
            card: 'border-slate-200/70'
          };
          const vagasStatus = vagas.filter(v => v.status_processo === status);

          return (
            <div key={status} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col min-h-[220px] w-[260px] shrink-0 snap-start">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`}></span>
                  <h3 className="text-xs font-semibold text-[#0A2725]">{status}</h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.badge}`}>
                  {vagasStatus.length}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {vagasStatus.length === 0 ? (
                  <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    Sem vagas neste status.
                  </div>
                ) : (
                  vagasStatus.map((v) => {
                    const idxReal = vagas.indexOf(v);
                    return (
                      <div
                        key={v.id}
                        onClick={() => onDetalhes(v, idxReal)}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-[#F58634] hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {v.tipo_contrato || 'CLT'}
                          </span>
                        </div>
                        <p className="font-bold text-[#0A2725] text-sm leading-snug group-hover:text-[#F58634] transition-colors mb-1 line-clamp-2" title={v.titulo}>
                          {v.titulo || 'Vaga'}
                        </p>
                        <p className="text-[10px] text-slate-500 mb-2 truncate">
                          {v.cidade || 'N/A'} • {v.modelo_trabalho || 'N/A'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-50 mt-auto">
                          <span>👥 {v.total_candidatos || 0}</span>
                          <span className="font-semibold text-slate-500">{v.nivel || '-'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
