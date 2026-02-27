'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
import {
  fetchOnboardingProcessos,
  fetchOnboardingProcesso,
  createOnboardingProcesso,
  updateProcessoStatus,
  deleteProcesso,
  createOnboardingItem,
  updateOnboardingItem,
  deleteOnboardingItem,
  createOnboardingDocumento,
  signDocumento,
  deleteDocumento,
  type OnboardingProcesso,
  type OnboardingItem,
  type OnboardingDocumento,
} from '../services/onboardingApi';
import { fetchCandidatos, type Candidato } from '@/features/talent-bank/services/talentBankApi';

type StatusFilter = 'todos' | 'ativo' | 'concluido' | 'cancelado';
type Tab = 'checklist' | 'documentos' | 'info';

export function OnboardingPageClient() {
  const [processos, setProcessos] = useState<OnboardingProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcesso, setSelectedProcesso] = useState<OnboardingProcesso | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [activeTab, setActiveTab] = useState<Tab>('checklist');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);

  // Add item modal
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItemTitulo, setNewItemTitulo] = useState('');
  const [newItemCategoria, setNewItemCategoria] = useState('Geral');
  const [newItemDescricao, setNewItemDescricao] = useState('');

  // Add document modal
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [newDocNome, setNewDocNome] = useState('');
  const [newDocTipo, setNewDocTipo] = useState('');

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  const loadProcessos = useCallback(async () => {
    setLoading(true);
    try {
      const filter = statusFilter === 'todos' ? undefined : statusFilter;
      const data = await fetchOnboardingProcessos(filter);
      setProcessos(data);
    } catch {
      console.error('Erro ao carregar processos.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadProcessos();
  }, [loadProcessos]);

  const openDetails = async (id: number) => {
    try {
      const details = await fetchOnboardingProcesso(id);
      setSelectedProcesso(details);
      setActiveTab('checklist');
      setEditingNotes(false);
    } catch {
      alert('Erro ao carregar detalhes do processo.');
    }
  };

  const refreshSelected = async () => {
    if (!selectedProcesso) return;
    try {
      const details = await fetchOnboardingProcesso(selectedProcesso.id);
      setSelectedProcesso(details);
      setProcessos(prev => prev.map(p => p.id === details.id ? { ...p, progresso_percentual: details.progresso_percentual, status: details.status } : p));
    } catch { /* silent */ }
  };

  /* ---- Item actions ---- */
  const toggleItem = async (item: OnboardingItem) => {
    try {
      const newStatus = item.status === 'concluido' ? 'pendente' : 'concluido';
      await updateOnboardingItem(item.id, { status: newStatus });
      await refreshSelected();
    } catch {
      alert('Erro ao atualizar item.');
    }
  };

  const handleAddItem = async () => {
    if (!selectedProcesso || !newItemTitulo.trim()) return;
    try {
      await createOnboardingItem(selectedProcesso.id, {
        titulo: newItemTitulo.trim(),
        categoria: newItemCategoria || 'Geral',
        descricao: newItemDescricao.trim() || undefined,
      });
      setNewItemTitulo('');
      setNewItemDescricao('');
      setNewItemCategoria('Geral');
      setAddItemOpen(false);
      await refreshSelected();
    } catch {
      alert('Erro ao adicionar item.');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Remover este item do checklist?')) return;
    try {
      await deleteOnboardingItem(itemId);
      await refreshSelected();
    } catch {
      alert('Erro ao remover item.');
    }
  };

  /* ---- Document actions ---- */
  const handleAddDoc = async () => {
    if (!selectedProcesso || !newDocNome.trim()) return;
    try {
      await createOnboardingDocumento(selectedProcesso.id, {
        nome: newDocNome.trim(),
        tipo: newDocTipo.trim() || undefined,
      });
      setNewDocNome('');
      setNewDocTipo('');
      setAddDocOpen(false);
      await refreshSelected();
    } catch {
      alert('Erro ao adicionar documento.');
    }
  };

  const handleSignDoc = async (doc: OnboardingDocumento) => {
    const nome = prompt('Nome de quem assina:');
    if (!nome?.trim()) return;
    try {
      await signDocumento(doc.id, nome.trim());
      await refreshSelected();
    } catch {
      alert('Erro ao assinar documento.');
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm('Remover este documento?')) return;
    try {
      await deleteDocumento(docId);
      await refreshSelected();
    } catch {
      alert('Erro ao remover documento.');
    }
  };

  /* ---- Process actions ---- */
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedProcesso) return;
    const label = newStatus === 'cancelado' ? 'cancelar' : 'concluir';
    if (!confirm(`Deseja ${label} este processo de onboarding?`)) return;
    try {
      await updateProcessoStatus(selectedProcesso.id, { status: newStatus });
      await refreshSelected();
      await loadProcessos();
    } catch {
      alert('Erro ao atualizar status.');
    }
  };

  const handleDeleteProcesso = async () => {
    if (!selectedProcesso) return;
    if (!confirm('Tem certeza que deseja EXCLUIR este processo? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteProcesso(selectedProcesso.id);
      setSelectedProcesso(null);
      await loadProcessos();
    } catch {
      alert('Erro ao excluir processo.');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedProcesso) return;
    try {
      await updateProcessoStatus(selectedProcesso.id, { observacoes: notesValue });
      setEditingNotes(false);
      await refreshSelected();
    } catch {
      alert('Erro ao salvar observações.');
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

  /* ---- Helpers ---- */
  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      ativo: 'bg-blue-100 text-blue-700',
      concluido: 'bg-emerald-100 text-emerald-700',
      cancelado: 'bg-red-100 text-red-700',
    };
    return m[s] || 'bg-slate-100 text-slate-600';
  };

  const statusLabel = (s: string) => {
    const m: Record<string, string> = { ativo: 'Ativo', concluido: 'Concluído', cancelado: 'Cancelado' };
    return m[s] || s;
  };

  const categoriaColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('documento')) return 'bg-amber-100 text-amber-700';
    if (c === 'dp') return 'bg-violet-100 text-violet-700';
    if (c.includes('acesso')) return 'bg-cyan-100 text-cyan-700';
    if (c.includes('integra')) return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-600';
  };

  const grouped = (selectedProcesso?.itens || []).reduce<Record<string, OnboardingItem[]>>((acc, item) => {
    const cat = item.categoria || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'ativo', label: 'Ativos' },
    { key: 'concluido', label: 'Concluídos' },
    { key: 'cancelado', label: 'Cancelados' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0A2725] tracking-tight">Onboarding</h1>
            <p className="text-slate-500 font-medium">Gestão de contratações e integração de novos colaboradores.</p>
          </div>
          <button
            onClick={() => { fetchCandidatos().then(setCandidatos); setCreateModalOpen(true); }}
            className="px-5 py-2.5 bg-[#F58634] text-white font-bold rounded-xl hover:bg-[#d87026] shadow-lg shadow-orange-900/10 transition-all"
          >
            + Novo Processo
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-slate-200 w-fit">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                statusFilter === t.key
                  ? 'bg-[#0A2725] text-white shadow'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Process List */}
          <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-slate-500">Carregando...</p>
            ) : processos.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
                Nenhum processo encontrado.
              </div>
            ) : (
              processos.map(proc => (
                <div
                  key={proc.id}
                  onClick={() => openDetails(proc.id)}
                  className={`bg-white p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    selectedProcesso?.id === proc.id ? 'border-[#F58634] ring-1 ring-[#F58634]' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#0A2725] text-sm">{proc.candidato_nome}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${statusBadge(proc.status)}`}>
                      {statusLabel(proc.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{proc.vaga_titulo || 'Sem vaga vinculada'}</p>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        proc.progresso_percentual >= 100 ? 'bg-emerald-500' : 'bg-[#F58634]'
                      }`}
                      style={{ width: `${Math.min(proc.progresso_percentual, 100)}%` }}
                    />
                  </div>
                  <p className="text-right text-[10px] font-bold text-slate-400">{proc.progresso_percentual}%</p>
                </div>
              ))
            )}
          </div>

          {/* Process Detail */}
          <div className="lg:col-span-2">
            {selectedProcesso ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[500px]">
                {/* Detail Header */}
                <div className="flex justify-between items-start p-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-[#0A2725] mb-1">{selectedProcesso.candidato_nome}</h2>
                    <p className="text-slate-500 text-sm">{selectedProcesso.vaga_titulo || 'Sem vaga vinculada'}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${statusBadge(selectedProcesso.status)}`}>
                        {statusLabel(selectedProcesso.status)}
                      </span>
                      <span className="text-xs text-slate-400">
                        Criado em {new Date(selectedProcesso.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {selectedProcesso.data_admissao && (
                        <span className="text-xs text-slate-400">
                          • Admissão: {new Date(selectedProcesso.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProcesso.status === 'ativo' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('concluido')}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          ✓ Concluir
                        </button>
                        <button
                          onClick={() => handleStatusChange('cancelado')}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleDeleteProcesso}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Excluir processo"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-3 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          selectedProcesso.progresso_percentual >= 100 ? 'bg-emerald-500' : 'bg-[#F58634]'
                        }`}
                        style={{ width: `${Math.min(selectedProcesso.progresso_percentual, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-600 whitespace-nowrap">{selectedProcesso.progresso_percentual}%</span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                  {([
                    { key: 'checklist' as Tab, label: 'Checklist', count: selectedProcesso.itens?.length },
                    { key: 'documentos' as Tab, label: 'Documentos', count: selectedProcesso.documentos?.length },
                    { key: 'info' as Tab, label: 'Informações' },
                  ]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === t.key
                          ? 'border-[#F58634] text-[#F58634]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t.label}
                      {t.count !== undefined && (
                        <span className="ml-1.5 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full">{t.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* ========= CHECKLIST TAB ========= */}
                  {activeTab === 'checklist' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-[#0A2725] text-sm">Itens do Checklist</h3>
                        {selectedProcesso.status === 'ativo' && (
                          <button
                            onClick={() => setAddItemOpen(true)}
                            className="text-xs font-bold text-[#F58634] hover:text-[#d87026] transition-colors"
                          >
                            + Adicionar item
                          </button>
                        )}
                      </div>

                      {Object.entries(grouped).length === 0 && (
                        <p className="text-slate-400 italic text-sm">Nenhum item de checklist.</p>
                      )}

                      {Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat} className="mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${categoriaColor(cat)}`}>
                              {cat}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {items.filter(i => i.status === 'concluido').length}/{items.length}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {items.map(item => (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.status === 'concluido'}
                                  onChange={() => toggleItem(item)}
                                  disabled={selectedProcesso.status !== 'ativo'}
                                  className="mt-0.5 w-5 h-5 text-[#F58634] rounded border-slate-300 focus:ring-[#F58634] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${item.status === 'concluido' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {item.titulo}
                                  </p>
                                  {item.descricao && <p className="text-xs text-slate-500 mt-0.5">{item.descricao}</p>}
                                  {item.concluido_em && (
                                    <p className="text-[10px] text-emerald-500 mt-1">
                                      Concluído em {new Date(item.concluido_em).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                                {item.responsavel_nome && (
                                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium shrink-0">
                                    {item.responsavel_nome}
                                  </span>
                                )}
                                {selectedProcesso.status === 'ativo' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-xs shrink-0"
                                    title="Remover"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ========= DOCUMENTOS TAB ========= */}
                  {activeTab === 'documentos' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-[#0A2725] text-sm">Documentos</h3>
                        {selectedProcesso.status === 'ativo' && (
                          <button
                            onClick={() => setAddDocOpen(true)}
                            className="text-xs font-bold text-[#F58634] hover:text-[#d87026] transition-colors"
                          >
                            + Adicionar documento
                          </button>
                        )}
                      </div>

                      {/* Signature progress */}
                      {(selectedProcesso.documentos?.length ?? 0) > 0 && (
                        <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600">Assinaturas</span>
                            <span className={`font-bold ${
                              selectedProcesso.assinatura_status === 'concluida' ? 'text-emerald-600' :
                              selectedProcesso.assinatura_status === 'parcial' ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                              {selectedProcesso.assinatura_status === 'concluida' ? 'Todas assinadas' :
                               selectedProcesso.assinatura_status === 'parcial' ? 'Parcialmente assinado' : 'Pendente'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                selectedProcesso.assinatura_status === 'concluida' ? 'bg-emerald-500' :
                                selectedProcesso.assinatura_status === 'parcial' ? 'bg-amber-500' : 'bg-slate-300'
                              }`}
                              style={{
                                width: `${selectedProcesso.documentos?.length
                                  ? (selectedProcesso.documentos.filter(d => d.assinatura_status === 'assinado').length / selectedProcesso.documentos.length) * 100
                                  : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {(!selectedProcesso.documentos || selectedProcesso.documentos.length === 0) && (
                        <p className="text-slate-400 italic text-sm">Nenhum documento adicionado.</p>
                      )}

                      <div className="space-y-2">
                        {selectedProcesso.documentos?.map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors group">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              doc.assinatura_status === 'assinado' ? 'bg-emerald-50' : 'bg-slate-50'
                            }`}>
                              <span className="text-lg">{doc.assinatura_status === 'assinado' ? '✓' : '📄'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{doc.nome}</p>
                              <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                {doc.tipo && <span>{doc.tipo}</span>}
                                {doc.assinado_por && <span>• Assinado por {doc.assinado_por}</span>}
                                {doc.assinado_em && <span>• {new Date(doc.assinado_em).toLocaleDateString('pt-BR')}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {doc.assinatura_status === 'pendente' && selectedProcesso.status === 'ativo' && (
                                <button
                                  onClick={() => handleSignDoc(doc)}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded bg-[#F58634] text-white hover:bg-[#d87026] transition-colors"
                                >
                                  Assinar
                                </button>
                              )}
                              {selectedProcesso.status === 'ativo' && (
                                <button
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] text-slate-400 hover:text-red-500 transition-all"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ========= INFO TAB ========= */}
                  {activeTab === 'info' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <InfoField label="Colaborador" value={selectedProcesso.colaborador_nome} />
                        <InfoField label="E-mail" value={selectedProcesso.colaborador_email} />
                        <InfoField label="Vaga" value={selectedProcesso.vaga_titulo || '—'} />
                        <InfoField
                          label="Data de Admissão"
                          value={selectedProcesso.data_admissao
                            ? new Date(selectedProcesso.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR')
                            : 'Não definida'}
                        />
                        <InfoField label="Status DP" value={selectedProcesso.dp_integracao_status} />
                        <InfoField label="Assinatura" value={selectedProcesso.assinatura_status} />
                        <InfoField
                          label="Criado em"
                          value={new Date(selectedProcesso.created_at).toLocaleDateString('pt-BR')}
                        />
                        <InfoField
                          label="Atualizado em"
                          value={new Date(selectedProcesso.updated_at).toLocaleDateString('pt-BR')}
                        />
                      </div>

                      {/* Observações */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observações</label>
                          {!editingNotes ? (
                            <button
                              onClick={() => { setNotesValue(selectedProcesso.observacoes || ''); setEditingNotes(true); }}
                              className="text-xs text-[#F58634] font-bold hover:text-[#d87026]"
                            >
                              Editar
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={handleSaveNotes} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Salvar</button>
                              <button onClick={() => setEditingNotes(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Cancelar</button>
                            </div>
                          )}
                        </div>
                        {editingNotes ? (
                          <textarea
                            value={notesValue}
                            onChange={e => setNotesValue(e.target.value)}
                            rows={4}
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:border-[#F58634] focus:ring-1 focus:ring-[#F58634] outline-none resize-none"
                            placeholder="Adicione observações sobre o processo..."
                          />
                        ) : (
                          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 min-h-[60px]">
                            {selectedProcesso.observacoes || 'Sem observações.'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 min-h-[500px]">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium">Selecione um processo para ver os detalhes</p>
              </div>
            )}
          </div>
        </div>

        {/* ============ CREATE MODAL ============ */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCreateModalOpen(false)}>
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4 text-[#0A2725]">Iniciar Onboarding</h3>
              <p className="text-xs text-slate-500 mb-3">Candidatos com etapa &quot;Contratado&quot; ou &quot;Proposta&quot;</p>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {candidatos
                  .filter(c => c.etapa?.toLowerCase().includes('contratado') || c.etapa?.toLowerCase().includes('proposta'))
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCreate(Number(c.id))}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-[#F58634] transition-all"
                    >
                      <p className="font-bold text-slate-800">{c.nome}</p>
                      <p className="text-xs text-slate-500">{c.etapa} • {c.vaga_titulo || 'Sem vaga'}</p>
                    </button>
                  ))}
                {candidatos.filter(c => c.etapa?.toLowerCase().includes('contratado') || c.etapa?.toLowerCase().includes('proposta')).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhum candidato elegível encontrado.</p>
                )}
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="mt-4 w-full py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ============ ADD ITEM MODAL ============ */}
        {addItemOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAddItemOpen(false)}>
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4 text-[#0A2725]">Adicionar Item</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título *</label>
                  <input
                    value={newItemTitulo}
                    onChange={e => setNewItemTitulo(e.target.value)}
                    placeholder="Ex: Entregar atestado médico"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#F58634] focus:ring-1 focus:ring-[#F58634] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoria</label>
                  <select
                    value={newItemCategoria}
                    onChange={e => setNewItemCategoria(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#F58634] focus:ring-1 focus:ring-[#F58634] outline-none"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Documentos">Documentos</option>
                    <option value="DP">DP</option>
                    <option value="Acessos">Acessos</option>
                    <option value="Integração">Integração</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição</label>
                  <textarea
                    value={newItemDescricao}
                    onChange={e => setNewItemDescricao(e.target.value)}
                    rows={2}
                    placeholder="Descrição opcional..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#F58634] focus:ring-1 focus:ring-[#F58634] outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddItem}
                  disabled={!newItemTitulo.trim()}
                  className="flex-1 py-2 rounded-lg bg-[#F58634] text-white font-bold hover:bg-[#d87026] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setAddItemOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ ADD DOC MODAL ============ */}
        {addDocOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAddDocOpen(false)}>
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4 text-[#0A2725]">Adicionar Documento</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do documento *</label>
                  <input
                    value={newDocNome}
                    onChange={e => setNewDocNome(e.target.value)}
                    placeholder="Ex: Contrato de trabalho"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#F58634] focus:ring-1 focus:ring-[#F58634] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo</label>
                  <input
                    value={newDocTipo}
                    onChange={e => setNewDocTipo(e.target.value)}
                    placeholder="Ex: Contrato, Política, NDA..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#F58634] focus:ring-1 focus:ring-[#F58634] outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddDoc}
                  disabled={!newDocNome.trim()}
                  className="flex-1 py-2 rounded-lg bg-[#F58634] text-white font-bold hover:bg-[#d87026] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setAddDocOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---- Small UI helper ---- */
function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
    </div>
  );
}
