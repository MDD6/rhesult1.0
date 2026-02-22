'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
import {
  fetchOnboardingProcessos,
  fetchOnboardingProcesso,
  updateOnboardingItem,
  createOnboardingProcesso,
  type OnboardingProcesso,
  type OnboardingItem
} from '../services/onboardingApi';
import { fetchCandidatos, type Candidato } from '@/features/talent-bank/services/talentBankApi';

export function OnboardingPageClient() {
  const [processos, setProcessos] = useState<OnboardingProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcesso, setSelectedProcesso] = useState<OnboardingProcesso | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);

  useEffect(() => {
    loadProcessos();
  }, []);

  const loadProcessos = async () => {
    setLoading(true);
    try {
      const data = await fetchOnboardingProcessos();
      setProcessos(data);
    } catch {
      console.error("Erro ao carregar processos.");
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (id: number) => {
    try {
      const details = await fetchOnboardingProcesso(id);
      setSelectedProcesso(details);
    } catch {
      alert('Erro ao carregar detalhes do processo.');
    }
  };

  const toggleItem = async (item: OnboardingItem) => {
    if (!selectedProcesso) return;
    try {
      const updatedItem = await updateOnboardingItem(item.id, {
        concluido: !item.concluido
      });
      
      // Update local state
      setSelectedProcesso(prev => {
        if (!prev) return null;
        const newItens = prev.itens?.map(i => i.id === item.id ? { ...i, ...updatedItem } : i);
        // Recalculate progress locally for instant feedback
        const completed = newItens?.filter(i => i.concluido).length || 0;
        const total = newItens?.length || 1;
        const progress = Math.round((completed / total) * 100);
        return { ...prev, itens: newItens, progresso_percentual: progress };
      });

      // Update list state
      setProcessos(prev => prev.map(p => p.id === selectedProcesso.id ? { ...p, progresso_percentual: selectedProcesso.progresso_percentual } : p));
    } catch {
      alert('Erro ao atualizar item.');
    }
  };

  const handleCreate = async (candidatoId: number) => {
    try {
      await createOnboardingProcesso(candidatoId);
      setCreateModalOpen(false);
      loadProcessos();
    } catch {
      alert('Erro ao criar processo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0A2725] tracking-tight">Onboarding</h1>
            <p className="text-slate-500 font-medium">Gestão de contratações e integração de novos colaboradores.</p>
          </div>
          <button 
            onClick={() => {
              fetchCandidatos().then(setCandidatos);
              setCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[#F58634] text-white font-bold rounded-xl hover:bg-[#d87026] shadow-lg shadow-orange-900/10 transition-all"
          >
            Novo Processo
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Processos */}
          <div className="lg:col-span-1 space-y-4">
            {loading ? (
              <p className="text-slate-500">Carregando...</p>
            ) : processos.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
                Nenhum processo de onboarding iniciado.
              </div>
            ) : (
              processos.map(proc => (
                <div 
                  key={proc.id}
                  onClick={() => openDetails(proc.id)}
                  className={`bg-white p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedProcesso?.id === proc.id ? 'border-[#F58634] ring-1 ring-[#F58634]' : 'border-slate-200'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#0A2725]">{proc.candidato_nome}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      proc.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                      proc.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {proc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{proc.vaga_titulo || 'Sem vaga vinculada'}</p>
                  
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                    <div 
                      className="bg-[#F58634] h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${proc.progresso_percentual}%` }}
                    />
                  </div>
                  <p className="text-right text-[10px] font-bold text-slate-400">{proc.progresso_percentual}% Completo</p>
                </div>
              ))
            )}
          </div>

          {/* Detalhes do Processo */}
          <div className="lg:col-span-2">
             {selectedProcesso ? (
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px]">
                 <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                   <div>
                     <h2 className="text-2xl font-bold text-[#0A2725] mb-1">{selectedProcesso.candidato_nome}</h2>
                     <p className="text-slate-500">{selectedProcesso.vaga_titulo}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Início</p>
                     <p className="font-semibold text-slate-700">{new Date(selectedProcesso.data_inicio).toLocaleDateString('pt-BR')}</p>
                   </div>
                 </div>

                 <h3 className="font-bold text-[#0A2725] mb-4 flex items-center gap-2">
                   <svg className="w-5 h-5 text-[#F58634]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                   Checklist de Integração
                 </h3>

                 <div className="space-y-3">
                   {selectedProcesso.itens?.map(item => (
                     <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group">
                       <input 
                         type="checkbox" 
                         checked={item.concluido} 
                         onChange={() => toggleItem(item)}
                         className="mt-1 w-5 h-5 text-[#F58634] rounded border-slate-300 focus:ring-[#F58634] cursor-pointer"
                       />
                       <div className="flex-1">
                         <p className={`text-sm font-medium ${item.concluido ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                           {item.titulo}
                         </p>
                         {item.descricao && <p className="text-xs text-slate-500 mt-0.5">{item.descricao}</p>}
                       </div>
                       {item.responsavel && (
                         <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium">
                           {item.responsavel}
                         </span>
                       )}
                     </div>
                   ))}
                   {!selectedProcesso.itens?.length && (
                     <p className="text-slate-400 italic text-sm">Nenhum item de checklist.</p>
                   )}
                 </div>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 min-h-[400px]">
                 <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 <p className="font-medium">Selecione um processo para ver os detalhes</p>
               </div>
             )}
          </div>
        </div>

        {createModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
              <h3 className="font-bold text-lg mb-4 text-[#0A2725]">Iniciar Onboarding</h3>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {candidatos.filter(c => c.etapa?.toLowerCase().includes('contratado') || c.etapa?.toLowerCase().includes('proposta')).map(c => (
                  <button 
                    key={c.id}
                    onClick={() => handleCreate(Number(c.id))}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-[#F58634] transition-all"
                  >
                    <p className="font-bold text-slate-800">{c.nome}</p>
                    <p className="text-xs text-slate-500">{c.etapa} • {c.vaga_titulo || 'Sem vaga'}</p>
                  </button>
                ))}
                {candidatos.length === 0 && <p className="text-sm text-slate-500">Nenhum candidato elegível encontrado.</p>}
              </div>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="mt-4 w-full py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
