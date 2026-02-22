'use client';

import React from 'react';
import { VagaFilters } from '../types';

interface VagasFiltersProps {
  filters: VagaFilters;
  onFilterChange: (key: keyof VagaFilters, value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function VagasFilters({ filters, onFilterChange, onApply, onReset }: VagasFiltersProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 mb-8 backdrop-blur-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
        {/* Busca Rápida */}
        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Busca Rápida
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Título, área, responsável..."
              value={filters.texto}
              onChange={(e) => onFilterChange('texto', e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
            />
          </div>
        </div>

        {/* Cidade */}
        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Cidade
          </label>
          <input
            type="text"
            placeholder="Ex: São Paulo"
            value={filters.cidade}
            onChange={(e) => onFilterChange('cidade', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
          />
        </div>

        {/* Status */}
        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Status
          </label>
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="appearance-none w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
            >
              <option value="">Todos os status</option>
              <option>Ativa</option>
              <option>Aberta</option>
              <option>Recebendo Currículos</option>
              <option>Triagem</option>
              <option>Entrevista RH</option>
              <option>Entrevista Gestor</option>
              <option>Proposta</option>
              <option>Contratado</option>
              <option>Reprovado</option>
              <option>Encerrada</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
          </div>
        </div>

        {/* Modelo */}
        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Modelo
          </label>
          <div className="relative">
            <select
              value={filters.modelo}
              onChange={(e) => onFilterChange('modelo', e.target.value)}
              className="appearance-none w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
            >
              <option value="">Todos</option>
              <option>Presencial</option>
              <option>Remoto</option>
              <option>Híbrido</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
          </div>
        </div>

        {/* Contrato */}
        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Contrato
          </label>
          <div className="relative">
            <select
              value={filters.tipoContrato}
              onChange={(e) => onFilterChange('tipoContrato', e.target.value)}
              className="appearance-none w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
            >
              <option value="">Todos</option>
              <option>CLT</option>
              <option>PJ</option>
              <option>Estágio</option>
              <option>Temporário</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
          </div>
        </div>

        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Senioridade
          </label>
          <div className="relative">
            <select
              value={filters.senioridade}
              onChange={(e) => onFilterChange('senioridade', e.target.value)}
              className="appearance-none w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
            >
              <option value="">Todos</option>
              <option>Júnior</option>
              <option>Pleno</option>
              <option>Sênior</option>
              <option>Especialista</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
          </div>
        </div>

        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Salário mín.
          </label>
          <input
            type="number"
            placeholder="Ex: 3000"
            value={filters.salarioMin}
            onChange={(e) => onFilterChange('salarioMin', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
          />
        </div>

        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Salário máx.
          </label>
          <input
            type="number"
            placeholder="Ex: 8000"
            value={filters.salarioMax}
            onChange={(e) => onFilterChange('salarioMax', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
          />
        </div>

        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Abertura de
          </label>
          <input
            type="date"
            value={filters.dataAberturaInicio}
            onChange={(e) => onFilterChange('dataAberturaInicio', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
          />
        </div>

        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Abertura até
          </label>
          <input
            type="date"
            value={filters.dataAberturaFim}
            onChange={(e) => onFilterChange('dataAberturaFim', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
          />
        </div>

        <div className="w-full">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
            Escopo
          </label>
          <div className="relative">
            <select
              value={filters.apenasAtivas}
              onChange={(e) => onFilterChange('apenasAtivas', e.target.value)}
              className="appearance-none w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F58634]/20 focus:border-[#F58634] transition-all"
            >
              <option value="false">Todas as vagas</option>
              <option value="true">Apenas vagas ativas</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
          </div>
        </div>

        {/* Botões */}
        <div className="col-span-full flex gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
          <button
            type="button"
            onClick={onApply}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-[#0A2725] hover:bg-[#163b34] shadow-sm hover:shadow active:scale-95 transition-all"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-800 transition-all"
          >
            Limpar
          </button>
        </div>
      </div>
    </section>
  );
}
