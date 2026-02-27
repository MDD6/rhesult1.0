"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type Candidato,
  type CreateCandidatoInput,
  type Vaga,
  createCandidato,
  deleteCandidato,
  deleteCandidatos,
  fetchCandidatos,
  fetchVagas,
  patchCandidatoEtapa,
  updateCandidato,
  parseCVFile,
  recalcularScore,
} from "../services/talentBankApi";
import { AppHeader } from "@/shared/components/AppHeader";
import { useSocket } from "@/context/SocketContext";

type ViewMode = "dashboard" | "lista" | "cards";
type ExportScope = "filtered" | "page" | "selected";
type ExportFormat = "csv" | "json";
type ExportColumnKey = keyof Pick<
  Candidato,
  | "id"
  | "nome"
  | "email"
  | "telefone"
  | "cargo_desejado"
  | "senioridade"
  | "cidade"
  | "vaga_id"
  | "vaga_titulo"
  | "etapa"
  | "criado_em"
  | "origem"
  | "linkedin"
  | "curriculum_url"
  | "pretensao"
  | "score_total"
>;

const ETAPAS = [
  "Inscricao",
  "Pre-selecao",
  "Triagem",
  "Entrevista RH",
  "Entrevista Gestor",
  "Teste Tecnico",
  "Proposta",
  "Contratado",
  "Reprovado",
  "Portfolio",
];

const SENIORIDADES = ["Estagiario", "Junior", "Pleno", "Senior", "Especialista"];

const EXPORT_COLUMNS: { key: ExportColumnKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "nome", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "cargo_desejado", label: "Cargo desejado" },
  { key: "senioridade", label: "Senioridade" },
  { key: "cidade", label: "Cidade" },
  { key: "vaga_id", label: "Vaga (ID)" },
  { key: "vaga_titulo", label: "Vaga (Título)" },
  { key: "etapa", label: "Etapa" },
  { key: "criado_em", label: "Criado em" },
  { key: "origem", label: "Origem" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "curriculum_url", label: "Currículo URL" },
  { key: "pretensao", label: "Pretensão Salarial" },
  { key: "score_total", label: "Score Total" },
];

function createInitialCandidatoForm(): CreateCandidatoInput {
  return {
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    senioridade: "",
    cargo_desejado: "",
    etapa: "Inscricao",
    vaga_id: null,
    origem: "Banco de Talentos",
    historico: "",
    linkedin: "",
    curriculum_url: "",
    pretensao: null,
  };
}

function normalize(value: string | undefined | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isValidEmail(value?: string) {
  const email = String(value || "").trim();
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function onlyDigits(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function isValidPhone(value?: string) {
  const digits = onlyDigits(value);
  if (!digits) return true;
  return digits.length >= 8;
}

function formatPhone(value?: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function resolveCurriculumLink(url?: string) {
  const value = String(url || "").trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;
  if (normalized.startsWith("/uploads/")) {
    return `/api/public${normalized}`;
  }

  return normalized;
}

function badgeClass(etapa?: string) {
  const key = normalize(etapa);
  if (key.includes("contratado")) return "badge-etapa contratado";
  if (key.includes("proposta")) return "badge-etapa proposta";
  if (key.includes("entrevista rh")) return "badge-etapa entrevista-rh";
  if (key.includes("entrevista gestor")) return "badge-etapa entrevista-gestor";
  if (key.includes("triagem")) return "badge-etapa triagem";
  if (key.includes("reprovado")) return "badge-etapa reprovado";
  return "badge-etapa inscricao";
}

function toCsv(rows: Candidato[], columns: ExportColumnKey[]) {
  const headers = [...columns];

  const escapeCsv = (value: unknown) => {
    const content = String(value ?? "").replace(/"/g, '""');
    return `"${content}"`;
  };

  const lines = rows.map((row) =>
    columns.map((column) => row[column])
      .map(escapeCsv)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

function downloadFile(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function TalentBankPageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vagasError, setVagasError] = useState("");
  const [view, setView] = useState<ViewMode>("dashboard");

  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);

  // Socket.IO Integration
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    
    socket.on('candidate:created', (newCandidate: Candidato) => {
        setCandidatos(prev => [newCandidate, ...prev]);
    });

    socket.on('candidate:updated', (updated: Candidato) => {
        setCandidatos(prev => prev.map(c => c.id === updated.id ? updated : c));
    });

    return () => {
        socket.off('candidate:created');
        socket.off('candidate:updated');
    };
  }, [socket]);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroSenioridade, setFiltroSenioridade] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroVaga, setFiltroVaga] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [recalculando, setRecalculando] = useState(false);

  const [sortBy, setSortBy] = useState("recentes");
  const [porPagina, setPorPagina] = useState(9);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [bulkEtapa, setBulkEtapa] = useState("");

  const [detalhe, setDetalhe] = useState<Candidato | null>(null);
  const [modalEtapa, setModalEtapa] = useState("");
  // const [showQuickActions, setShowQuickActions] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>("filtered");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [exportColumns, setExportColumns] = useState<ExportColumnKey[]>([
    "id",
    "nome",
    "email",
    "telefone",
    "cargo_desejado",
    "senioridade",
    "cidade",
    "etapa",
    "criado_em",
  ]);
  const [createForm, setCreateForm] = useState<CreateCandidatoInput>(createInitialCandidatoForm());
  const [creatingCandidate, setCreatingCandidate] = useState(false);
  const [editForm, setEditForm] = useState<CreateCandidatoInput>(createInitialCandidatoForm());
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState(false);

  const editEmailInvalid = useMemo(() => !isValidEmail(editForm.email), [editForm.email]);
  const editPhoneInvalid = useMemo(() => !isValidPhone(editForm.telefone), [editForm.telefone]);

  const openDetalhe = (candidate: Candidato) => {
    setDetalhe(candidate);
    setModalEtapa(candidate.etapa || "Inscricao");
    setEditForm({
      nome: candidate.nome || "",
      email: candidate.email || "",
      telefone: candidate.telefone || "",
      cidade: candidate.cidade || "",
      senioridade: candidate.senioridade || "",
      cargo_desejado: candidate.cargo_desejado || "",
      etapa: candidate.etapa || "Inscricao",
      vaga_id: candidate.vaga_id ?? null,
      origem: candidate.origem || "Banco de Talentos",
      historico: candidate.historico || "",
      linkedin: candidate.linkedin || "",
      curriculum_url: candidate.curriculum_url || "",
      pretensao: candidate.pretensao ?? null,
    });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    setVagasError("");
    try {
      const [cand, vg] = await Promise.all([fetchCandidatos(), fetchVagas()]);
      setCandidatos(cand);
      setVagas(vg);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      if (errorMsg.includes("status:401") || errorMsg.toLowerCase().includes("sessão expirada")) {
        setError("Sua sessão expirou. Redirecionando para o login...");
        window.setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      } else if (errorMsg.includes("vagas")) {
        setVagasError("⚠️ Sistema de vagas indisponível no momento. Você ainda pode cadastrar candidatos no banco de talentos.");
      } else {
        setError("Erro ao conectar com o servidor. Verifique sua conexão.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const origensDisponiveis = useMemo(() => {
    const set = new Set<string>();
    candidatos.forEach((c) => { if (c.origem) set.add(c.origem); });
    return Array.from(set).sort();
  }, [candidatos]);

  const filtered = useMemo(() => {
    const result = candidatos.filter((c) => {
      const blob = `${c.nome} ${c.cargo_desejado || ""} ${c.email || ""} ${c.telefone || ""}`.toLowerCase();
      const matchTexto = !filtroTexto || blob.includes(filtroTexto.toLowerCase());
      const matchCidade = !filtroCidade || normalize(c.cidade).includes(normalize(filtroCidade));
      const matchSenioridade = !filtroSenioridade || c.senioridade === filtroSenioridade;
      const matchEtapa = !filtroEtapa || normalize(c.etapa) === normalize(filtroEtapa);
      const matchVaga = !filtroVaga || String(c.vaga_id || "") === filtroVaga;
      const matchOrigem = !filtroOrigem || normalize(c.origem) === normalize(filtroOrigem);

      let matchPeriodo = true;
      if (filtroPeriodo && c.criado_em) {
        const created = new Date(c.criado_em).getTime();
        const now = Date.now();
        if (filtroPeriodo === "7d") matchPeriodo = now - created <= 7 * 86400000;
        else if (filtroPeriodo === "30d") matchPeriodo = now - created <= 30 * 86400000;
        else if (filtroPeriodo === "90d") matchPeriodo = now - created <= 90 * 86400000;
      } else if (filtroPeriodo && !c.criado_em) {
        matchPeriodo = false;
      }

      return matchTexto && matchCidade && matchSenioridade && matchEtapa && matchVaga && matchOrigem && matchPeriodo;
    });

    result.sort((a, b) => {
      const dtA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const dtB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      if (sortBy === "antigos") return dtA - dtB;
      if (sortBy === "nome_az") return normalize(a.nome).localeCompare(normalize(b.nome));
      if (sortBy === "nome_za") return normalize(b.nome).localeCompare(normalize(a.nome));
      if (sortBy === "score_desc") return (b.score_total ?? 0) - (a.score_total ?? 0);
      if (sortBy === "score_asc") return (a.score_total ?? 0) - (b.score_total ?? 0);
      return dtB - dtA;
    });

    return result;
  }, [
    candidatos,
    filtroCidade,
    filtroEtapa,
    filtroSenioridade,
    filtroTexto,
    filtroVaga,
    filtroOrigem,
    filtroPeriodo,
    sortBy,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / porPagina));

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const paginaSlice = useMemo(() => {
    const start = (paginaAtual - 1) * porPagina;
    return filtered.slice(start, start + porPagina);
  }, [filtered, paginaAtual, porPagina]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const fortaleza = filtered.filter((c) => normalize(c.cidade).includes("fortaleza")).length;
    const plenoSenior = filtered.filter((c) => {
      const s = normalize(c.senioridade);
      return s.includes("pleno") || s.includes("senior");
    }).length;

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const ultMes = filtered.filter((c) => c.criado_em && new Date(c.criado_em) >= monthAgo).length;

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const mesAnterior = filtered.filter((c) => c.criado_em && new Date(c.criado_em) >= twoMonthsAgo && new Date(c.criado_em) < monthAgo).length;
    const variacao = mesAnterior > 0 ? Math.round(((ultMes - mesAnterior) / mesAnterior) * 100) : (ultMes > 0 ? 100 : 0);

    const comScore = filtered.filter((c) => typeof c.score_total === 'number' && c.score_total > 0);
    const avgScore = comScore.length > 0 ? Math.round(comScore.reduce((s, c) => s + (c.score_total ?? 0), 0) / comScore.length) : 0;

    const porEtapa = ETAPAS.map((etapa) => ({
      etapa,
      total: filtered.filter((c) => normalize(c.etapa) === normalize(etapa)).length,
    }));

    return { total, fortaleza, plenoSenior, ultMes, porEtapa, variacao, avgScore };
  }, [filtered]);

  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginaSlice.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const applyBulkEtapa = async () => {
    if (!bulkEtapa || selectedIds.size === 0) return;

    try {
      await Promise.all([...selectedIds].map((id) => patchCandidatoEtapa(id, bulkEtapa)));
      await load();
      clearSelection();
      setBulkEtapa("");
    } catch {
      setError("Não foi possível aplicar etapa em lote.");
    }
  };

  const applyBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} candidato(s)? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteCandidatos([...selectedIds]);
      clearSelection();
      await load();
    } catch {
      setError("Não foi possível excluir os candidatos selecionados.");
    }
  };

  const handleRecalcularScores = async () => {
    if (!confirm("Recalcular pontuação de TODOS os candidatos? Isso pode levar alguns segundos.")) return;
    setRecalculando(true);
    try {
      const result = await recalcularScore();
      await load();
      alert(`Scores recalculados! ${result.updated_count} candidato(s) atualizados.`);
    } catch {
      setError("Erro ao recalcular scores.");
    } finally {
      setRecalculando(false);
    }
  };

  const saveModalEtapa = async () => {
    if (!detalhe || !modalEtapa) return;
    try {
      await patchCandidatoEtapa(detalhe.id, modalEtapa);
      setDetalhe(null);
      await load();
    } catch {
      setError("Não foi possível atualizar etapa do candidato.");
    }
  };

  const saveModalPerfil = async () => {
    if (!detalhe || !editForm.nome?.trim()) {
      setError("Informe o nome do candidato.");
      return;
    }

    if (editEmailInvalid) {
      setError("E-mail inválido.");
      return;
    }

    if (editPhoneInvalid) {
      setError("Telefone inválido.");
      return;
    }

    setSavingEdit(true);
    try {
      await updateCandidato(detalhe.id, {
        nome: editForm.nome.trim(),
        email: editForm.email?.trim() || undefined,
        telefone: editForm.telefone?.trim() || undefined,
        cidade: editForm.cidade?.trim() || undefined,
        senioridade: editForm.senioridade?.trim() || undefined,
        cargo_desejado: editForm.cargo_desejado?.trim() || undefined,
        vaga_id: editForm.vaga_id || null,
        etapa: modalEtapa || editForm.etapa,
        origem: editForm.origem?.trim() || undefined,
        historico: editForm.historico?.trim() || undefined,
        linkedin: editForm.linkedin?.trim() || undefined,
        curriculum_url: editForm.curriculum_url?.trim() || undefined,
        pretensao: editForm.pretensao ?? null,
      });
      setDetalhe(null);
      await load();
    } catch {
      setError("Não foi possível atualizar os dados do candidato.");
    } finally {
      setSavingEdit(false);
    }
  };

  const removeCandidate = async () => {
    if (!detalhe) return;
    if (!confirm("Tem certeza que deseja excluir este candidato?")) return;

    setDeletingCandidate(true);
    try {
      await deleteCandidato(detalhe.id);
      setDetalhe(null);
      await load();
    } catch {
      setError("Não foi possível excluir o candidato.");
    } finally {
      setDeletingCandidate(false);
    }
  };

  const clearFiltros = () => {
    setFiltroTexto("");
    setFiltroCidade("");
    setFiltroSenioridade("");
    setFiltroEtapa("");
    setFiltroVaga("");
    setFiltroOrigem("");
    setFiltroPeriodo("");
    setSortBy("recentes");
    setPaginaAtual(1);
  };

  const exportRows = useMemo(() => {
    if (exportScope === "page") return paginaSlice;
    if (exportScope === "selected") {
      if (selectedIds.size === 0) return [];
      return filtered.filter((candidate) => selectedIds.has(candidate.id));
    }
    return filtered;
  }, [exportScope, paginaSlice, selectedIds, filtered]);

  const exportData = () => {
    if (exportRows.length === 0) {
      setError("Não há dados para exportar nesse escopo.");
      return;
    }

    if (exportColumns.length === 0) {
      setError("Selecione ao menos uma coluna para exportar.");
      return;
    }

    const mappedRows = exportRows.map((row) =>
      Object.fromEntries(exportColumns.map((column) => [column, row[column] ?? ""]))
    );

    const stamp = new Date().toISOString().slice(0, 10);
    if (exportFormat === "json") {
      downloadFile(
        JSON.stringify(mappedRows, null, 2),
        "application/json;charset=utf-8",
        `candidatos-${exportScope}-${stamp}.json`
      );
      setShowExportModal(false);
      return;
    }

    downloadFile(
      toCsv(exportRows, exportColumns),
      "text/csv;charset=utf-8",
      `candidatos-${exportScope}-${stamp}.csv`
    );
    setShowExportModal(false);
  };

  const toggleExportColumn = (column: ExportColumnKey) => {
    setExportColumns((prev) => {
      if (prev.includes(column)) {
        return prev.filter((item) => item !== column);
      }
      return [...prev, column];
    });
  };

  const resetCreateForm = () => {
    setCreateForm(createInitialCandidatoForm());
  };

  const submitCreateCandidate = async () => {
    if (!createForm.nome?.trim()) {
      setError("Informe o nome do candidato.");
      return;
    }

    setCreatingCandidate(true);
    try {
      await createCandidato({
        ...createForm,
        nome: createForm.nome.trim(),
        email: createForm.email?.trim() || undefined,
        telefone: createForm.telefone?.trim() || undefined,
        cidade: createForm.cidade?.trim() || undefined,
        senioridade: createForm.senioridade?.trim() || undefined,
        cargo_desejado: createForm.cargo_desejado?.trim() || undefined,
        etapa: createForm.etapa?.trim() || "Inscricao",
        vaga_id: createForm.vaga_id || null,
        origem: createForm.origem?.trim() || undefined,
        historico: createForm.historico?.trim() || undefined,
        linkedin: createForm.linkedin?.trim() || undefined,
        curriculum_url: createForm.curriculum_url?.trim() || undefined,
      });
      setShowCreateModal(false);
      resetCreateForm();
      await load();
    } catch {
      setError("Não foi possível criar o candidato.");
    } finally {
      setCreatingCandidate(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col page-shell">
      <AppHeader />

      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-400 mx-auto">
          <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Banco de Talentos</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Gestão unificada de capital humano</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 backdrop-blur-sm self-start sm:self-auto order-2 sm:order-1">
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                    view === "dashboard"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Visão Geral
                </button>
                <button
                  type="button"
                  onClick={() => setView("lista")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                    view === "lista"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                    view === "cards"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Galeria
                </button>
              </div>

              <div className="flex items-center gap-2 order-1 sm:order-2 self-end sm:self-auto">
                 <button
                  type="button"
                  onClick={handleRecalcularScores}
                  disabled={recalculando}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm text-slate-600 text-xs font-bold hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50"
                >
                  {recalculando ? "⏳ Calculando..." : "⚡ Recalcular Scores"}
                </button>
                 <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm text-slate-600 text-xs font-bold hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  Exportar
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all"
                >
                  + Novo Candidato
                </button>
              </div>
            </div>
          </div>

          <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-white/20 p-5 mb-8 overflow-hidden relative group">
             <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-white/20 to-slate-100/30 opacity-60 pointer-events-none" />
             <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Buscar</label>
                <div className="relative group">
                  <input 
                    value={filtroTexto} 
                    onChange={(e) => setFiltroTexto(e.target.value)} 
                    placeholder="Nome, cargo, email..." 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm group-hover:shadow-md" 
                  />
                  <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Cidade</label>
                <input 
                  value={filtroCidade} 
                  onChange={(e) => setFiltroCidade(e.target.value)} 
                  placeholder="Cidade..." 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Senioridade</label>
                <select 
                  value={filtroSenioridade} 
                  onChange={(e) => setFiltroSenioridade(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Todas</option>
                  {SENIORIDADES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Etapa</label>
                <select 
                  value={filtroEtapa} 
                  onChange={(e) => setFiltroEtapa(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Todas</option>
                  {ETAPAS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Vaga</label>
                <select 
                  value={filtroVaga} 
                  onChange={(e) => setFiltroVaga(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Todas</option>
                  {vagas.map((v) => <option key={String(v.id)} value={String(v.id)}>{v.titulo}</option>)}
                </select>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Origem</label>
                <select 
                  value={filtroOrigem} 
                  onChange={(e) => setFiltroOrigem(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Todas</option>
                  {origensDisponiveis.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Período</label>
                <select 
                  value={filtroPeriodo} 
                  onChange={(e) => setFiltroPeriodo(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Qualquer</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">Ordenar por:</span>
                 <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setSortBy('recentes')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === 'recentes' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Recentes
                    </button>
                    <button 
                       onClick={() => setSortBy('nome_az')}
                       className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === 'nome_az' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      A-Z
                    </button>
                    <button 
                       onClick={() => setSortBy('score_desc')}
                       className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === 'score_desc' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Score ↓
                    </button>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">Exibir:</span>
                 <select 
                    value={porPagina} 
                    onChange={(e) => setPorPagina(Number(e.target.value))} 
                    className="bg-white border-none py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 cursor-pointer"
                 >
                   {[6, 9, 12, 18, 24].map((n) => <option key={n} value={n}>{n} itens</option>)}
                 </select>
                 
                 <button
                   type="button"
                   onClick={clearFiltros}
                   className="ml-2 px-4 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                 >
                   Limpar Filtros
                 </button>
              </div>
            </div>
          </section>

          {error && (
            <div className="mb-6 p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-sm font-semibold flex items-center justify-between gap-3">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} className="text-amber-900/70 hover:text-amber-900 text-xs font-black">FECHAR</button>
            </div>
          )}

          {vagasError && (
            <div className="mb-6 p-3 rounded-xl border border-orange-200 bg-orange-50/80 text-orange-900 text-sm font-semibold flex items-center justify-between gap-3">
              <span>{vagasError}</span>
              <button type="button" onClick={() => setVagasError("")} className="text-orange-900/70 hover:text-orange-900 text-xs font-black">FECHAR</button>
            </div>
          )}

          {view === "dashboard" && (
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <article className="relative overflow-hidden bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-lg transition-all duration-500">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                   </div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total de Candidatos</p>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{stats.total}</p>
                   <div className="mt-4 flex items-center gap-2 text-xs font-semibold bg-emerald-50 w-fit px-2 py-1 rounded-full border border-emerald-100">
                      <span className={stats.variacao >= 0 ? 'text-emerald-600' : 'text-red-600'}>{stats.variacao >= 0 ? '+' : ''}{stats.variacao}%</span>
                      <span className="text-emerald-600/70 font-medium">vs. mês anterior</span>
                   </div>
                </article>

                <article className="relative overflow-hidden bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-lg transition-all duration-500">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-indigo-600"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                   </div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Senioridade Alta</p>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{stats.plenoSenior}</p>
                   <p className="text-xs text-slate-500 mt-2 font-medium">Pleno e Sênior</p>
                </article>

                <article className="relative overflow-hidden bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-lg transition-all duration-500">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                   </div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Atividade Recente</p>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{stats.ultMes}</p>
                   <p className="text-xs text-slate-500 mt-2 font-medium">Novos nos últimos 30 dias</p>
                </article>

                <article className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg shadow-slate-900/10 group hover:shadow-slate-900/20 transition-all duration-500">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                   </div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Score Médio</p>
                   <p className="text-4xl font-black text-white tracking-tight">{stats.avgScore}<span className="text-lg text-slate-400">/100</span></p>
                   <p className="text-xs text-slate-400 mt-2 font-medium">Pontuação média dos candidatos</p>
                </article>
              </div>

              <div className="bg-white/70 backdrop-blur-md border border-white/50 p-6 rounded-3xl shadow-sm">
                <h2 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2">
                   <span className="w-1.5 h-6 bg-[var(--brand)] rounded-full"></span>
                   Funil de Contratação
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {stats.porEtapa.map((row) => {
                    const pct = stats.total ? Math.round((row.total / stats.total) * 100) : 0;
                    return (
                      <button key={row.etapa} type="button" onClick={() => { setFiltroEtapa(row.etapa); setView("lista"); }} className="group text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${row.total > 0 ? "bg-[var(--brand)]" : "bg-slate-200"}`} />
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`${badgeClass(row.etapa)} scale-90 origin-left`}>{row.etapa}</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-black text-slate-800">{row.total}</span>
                            <span className="text-[10px] font-bold text-slate-400 mb-1.5">{pct}%</span>
                        </div>
                         <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-[var(--brand)] transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {view === "lista" && (
            <section className="glass overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white/45">
                <div className="flex items-center gap-2 text-xs">
                  <span className="pill">Selecionados: <strong>{selectedIds.size}</strong></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={selectPage} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-extrabold">Selecionar página</button>
                  <button onClick={clearSelection} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-extrabold">Limpar seleção</button>
                  <select value={bulkEtapa} onChange={(e) => setBulkEtapa(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold">
                    <option value="">Mover para etapa...</option>
                    {ETAPAS.map((e) => <option key={e}>{e}</option>)}
                  </select>
                  <button onClick={() => void applyBulkEtapa()} className="px-3 py-2 rounded-xl bg-(--ink) text-white text-xs font-black">Aplicar</button>
                  <button onClick={() => void applyBulkDelete()} disabled={selectedIds.size === 0} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 disabled:opacity-40">Excluir selecionados</button>
                </div>
              </div>

              <div className="overflow-x-auto nice-scroll">
                <table className="w-full text-sm table-soft">
                  <thead>
                    <tr>
                      <th className="w-11">Sel</th>
                      <th>Nome</th>
                      <th>Cargo</th>
                      <th>Senioridade</th>
                      <th>Cidade</th>
                      <th>Score</th>
                      <th>Etapa</th>
                      <th>Criado em</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--brand)] border-t-transparent"></div>
                          <p className="mt-2 text-xs font-semibold">Carregando candidatos...</p>
                        </td>
                      </tr>
                    )}
                    {!loading && paginaSlice.length === 0 && (
                      <tr><td colSpan={9} className="py-8 text-center text-slate-500">Nenhum candidato encontrado.</td></tr>
                    )}
                    {!loading && paginaSlice.map((c) => (
                      <tr key={String(c.id)}>
                        <td>
                          <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4" />
                        </td>
                        <td>
                          <button type="button" onClick={() => openDetalhe(c)} className="font-extrabold text-slate-900 hover:text-(--brand)">{c.nome || "-"}</button>
                          <div className="text-[11px] text-slate-500">{c.email || ""}</div>
                        </td>
                        <td>{c.cargo_desejado || "-"}</td>
                        <td>{c.senioridade || "-"}</td>
                        <td>{c.cidade || "-"}</td>
                        <td>
                          {c.score_total != null ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                              c.score_total >= 70 ? 'bg-emerald-100 text-emerald-700' :
                              c.score_total >= 40 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>{c.score_total}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td><span className={badgeClass(c.etapa)}>{c.etapa || "-"}</span></td>
                        <td>{c.criado_em ? new Date(c.criado_em).toLocaleDateString("pt-BR") : "-"}</td>
                        <td className="text-right">
                          <button type="button" onClick={() => openDetalhe(c)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:bg-white font-extrabold">Detalhes</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-4 border-t border-slate-200">
                <div className="text-xs text-slate-500">Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> • Total: <strong>{filtered.length}</strong></div>
                <div className="flex gap-2">
                  <button onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-extrabold disabled:opacity-40">&larr;</button>
                  <button onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-extrabold disabled:opacity-40">&rarr;</button>
                </div>
              </div>
            </section>
          )}

          {view === "cards" && (
            <section className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm shimmer h-52" />
                ))}

                {!loading && paginaSlice.map((c) => (
                  <article key={String(c.id)} className="card-spotlight p-5 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                        {String(c.nome || "?").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#0A2725] truncate">{c.nome || "Sem nome"}</h3>
                        <p className="text-xs text-slate-500 truncate">{c.cargo_desejado || "Cargo não informado"}</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-100 space-y-2 mb-4 text-[11px] text-slate-500">
                      <p className="truncate">📍 {c.cidade || "N/A"}</p>
                      <p className="truncate">💼 {c.vaga_titulo || "Banco de talentos"}</p>
                      <p className="truncate">📞 {c.telefone || "N/A"}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={badgeClass(c.etapa)}>{c.etapa || "Inscricao"}</span>
                      {c.senioridade && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">{c.senioridade}</span>}
                      {c.score_total != null && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${
                          c.score_total >= 70 ? 'bg-emerald-100 text-emerald-700' :
                          c.score_total >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>⭐ {c.score_total}</span>
                      )}
                      <button onClick={() => openDetalhe(c)} className="ml-auto px-3 py-2 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 border border-slate-200">Ver perfil</button>
                    </div>
                  </article>
                ))}

                {!loading && paginaSlice.length === 0 && (
                  <div className="col-span-full glass rounded-2xl text-center py-16">
                    <h3 className="text-lg font-bold text-[#0A2725]">Nenhum candidato encontrado</h3>
                    <p className="text-sm text-slate-500">Tente ajustar os filtros.</p>
                  </div>
                )}
              </div>

              {!loading && filtered.length > porPagina && (
                <div className="flex items-center justify-center gap-3 p-4">
                  <button onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">Anterior</button>
                  <span className="text-sm font-semibold text-slate-700">Página {paginaAtual} de {totalPaginas}</span>
                  <button onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">Próxima</button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {detalhe && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-start sm:items-center justify-center z-40 py-4" onClick={() => setDetalhe(null)}>
          <div className="modal-card p-4 sm:p-6 lg:p-8 w-full mx-4 max-w-4xl relative fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setDetalhe(null)} className="absolute top-4 right-4 text-slate-400 hover:text-(--brand) text-2xl font-black">&times;</button>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-(--ink)">{detalhe.nome || "Sem nome"}</h2>
                <p className="text-sm text-(--brand) font-black mt-1">Edição rápida de perfil</p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="glass p-3">
                    <p className="text-xs font-black text-slate-500 uppercase">Contato</p>
                    <input value={editForm.email || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="E-mail" className={`mt-2 w-full px-2 py-1.5 rounded-lg border text-xs ${editEmailInvalid ? "border-red-300 bg-red-50/40" : "border-slate-200"}`} />
                    {editEmailInvalid && <p className="mt-1 text-[11px] text-red-600 font-semibold">Formato de e-mail inválido.</p>}
                    <input value={editForm.telefone || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, telefone: formatPhone(e.target.value) }))} placeholder="Telefone" className={`mt-2 w-full px-2 py-1.5 rounded-lg border text-xs ${editPhoneInvalid ? "border-red-300 bg-red-50/40" : "border-slate-200"}`} />
                    {editPhoneInvalid && <p className="mt-1 text-[11px] text-red-600 font-semibold">Informe pelo menos 8 dígitos.</p>}
                    <input value={editForm.cidade || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, cidade: e.target.value }))} placeholder="Cidade" className="mt-2 w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs" />
                  </div>
                  <div className="glass p-3">
                    <p className="text-xs font-black text-slate-500 uppercase">Resumo</p>
                    <input value={editForm.nome || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Nome" className="mt-2 w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs" />
                    <input value={editForm.cargo_desejado || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, cargo_desejado: e.target.value }))} placeholder="Cargo desejado" className="mt-2 w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs" />
                    <select value={editForm.senioridade || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, senioridade: e.target.value }))} className="mt-2 w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white">
                      <option value="">Senioridade</option>
                      {SENIORIDADES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <select value={editForm.vaga_id == null ? "" : String(editForm.vaga_id)} onChange={(e) => setEditForm((prev) => ({ ...prev, vaga_id: e.target.value || null }))} className="mt-2 w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white">
                      <option value="">Banco de talentos</option>
                      {vagas.map((vaga) => <option key={String(vaga.id)} value={String(vaga.id)}>{vaga.titulo}</option>)}
                    </select>
                    <p><strong>Criado em:</strong> {detalhe.criado_em ? new Date(detalhe.criado_em).toLocaleString("pt-BR") : "-"}</p>
                    <div className="mt-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Pretensão salarial (R$)</label>
                      <input type="number" step="0.01" min="0" value={editForm.pretensao ?? ""} onChange={(e) => setEditForm((prev) => ({ ...prev, pretensao: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="Ex: 5000.00" className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs" />
                    </div>
                  </div>
                </div>

                {detalhe.score_total != null && (
                  <div className="mt-4 glass p-3">
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">Scores</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { label: 'Total', value: detalhe.score_total },
                        { label: 'Técnico', value: detalhe.score_tecnico },
                        { label: 'Comportam.', value: detalhe.score_comportamental },
                        { label: 'Salarial', value: detalhe.score_salarial },
                      ].map((s) => (
                        <div key={s.label} className="text-center p-2 rounded-lg bg-white border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
                          <p className={`text-lg font-black ${
                            (s.value ?? 0) >= 70 ? 'text-emerald-600' :
                            (s.value ?? 0) >= 40 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>{s.value ?? '—'}</p>
                        </div>
                      ))}
                      <div className="text-center p-2 rounded-lg bg-white border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Prioridade</p>
                        <p className={`text-lg font-black ${
                          detalhe.score_prioridade === 'Alta' ? 'text-emerald-600' :
                          detalhe.score_prioridade === 'Media' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>{detalhe.score_prioridade || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-sm font-black text-(--ink) mb-2">Histórico</p>
                  <textarea value={editForm.historico || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, historico: e.target.value }))} className="glass p-3 text-sm text-slate-700 whitespace-pre-line w-full min-h-24" />
                </div>
              </div>

              <div className="lg:w-72 space-y-3">
                <div className="glass p-4">
                  <p className="text-xs font-black text-slate-500 uppercase">Atualizar etapa</p>
                  <select value={modalEtapa} onChange={(e) => setModalEtapa(e.target.value)} className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-extrabold">
                    {ETAPAS.map((e) => <option key={e}>{e}</option>)}
                  </select>
                  <button type="button" onClick={() => void saveModalEtapa()} className="mt-2 w-full px-3 py-2 rounded-lg bg-(--ink) text-white text-xs font-black">Salvar etapa</button>
                  <button type="button" disabled={savingEdit || editEmailInvalid || editPhoneInvalid || !editForm.nome?.trim()} onClick={() => void saveModalPerfil()} className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-black hover:bg-slate-50 disabled:opacity-60">{savingEdit ? "Salvando..." : "Salvar perfil"}</button>
                  <button type="button" disabled={deletingCandidate} onClick={() => void removeCandidate()} className="mt-2 w-full px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-black hover:bg-red-700 disabled:opacity-60">{deletingCandidate ? "Excluindo..." : "Excluir candidato"}</button>
                </div>

                <div className="glass p-4">
                  <p className="text-xs font-black text-slate-500 uppercase">Links</p>
                  <div className="mt-2 grid gap-2">
                    {detalhe.linkedin && <a href={detalhe.linkedin} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-black hover:bg-slate-50">LinkedIn</a>}
                    {detalhe.curriculum_url && <a href={resolveCurriculumLink(detalhe.curriculum_url)} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-black hover:bg-slate-50">Currículo</a>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4" onClick={() => setShowExportModal(false)}>
          <div className="modal-card w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-(--ink)">Exportar candidatos</h3>
            <p className="text-xs text-slate-500 mt-1">Selecione escopo, formato e colunas da exportação.</p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Escopo</label>
                <select value={exportScope} onChange={(e) => setExportScope(e.target.value as ExportScope)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm">
                  <option value="filtered">Todos filtrados ({filtered.length})</option>
                  <option value="page">Apenas página atual ({paginaSlice.length})</option>
                  <option value="selected">Apenas selecionados ({selectedIds.size})</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Formato</label>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm">
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black text-slate-600">Colunas</label>
                <button
                  type="button"
                  onClick={() => setExportColumns(EXPORT_COLUMNS.map((column) => column.key))}
                  className="text-[11px] font-extrabold text-slate-600 hover:text-slate-900"
                >
                  Marcar todas
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {EXPORT_COLUMNS.map((column) => (
                  <label key={column.key} className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={exportColumns.includes(column.key)}
                      onChange={() => toggleExportColumn(column.key)}
                      className="w-3.5 h-3.5"
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowExportModal(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-extrabold bg-white hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={exportData} className="px-3 py-2 rounded-lg bg-(--ink) text-white text-xs font-black">Baixar arquivo</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card w-full max-w-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="text-lg font-black text-(--ink)">Novo candidato</h3>
                   <p className="text-xs text-slate-500 mt-1">Preencha os dados ou faça upload do CV para preenchimento automático.</p>
                </div>
                
                {/* CV UPLOAD BUTTON */}
                <div className="relative">
                    <input 
                        type="file" 
                        accept=".pdf" 
                        id="cv-upload-input"
                        className="hidden" 
                        onChange={async (e) => {
                            const input = e.target;
                            const file = input.files?.[0];
                            if(!file) return;

                            try {
                               // Update button text directly to show loading state (React re-render might be slow/complex here for just a label)
                           const label = document.getElementById('cv-upload-btn-label');
                           if(label) label.innerText = '⏳ Lendo PDF...';

                           const parsed = await parseCVFile(file);
                           
                           setCreateForm(prev => ({
                                ...prev,
                                nome: parsed.nome || prev.nome,
                                email: parsed.email || prev.email,
                                telefone: parsed.telefone || prev.telefone,
                                senioridade: parsed.senioridade || prev.senioridade,
                                cargo_desejado: parsed.cargo_desejado || prev.cargo_desejado,
                                linkedin: parsed.linkedin || prev.linkedin,
                                historico: parsed.historico || prev.historico,
                                curriculum_url: parsed.curriculum_url || prev.curriculum_url
                           }));
                           
                           alert('✅ CV Lido com sucesso! Dados preenchidos.');
                        } catch (err) {
                           console.error(err);
                           alert('Erro ao ler CV. Tente novamente ou preencha manualmente.');
                        } finally {
                           const label = document.getElementById('cv-upload-btn-label');
                           if(label) label.innerText = '📄 Upload PDF (Auto-Preencher)';
                           // Reset input so same file can be selected again if needed
                           input.value = '';
                        }
                    }}
                    />
                    <label 
                        id="cv-upload-btn-label"
                        htmlFor="cv-upload-input" 
                        className="cursor-pointer px-3 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-200 transition-colors flex items-center gap-2 select-none"
                    >
                        📄 Upload PDF (Auto-Preencher)
                    </label>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-600 mb-1">Nome*</label>
                <input value={createForm.nome || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, nome: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">E-mail</label>
                <input type="email" value={createForm.email || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Telefone</label>
                <input value={createForm.telefone || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, telefone: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Cidade</label>
                <input value={createForm.cidade || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, cidade: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Cargo desejado</label>
                <input value={createForm.cargo_desejado || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, cargo_desejado: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Senioridade</label>
                <select value={createForm.senioridade || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, senioridade: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                  <option value="">Selecione</option>
                  {SENIORIDADES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Etapa</label>
                <select value={createForm.etapa || "Inscricao"} onChange={(event) => setCreateForm((prev) => ({ ...prev, etapa: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                  {ETAPAS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Vaga</label>
                <select
                  value={createForm.vaga_id == null ? "" : String(createForm.vaga_id)}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, vaga_id: event.target.value || null }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="">Banco de talentos</option>
                  {vagas.map((vaga) => (
                    <option key={String(vaga.id)} value={String(vaga.id)}>{vaga.titulo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Pretensão salarial (R$)</label>
                <input type="number" step="0.01" min="0" value={createForm.pretensao ?? ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, pretensao: event.target.value === '' ? null : Number(event.target.value) }))} placeholder="Ex: 5000.00" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">LinkedIn</label>
                <input value={createForm.linkedin || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, linkedin: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">URL currículo</label>
                <input value={createForm.curriculum_url || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, curriculum_url: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-600 mb-1">Histórico</label>
                <textarea value={createForm.historico || ""} onChange={(event) => setCreateForm((prev) => ({ ...prev, historico: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm min-h-24" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-extrabold bg-white hover:bg-slate-50">Cancelar</button>
              <button type="button" disabled={creatingCandidate} onClick={() => void submitCreateCandidate()} className="px-3 py-2 rounded-lg bg-(--ink) text-white text-xs font-black disabled:opacity-60">{creatingCandidate ? "Salvando..." : "Cadastrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
