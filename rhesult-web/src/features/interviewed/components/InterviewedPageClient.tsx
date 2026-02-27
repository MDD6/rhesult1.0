"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/shared/components/AppHeader";
import {
  type Candidato,
  type Vaga,
  fetchCandidatos,
  fetchVagas,
  patchCandidatoEtapa,
} from "@/features/talent-bank/services/talentBankApi";

const ETAPAS_ENTREVISTADOS = [
  "Entrevista RH",
  "Entrevista Gestor",
  "Teste Tecnico",
  "Teste Técnico",
  "Proposta",
  "Contratado",
];

type TemplateCanal = "email" | "whatsapp";
type TipoTemplate = "aprovar" | "reprovar";

type TemplateComunicacao = {
  id: number;
  nome: string;
  canal: TemplateCanal;
  etapa?: string | null;
  assunto?: string | null;
  corpo: string;
  ativo: boolean;
};

type TemplateForm = {
  id: number | null;
  nome: string;
  tipo: "" | "aprovacao" | "reprovacao";
  canal: TemplateCanal;
  assunto: string;
  corpo: string;
  ativo: boolean;
};

type AcaoAtual = {
  tipo: TipoTemplate;
  candidatoId: string | number;
};

type ToastKind = "ok" | "erro" | "alerta";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

function normalize(value: string | undefined | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeEtapa(etapa: string | undefined | null) {
  const value = normalize(etapa);
  const map: Record<string, string> = {
    "entrevista rh": "Entrevista RH",
    "entrevista gestor": "Entrevista Gestor",
    "teste tecnico": "Teste Tecnico",
    proposta: "Proposta",
    contratado: "Contratado",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
  };
  return map[value] || (etapa || "");
}

function etapaBadgeClass(etapa: string | undefined | null) {
  const value = normalize(etapa).replace(/\s+/g, "-");
  return `badge-etapa ${value || "inscricao"}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("pt-BR");
}

function normalizeTemplate(payload: Record<string, unknown>): TemplateComunicacao {
  return {
    id: Number(payload.id || 0),
    nome: String(payload.nome || "").trim(),
    canal: String(payload.canal || "email").toLowerCase() === "whatsapp" ? "whatsapp" : "email",
    etapa: payload.etapa ? String(payload.etapa) : null,
    assunto: payload.assunto ? String(payload.assunto) : null,
    corpo: String(payload.corpo || "").trim(),
    ativo: Boolean(payload.ativo),
  };
}

function createDefaultTemplateForm(): TemplateForm {
  return {
    id: null,
    nome: "",
    tipo: "",
    canal: "whatsapp",
    assunto: "",
    corpo: "",
    ativo: true,
  };
}

export function InterviewedPageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroVaga, setFiltroVaga] = useState("");
  const [sortBy] = useState("recentes");
  const [filtrosAplicados, setFiltrosAplicados] = useState({ texto: "", etapa: "", vaga: "" });

  const [selected, setSelected] = useState<Candidato | null>(null);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [templatesEditor, setTemplatesEditor] = useState<TemplateComunicacao[]>([]);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(createDefaultTemplateForm());
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const [acaoAtual, setAcaoAtual] = useState<AcaoAtual | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateModalLoading, setTemplateModalLoading] = useState(false);
  const [templatesSelecao, setTemplatesSelecao] = useState<TemplateComunicacao[]>([]);
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<number | null>(null);

  const pushToast = (kind: ToastKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  };

  const parseErrorMessage = async (response: Response, fallback: string) => {
    const body = await response.json().catch(() => null);
    if (body && typeof body === "object") {
      const bodyObj = body as { error?: unknown; mensagem?: unknown };
      if (typeof bodyObj.mensagem === "string" && bodyObj.mensagem.trim()) return bodyObj.mensagem;
      if (typeof bodyObj.error === "string" && bodyObj.error.trim()) return bodyObj.error;
    }
    return fallback;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [cand, vg] = await Promise.all([fetchCandidatos(), fetchVagas()]);
      setCandidatos(cand);
      setVagas(vg);
    } catch {
      setError("Erro ao carregar candidatos entrevistados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const entrevistados = useMemo(() => {
    const allowed = ETAPAS_ENTREVISTADOS.map((item) => normalizeEtapa(item));

    const list = candidatos
      .filter((cand) => allowed.includes(normalizeEtapa(cand.etapa)))
      .filter((cand) => {
        const blob = `${cand.nome || ""} ${cand.email || ""} ${cand.cargo_desejado || ""} ${cand.cidade || ""}`.toLowerCase();
        const matchTexto = !filtrosAplicados.texto || blob.includes(filtrosAplicados.texto.toLowerCase());
        const matchEtapa = !filtrosAplicados.etapa || normalizeEtapa(cand.etapa) === filtrosAplicados.etapa;
        const matchVaga = !filtrosAplicados.vaga || String(cand.vaga_id || "") === filtrosAplicados.vaga;
        return matchTexto && matchEtapa && matchVaga;
      });

    list.sort((a, b) => {
      const da = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const db = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      if (sortBy === "antigos") return da - db;
      if (sortBy === "nome_az") return normalize(a.nome).localeCompare(normalize(b.nome));
      if (sortBy === "nome_za") return normalize(b.nome).localeCompare(normalize(a.nome));
      return db - da;
    });

    return list;
  }, [candidatos, filtrosAplicados, sortBy]);

  const getVagaTitulo = (cand: Candidato) => {
    const match = vagas.find((vaga) => String(vaga.id) === String(cand.vaga_id || ""));
    return match?.titulo || cand.vaga_titulo || (cand.vaga_id ? `Vaga ${cand.vaga_id}` : "—");
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados({ texto: filtroTexto, etapa: filtroEtapa, vaga: filtroVaga });
  };

  const hasUnsavedFilters =
    filtroTexto !== filtrosAplicados.texto || filtroEtapa !== filtrosAplicados.etapa || filtroVaga !== filtrosAplicados.vaga;

  const substituirVariaveis = (texto: string, candidato: Candidato) => {
    const vaga = vagas.find((item) => String(item.id) === String(candidato.vaga_id || ""));
    return texto
      .replace(/\{\{nome\}\}/g, candidato.nome || "")
      .replace(/\{\{email\}\}/g, candidato.email || "")
      .replace(/\{\{telefone\}\}/g, candidato.telefone || "")
      .replace(/\{\{cargo\}\}/g, candidato.cargo_desejado || "")
      .replace(/\{\{vaga\}\}/g, vaga?.titulo || "")
      .replace(/\{\{empresa\}\}/g, "");
  };

  const carregarTemplates = async (query = "") => {
    const response = await fetch(`/api/comunicacoes/templates${query}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, "Erro ao carregar templates."));
    }

    const data = (await response.json()) as unknown;
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => normalizeTemplate(item as Record<string, unknown>));
  };

  const abrirEditorTemplates = async () => {
    setEditorOpen(true);
    setEditorLoading(true);
    setShowTemplateForm(false);

    try {
      setTemplatesEditor(await carregarTemplates());
    } catch (err) {
      pushToast("erro", err instanceof Error ? err.message : "Erro ao carregar templates.");
      setTemplatesEditor([]);
    } finally {
      setEditorLoading(false);
    }
  };

  const novoTemplate = () => {
    setTemplateForm(createDefaultTemplateForm());
    setShowTemplateForm(true);
  };

  const editarTemplate = async (id: number) => {
    try {
      const response = await fetch(`/api/comunicacoes/templates/${id}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Erro ao carregar template."));
      }

      const payload = normalizeTemplate((await response.json()) as Record<string, unknown>);
      const nomeNormalizado = normalize(payload.nome);
      let tipo: TemplateForm["tipo"] = "";
      if (nomeNormalizado.includes("aprov")) tipo = "aprovacao";
      if (nomeNormalizado.includes("reprov")) tipo = "reprovacao";

      setTemplateForm({
        id: payload.id,
        nome: payload.nome,
        tipo,
        canal: payload.canal,
        assunto: payload.assunto || "",
        corpo: payload.corpo,
        ativo: payload.ativo,
      });
      setShowTemplateForm(true);
    } catch (err) {
      pushToast("erro", err instanceof Error ? err.message : "Erro ao carregar template.");
    }
  };

  const excluirTemplate = async (id: number) => {
    const template = templatesEditor.find((item) => item.id === id);
    if (!template) return;

    if (!window.confirm(`Tem certeza que deseja excluir o template "${template.nome}"?`)) return;

    try {
      const response = await fetch(`/api/comunicacoes/templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Erro ao excluir template."));
      }

      setTemplatesEditor((prev) => prev.filter((item) => item.id !== id));
      if (templateForm.id === id) {
        setTemplateForm(createDefaultTemplateForm());
        setShowTemplateForm(false);
      }
      pushToast("ok", "Template excluído com sucesso.");
    } catch (err) {
      pushToast("erro", err instanceof Error ? err.message : "Erro ao excluir template.");
    }
  };

  const salvarTemplate = async () => {
    if (!templateForm.nome.trim() || !templateForm.tipo || !templateForm.corpo.trim()) {
      pushToast("erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    let nomeCompleto = templateForm.nome.trim();
    const nomeNorm = normalize(nomeCompleto);
    if (templateForm.tipo === "aprovacao" && !nomeNorm.includes("aprov")) {
      nomeCompleto = `Aprovação - ${nomeCompleto}`;
    }
    if (templateForm.tipo === "reprovacao" && !nomeNorm.includes("reprov")) {
      nomeCompleto = `Reprovação - ${nomeCompleto}`;
    }

    const payload = {
      nome: nomeCompleto,
      canal: templateForm.canal,
      etapa: templateForm.tipo === "aprovacao" ? "Aprovado" : "Reprovado",
      assunto: templateForm.assunto.trim() || null,
      corpo: templateForm.corpo.trim(),
      ativo: templateForm.ativo,
    };

    try {
      const isEdit = Boolean(templateForm.id);
      const response = await fetch(
        isEdit ? `/api/comunicacoes/templates/${templateForm.id}` : "/api/comunicacoes/templates",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Erro ao salvar template."));
      }

      setTemplatesEditor(await carregarTemplates());
      setTemplateForm(createDefaultTemplateForm());
      setShowTemplateForm(false);
      pushToast("ok", isEdit ? "Template atualizado com sucesso." : "Template criado com sucesso.");
    } catch (err) {
      pushToast("erro", err instanceof Error ? err.message : "Erro ao salvar template.");
    }
  };

  const abrirModalTemplate = async (cand: Candidato, tipo: TipoTemplate) => {
    setAcaoAtual({ tipo, candidatoId: cand.id });
    setTemplateModalOpen(true);
    setTemplateModalLoading(true);
    setTemplateSelecionadoId(null);
    setTemplatesSelecao([]);

    try {
      const ativos = await carregarTemplates("?ativo=true");
      const filtrados = ativos.filter((template) => {
        const nome = normalize(template.nome);
        const assunto = normalize(template.assunto);
        const etapa = normalize(template.etapa);
        if (tipo === "aprovar") {
          return nome.includes("aprov") || assunto.includes("aprov") || etapa.includes("aprovado");
        }
        return nome.includes("reprov") || assunto.includes("reprov") || etapa.includes("reprovado");
      });

      setTemplatesSelecao(filtrados);
      if (filtrados.length === 1) {
        setTemplateSelecionadoId(filtrados[0].id);
      }
    } catch (err) {
      pushToast("erro", err instanceof Error ? err.message : "Erro ao carregar templates.");
    } finally {
      setTemplateModalLoading(false);
    }
  };

  const templateSelecionado = useMemo(
    () => templatesSelecao.find((item) => item.id === templateSelecionadoId) || null,
    [templatesSelecao, templateSelecionadoId]
  );

  const candidatoAcao = useMemo(() => {
    if (!acaoAtual) return null;
    return candidatos.find((cand) => cand.id === acaoAtual.candidatoId) || null;
  }, [acaoAtual, candidatos]);

  const templatePreview = templateSelecionado && candidatoAcao ? substituirVariaveis(templateSelecionado.corpo, candidatoAcao) : "";

  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
    setTemplateModalLoading(false);
    setAcaoAtual(null);
    setTemplateSelecionadoId(null);
    setTemplatesSelecao([]);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setShowTemplateForm(false);
    setTemplateForm(createDefaultTemplateForm());
  };

  const confirmarEnvio = async () => {
    if (!acaoAtual || !templateSelecionado || !candidatoAcao) return;

    try {
      setProcessingId(candidatoAcao.id);
      const novaEtapa = acaoAtual.tipo === "aprovar" ? "Aprovado" : "Reprovado";
      await patchCandidatoEtapa(candidatoAcao.id, novaEtapa);

      const scheduledDate = new Date();

      const response = await fetch("/api/comunicacoes/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidato_id: candidatoAcao.id,
          canal: "whatsapp",
          assunto: templateSelecionado.assunto || null,
          corpo: substituirVariaveis(templateSelecionado.corpo, candidatoAcao),
          scheduled_at: scheduledDate.toISOString(),
          template_id: templateSelecionado.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Erro ao agendar mensagem."));
      }

      const dispatchPayload = (await response.json().catch(() => null)) as
        | {
            dispatch?: {
              attempted?: boolean;
              delivered?: boolean;
              message?: string;
            };
            status?: string;
          }
        | null;

      const dispatch = dispatchPayload?.dispatch;
      const delivered = dispatch?.attempted && dispatch?.delivered;
      const fallbackSent = dispatchPayload?.status === "enviado";
      const wasSent = Boolean(delivered || fallbackSent);

      setCandidatos((prev) => prev.map((item) => (item.id === candidatoAcao.id ? { ...item, etapa: novaEtapa } : item)));

      if (wasSent) {
        pushToast("ok", `Candidato ${novaEtapa.toLowerCase()} e mensagem enviada no WhatsApp.`);
      } else {
        const dispatchMessage = dispatch?.message ? ` ${dispatch.message}` : "";
        pushToast(
          "alerta",
          `Candidato ${novaEtapa.toLowerCase()} e comunicação registrada na outbox para reenvio manual.${dispatchMessage}`
        );
      }

      closeTemplateModal();
    } catch (err) {
      pushToast("erro", err instanceof Error ? err.message : "Erro ao processar ação.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderBadgeTemplateTipo = (template: TemplateComunicacao) => {
    const nome = normalize(template.nome);
    const isAprovacao = nome.includes("aprov");
    const isReprovacao = nome.includes("reprov");

    if (isAprovacao) {
      return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">aprovação</span>;
    }
    if (isReprovacao) {
      return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">reprovação</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">geral</span>;
  };

  return (
    <div className="min-h-screen flex flex-col page-shell bt-page">
      <AppHeader />

      <div role="status" aria-live="polite" className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${
              toast.kind === "ok" ? "text-green-700" : toast.kind === "erro" ? "text-red-700" : "text-amber-700"
            }`}
          >
            <span>{toast.kind === "ok" ? "✓" : toast.kind === "erro" ? "✗" : "⚠"}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-[1400px] mx-auto w-full">
        {/* Header Section */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sala de Entrevistas</h1>
            <p className="text-slate-500 font-medium">Gestão de candidatos em fase de avaliação e feedback.</p>
            <Link 
              href="/banco-talentos" 
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Voltar para Banco de Talentos
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white ring-1 ring-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">?</div>)}
                </div>
                <div className="text-xs">
                   <p className="font-extrabold text-slate-900">{entrevistados.length} Candidatos</p>
                   <p className="text-slate-500 font-medium">Em processo</p>
                </div>
             </div>

            <button
              type="button"
              onClick={() => void abrirEditorTemplates()}
              className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Gerenciar Templates
            </button>
          </div>
        </div>

        {/* Dashboard Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-sm hover:shadow-md transition-all">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entrevistas (RH)</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-black text-slate-800">{entrevistados.filter(c => normalizeEtapa(c.etapa) === "Entrevista RH").length}</span>
                 <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Agendadas</span>
              </div>
           </div>
           <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-sm hover:shadow-md transition-all">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entrevistas (Gestor)</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-black text-slate-800">{entrevistados.filter(c => normalizeEtapa(c.etapa) === 'Entrevista Gestor').length}</span>
                 <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Técnicas</span>
              </div>
           </div>
           <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-sm hover:shadow-md transition-all">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Propostas</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-black text-slate-800">{entrevistados.filter(c => normalizeEtapa(c.etapa) === 'Proposta').length}</span>
                 <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">Em negociação</span>
              </div>
           </div>
           <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mb-2">Aprovações</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-black text-emerald-800">{entrevistados.filter(c => normalizeEtapa(c.etapa) === 'Contratado' || normalizeEtapa(c.etapa) === 'Aprovado').length}</span>
                 <span className="text-xs font-semibold text-emerald-700 bg-white/50 px-2 py-0.5 rounded-md">Este mês</span>
              </div>
           </div>
        </section>

        {/* Filters Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1 mb-8">
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Buscar</label>
                <input
                  value={filtroTexto}
                  onChange={(event) => setFiltroTexto(event.target.value)}
                  type="text"
                  placeholder="Nome, email, cargo..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Etapa</label>
                <select
                  value={filtroEtapa}
                  onChange={(event) => setFiltroEtapa(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Todas</option>
                  <option value="Entrevista RH">Entrevista RH</option>
                  <option value="Entrevista Gestor">Entrevista Gestor</option>
                  <option value="Teste Tecnico">Teste Técnico</option>
                  <option value="Proposta">Proposta</option>
                  <option value="Contratado">Contratado</option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Vaga</label>
                <select
                  value={filtroVaga}
                  onChange={(event) => setFiltroVaga(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Todas as vagas</option>
                  {vagas.map((vaga) => (
                    <option key={vaga.id} value={String(vaga.id)}>
                      {vaga.titulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                 <button
                  type="button"
                  onClick={aplicarFiltros}
                  className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:shadow-none"
                  disabled={!hasUnsavedFilters}
                >
                  {hasUnsavedFilters ? 'Aplicar Filtros' : 'Filtros Ativos'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="text-red-700/70 hover:text-red-700 text-xs font-black">
              FECHAR
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
            <p className="mt-4 text-sm text-slate-500 font-bold">Carregando candidatos...</p>
          </div>
        ) : entrevistados.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhum candidato aguardando</h3>
            <p className="mt-2 text-sm text-slate-500">Não há candidatos na fase de entrevista com os filtros atuais.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidato</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo / Senioridade</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Etapa Atual</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vaga Relacionada</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Data Início</th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entrevistados.map((cand) => (
                    <tr key={cand.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                            {cand.nome ? cand.nome.substring(0, 2) : "??"}
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{cand.nome || "—"}</p>
                             <p className="text-xs text-slate-500">{cand.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                           <span className="text-sm font-semibold text-slate-700">{cand.cargo_desejado || "—"}</span>
                           <span className="text-xs text-slate-500 bg-slate-100 w-fit px-2 py-0.5 rounded mt-1">{cand.senioridade || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`${etapaBadgeClass(cand.etapa)} shadow-sm`}>{normalizeEtapa(cand.etapa) || "—"}</span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 font-medium">{getVagaTitulo(cand)}</td>
                      <td className="py-4 px-6 text-xs font-bold text-slate-400">{formatDate(cand.criado_em)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setSelected(cand)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white hover:border-slate-300"
                          >
                            Detalhes
                          </button>
                          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                             <button
                               type="button"
                               onClick={() => void abrirModalTemplate(cand, "aprovar")}
                               disabled={processingId === cand.id}
                               className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                               title="Aprovar"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                             </button>
                             <div className="w-px bg-slate-200 mx-1"></div>
                             <button
                               type="button"
                               onClick={() => void abrirModalTemplate(cand, "reprovar")}
                               disabled={processingId === cand.id}
                               className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                               title="Reprovar"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-start sm:items-center justify-center z-40 py-4 sm:py-0" onClick={() => setSelected(null)}>
          <div className="modal-card p-6 w-full mx-4 sm:mx-0 max-w-2xl relative max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-(--brand) text-2xl font-black"
              aria-label="Fechar detalhes"
            >
              ×
            </button>
            <h2 className="text-2xl font-extrabold text-(--ink) mb-4">{selected.nome || "Candidato"}</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Email</p>
                <p className="text-sm text-slate-700">{selected.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Telefone</p>
                <p className="text-sm text-slate-700">{selected.telefone || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Cargo Desejado</p>
                <p className="text-sm text-slate-700">{selected.cargo_desejado || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Senioridade</p>
                <p className="text-sm text-slate-700">{selected.senioridade || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Etapa</p>
                <span className={etapaBadgeClass(selected.etapa)}>{normalizeEtapa(selected.etapa) || "—"}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Vaga</p>
                <p className="text-sm text-slate-700">{getVagaTitulo(selected)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Cidade</p>
                <p className="text-sm text-slate-700">{selected.cidade || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Criado em</p>
                <p className="text-sm text-slate-700">{formatDate(selected.criado_em)}</p>
              </div>
              {selected.historico && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Histórico</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.historico}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 py-4 sm:py-0 overflow-y-auto" onClick={closeEditor}>
          <div className="modal-card p-6 w-full mx-4 sm:mx-0 max-w-5xl relative my-4" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={closeEditor}
              className="absolute top-4 right-4 text-slate-400 hover:text-(--accent) text-2xl font-black rounded-lg px-2 py-1"
              aria-label="Fechar"
            >
              ×
            </button>

            <h2 className="text-2xl font-extrabold text-(--ink) mb-6">Gerenciar Templates</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-700">Templates Existentes</h3>
                  <button
                    type="button"
                    onClick={novoTemplate}
                    className="px-3 py-1.5 bg-(--accent) text-white text-sm font-bold rounded-lg hover:opacity-90 transition"
                  >
                    + Novo
                  </button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {editorLoading ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
                  ) : templatesEditor.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Nenhum template cadastrado</div>
                  ) : (
                    templatesEditor.map((template) => (
                      <div key={template.id} className="border border-slate-200 rounded-lg p-3 hover:border-(--accent) transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{template.nome}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {renderBadgeTemplateTipo(template)}
                              <span className="text-xs text-slate-500">{template.canal}</span>
                              {template.ativo ? <span className="text-xs text-green-600">✓ Ativo</span> : <span className="text-xs text-slate-400">Inativo</span>}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{template.corpo.slice(0, 100)}...</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void editarTemplate(template.id)} className="text-xs text-(--accent) hover:underline font-semibold">
                            Editar
                          </button>
                          <button type="button" onClick={() => void excluirTemplate(template.id)} className="text-xs text-red-600 hover:underline font-semibold">
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {showTemplateForm ? (
                <div>
                  <h3 className="text-lg font-bold text-slate-700 mb-4">Editar Template</h3>
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void salvarTemplate();
                    }}
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Template *</label>
                      <input
                        value={templateForm.nome}
                        onChange={(event) => setTemplateForm((prev) => ({ ...prev, nome: event.target.value }))}
                        type="text"
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-(--accent)/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Tipo *</label>
                      <select
                        value={templateForm.tipo}
                        onChange={(event) => setTemplateForm((prev) => ({ ...prev, tipo: event.target.value as TemplateForm["tipo"] }))}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-(--accent)/30"
                      >
                        <option value="">Selecione...</option>
                        <option value="aprovacao">Aprovação</option>
                        <option value="reprovacao">Reprovação</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Canal *</label>
                      <select
                        value={templateForm.canal}
                        onChange={(event) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            canal: event.target.value === "whatsapp" ? "whatsapp" : "email",
                          }))
                        }
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-(--accent)/30"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Assunto (opcional)</label>
                      <input
                        value={templateForm.assunto}
                        onChange={(event) => setTemplateForm((prev) => ({ ...prev, assunto: event.target.value }))}
                        type="text"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-(--accent)/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Mensagem *</label>
                      <textarea
                        value={templateForm.corpo}
                        onChange={(event) => setTemplateForm((prev) => ({ ...prev, corpo: event.target.value }))}
                        required
                        rows={8}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-(--accent)/30"
                      />
                      <p className="text-xs text-slate-500 mt-1">{"💡 Variáveis: {{nome}}, {{email}}, {{telefone}}, {{cargo}}, {{vaga}}, {{empresa}}"}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        checked={templateForm.ativo}
                        onChange={(event) => setTemplateForm((prev) => ({ ...prev, ativo: event.target.checked }))}
                        type="checkbox"
                        className="w-4 h-4 text-(--accent) rounded"
                      />
                      <label className="text-sm font-semibold text-slate-700">Template ativo</label>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="flex-1 px-4 py-2 bg-(--accent) text-white rounded-lg hover:opacity-90 font-extrabold text-sm">
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTemplateForm(false);
                          setTemplateForm(createDefaultTemplateForm());
                        }}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex items-center justify-center text-slate-400 text-sm">
                  Selecione um template para editar ou crie um novo
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {templateModalOpen && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 py-4 sm:py-0" onClick={closeTemplateModal}>
          <div className="modal-card p-6 w-full mx-4 sm:mx-0 max-w-3xl relative max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={closeTemplateModal}
              className="sticky top-0 float-right text-slate-400 hover:text-(--accent) text-2xl font-black rounded-lg px-2 py-1"
              aria-label="Fechar"
            >
              ×
            </button>

            <h2 className="text-2xl font-extrabold text-(--ink) mb-2">Selecionar Template WhatsApp</h2>
            <p className="text-sm font-bold text-(--accent) mb-2">{acaoAtual?.tipo === "aprovar" ? "📋 Template de Aprovação" : "📋 Template de Reprovação"}</p>
            <p className="text-sm text-slate-600 mb-6">A mensagem será enviada automaticamente em 7 dias</p>

            {templateModalLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-(--accent) border-t-transparent"></div>
                <p className="mt-3 text-sm text-slate-500">Carregando templates...</p>
              </div>
            ) : templatesSelecao.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">Nenhum template para essa ação foi encontrado.</div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {templatesSelecao.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`w-full border rounded-lg p-4 text-left transition-all ${
                      templateSelecionadoId === template.id ? "border-(--accent) bg-orange-50" : "border-slate-200 hover:border-(--accent)"
                    }`}
                    onClick={() => setTemplateSelecionadoId(template.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{template.nome}</h3>
                        {template.assunto ? <p className="text-xs text-slate-500 mt-1">Assunto: {template.assunto}</p> : null}
                        <p className="text-sm text-slate-600 mt-2">{template.corpo.slice(0, 100)}...</p>
                      </div>
                      <input type="radio" checked={templateSelecionadoId === template.id} onChange={() => setTemplateSelecionadoId(template.id)} className="ml-3 mt-1 w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {templatePreview ? (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Preview</p>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{templatePreview}</div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeTemplateModal} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-sm">
                Cancelar
              </button>
              <button
                onClick={() => void confirmarEnvio()}
                disabled={!templateSelecionado || Boolean(processingId)}
                className="px-4 py-2 bg-(--accent) text-white rounded-lg hover:opacity-90 font-extrabold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId ? "Processando..." : "Confirmar e Agendar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
