"use client";

import Link from "next/link";
import { AppHeader } from "@/shared/components/AppHeader";
import { useCorporativoData } from "../hooks/useCorporativoData";

export function CorporativoPageClient() {
  const { loading, error, stats, vagasAtivas, atividade } = useCorporativoData();

  return (
    <>
      <AppHeader />
      <main className="page-shell text-slate-900 px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <section className="space-y-6">
            <article className="premium-card p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--ink)]">Meu Painel</h1>
                  <p className="text-sm text-slate-500 mt-1">Visão operacional e estratégica do recrutamento.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/vagas" className="px-3 py-2 rounded-2xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Ações rápidas</Link>
                  <Link href="/banco-talentos" className="px-3 py-2 rounded-2xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-95">Ver candidatos</Link>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/vagas" className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">Abrir vagas</Link>
                <Link href="/entrevistados" className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">Ver entrevistados</Link>
                <Link href="/agenda" className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">Abrir agenda</Link>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">SLA de retorno</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold text-[var(--ink)]">{loading ? "..." : stats.retornosPendentes}</span> pendentes</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Triagem ativa</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold text-[var(--ink)]">{loading ? "..." : stats.emAvaliacao}</span> em avaliação</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Leads não atribuídos</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold text-[var(--ink)]">{loading ? "..." : stats.leadsNaoAtribuidos}</span> aguardando dono</p>
                </div>
              </div>
            </article>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article className="premium-card p-5">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Leads não atribuídos</p>
                <p className="mt-2 text-3xl font-extrabold text-[var(--ink)]">{loading ? "..." : stats.leadsNaoAtribuidos}</p>
                <p className="mt-1 text-xs text-slate-500">Atualizado agora</p>
              </article>
              <article className="premium-card p-5">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Leads em avaliação</p>
                <p className="mt-2 text-3xl font-extrabold text-[var(--ink)]">{loading ? "..." : stats.emAvaliacao}</p>
                <p className="mt-1 text-xs text-slate-500">Triagem em execução</p>
              </article>
              <article className="premium-card p-5">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Retornos pendentes</p>
                <p className="mt-2 text-3xl font-extrabold text-[var(--ink)]">{loading ? "..." : stats.retornosPendentes}</p>
                <p className="mt-1 text-xs text-slate-500">Prioridade alta</p>
              </article>
            </section>

            <section className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Vagas em andamento</h2>
                <a href="/vagas" className="text-xs font-bold text-[var(--brand)] hover:text-[var(--accent)] transition-colors">Ver todas</a>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 font-semibold">{error}</div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {!loading && vagasAtivas.length === 0 && (
                  <article className="premium-card p-6 lg:col-span-2 text-center text-slate-500">Nenhuma vaga em andamento no momento.</article>
                )}

                {vagasAtivas.map((vaga) => (
                  <article key={vaga.id} className="premium-card p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{vaga.modelo}</p>
                        <h3 className="text-lg font-extrabold text-slate-800 mt-1 line-clamp-1">{vaga.titulo}</h3>
                        <p className="text-xs text-slate-500 mt-1">{vaga.empresa}</p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-xl border border-slate-200 p-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Inscritos</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">{vaga.inscritos}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Triagem</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">{vaga.triagem}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">SLA</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">{vaga.sla}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">Fase: <span className="text-slate-700">{vaga.fase}</span></p>
                      <a href="/vagas" className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-[var(--brand)] transition-colors">Gerenciar</a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className="premium-card p-6 h-fit sticky top-24 hidden lg:block">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-slate-800">Atividade</h3>
              <span className="px-2 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 text-[10px] font-bold">Online</span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {!loading && atividade.length === 0 && (
                <div className="rounded-2xl border border-slate-100 p-3 bg-slate-50/60">
                  <p className="text-xs text-slate-500">Sem atividades recentes.</p>
                </div>
              )}

              {atividade.map((item) => (
                <div key={item.key} className="rounded-2xl border border-slate-100 p-3 bg-slate-50/60">
                  <p className="text-xs font-bold text-slate-700 line-clamp-1">{item.nome}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.evento}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{item.quando}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2">
              <Link href="/entrevistados" className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-[var(--brand)] transition-colors text-center">Ver feed completo</Link>
              <Link href="/agenda" className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors text-center">Integrações</Link>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
