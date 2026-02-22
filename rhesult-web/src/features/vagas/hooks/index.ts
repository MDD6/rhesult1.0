'use client';

import { useState, useCallback } from 'react';
import { Vaga, VagaFilters } from '../types';

interface UseVagasFilterResult {
  filters: VagaFilters;
  setFilters: (filters: VagaFilters) => void;
  updateFilter: (key: keyof VagaFilters, value: string) => void;
  resetFilters: () => void;
  applyFilters: (vagas: Vaga[]) => Vaga[];
}

export function useVagasFilter(): UseVagasFilterResult {
  const [filters, setFilters] = useState<VagaFilters>({
    texto: '',
    cidade: '',
    status: '',
    modelo: '',
    tipoContrato: '',
    senioridade: '',
    salarioMin: '',
    salarioMax: '',
    dataAberturaInicio: '',
    dataAberturaFim: '',
    apenasAtivas: 'false'
  });

  const updateFilter = useCallback((key: keyof VagaFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      texto: '',
      cidade: '',
      status: '',
      modelo: '',
      tipoContrato: '',
      senioridade: '',
      salarioMin: '',
      salarioMax: '',
      dataAberturaInicio: '',
      dataAberturaFim: '',
      apenasAtivas: 'false'
    });
  }, []);

  const applyFilters = useCallback((vagas: Vaga[]): Vaga[] => {
    return vagas.filter(v => {
      const titulo = (v.titulo || '').toLowerCase();
      const area = (v.area || '').toLowerCase();
      const responsavel = (v.responsavel || '').toLowerCase();
      const texto = filters.texto.toLowerCase().trim();
      
      const matchTexto = !texto ||
        titulo.includes(texto) ||
        area.includes(texto) ||
        responsavel.includes(texto);

      const cid = (v.cidade || '').toLowerCase();
      const cidade = filters.cidade.toLowerCase().trim();
      const matchCidade = !cidade || cid.includes(cidade);

      const st = v.status_processo || '';
      const st2 = v.status || '';
      const matchStatus = !filters.status || st === filters.status || st2 === filters.status;

      const mod = v.modelo_trabalho || '';
      const matchModelo = !filters.modelo || mod === filters.modelo;

      const tipo = v.tipo_contrato || '';
      const matchTipo = !filters.tipoContrato || tipo === filters.tipoContrato;

      const senioridade = String(v.nivel || v.senioridade || '');
      const matchSenioridade = !filters.senioridade || senioridade === filters.senioridade;

      const min = Number(filters.salarioMin || 0);
      const max = Number(filters.salarioMax || 0);
      const vagaMin = Number(v.salario_min || 0);
      const vagaMax = Number(v.salario_max || 0);
      const matchSalarioMin = !min || vagaMax >= min;
      const matchSalarioMax = !max || vagaMin <= max;

      const abertura = v.data_abertura ? new Date(v.data_abertura).getTime() : NaN;
      const inicio = filters.dataAberturaInicio ? new Date(filters.dataAberturaInicio).getTime() : NaN;
      const fim = filters.dataAberturaFim ? new Date(filters.dataAberturaFim).getTime() : NaN;
      const matchInicio = Number.isNaN(inicio) || (!Number.isNaN(abertura) && abertura >= inicio);
      const matchFim = Number.isNaN(fim) || (!Number.isNaN(abertura) && abertura <= fim + 86399999);

      const statusAtual = st || st2;
      const isAtiva = [
        'Ativa',
        'Aberta',
        'Recebendo Currículos',
        'Triagem',
        'Entrevista RH',
        'Entrevista Gestor'
      ].includes(statusAtual);
      const matchAtivas = filters.apenasAtivas !== 'true' || isAtiva;

      return (
        matchTexto &&
        matchCidade &&
        matchStatus &&
        matchModelo &&
        matchTipo &&
        matchSenioridade &&
        matchSalarioMin &&
        matchSalarioMax &&
        matchInicio &&
        matchFim &&
        matchAtivas
      );
    });
  }, [filters]);

  return { filters, setFilters, updateFilter, resetFilters, applyFilters };
}

interface UseVagasPaginationResult {
  paginaAtual: number;
  vagasPorPagina: number;
  setPaginaAtual: (page: number) => void;
  getPaginatedVagas: (vagas: Vaga[]) => { items: Vaga[]; total: number; totalPages: number };
}

export function useVagasPagination(vagasPorPagina = 6): UseVagasPaginationResult {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const getPaginatedVagas = useCallback((vagas: Vaga[]) => {
    const total = vagas.length;
    const totalPages = Math.ceil(total / vagasPorPagina);
    const inicio = (paginaAtual - 1) * vagasPorPagina;
    const fim = inicio + vagasPorPagina;
    return {
      items: vagas.slice(inicio, fim),
      total,
      totalPages
    };
  }, [paginaAtual, vagasPorPagina]);

  return { paginaAtual, vagasPorPagina, setPaginaAtual, getPaginatedVagas };
}
