'use client';

import { Vaga } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export async function fetchVagas(): Promise<Vaga[]> {
  try {
    const response = await fetch(`${API_BASE}/vagas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const arr = Array.isArray(data) ? data : (data?.data || []);
    return arr;
  } catch (error) {
    console.error('Error fetching vagas:', error);
    return [];
  }
}

export async function createVaga(vaga: Partial<Vaga>): Promise<Vaga | null> {
  try {
    const payload = {
      titulo: vaga.titulo,
      tipo_contrato: vaga.tipo_contrato,
      modelo_trabalho: vaga.modelo_trabalho,
      senioridade: vaga.nivel || vaga.senioridade,
      cidade: vaga.cidade,
      responsavel: vaga.responsavel,
      salario_min: vaga.salario_min,
      salario_max: vaga.salario_max,
      status: vaga.status_processo || vaga.status,
      descricao: vaga.descricao,
      area: vaga.area,
      descricao_curta: vaga.descricao_curta
    };

    const response = await fetch(`${API_BASE}/vagas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating vaga:', error);
    return null;
  }
}

export async function updateVaga(id: string | number, vaga: Partial<Vaga>): Promise<boolean> {
  try {
    const payload = {
      titulo: vaga.titulo,
      tipo_contrato: vaga.tipo_contrato,
      modelo_trabalho: vaga.modelo_trabalho,
      senioridade: vaga.nivel || vaga.senioridade,
      cidade: vaga.cidade,
      responsavel: vaga.responsavel,
      salario_min: vaga.salario_min,
      salario_max: vaga.salario_max,
      status: vaga.status_processo || vaga.status,
      descricao: vaga.descricao,
      area: vaga.area,
      descricao_curta: vaga.descricao_curta
    };

    const response = await fetch(`${API_BASE}/vagas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating vaga:', error);
    return false;
  }
}

export async function deleteVaga(id: string | number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/vagas/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting vaga:', error);
    return false;
  }
}

export function normalizeVaga(v: Vaga): Vaga {
  return {
    ...v,
    nivel: v.nivel || v.senioridade || '',
    status_processo: v.status_processo || v.status || '',
    area: v.area || '',
    responsavel: v.responsavel || '',
    total_candidatos: typeof v.total_candidatos === 'number' ? v.total_candidatos : (v.total_candidatos ?? 0),
    total_entrevistas: typeof v.total_entrevistas === 'number' ? v.total_entrevistas : (v.total_entrevistas ?? 0)
  };
}

export function mergeVagas(base: Vaga[], extras: Vaga[]): Vaga[] {
  const ids = new Set(base.map(v => String(v.id)));
  const merged = [...base];
  extras.forEach(v => {
    if (!ids.has(String(v.id))) {
      merged.push(v);
    }
  });
  return merged;
}

export function loadLocalVagas(): Vaga[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('rhesult_vagas_local');
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export function saveLocalVagas(vagas: Vaga[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('rhesult_vagas_local', JSON.stringify(vagas));
  } catch {
    // Ignore
  }
}

export function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'A combinar';
  const minStr = min ? `R$ ${min.toLocaleString('pt-BR')}` : '?';
  const maxStr = max ? `R$ ${max.toLocaleString('pt-BR')}` : '?';
  return `${minStr} - ${maxStr}`;
}

export function getStatusBadgeClass(status?: string): { dot: string; badge: string } {
  const meta: Record<string, { dot: string; badge: string }> = {
    'Recebendo Currículos': { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    'Triagem': { dot: 'bg-sky-400', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    'Entrevista RH': { dot: 'bg-indigo-400', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'Entrevista Gestor': { dot: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
    'Proposta': { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    'Contratado': { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'Reprovado': { dot: 'bg-rose-400', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    'Encerrada': { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' }
  };
  return meta[status || ''] || { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
}
