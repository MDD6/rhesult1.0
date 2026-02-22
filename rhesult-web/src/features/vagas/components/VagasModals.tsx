'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Vaga } from '../types';
import { formatSalary } from '../services/vagasApi';
import { submitApplicationRequest } from '@/features/landing/services/jobsApi';
import type { JobApplication } from '@/features/landing/types';
import { fetchCandidatos, type Candidato } from '@/features/talent-bank/services/talentBankApi';

interface VagasModalsProps {
  showDetalhes: boolean;
  detalhesVaga: Vaga | null;
  onCloseDetalhes: () => void;
  onEditar: (vaga: Vaga) => void;
  showEditar: boolean;
  onCloseEditar: () => void;
  onSaveEditar: (vaga: Partial<Vaga>) => void;
  editarVaga: Vaga | null;
  showCriar: boolean;
  onCloseCriar: () => void;
  onSaveCriar: (vaga: Partial<Vaga>) => void;
  showCandidatura: boolean;
  candidaturaVaga: Vaga | null;
  onCloseCandidatura: () => void;
  onOpenCandidatura: (vaga: Vaga) => void;
}

export function VagasModals({
  showDetalhes,
  detalhesVaga,
  onCloseDetalhes,
  onEditar,
  showEditar,
  onCloseEditar,
  onSaveEditar,
  editarVaga,
  showCriar,
  onCloseCriar,
  onSaveCriar,
  showCandidatura,
  candidaturaVaga,
  onCloseCandidatura,
  onOpenCandidatura
}: VagasModalsProps) {
  const [detalhesTab, setDetalhesTab] = useState<'resumo' | 'candidatos' | 'sugestoes' | 'historico'>('resumo');
  const [etapaCandidatura, setEtapaCandidatura] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [candidatosDaVaga, setCandidatosDaVaga] = useState<Candidato[]>([]);
  const [loadingCandidatos, setLoadingCandidatos] = useState(false);
  const [erroCandidatos, setErroCandidatos] = useState('');
  const detalhesVagaId = detalhesVaga?.id;
  const [formDataCandidatura, setFormDataCandidatura] = useState<JobApplication>({
    vaga_id: '',
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    senioridade: '',
    cargo_desejado: '',
    historico: '',
    linkedin: '',
    curriculum_url: '',
    pretensao: '',
    consentimento: false
  });

  const resetCandidatura = useCallback(() => {
    setEtapaCandidatura(1);
    setSubmitting(false);
    setFeedback('');
    setCurriculumFile(null);
    setFormDataCandidatura({
      vaga_id: candidaturaVaga?.id ? String(candidaturaVaga.id) : '',
      nome: '',
      telefone: '',
      email: '',
      cidade: '',
      senioridade: '',
      cargo_desejado: candidaturaVaga?.titulo || '',
      historico: '',
      linkedin: '',
      curriculum_url: '',
      pretensao: '',
      consentimento: false
    });
  }, [candidaturaVaga]);

  useEffect(() => {
    if (showCandidatura && candidaturaVaga) {
      resetCandidatura();
    }
  }, [showCandidatura, candidaturaVaga, resetCandidatura]);

  useEffect(() => {
    if (!showDetalhes || detalhesTab !== 'candidatos' || !detalhesVagaId) {
      return;
    }

    let active = true;

    const loadCandidatosByVaga = async () => {
      setLoadingCandidatos(true);
      setErroCandidatos('');

      try {
        const filtered = await fetchCandidatos({ vagaId: detalhesVagaId });
        if (!active) return;
        setCandidatosDaVaga(filtered);
      } catch (error) {
        if (!active) return;
        console.error('Erro ao carregar candidatos da vaga:', error);
        setErroCandidatos('Não foi possível carregar os candidatos desta vaga.');
        setCandidatosDaVaga([]);
      } finally {
        if (active) {
          setLoadingCandidatos(false);
        }
      }
    };

    void loadCandidatosByVaga();

    return () => {
      active = false;
    };
  }, [showDetalhes, detalhesTab, detalhesVagaId]);

  const openCandidaturaFromVaga = (vaga: Vaga) => {
    onOpenCandidatura(vaga);
    setTimeout(() => {
      setFormDataCandidatura((prev) => ({
        ...prev,
        vaga_id: String(vaga.id || ''),
        cargo_desejado: vaga.titulo || prev.cargo_desejado
      }));
      setEtapaCandidatura(1);
      setFeedback('');
    }, 0);
  };

  const handleSubmitCandidatura = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!candidaturaVaga) return;

    if (!formDataCandidatura.consentimento) {
      setFeedback('Você precisa aceitar o consentimento LGPD.');
      return;
    }

    setSubmitting(true);
    setFeedback('');

    try {
      await submitApplicationRequest(
        {
          ...formDataCandidatura,
          vaga_id: String(candidaturaVaga.id || ''),
          cargo_desejado: formDataCandidatura.cargo_desejado || candidaturaVaga.titulo || ''
        },
        curriculumFile
      );
      setFeedback('✅ Candidatura enviada com sucesso.');
      setTimeout(() => {
        onCloseCandidatura();
        resetCandidatura();
      }, 1200);
    } catch (err) {
      setFeedback(err instanceof Error ? `❌ ${err.message}` : '❌ Erro ao enviar candidatura.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextEtapa = () => {
    if (etapaCandidatura === 1) {
      if (!formDataCandidatura.nome.trim() || !formDataCandidatura.telefone.trim() || !formDataCandidatura.email.trim()) {
        setFeedback('Preencha nome, telefone e e-mail para avançar.');
        return;
      }
    }

    if (etapaCandidatura === 2) {
      if (!formDataCandidatura.senioridade.trim()) {
        setFeedback('Selecione a senioridade para avançar.');
        return;
      }
    }

    setFeedback('');
    setEtapaCandidatura((prev) => Math.min(3, prev + 1));
  };

  return (
    <>
      {/* MODAL DETALHES */}
      {showDetalhes && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-xl relative fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={onCloseDetalhes}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#F58634] text-xl font-bold"
              aria-label="Fechar detalhes"
            >
              &times;
            </button>

            {detalhesVaga && (
              <>
                <h2 className="text-lg font-semibold text-[#0A2725] mb-3">{detalhesVaga.titulo || 'Vaga'}</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {detalhesVaga.cidade || 'Cidade não informada'} • {detalhesVaga.modelo_trabalho || 'Modelo não informado'}
                </p>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['resumo', 'candidatos', 'sugestoes', 'historico'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDetalhesTab(tab)}
                      className={`px-3 py-2 text-xs font-semibold rounded-full transition-colors ${
                        detalhesTab === tab
                          ? 'bg-[#F58634] text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Resumo */}
                {detalhesTab === 'resumo' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                      <p>
                        <span className="font-semibold text-[#0A2725]">Área:</span> {detalhesVaga.area || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0A2725]">Tipo:</span> {detalhesVaga.tipo_contrato || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0A2725]">Nível:</span> {detalhesVaga.nivel || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0A2725]">Status:</span> {detalhesVaga.status_processo || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0A2725]">Responsável:</span> {detalhesVaga.responsavel || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0A2725]">Abertura:</span>{' '}
                        {detalhesVaga.data_abertura ? new Date(detalhesVaga.data_abertura).toLocaleDateString('pt-BR') : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0A2725]">Candidatos:</span>{' '}
                        {typeof detalhesVaga.total_candidatos === 'number' ? detalhesVaga.total_candidatos : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0A2725]">Faixa salarial:</span> {formatSalary(detalhesVaga.salario_min, detalhesVaga.salario_max)}
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-[#0A2725] mb-1">Descrição da vaga</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {detalhesVaga.descricao || detalhesVaga.descricao_curta || 'Nenhuma descrição informada.'}
                      </p>
                    </div>
                  </div>
                )}

                {detalhesTab === 'candidatos' && (
                  <div className="text-sm text-gray-700">
                    {loadingCandidatos && (
                      <p className="mb-3 text-slate-500">Carregando candidatos da vaga...</p>
                    )}

                    {erroCandidatos && (
                      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                        {erroCandidatos}
                      </div>
                    )}

                    {!loadingCandidatos && !erroCandidatos && (
                      <>
                        <p className="mb-3 text-slate-600">
                          {candidatosDaVaga.length > 0
                            ? `${candidatosDaVaga.length} candidato(s) inscrito(s) nesta vaga.`
                            : 'Nenhum candidato inscrito nesta vaga até o momento.'}
                        </p>

                        {candidatosDaVaga.length > 0 && (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {candidatosDaVaga.map((cand) => (
                              <div key={String(cand.id)} className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/60 transition-colors hover:bg-slate-100">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-[#0A2725]">{cand.nome || 'Sem nome'}</p>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                                      <span>Etapa: {cand.etapa || 'Inscricao'}</span>
                                      {cand.senioridade && <span>• Senioridade: {cand.senioridade}</span>}
                                      {cand.cidade && <span>• {cand.cidade}</span>}
                                    </div>
                                  </div>
                                  {/* Score Badge */}
                                  {cand.score_total !== undefined && (
                                    <div className="flex flex-col items-end">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                                        cand.score_total >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                        cand.score_total >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                        'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}>
                                        {cand.score_total}% Match
                                      </span>
                                      <span className="text-[9px] text-slate-400 mt-0.5" title="T=Técnico, C=Comportamental, S=Salarial">
                                        T:{cand.score_tecnico || 0} C:{cand.score_comportamental || 0} S:{cand.score_salarial || 0}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-2 flex flex-wrap gap-2 text-xs border-t border-slate-200/50 pt-2">
                                  {cand.email && <span className="text-slate-500">📧 {cand.email}</span>}
                                  {cand.telefone && <span className="text-slate-500">📱 {cand.telefone}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    <a
                      href="/banco-talentos"
                      className="mt-3 inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0A2725] hover:bg-slate-50"
                    >
                      Ver Banco de Talentos
                    </a>
                  </div>
                )}

                {/* Sugestões e Histórico */}
                {['sugestoes', 'historico'].includes(detalhesTab) && (
                  <div className="text-sm text-gray-600">
                    <p className="mb-3">Esta seção será integrada com o Banco de Talentos.</p>
                    <a
                      href="/banco-talentos"
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0A2725] hover:bg-slate-50"
                    >
                      Ver Banco de Talentos
                    </a>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-2 text-xs">
                  <button
                    onClick={onCloseDetalhes}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      onEditar(detalhesVaga);
                      onCloseDetalhes();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#F58634] text-white font-semibold hover:bg-[#d87026]"
                  >
                    Editar vaga
                  </button>
                  <button
                    onClick={() => {
                      openCandidaturaFromVaga(detalhesVaga);
                      onCloseDetalhes();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    Candidatar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showEditar && editarVaga && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-xl relative fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={onCloseEditar}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#F58634] text-xl font-bold"
              aria-label="Fechar edição"
            >
              &times;
            </button>

            <h2 className="text-lg font-semibold text-[#0A2725] mb-4">Editar Vaga</h2>

            <VagaForm
              initialVaga={editarVaga}
              onSubmit={onSaveEditar}
              onCancel={onCloseEditar}
            />
          </div>
        </div>
      )}

      {/* MODAL CRIAR */}
      {showCriar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-xl relative fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={onCloseCriar}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#F58634] text-xl font-bold"
              aria-label="Fechar criação"
            >
              &times;
            </button>

            <h2 className="text-lg font-semibold text-[#0A2725] mb-4">Nova Vaga</h2>

            <VagaForm
              onSubmit={onSaveCriar}
              onCancel={onCloseCriar}
            />
          </div>
        </div>
      )}

      {/* MODAL CANDIDATURA EM ETAPAS */}
      {showCandidatura && candidaturaVaga && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                onCloseCandidatura();
                resetCandidatura();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#F58634] text-xl font-bold"
              aria-label="Fechar candidatura"
            >
              &times;
            </button>

            <h2 className="text-lg font-semibold text-[#0A2725] mb-1">Candidatura em etapas</h2>
            <p className="text-sm text-slate-600 mb-4">{candidaturaVaga.titulo} • {candidaturaVaga.cidade || 'Remoto'}</p>

            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className={`h-2 flex-1 rounded-full ${step <= etapaCandidatura ? 'bg-[#F58634]' : 'bg-slate-200'}`} />
              ))}
            </div>

            <form onSubmit={handleSubmitCandidatura} className="space-y-4">
              {etapaCandidatura === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#0A2725] block mb-1">Nome completo</label>
                    <input required value={formDataCandidatura.nome} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, nome: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="font-semibold text-[#0A2725] block mb-1">Telefone</label>
                    <input required value={formDataCandidatura.telefone} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, telefone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="font-semibold text-[#0A2725] block mb-1">E-mail</label>
                    <input type="email" required value={formDataCandidatura.email} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#0A2725] block mb-1">Cidade</label>
                    <input value={formDataCandidatura.cidade || ''} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, cidade: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              )}

              {etapaCandidatura === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#0A2725] block mb-1">Senioridade</label>
                    <select required value={formDataCandidatura.senioridade} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, senioridade: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Selecione</option>
                      <option>Júnior</option>
                      <option>Pleno</option>
                      <option>Sênior</option>
                      <option>Especialista</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-[#0A2725] block mb-1">Pretensão salarial</label>
                    <input value={formDataCandidatura.pretensao || ''} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, pretensao: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#0A2725] block mb-1">LinkedIn</label>
                    <input value={formDataCandidatura.linkedin || ''} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, linkedin: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#0A2725] block mb-1">Resumo profissional</label>
                    <textarea rows={4} value={formDataCandidatura.historico || ''} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, historico: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              )}

              {etapaCandidatura === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-[#0A2725] block mb-1">Currículo (arquivo)</label>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCurriculumFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="font-semibold text-[#0A2725] block mb-1">Ou link do currículo</label>
                    <input value={formDataCandidatura.curriculum_url || ''} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, curriculum_url: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={formDataCandidatura.consentimento} onChange={(e) => setFormDataCandidatura(prev => ({ ...prev, consentimento: e.target.checked }))} />
                    Concordo com o tratamento dos meus dados para fins de recrutamento e seleção (LGPD).
                  </label>
                </div>
              )}

              {feedback && <p className="text-sm text-slate-700">{feedback}</p>}

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEtapaCandidatura((prev) => Math.max(1, prev - 1))}
                  disabled={etapaCandidatura === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm disabled:opacity-50"
                >
                  Voltar
                </button>

                {etapaCandidatura < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextEtapa}
                    className="px-4 py-2 rounded-lg bg-[#F58634] text-white text-sm font-semibold hover:bg-[#d87026]"
                  >
                    Próxima etapa
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitting ? 'Enviando...' : 'Enviar candidatura'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

interface VagaFormProps {
  initialVaga?: Vaga;
  onSubmit: (vaga: Partial<Vaga>) => void;
  onCancel: () => void;
}

function VagaForm({ initialVaga, onSubmit, onCancel }: VagaFormProps) {
  const [formData, setFormData] = useState({
    titulo: String(initialVaga?.titulo || ''),
    cidade: String(initialVaga?.cidade || ''),
    area: String(initialVaga?.area || ''),
    responsavel: String(initialVaga?.responsavel || ''),
    tipo_contrato: String(initialVaga?.tipo_contrato || ''),
    modelo_trabalho: String(initialVaga?.modelo_trabalho || ''),
    nivel: String(initialVaga?.nivel || initialVaga?.senioridade || ''),
    salario_min: String(initialVaga?.salario_min || ''),
    salario_max: String(initialVaga?.salario_max || ''),
    status_processo: String(initialVaga?.status_processo || initialVaga?.status || 'Recebendo Currículos'),
    descricao_curta: String(initialVaga?.descricao_curta || ''),
    descricao: String(initialVaga?.descricao || '')
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: Partial<Vaga> = {
      titulo: formData.titulo,
      cidade: formData.cidade,
      area: formData.area,
      responsavel: formData.responsavel,
      tipo_contrato: formData.tipo_contrato,
      modelo_trabalho: formData.modelo_trabalho,
      nivel: formData.nivel,
      salario_min: formData.salario_min ? Number(formData.salario_min) : undefined,
      salario_max: formData.salario_max ? Number(formData.salario_max) : undefined,
      status_processo: formData.status_processo,
      descricao_curta: formData.descricao_curta,
      descricao: formData.descricao
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div>
        <label className="font-semibold text-[#0A2725] block mb-1">Título</label>
        <input
          name="titulo"
          value={formData.titulo}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold text-[#0A2725] block mb-1">Cidade</label>
          <input
            name="cidade"
            value={formData.cidade}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
        <div>
          <label className="font-semibold text-[#0A2725] block mb-1">Área</label>
          <input
            name="area"
            value={formData.area}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="font-semibold text-[#0A2725] block mb-1">Responsável</label>
          <input
            name="responsavel"
            value={formData.responsavel}
            onChange={handleChange}
            placeholder="Nome do responsável"
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="font-semibold text-[#0A2725] block mb-1">Tipo de Contrato</label>
          <input
            name="tipo_contrato"
            value={formData.tipo_contrato}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
        <div>
          <label className="font-semibold text-[#0A2725] block mb-1">Modelo</label>
          <input
            name="modelo_trabalho"
            value={formData.modelo_trabalho}
            onChange={handleChange}
            placeholder="Presencial / Remoto / Híbrido"
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
        <div>
          <label className="font-semibold text-[#0A2725] block mb-1">Nível</label>
          <input
            name="nivel"
            value={formData.nivel}
            onChange={handleChange}
            placeholder="Júnior / Pleno / Sênior"
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold text-[#0A2725] block mb-1">Salário Mínimo</label>
          <input
            name="salario_min"
            type="number"
            value={formData.salario_min}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
        <div>
          <label className="font-semibold text-[#0A2725] block mb-1">Salário Máximo</label>
          <input
            name="salario_max"
            type="number"
            value={formData.salario_max}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
          />
        </div>
      </div>

      <div>
        <label className="font-semibold text-[#0A2725] block mb-1">Status do Processo</label>
        <select
          name="status_processo"
          value={formData.status_processo}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
        >
          <option>Recebendo Currículos</option>
          <option>Triagem</option>
          <option>Entrevista RH</option>
          <option>Entrevista Gestor</option>
          <option>Proposta</option>
          <option>Contratado</option>
          <option>Reprovado</option>
          <option>Encerrada</option>
        </select>
      </div>

      <div>
        <label className="font-semibold text-[#0A2725] block mb-1">Descrição Curta</label>
        <input
          name="descricao_curta"
          value={formData.descricao_curta}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
        />
      </div>

      <div>
        <label className="font-semibold text-[#0A2725] block mb-1">Descrição Completa</label>
        <textarea
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 border rounded-lg focus-visible:ring-1 focus-visible:ring-[#F58634]"
        ></textarea>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-[#F58634] text-white text-sm font-semibold hover:bg-[#d87026]"
        >
          {initialVaga ? 'Salvar alterações' : 'Criar Vaga'}
        </button>
      </div>
    </form>
  );
}
