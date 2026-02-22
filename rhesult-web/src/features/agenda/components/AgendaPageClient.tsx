"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventInput } from "@fullcalendar/core";
import { AppHeader } from "@/shared/components/AppHeader";
import { fetchCandidatos, fetchVagas, type Candidato, type Vaga } from "@/features/talent-bank/services/talentBankApi";
import {
  createEntrevista,
  fetchEntrevistas,
  type Entrevista,
  type EntrevistaStatus,
  type EntrevistaTipo,
  updateEntrevista,
} from "@/features/agenda/services/agendaApi";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

type ToastKind = "success" | "error" | "warn";

type AgendaFilters = {
  quickSearch: string;
  status: "" | EntrevistaStatus;
  tipo: "" | EntrevistaTipo;
  recrutadorId: string;
};

type FormState = {
  id?: number;
  candidatoId: string;
  candidatoNome: string;
  vagaId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipo: EntrevistaTipo;
  status: EntrevistaStatus;
  observacoes: string;
  meetLink: string;
};

const STATUS_COLORS: Record<EntrevistaStatus, string> = {
  Agendada: "#2563eb",
  Confirmada: "#16a34a",
  Reagendada: "#eab308",
  Cancelada: "#ef4444",
  Realizada: "#64748b",
};

const EMPTY_FORM: FormState = {
  candidatoId: "",
  candidatoNome: "",
  vagaId: "",
  data: "",
  horaInicio: "",
  horaFim: "",
  tipo: "RH",
  status: "Agendada",
  observacoes: "",
  meetLink: "",
};

function formatDateToInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatTimeToInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toTimeString().slice(0, 5);
}

type CalendarInteractionArg = {
  event: {
    id: string;
    start: Date | null;
    end: Date | null;
  };
  revert: () => void;
};

function inNextHours(dateIso: string, hours: number) {
  const now = Date.now();
  const target = new Date(dateIso).getTime();
  return target >= now && target <= now + hours * 60 * 60 * 1000;
}

function isPast(dateIso: string) {
  return new Date(dateIso).getTime() < Date.now();
}

function toWhatsAppLink(phone: string | null | undefined, text: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}

export function AgendaPageClient() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);

  const [view, setView] = useState<CalendarView>("dayGridMonth");
  const [filters, setFilters] = useState<AgendaFilters>({
    quickSearch: "",
    status: "",
    tipo: "",
    recrutadorId: "",
  });

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [candidateSuggestions, setCandidateSuggestions] = useState<Candidato[]>([]);

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cand, vg] = await Promise.all([fetchCandidatos(), fetchVagas()]);
      setCandidatos(cand);
      setVagas(vg);
    } catch {
      setError("Não foi possível carregar dados base da agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadEntrevistas = useCallback(async (range?: { start?: string; end?: string }) => {
    try {
      const list = await fetchEntrevistas(range);
      setEntrevistas(list);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao carregar entrevistas.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadBase();
      await reloadEntrevistas();
    })();
  }, [loadBase, reloadEntrevistas]);

  const filteredEntrevistas = useMemo(() => {
    const q = filters.quickSearch.toLowerCase().trim();
    return entrevistas.filter((item) => {
      const text = `${item.candidato_nome} ${item.vaga_titulo}`.toLowerCase();
      const okQ = !q || text.includes(q);
      const okStatus = !filters.status || item.status === filters.status;
      const okTipo = !filters.tipo || item.tipo === filters.tipo;
      const okRecrutador = !filters.recrutadorId || String(item.recrutador_id || "") === filters.recrutadorId;
      return okQ && okStatus && okTipo && okRecrutador;
    });
  }, [entrevistas, filters]);

  const events = useMemo<EventInput[]>(() => {
    return filteredEntrevistas.map((item) => ({
      id: String(item.id),
      title: `${item.candidato_nome} – ${item.vaga_titulo}`,
      start: item.data_inicio,
      end: item.data_fim,
      backgroundColor: STATUS_COLORS[item.status],
      borderColor: "transparent",
      extendedProps: item,
    }));
  }, [filteredEntrevistas]);

  const selectedEntrevista = useMemo(
    () => entrevistas.find((item) => item.id === selectedEventId) || null,
    [entrevistas, selectedEventId]
  );

  const nextEvents = useMemo(() => {
    const now = Date.now();
    const max = now + 7 * 24 * 60 * 60 * 1000;
    return filteredEntrevistas
      .filter((item) => {
        const ts = new Date(item.data_inicio).getTime();
        return ts >= now && ts <= max && item.status !== "Cancelada";
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
      .slice(0, 5);
  }, [filteredEntrevistas]);

  const metrics = useMemo(() => {
    const count = (status: EntrevistaStatus) => filteredEntrevistas.filter((item) => item.status === status).length;
    const pendenteConfirm = filteredEntrevistas.filter((item) => item.status === "Agendada" && inNextHours(item.data_inicio, 24)).length;
    const slaVencido = filteredEntrevistas.filter((item) => item.status === "Agendada" && isPast(item.data_inicio)).length;
    const next24h = filteredEntrevistas.filter((item) => item.status !== "Cancelada" && inNextHours(item.data_inicio, 24)).length;
    return {
      agendadas: count("Agendada") + count("Confirmada") + count("Reagendada"),
      confirmadas: count("Confirmada"),
      reagendadas: count("Reagendada"),
      canceladas: count("Cancelada"),
      realizadas: count("Realizada"),
      pendenteConfirm,
      slaVencido,
      next24h,
    };
  }, [filteredEntrevistas]);

  const openCreateModal = (date?: Date) => {
    const baseDate = date ? formatDateToInput(date) : "";
    setFormState({ ...EMPTY_FORM, data: baseDate, vagaId: String(vagas[0]?.id || "") });
    setCandidateSuggestions([]);
    setModalOpen(true);
  };

  const openEditModal = (item: Entrevista) => {
    setFormState({
      id: item.id,
      candidatoId: String(item.candidato_id),
      candidatoNome: item.candidato_nome,
      vagaId: String(item.vaga_id),
      data: formatDateToInput(item.data_inicio),
      horaInicio: formatTimeToInput(item.data_inicio),
      horaFim: formatTimeToInput(item.data_fim),
      tipo: item.tipo,
      status: item.status,
      meetLink: item.meet_link || "",
      observacoes: item.observacoes || "",
    });
    setCandidateSuggestions([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormState(EMPTY_FORM);
    setCandidateSuggestions([]);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.candidatoId || !formState.vagaId || !formState.data || !formState.horaInicio || !formState.horaFim) {
      showToast("error", "Preencha todos os campos obrigatórios.");
      return;
    }

    const payload = {
      candidato_id: Number(formState.candidatoId),
      vaga_id: Number(formState.vagaId),
      data: formState.data,
      hora_inicio: formState.horaInicio,
      hora_fim: formState.horaFim,
      tipo: formState.tipo,
      status: formState.status,
      meet_link: formState.meetLink,
      observacoes: formState.observacoes,
    };

    try {
      if (formState.id) {
        await updateEntrevista(formState.id, payload);
        showToast("success", "Entrevista atualizada.");
      } else {
        await createEntrevista(payload);
        showToast("success", "Entrevista criada.");
      }
      closeModal();
      await reloadEntrevistas();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao salvar entrevista.");
    }
  };

  const updateStatus = async (id: number, status: EntrevistaStatus) => {
    try {
      await updateEntrevista(id, { status });
      showToast("success", `Status atualizado: ${status}`);
      await reloadEntrevistas();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  };

  const persistMove = async (arg: CalendarInteractionArg) => {
    const id = Number(arg.event.id);
    const start = arg.event.start;
    const end = arg.event.end;

    if (!start || !end) {
      arg.revert();
      return;
    }

    try {
      await updateEntrevista(id, {
        data: formatDateToInput(start),
        hora_inicio: formatTimeToInput(start),
        hora_fim: formatTimeToInput(end),
        status: "Reagendada",
      });
      showToast("success", "Entrevista reagendada.");
      await reloadEntrevistas();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao reagendar.");
      arg.revert();
    }
  };

  const onCandidateInput = (value: string) => {
    setFormState((prev) => ({ ...prev, candidatoNome: value, candidatoId: "" }));
    const term = value.trim().toLowerCase();
    if (term.length < 2) {
      setCandidateSuggestions([]);
      return;
    }
    setCandidateSuggestions(candidatos.filter((item) => item.nome?.toLowerCase().includes(term)).slice(0, 8));
  };

  const onDateClick = (arg: { date: Date }) => {
    openCreateModal(arg.date);
  };

  const onEventClick = (arg: { event: { id: string } }) => {
    setSelectedEventId(Number(arg.event.id));
  };

  const onViewChange = (nextView: CalendarView) => {
    setView(nextView);
    calendarRef.current?.getApi().changeView(nextView);
  };

  const exportCsv = () => {
    const header = ["id", "candidato", "vaga", "tipo", "status", "inicio", "fim", "meet"];
    const rows = [header.join(";")]
      .concat(
        filteredEntrevistas.map((item) =>
          [
            String(item.id),
            item.candidato_nome,
            item.vaga_titulo,
            item.tipo,
            item.status,
            item.data_inicio,
            item.data_fim,
            item.meet_link || "",
          ]
            .map((field) => field.replaceAll(";", " "))
            .join(";")
        )
      )
      .join("\n");

    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenda_rhesult_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("success", "CSV exportado.");
  };

  const eventContent = (arg: { event: { title: string; extendedProps: unknown } }) => {
    const status = (arg.event.extendedProps as Entrevista).status;
    return (
      <div className="text-[11px] leading-tight">
        <p className="font-semibold truncate">{arg.event.title}</p>
        <p className="opacity-90">{status}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bt-page">
        <AppHeader />
        <main className="max-w-6xl mx-auto w-full px-4 py-8 text-sm text-slate-600">Carregando agenda...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen has-header bt-page">
      <AppHeader />

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-2 rounded-lg text-xs text-white shadow-lg ${
              toast.kind === "success" ? "bg-emerald-500" : toast.kind === "warn" ? "bg-amber-500" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {error && (
           <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
             <span>{error}</span>
             <button type="button" onClick={() => setError("")} className="text-red-700/70 hover:text-red-700 text-xs font-black">FECHAR</button>
           </div>
        )}

        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
           <div className="space-y-2">
             <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Agenda de Entrevistas</h1>
             <p className="text-slate-500 font-medium">Cronograma de avaliações e compromissos do time.</p>
           </div>
           
           <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                 <div className="flex -space-x-2">
                    {[1,2].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white ring-1 ring-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">?</div>)}
                 </div>
                 <div className="text-xs">
                    <p className="font-extrabold text-slate-900">{metrics.next24h} Entrevistas</p>
                    <p className="text-slate-500 font-medium">Próximas 24h</p>
                 </div>
              </div>

              <button 
                onClick={() => openCreateModal()} 
                className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Nova Entrevista
              </button>
           </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1 mb-8">
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
               <div className="lg:col-span-5">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Buscar</label>
                 <div className="relative group">
                   <input
                     type="search"
                     value={filters.quickSearch}
                     onChange={(event) => setFilters((prev) => ({ ...prev, quickSearch: event.target.value }))}
                     placeholder="Candidato, vaga, entrevistador..."
                     className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm"
                   />
                   <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                   </div>
                 </div>
               </div>
               
               <div className="lg:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                 <select
                   value={filters.status}
                   onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as AgendaFilters["status"] }))}
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                 >
                   <option value="">Todos</option>
                   <option>Agendada</option>
                   <option>Confirmada</option>
                   <option>Reagendada</option>
                   <option>Cancelada</option>
                   <option>Realizada</option>
                 </select>
               </div>

               <div className="lg:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                 <select
                   value={filters.tipo}
                   onChange={(event) => setFilters((prev) => ({ ...prev, tipo: event.target.value as AgendaFilters["tipo"] }))}
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                 >
                   <option value="">Todos</option>
                   <option>RH</option>
                   <option>Tecnica</option>
                   <option>Gestor</option>
                 </select>
               </div>
               
               <div className="lg:col-span-3 flex items-center gap-2">
                   <button onClick={exportCsv} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all">
                     Exportar
                   </button>
                   <button onClick={() => showToast("warn", "Sincronização Google em breve.")} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                     <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                     Sync
                   </button>
               </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex bg-slate-200/50 p-1 rounded-lg">
                    {["dayGridMonth", "timeGridWeek", "timeGridDay", "listWeek"].map((item) => (
                      <button
                        key={item}
                        onClick={() => onViewChange(item as CalendarView)}
                         className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          view === item 
                            ? "bg-white text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                      >
                       {item === "dayGridMonth" ? "Mês" : item === "timeGridWeek" ? "Semana" : item === "timeGridDay" ? "Dia" : "Lista"}
                      </button>
                    ))}
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                       <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                       <span className="text-[10px] font-bold text-amber-700 uppercase">Pendentes: {metrics.pendenteConfirm}</span>
                    </div>
                    {metrics.slaVencido > 0 && (
                      <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                         <span className="text-[10px] font-bold text-red-700 uppercase">Atrasados: {metrics.slaVencido}</span>
                      </div>
                    )}
                 </div>
              </div>
              
              <div className="flex-1 p-4 overflow-hidden relative calendar-wrapper">
                 <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    locale="pt-br"
                    initialView="dayGridMonth"
                    headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
                    nowIndicator
                    editable
                    selectable
                    dayMaxEvents={3}
                    events={events}
                    eventContent={eventContent}
                    dateClick={onDateClick}
                    eventClick={onEventClick}
                    eventDrop={(arg) => {
                      if (!window.confirm("Confirmar reagendamento deste evento?")) {
                        arg.revert();
                        return;
                      }
                      void persistMove(arg);
                    }}
                    eventResize={(arg) => {
                      if (!window.confirm("Confirmar alteração de duração?")) {
                        arg.revert();
                        return;
                      }
                      void persistMove(arg);
                    }}
                    height="100%"
                  />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detalhes</p>
                </div>
                {selectedEventId && (
                  <button 
                    onClick={() => setSelectedEventId(null)} 
                    className="text-[10px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                  >
                    FECHAR
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {!selectedEntrevista ? (
                  <div className="flex flex-col items-center justify-center text-center mt-10 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                       <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Selecione um evento</p>
                      <p className="text-xs text-slate-500 mt-1">Clique no calendário para ver os detalhes.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-2">
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Candidato</p>
                          <p className="text-base font-bold text-slate-900">{selectedEntrevista.candidato_nome}</p>
                          <p className="text-xs font-semibold text-(--brand) mt-0.5">{selectedEntrevista.vaga_titulo}</p>
                       </div>
                       <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          selectedEntrevista.status === 'Confirmada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          selectedEntrevista.status === 'Agendada' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                       }`}>
                          {selectedEntrevista.status}
                       </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         </div>
                         <div>
                            <p className="text-xs font-bold text-slate-700">Horário</p>
                            <p className="text-xs text-slate-500">
                              {new Date(selectedEntrevista.data_inicio).toLocaleDateString("pt-BR")} • {new Date(selectedEntrevista.data_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              {" - "}
                              {new Date(selectedEntrevista.data_fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                         </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Observações</p>
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 min-h-[60px]">
                         {selectedEntrevista.observacoes || <span className="text-slate-400 italic">Sem observações.</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                       <button onClick={() => openEditModal(selectedEntrevista)} className="col-span-2 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          Editar / Reagendar
                       </button>
                       <button onClick={() => void updateStatus(selectedEntrevista.id, "Confirmada")} className="py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">
                          Confirmar
                       </button>
                       <button onClick={() => void updateStatus(selectedEntrevista.id, "Cancelada")} className="py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors">
                          Cancelar
                       </button>
                       {selectedEntrevista.candidato_telefone && (
                        <a
                          className="col-span-2 py-2 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:bg-[#20bd5a] text-center flex items-center justify-center gap-2"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={toWhatsAppLink(
                            selectedEntrevista.candidato_telefone,
                            `Olá, ${selectedEntrevista.candidato_nome}! Sua entrevista para ${selectedEntrevista.vaga_titulo} está ${selectedEntrevista.status}.`
                          )}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Confirmar no WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[300px]">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Próximas</p>
                 </div>
                 <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600">7 Dias</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {!nextEvents.length ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs font-medium">Nenhuma entrevista próxima</div>
                ) : (
                  nextEvents.map((item) => (
                    <button key={item.id} onClick={() => setSelectedEventId(item.id)} className="w-full text-left p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-all hover:shadow-sm group">
                      <div className="flex items-start justify-between mb-1">
                         <p className="text-xs font-bold text-slate-800 truncate group-hover:text-(--brand)">{item.candidato_nome}</p>
                         <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[item.status] === '#16a34a' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mb-2">{item.vaga_titulo}</p>
                      <div className="flex items-center gap-2">
                         <div className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                             {new Date(item.data_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                         </div>
                         <span className="text-[10px] text-slate-400">{new Date(item.data_inicio).toLocaleDateString("pt-BR", {day: '2-digit', month: '2-digit'})}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={closeModal}>
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{formState.id ? "Editar entrevista" : "Nova entrevista"}</p>
                <p className="text-xs text-gray-500">Defina candidato, vaga, data e horário.</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-800 text-xl leading-none">×</button>
            </div>

            <form onSubmit={submitForm} className="px-4 py-3 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 mb-1">Candidato</label>
                <input
                  value={formState.candidatoNome}
                  onChange={(event) => onCandidateInput(event.target.value)}
                  className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5"
                  placeholder="Nome do candidato"
                />
                {!!candidateSuggestions.length && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-lg max-h-32 overflow-y-auto text-xs shadow-sm">
                    {candidateSuggestions.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setFormState((prev) => ({ ...prev, candidatoId: String(candidate.id), candidatoNome: candidate.nome }));
                          setCandidateSuggestions([]);
                        }}
                        className="w-full text-left px-2 py-2 hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">{candidate.nome}</div>
                        <div className="text-[11px] text-gray-500">ID: {candidate.id}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Vaga</label>
                <select value={formState.vagaId} onChange={(event) => setFormState((prev) => ({ ...prev, vagaId: event.target.value }))} className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5">
                  <option value="">Selecione...</option>
                  {vagas.map((vaga) => (
                    <option key={vaga.id} value={String(vaga.id)}>{vaga.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-gray-700 mb-1">Data</label>
                  <input type="date" value={formState.data} onChange={(event) => setFormState((prev) => ({ ...prev, data: event.target.value }))} className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5" />
                </div>
                <div className="flex-1">
                  <label className="block text-gray-700 mb-1">Início</label>
                  <input type="time" value={formState.horaInicio} onChange={(event) => setFormState((prev) => ({ ...prev, horaInicio: event.target.value }))} className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5" />
                </div>
                <div className="flex-1">
                  <label className="block text-gray-700 mb-1">Fim</label>
                  <input type="time" value={formState.horaFim} onChange={(event) => setFormState((prev) => ({ ...prev, horaFim: event.target.value }))} className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 mb-1">Tipo</label>
                  <select value={formState.tipo} onChange={(event) => setFormState((prev) => ({ ...prev, tipo: event.target.value as EntrevistaTipo }))} className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5">
                    <option value="RH">RH</option>
                    <option value="Tecnica">Técnica</option>
                    <option value="Gestor">Gestor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Status</label>
                  <select value={formState.status} onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value as EntrevistaStatus }))} className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5">
                    <option>Agendada</option>
                    <option>Confirmada</option>
                    <option>Reagendada</option>
                    <option>Cancelada</option>
                    <option>Realizada</option>
                  </select>
              
              <div>
                <label className="block text-gray-700 mb-1">Link da Reunião (Google Meet / Equipes)</label>
                <input 
                  type="url"
                  value={formState.meetLink} 
                  onChange={(event) => setFormState((prev) => ({ ...prev, meetLink: event.target.value }))} 
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5"
                />
              </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Observações internas</label>
                <textarea value={formState.observacoes} onChange={(event) => setFormState((prev) => ({ ...prev, observacoes: event.target.value }))} rows={3} className="w-full rounded-lg bg-white border border-gray-300 px-2 py-1.5 resize-none" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 mt-2">
                <button type="button" onClick={closeModal} className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
                <button type="submit" className="text-xs px-3 py-1.5 rounded-full bg-[#F58634] text-white font-semibold hover:bg-[#e9792e]">{formState.id ? "Atualizar" : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
