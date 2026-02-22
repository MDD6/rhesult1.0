'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Vaga, VagaView, DEMO_VAGAS } from '../types';
import { useVagasFilter, useVagasPagination } from '../hooks';
import { fetchVagas, createVaga, updateVaga, deleteVaga, normalizeVaga, loadLocalVagas, saveLocalVagas, mergeVagas } from '../services/vagasApi';
import { VagasFilters } from './VagasFilters';
import { VagasDashboard } from './VagasDashboard';
import { VagasLista } from './VagasLista';
import { VagasCards } from './VagasCards';
import { VagasModals } from './VagasModals';
import { AppHeader } from '@/shared/components/AppHeader';

export function VagasPageClient() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [filteredVagas, setFilteredVagas] = useState<Vaga[]>([]);
  const [currentView, setCurrentView] = useState<VagaView>('dashboard');

  const { filters, updateFilter, resetFilters: resetFiltersState, applyFilters } = useVagasFilter();
  const { paginaAtual, setPaginaAtual } = useVagasPagination(6);

  // Modal states
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [detalhesVaga, setDetalhesVaga] = useState<Vaga | null>(null);

  const [showEditar, setShowEditar] = useState(false);
  const [editarVaga, setEditarVaga] = useState<Vaga | null>(null);

  const [showCriar, setShowCriar] = useState(false);
  const [showCandidatura, setShowCandidatura] = useState(false);
  const [candidaturaVaga, setCandidaturaVaga] = useState<Vaga | null>(null);

  const loadVagas = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const apiVagas = await fetchVagas();
      const localVagas = loadLocalVagas();
      const merged = mergeVagas(
        apiVagas.map(normalizeVaga),
        localVagas.map(normalizeVaga)
      );
      const finalVagas = merged.length > 0 ? merged : DEMO_VAGAS;
      setVagas(finalVagas);
      setFilteredVagas(finalVagas);
    } catch (error) {
      console.error('Error loading vagas:', error);
      setLoadError('Não foi possível carregar as vagas no momento.');
      setVagas(DEMO_VAGAS);
      setFilteredVagas(DEMO_VAGAS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const fetchData = async () => {
      await loadVagas();
    };
    void fetchData();
  }, [loadVagas]);

  const handleApplyFilters = () => {
    const filtered = applyFilters(vagas);
    setFilteredVagas(filtered);
    setPaginaAtual(1);
  };

  const handleResetFilters = () => {
    resetFiltersState();
    setFilteredVagas(vagas);
    setPaginaAtual(1);
  };

  const handleDetalhes = (vaga: Vaga) => {
    setDetalhesVaga(vaga);
    setShowDetalhes(true);
  };

  const handleEditar = (vaga: Vaga) => {
    setEditarVaga(vaga);
    setShowEditar(true);
  };

  const handleSaveEditar = async (vaga: Partial<Vaga>) => {
    if (!editarVaga || !editarVaga.id) return;

    const success = await updateVaga(editarVaga.id, vaga);
    if (success) {
      const updated = vagas.map(v =>
        v.id === editarVaga.id ? { ...editarVaga, ...vaga } : v
      );
      setVagas(updated);
      setFilteredVagas(updated);
      saveLocalVagas(updated);
      setShowEditar(false);
    }
  };

  const handleExcluir = async (vaga: Vaga) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return;

    if (vaga.id) {
      await deleteVaga(vaga.id);
    }

    const updated = vagas.filter(v => v.id !== vaga.id);
    setVagas(updated);
    setFilteredVagas(updated);
    saveLocalVagas(updated);
  };

  const handleCreateVaga = async (formData: Partial<Vaga>) => {
    const novaVaga = await createVaga(formData);
    if (novaVaga) {
      const updated = [...vagas, novaVaga];
      setVagas(updated);
      setFilteredVagas(updated);
      saveLocalVagas(updated);
      setShowCriar(false);
    }
  };

  const handleCandidatar = (vaga: Vaga) => {
    setCandidaturaVaga(vaga);
    setShowCandidatura(true);
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 w-full page-shell">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Gestão de Vagas
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">
                Gerencie o ciclo de vida das oportunidades em aberto.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCriar(true)}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-orange-600 hover:to-orange-500 hover:shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
              </svg>
              Nova Vaga
            </button>
          </div>

          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total de Vagas</span>
                <span className="text-2xl font-extrabold text-slate-900">{vagas.length}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Ativas</span>
                <span className="text-2xl font-extrabold text-emerald-600">
                  {vagas.filter(v => v.status_processo !== 'Encerrada' && v.status_processo !== 'Cancelada').length}
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-blue-600/70 uppercase tracking-wider mb-1">Em Processo</span>
                 <span className="text-2xl font-extrabold text-blue-600">
                  {vagas.filter(v => ['Triagem', 'Entrevista', 'Teste'].includes(v.status_processo || '')).length}
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Encerradas</span>
                <span className="text-2xl font-extrabold text-slate-700">
                  {vagas.filter(v => v.status_processo === 'Encerrada').length}
                </span>
              </div>
            </div>
          )}

          <VagasFilters
            filters={filters}
            onFilterChange={updateFilter}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />

          <div className="mb-6 flex gap-1 p-1.5 bg-slate-100/80 backdrop-blur rounded-2xl w-full sm:rounded-full sm:w-fit border border-slate-200 overflow-x-auto scrollbar-hide shadow-inner">
            {(['dashboard', 'lista', 'cards'] as VagaView[]).map(view => (
              <button
                key={view}
                type="button"
                onClick={() => setCurrentView(view)}
                className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center ${
                  currentView === view
                    ? 'bg-white text-orange-600 shadow-md ring-1 ring-black/5 transform scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                  {view === 'dashboard' && (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Dashboard
                    </>
                  )}
                  {view === 'lista' && (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                      Lista
                    </>
                  )}
                  {view === 'cards' && (
                    <>
                       <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      Cards
                    </>
                  )}
              </button>
            ))}
          </div>

          {loadError && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 font-semibold">
              {loadError}
            </div>
          )}

          {loading && (
            <div className="glass rounded-2xl p-10 text-center mb-6">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#F58634] border-t-transparent"></div>
              <p className="mt-3 text-sm text-slate-500 font-semibold">Carregando vagas...</p>
            </div>
          )}

          {!loading && filteredVagas.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center mb-6">
              <h3 className="text-lg font-bold text-[#0A2725]">Nenhuma vaga encontrada</h3>
              <p className="mt-2 text-sm text-slate-500">Ajuste os filtros ou crie uma nova vaga para começar.</p>
            </div>
          )}

          {!loading && filteredVagas.length > 0 && currentView === 'dashboard' && <VagasDashboard vagas={filteredVagas} />}

          {!loading && filteredVagas.length > 0 && currentView === 'lista' && (
            <VagasLista
              vagas={filteredVagas}
              paginaAtual={paginaAtual}
              vagasPorPagina={6}
              onPageChange={setPaginaAtual}
              onDetalhes={handleDetalhes}
              onEditar={handleEditar}
              onExcluir={handleExcluir}
              onCandidatar={handleCandidatar}
            />
          )}

          {!loading && filteredVagas.length > 0 && currentView === 'cards' && (
            <VagasCards
              vagas={filteredVagas}
              onDetalhes={handleDetalhes}
              onEditar={handleEditar}
              onCandidatar={handleCandidatar}
            />
          )}

          <VagasModals
            showDetalhes={showDetalhes}
            detalhesVaga={detalhesVaga}
            onCloseDetalhes={() => setShowDetalhes(false)}
            onEditar={handleEditar}
            showEditar={showEditar}
            onCloseEditar={() => setShowEditar(false)}
            onSaveEditar={handleSaveEditar}
            editarVaga={editarVaga}
            showCriar={showCriar}
            onCloseCriar={() => setShowCriar(false)}
            onSaveCriar={handleCreateVaga}
            showCandidatura={showCandidatura}
            candidaturaVaga={candidaturaVaga}
            onCloseCandidatura={() => setShowCandidatura(false)}
            onOpenCandidatura={handleCandidatar}
          />
        </div>
      </main>
    </>
  );
}
