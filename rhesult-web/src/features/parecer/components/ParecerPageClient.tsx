"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/shared/components/AppHeader";
import { useAuth } from "@/shared/context/AppContext";
import { fetchCandidatos, fetchVagas, type Candidato, type Vaga } from "@/features/talent-bank/services/talentBankApi";
import {
  createParecer,
  createParecerComentario,
  deleteParecer,
  fetchParecerById,
  fetchParecerComentarios,
  fetchParecerVersaoConteudo,
  fetchParecerVersoes,
  fetchPareceres,
  updateParecer,
  type Parecer,
  type ParecerComentario,
  type ParecerStatus,
  type ParecerVersao,
} from "@/features/parecer/services/parecerApi";
import { RichTextEditor, stripHtml, markdownToHtml } from "./RichTextEditor";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

type ToastKind = "success" | "error";
type Toast = { kind: ToastKind; message: string };
type Tab = "comentarios" | "versoes";
type EditorTemplate = { label: string; icon: string; html: string };
type SortMode = "recente" | "antigo" | "nome" | "status";
type ConfirmDialogState = { title: string; message: string; onConfirm: () => void; destructive?: boolean } | null;

const TEMPLATES: EditorTemplate[] = [
  {
    label: "Parecer Completo",
    icon: "📋",
    html: `<h2 style="text-align: center"><u>Parecer de Seleção</u></h2>
<table style="width: 100%">
  <tbody>
    <tr>
      <td><p><strong>Nome:</strong><br>ANTÔNIO WISLEY MARQUES DA SILVA</p></td>
      <td><p><strong>Cargo / Função:</strong><br>AUXILIAR DE PRODUÇÃO</p></td>
    </tr>
    <tr>
      <td><p><strong>Contatos:</strong><br>(85) 98692-6903</p></td>
      <td><p><strong>Data:</strong><br>${new Date().toLocaleDateString("pt-BR")}</p></td>
    </tr>
    <tr>
      <td colspan="2" style="text-align: center"><p>Perfil Público Linkedin</p></td>
    </tr>
  </tbody>
</table>
<p><strong>Dados Pessoais e Qualificações:</strong></p>
<p>Antônio Wisley Marques da Silva, 24 anos, solteiro, residente no bairro Bom Sucesso – Fortaleza/CE. Mora sozinho, possui moto própria, o que garante boa mobilidade e disponibilidade para o turno noturno/madrugada. Demonstra postura simples, educada e respeitosa, com boa capacidade de escuta e adaptação a ambientes operacionais.</p>
<p>Apresenta perfil compatível com atividades industriais, especialmente em rotinas produtivas, organização de processos e cumprimento de normas de segurança.</p>
<p><strong>Formação Acadêmica:</strong></p>
<p>Ensino Médio Completo - EEFM Prof. Hermenegildo Firmeza</p>
<p><strong><u>Resumo do Perfil Profissional:</u></strong></p>
<p>No ambiente profissional, Wesley demonstra comportamento colaborativo, foco em execução e facilidade de aprendizado. Possui experiência em ambientes operacionais e de distribuição, com vivência em rotinas que exigem atenção, organização, conferência de produtos e trabalho sob pressão.</p>
<p>Apresenta maturidade ao lidar com erros, adotando postura analítica, buscando correção de falhas e apoio de colaboradores mais experientes. Demonstra entendimento prático de processos produtivos e respeito à hierarquia técnica, características relevantes para atuação em indústria gráfica.</p>
<p>Mostra interesse genuíno em crescimento interno, aprendizado contínuo e desenvolvimento profissional.</p>
<p><strong><u>Suas principais experiências profissionais são:</u></strong></p>
<p><strong>Empresa:</strong> Comercial Inova Brasil Ltda – Fortaleza/CE<br><strong>Período:</strong> Dez/2022 – Jan/2024<br><strong>Cargo:</strong> Auxiliar de Expedição / Repositor</p>
<p>Atuação em atividades operacionais, separação, organização, reposição e movimentação de produtos, com rotina física intensa e foco em cumprimento de prazos.</p>
<p><strong>Motivo da saída:</strong> Encerramento do vínculo e busca por novas oportunidades profissionais.</p>`,
  },
  { label: "Resumo", icon: "📝", html: "<h2>Resumo</h2><ul><li>Contexto geral do candidato:</li><li>Pontos fortes:</li><li>Pontos de atenção:</li></ul>" },
  { label: "Hard Skills", icon: "⚙️", html: "<h2>Hard Skills</h2><ul><li>Competências técnicas avaliadas:</li><li>Evidências observadas:</li><li>Nível de aderência à vaga:</li></ul>" },
  { label: "Comportamental", icon: "🧠", html: "<h2>Fit Comportamental</h2><ul><li>Comunicação:</li><li>Colaboração:</li><li>Autonomia e ownership:</li></ul>" },
  { label: "Recomendação", icon: "✅", html: "<h2>Recomendação Final</h2><ul><li>Decisão sugerida:</li><li>Justificativa:</li><li>Próximos passos:</li></ul>" },
];

const STATUS_CONFIG: Record<
  ParecerStatus,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  pendente:  { label: "Pendente",  dot: "bg-slate-400",   bg: "bg-slate-50",    text: "text-slate-600",   border: "border-slate-200" },
  aprovado:  { label: "Aprovado",  dot: "bg-emerald-500", bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  reprovado: { label: "Reprovado", dot: "bg-red-500",     bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200" },
  ajustes:   { label: "Ajustes",   dot: "bg-amber-500",   bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function draftKey(parecerId: number | null, candidatoId: string, vagaId: string) {
  if (parecerId) return `parecer:draft:${parecerId}`;
  return `parecer:draft:new:${candidatoId || "none"}:${vagaId || "none"}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatTimeHM(value: string | null) {
  if (!value) return "Nunca salvo";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nunca salvo";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function wordCount(html: string) {
  const plain = stripHtml(html);
  return plain.trim() ? plain.trim().split(/\s+/).length : 0;
}

function readingTime(html: string) {
  const words = wordCount(html);
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min de leitura`;
}


/* ------------------------------------------------------------------ */
/*  Confirm Dialog                                                     */
/* ------------------------------------------------------------------ */

function ConfirmDialog({ state, onClose }: { state: NonNullable<ConfirmDialogState>; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${state.destructive ? "bg-red-50" : "bg-amber-50"}`}>
              {state.destructive ? (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{state.title}</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{state.message}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 pb-5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { state.onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors ${
              state.destructive
                ? "bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20"
                : "bg-slate-900 hover:bg-slate-800 shadow-sm shadow-slate-900/20"
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsBar({ pareceres }: { pareceres: Parecer[] }) {
  const stats = useMemo(() => {
    const total = pareceres.length;
    const aprovados = pareceres.filter((p) => p.status === "aprovado").length;
    const reprovados = pareceres.filter((p) => p.status === "reprovado").length;
    const pendentes = pareceres.filter((p) => p.status === "pendente").length;
    return { total, aprovados, reprovados, pendentes };
  }, [pareceres]);

  const cards = [
    { label: "Total",      value: stats.total,      color: "text-slate-900",   bg: "bg-white",       icon: "\uD83D\uDCC4" },
    { label: "Aprovados",  value: stats.aprovados,  color: "text-emerald-700", bg: "bg-emerald-50",  icon: "\u2705" },
    { label: "Reprovados", value: stats.reprovados,  color: "text-red-700",     bg: "bg-red-50",      icon: "\u274C" },
    { label: "Pendentes",  value: stats.pendentes,  color: "text-amber-700",   bg: "bg-amber-50",    icon: "\u23F3" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm`}>
          <span className="text-2xl">{c.icon}</span>
          <div>
            <p className={`text-2xl font-extrabold ${c.color} leading-none`}>{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ParecerListItem({ item, isSelected, onClick }: { item: Parecer; isSelected: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[item.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group ${
        isSelected
          ? "border-slate-900 bg-slate-900 shadow-lg shadow-slate-900/10 transform scale-[1.01]"
          : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
      }`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <p className={`text-sm font-bold truncate pr-2 ${isSelected ? "text-white" : "text-slate-900"}`}>{item.candidato_nome}</p>
        <span className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${cfg.dot} ${isSelected ? "ring-2 ring-white/30" : ""}`} />
      </div>
      <p className={`text-xs truncate mb-2.5 ${isSelected ? "text-slate-400" : "text-slate-500"}`}>{item.vaga_titulo}</p>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isSelected ? "bg-white/15 text-white/90" : `${cfg.bg} ${cfg.text}`}`}>{cfg.label}</span>
        <span className={`text-[10px] ${isSelected ? "text-slate-500" : "text-slate-400"}`}>{formatDateShort(item.updated_at)}</span>
      </div>
    </button>
  );
}



function CommentSection({ comentarios, novoComentario, onNovoComentarioChange, onAddComentario }: { comentarios: ParecerComentario[]; novoComentario: string; onNovoComentarioChange: (v: string) => void; onAddComentario: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comentarios.length]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comentarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl">{"\uD83D\uDCAC"}</div>
            <p className="text-xs font-medium text-slate-400">Nenhum coment\u00E1rio ainda.</p>
            <p className="text-[10px] text-slate-300">Adicione observa\u00E7\u00F5es sobre este parecer</p>
          </div>
        ) : (
          comentarios.map((item) => (
            <div key={item.id} className="group bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-slate-500">{(item.usuario_nome || "U")[0].toUpperCase()}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{item.usuario_nome || "Usu\u00E1rio"}</span>
                </div>
                <span className="text-[10px] text-slate-400">{formatDateShort(item.created_at)}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-7">{item.texto}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-slate-100 bg-white">
        <div className="relative">
          <input value={novoComentario} onChange={(e) => onNovoComentarioChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onAddComentario()} className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300" placeholder="Escreva um coment\u00E1rio..." />
          <button onClick={onAddComentario} disabled={!novoComentario.trim()} className="absolute right-1.5 top-1.5 p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:bg-slate-200 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function VersionList({ versoes, onLoadVersion }: { versoes: ParecerVersao[]; onLoadVersion: (id: number) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
      {versoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-lg">{"\uD83D\uDD50"}</div>
          <p className="text-xs font-medium text-slate-400">Nenhuma vers\u00E3o anterior</p>
          <p className="text-[10px] text-slate-300">Salve para criar o hist\u00F3rico</p>
        </div>
      ) : (
        versoes.map((item, i) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <button key={item.id} type="button" onClick={() => onLoadVersion(item.id)} className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{versoes.length - i}</div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">v{versoes.length - i}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-7">{formatDate(item.created_at)}</p>
            </button>
          );
        })
      )}
    </div>
  );
}

function PreviewModal({ content, candidatoNome, vagaTitulo, status, onClose, onPrint, onDownload }: { content: string; candidatoNome: string; vagaTitulo: string; status: ParecerStatus; onClose: () => void; onPrint?: () => void; onDownload?: () => void }) {
  const cfg = STATUS_CONFIG[status];
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-[850px] max-h-[95vh] overflow-hidden bg-white rounded-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Teal bar */}
        <div className="w-full h-2 bg-[#0A2725] rounded-t-sm flex-shrink-0" />
        <div className="px-[72px] pt-8 pb-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <img src="/Rhesult.png" alt="Rhesult" className="h-10 w-auto object-contain" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{candidatoNome}</h2>
              <p className="text-sm text-slate-500">{vagaTitulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block mr-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento Oficial</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Uso Interno</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border} border`}>{cfg.label}</span>
            <button type="button" className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition-colors" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-[72px] py-10">
          <div className="prose prose-slate max-w-none rhesult-editor" dangerouslySetInnerHTML={{ __html: content || "<p>Sem conte\u00fado.</p>" }} />
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">{wordCount(content)} palavras · {content.length} caracteres · {readingTime(content)}</p>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button onClick={onPrint} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5" title="Imprimir">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Imprimir
              </button>
            )}
            {onDownload && (
              <button onClick={onDownload} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5" title="Download HTML">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </button>
            )}
            <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 transition-colors">Voltar ao Editor</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ParecerPageClient() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [pareceres, setPareceres] = useState<Parecer[]>([]);

  const [selectedParecerId, setSelectedParecerId] = useState<number | null>(null);
  const [selectedCandidatoId, setSelectedCandidatoId] = useState("");
  const [selectedVagaId, setSelectedVagaId] = useState("");

  const [editorContent, setEditorContent] = useState("");
  const [status, setStatus] = useState<ParecerStatus>("pendente");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [comentarios, setComentarios] = useState<ParecerComentario[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [versoes, setVersoes] = useState<ParecerVersao[]>([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [rightTab, setRightTab] = useState<Tab>("comentarios");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recente");
  const [statusFilter, setStatusFilter] = useState<ParecerStatus | "todos">("todos");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);

  const currentCandidato = useMemo(() => candidatos.find((c) => String(c.id) === selectedCandidatoId) || null, [candidatos, selectedCandidatoId]);
  const currentVaga = useMemo(() => vagas.find((v) => String(v.id) === selectedVagaId) || null, [vagas, selectedVagaId]);
  const dynamicVariables = useMemo(
    () =>
      [
        { label: "Candidato", value: currentCandidato?.nome || "" },
        { label: "Cargo/Vaga", value: currentVaga?.titulo || "" },
        { label: "Status do Parecer", value: STATUS_CONFIG[status].label },
        { label: "Data de Hoje", value: new Date().toLocaleDateString("pt-BR") },
        { label: "Hora", value: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
        { label: "Avaliador", value: (user as { nome?: string; name?: string } | undefined)?.nome || (user as { nome?: string; name?: string } | undefined)?.name || "" },
      ].filter((v) => v.value),
    [currentCandidato?.nome, currentVaga?.titulo, status, user],
  );

  const applyParecerState = useCallback(
    (parecer: Parecer, opts?: { comentarios?: ParecerComentario[]; versoes?: ParecerVersao[]; markDirty?: boolean }) => {
      setSelectedParecerId(parecer.id);
      setSelectedCandidatoId(String(parecer.candidato_id));
      setSelectedVagaId(String(parecer.vaga_id));
      const html = markdownToHtml(parecer.conteudo || "");
      setEditorContent(html);
      setLastSavedContent(html);
      setStatus(parecer.status);
      if (opts?.comentarios) setComentarios(opts.comentarios);
      if (opts?.versoes) setVersoes(opts.versoes);
      setIsDirty(opts?.markDirty ?? false);
      setLastSavedAt(parecer.updated_at || new Date().toISOString());
    },
    [],
  );

  /* -- helpers -- */

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3200);
  };

  const resetEditor = () => {
    setSelectedParecerId(null);
    setSelectedCandidatoId("");
    setSelectedVagaId("");
    setEditorContent("");
    setStatus("pendente");
    setComentarios([]);
    setVersoes([]);
    setIsDirty(false);
    setLastSavedContent("");
    setLastSavedAt(null);
  };

  const handleContentChange = (value: string) => {
    setEditorContent(value);
    setIsDirty(value !== lastSavedContent);
  };

  /* -- data loading -- */

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cand, vg, prs] = await Promise.all([fetchCandidatos(), fetchVagas(), fetchPareceres()]);
      setCandidatos(cand);
      setVagas(vg);
      setPareceres(prs);
      if (prs.length > 0 && !selectedParecerId) {
        applyParecerState(prs[0]);
      }
    } catch {
      setError("N\u00E3o foi poss\u00EDvel carregar os dados de pareceres.");
    } finally {
      setLoading(false);
    }
  }, [applyParecerState]);

  const loadParecerDetails = useCallback(async (parecerId: number) => {
    try {
      const [parecer, comms, vers] = await Promise.all([fetchParecerById(parecerId), fetchParecerComentarios(parecerId), fetchParecerVersoes(parecerId)]);
      applyParecerState(parecer, { comentarios: comms, versoes: vers });
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao carregar parecer.");
    }
  }, [applyParecerState]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  /* -- draft persistence -- */

  useEffect(() => {
    const key = draftKey(selectedParecerId, selectedCandidatoId, selectedVagaId);
    localStorage.setItem(key, JSON.stringify({ selectedParecerId, selectedCandidatoId, selectedVagaId, editorContent, status }));
  }, [selectedParecerId, selectedCandidatoId, selectedVagaId, editorContent, status]);

  useEffect(() => {
    const key = draftKey(selectedParecerId, selectedCandidatoId, selectedVagaId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { editorContent?: string; status?: ParecerStatus };
      if (typeof draft.editorContent === "string") { setEditorContent(draft.editorContent); setIsDirty(draft.editorContent !== lastSavedContent); }
      if (draft.status) setStatus(draft.status);
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParecerId]);

  /* -- keyboard shortcuts -- */

  useEffect(() => {
    const handleKeyboard = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); void handleSave(); }
      if (e.key === "Escape" && isFullscreen) { setIsFullscreen(false); }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorContent, status, selectedParecerId, selectedCandidatoId, selectedVagaId, saving, isFullscreen]);

  /* -- unsaved changes guard -- */

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* -- filtering & sorting -- */

  const filteredPareceres = useMemo(() => {
    let list = pareceres;
    // text filter
    const q = filtroTexto.toLowerCase().trim();
    if (q) list = list.filter((item) => `${item.candidato_nome} ${item.vaga_titulo} ${item.status}`.toLowerCase().includes(q));
    // status filter
    if (statusFilter !== "todos") list = list.filter((item) => item.status === statusFilter);
    // sort
    const sorted = [...list];
    switch (sortMode) {
      case "recente": sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()); break;
      case "antigo": sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()); break;
      case "nome": sorted.sort((a, b) => a.candidato_nome.localeCompare(b.candidato_nome)); break;
      case "status": sorted.sort((a, b) => a.status.localeCompare(b.status)); break;
    }
    return sorted;
  }, [pareceres, filtroTexto, statusFilter, sortMode]);

  const currentParecer = useMemo(() => pareceres.find((item) => item.id === selectedParecerId) || null, [pareceres, selectedParecerId]);
  const canSave = stripHtml(editorContent).trim().length > 0 && selectedCandidatoId && selectedVagaId;

  /* -- actions -- */

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (selectedParecerId) {
        const updated = await updateParecer(selectedParecerId, { conteudo: editorContent, status });
        setPareceres((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast("success", "Parecer atualizado com sucesso.");
      } else {
        const created = await createParecer({ candidato_id: Number(selectedCandidatoId), vaga_id: Number(selectedVagaId), avaliador_id: user?.id ? Number(user.id) : undefined, conteudo: editorContent, status });
        setPareceres((prev) => [created, ...prev]);
        setSelectedParecerId(created.id);
        showToast("success", "Parecer criado com sucesso.");
      }
      setLastSavedContent(editorContent);
      setLastSavedAt(new Date().toISOString());
      setIsDirty(false);
      await loadBase();
      if (selectedParecerId) await loadParecerDetails(selectedParecerId);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao salvar parecer.");
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, selectedParecerId, selectedCandidatoId, selectedVagaId, user?.id, editorContent, status, loadBase, loadParecerDetails]);

  // Auto-save when the user stops typing for a few seconds and the content is valid
  useEffect(() => {
    if (!isDirty || !canSave || saving) return;
    const timer = window.setTimeout(() => { void handleSave(); }, 8000);
    return () => window.clearTimeout(timer);
  }, [isDirty, canSave, saving, handleSave]);

  const handleAddTemplate = (template: EditorTemplate) => {
    setEditorContent((prev) => { const next = prev.trim() && prev !== "<p></p>" ? `${prev}${template.html}` : template.html; setIsDirty(true); return next; });
    setTemplateMenuOpen(false);
  };

  const handleAddComentario = async () => {
    if (!selectedParecerId) { showToast("error", "Salve o parecer antes de comentar."); return; }
    if (!novoComentario.trim()) return;
    try {
      const created = await createParecerComentario(selectedParecerId, novoComentario.trim());
      setComentarios((prev) => [...prev, created]);
      setNovoComentario("");
      showToast("success", "Coment\u00E1rio adicionado.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao comentar.");
    }
  };

  const handleCarregarVersao = async (versionId: number) => {
    if (!selectedParecerId) return;
    try {
      const versao = await fetchParecerVersaoConteudo(selectedParecerId, versionId);
      setEditorContent(markdownToHtml(versao.conteudo || ""));
      if (versao.status) setStatus(versao.status);
      setIsDirty(true);
      showToast("success", "Versão carregada no editor.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao carregar versão.");
    }
  };

  const confirmLoadVersion = (versionId: number) => {
    if (isDirty) {
      setConfirmDialog({
        title: "Carregar versão anterior?",
        message: "Você tem alterações não salvas. Ao carregar esta versão, o conteúdo atual será substituído. Deseja continuar?",
        onConfirm: () => void handleCarregarVersao(versionId),
      });
    } else {
      void handleCarregarVersao(versionId);
    }
  };

  const handleDelete = async () => {
    if (!selectedParecerId) return;
    try {
      await deleteParecer(selectedParecerId);
      setPareceres((prev) => prev.filter((p) => p.id !== selectedParecerId));
      resetEditor();
      showToast("success", "Parecer excluído com sucesso.");
      await loadBase();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao excluir parecer.");
    }
  };

  const confirmDelete = () => {
    if (!selectedParecerId) return;
    setConfirmDialog({
      title: "Excluir Parecer",
      message: `Tem certeza que deseja excluir o parecer de "${currentParecer?.candidato_nome || "Candidato"}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => void handleDelete(),
      destructive: true,
    });
  };

  const handleDuplicate = async () => {
    if (!selectedParecerId || !selectedCandidatoId || !selectedVagaId) {
      showToast("error", "Selecione um parecer para duplicar.");
      return;
    }
    try {
      const created = await createParecer({
        candidato_id: Number(selectedCandidatoId),
        vaga_id: Number(selectedVagaId),
        avaliador_id: user?.id ? Number(user.id) : undefined,
        conteudo: editorContent,
        status: "pendente",
      });
      setPareceres((prev) => [created, ...prev]);
      setSelectedParecerId(created.id);
      showToast("success", "Parecer duplicado com sucesso.");
      await loadBase();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao duplicar parecer.");
    }
  };

  const handleExportHtml = () => {
    const candidatoNome = currentParecer?.candidato_nome || candidatos.find((c) => String(c.id) === selectedCandidatoId)?.nome || "parecer";
    const filename = `parecer-${candidatoNome.toLowerCase().replace(/\s+/g, "-")}.html`;
    const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Parecer — ${candidatoNome}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#334155}h1,h2,h3{color:#0f172a}table{border-collapse:collapse;width:100%;margin:1rem 0}td,th{border:1px solid #cbd5e1;padding:8px 12px}strong{color:#0f172a}</style></head><body>${editorContent}</body></html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };



  /* -- render -- */

  if (loading) {
    return (
      <main className="bg-slate-50 min-h-screen">
        <AppHeader />
        <section className="max-w-[1600px] mx-auto px-6 py-10 space-y-6">
          <div className="animate-pulse flex flex-col gap-6">
            <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map((i) => <div key={i} className="h-20 bg-slate-200/60 rounded-2xl" />)}</div>
            <div className="h-8 w-48 bg-slate-200/60 rounded-lg" />
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3 h-96 bg-slate-200/60 rounded-2xl" />
              <div className="lg:col-span-6 h-96 bg-slate-200/60 rounded-2xl" />
              <div className="lg:col-span-3 h-96 bg-slate-200/60 rounded-2xl" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen pb-12">
      <AppHeader />
      <section className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">Avaliação Técnica</h1>
            <p className="text-slate-500 font-medium max-w-2xl text-sm">Gerencie pareceres técnicos, feedbacks e aprovações de candidatos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={resetEditor} className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Novo Parecer
            </button>
            {selectedParecerId && (
              <>
                <button type="button" onClick={() => void handleDuplicate()} className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm" title="Duplicar parecer atual">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  Duplicar
                </button>
                <button type="button" onClick={confirmDelete} className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all shadow-sm" title="Excluir parecer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Excluir
                </button>
              </>
            )}
            <button type="button" onClick={() => void handleSave()} disabled={!canSave || saving} className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none">
              {saving ? (<><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Salvando...</>) : (<><svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Salvar<kbd className="hidden sm:inline-flex ml-1 text-[10px] bg-white/15 px-1.5 py-0.5 rounded font-mono">{"\u2318"}S</kbd></>)}
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar pareceres={pareceres} />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="text-red-700/70 hover:text-red-700 text-xs font-black">FECHAR</button>
          </div>
        )}

        {/* Main Layout */}
        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-340px)] min-h-[550px]">

          {/* Sidebar */}
          <aside className="lg:col-span-3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="relative group">
                <input type="search" placeholder="Buscar parecer..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 shadow-sm" />
                <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
              </div>
              {/* Status filter chips */}
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => setStatusFilter("todos")} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${statusFilter === "todos" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"}`}>
                  Todos
                </button>
                {(Object.entries(STATUS_CONFIG) as [ParecerStatus, typeof STATUS_CONFIG[ParecerStatus]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setStatusFilter(statusFilter === key ? "todos" : key)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${statusFilter === key ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
              {/* Sort & count */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-medium">{filteredPareceres.length} de {pareceres.length} pareceres</p>
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="text-[10px] font-bold text-slate-500 bg-transparent border-none outline-none cursor-pointer hover:text-slate-700 pr-1">
                  <option value="recente">Mais recente</option>
                  <option value="antigo">Mais antigo</option>
                  <option value="nome">Nome A-Z</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredPareceres.map((item) => <ParecerListItem key={item.id} item={item} isSelected={selectedParecerId === item.id} onClick={() => void loadParecerDetails(item.id)} />)}
              {!filteredPareceres.length && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl">{"\uD83D\uDCDD"}</div>
                  <p className="text-sm font-semibold text-slate-500">Nenhum parecer encontrado</p>
                  <p className="text-xs text-slate-400">Crie um novo parecer para começar</p>
                </div>
              )}
            </div>
          </aside>

          {/* Editor — A4 Document */}
          <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/80 ${
            isFullscreen
              ? "fixed inset-0 z-[100] rounded-none border-none"
              : "lg:col-span-6"
          }`}>
            {/* Toolbar bar */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200">
              <div className="flex gap-2 flex-1 min-w-0">
                <select value={selectedCandidatoId} onChange={(e) => setSelectedCandidatoId(e.target.value)} className="max-w-[160px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 outline-none truncate">
                  <option value="">Candidato...</option>
                  {candidatos.map((item) => <option key={String(item.id)} value={String(item.id)}>{item.nome}</option>)}
                </select>
                <select value={selectedVagaId} onChange={(e) => setSelectedVagaId(e.target.value)} className="max-w-[160px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 outline-none truncate">
                  <option value="">Vaga...</option>
                  {vagas.map((item) => <option key={String(item.id)} value={String(item.id)}>{item.titulo}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  {(Object.entries(STATUS_CONFIG) as [ParecerStatus, typeof STATUS_CONFIG[ParecerStatus]][]).map(([key, cfg]) => (
                    <button key={key} type="button" onClick={() => { setStatus(key); setIsDirty(true); }} className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all ${status === key ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm` : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600"}`}>{cfg.label}</button>
                  ))}
                </div>
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <div className="relative">
                  <button type="button" onClick={() => setTemplateMenuOpen((v) => !v)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all" title="Inserir Template">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                  </button>
                  {templateMenuOpen && (<>
                    <div className="fixed inset-0 z-10" onClick={() => setTemplateMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-20 py-1 animate-in fade-in zoom-in-95 duration-150">
                      <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Templates</p>
                      {TEMPLATES.map((tmpl) => <button key={tmpl.label} type="button" onClick={() => handleAddTemplate(tmpl)} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5"><span className="text-base">{tmpl.icon}</span>{tmpl.label}</button>)}
                    </div>
                  </>)}
                </div>
                <button onClick={() => setPreviewOpen(true)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all" title="Pré-visualizar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
                <button onClick={() => window.print()} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all" title="Imprimir / Exportar PDF">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
                <button onClick={handleExportHtml} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all" title="Download HTML">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className={`p-1.5 rounded-lg transition-all ${isFullscreen ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`} title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isFullscreen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* A4 Canvas — scrollable gray background with centered white page */}
            <div className="flex-1 overflow-y-auto a4-canvas">
              <div className="a4-page mx-auto relative">
                {/* Watermark */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0">
                  <img src="/Rhesult.png" alt="" className="w-3/4 h-auto grayscale" />
                </div>
                {/* Document header — teal bar + logo like Google Docs template */}
                <div className="a4-header w-full h-2 bg-[#0A2725] rounded-t-sm relative z-10" />
                <div className="px-[72px] pt-8 pb-4 border-b border-slate-100 flex items-center justify-between relative z-10">
                  <img src="/Rhesult.png" alt="Rhesult" className="h-10 w-auto object-contain" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento Oficial</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Uso Interno</p>
                  </div>
                </div>
                {/* Editor content area */}
                <div className="a4-body pt-6 relative z-10">
                  <RichTextEditor
                    content={editorContent}
                    onContentChange={handleContentChange}
                    onSave={() => void handleSave()}
                    placeholder="Comece a escrever sua avaliação técnica aqui..."
                    className="min-h-[900px]"
                    variables={dynamicVariables}
                  />
                </div>
                {/* Page Footer */}
                <div className="a4-footer mt-auto px-[72px] py-5 border-t border-slate-100 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#F58634] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[8px] font-black leading-none">R</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wide">www.rhesult.com.br</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-medium">Parecer de Seleção · Rhesult</span>
                </div>
              </div>
            </div>

            {/* Bottom status bar */}
            <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center justify-between">
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-3">
                <span>{wordCount(editorContent)} palavras</span>
                <span className="text-slate-200">|</span>
                <span>{editorContent.length} caracteres</span>
                <span className="text-slate-200">|</span>
                <span>{readingTime(editorContent)}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold">
                {isDirty ? (
                  <span className="text-amber-600">● Não salvo</span>
                ) : (
                  <span className="text-emerald-600">● Autosalvo às {formatTimeHM(lastSavedAt)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <aside className="lg:col-span-3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button type="button" onClick={() => setRightTab("comentarios")} className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${rightTab === "comentarios" ? "text-slate-900 border-b-2 border-slate-900 bg-white" : "text-slate-400 hover:text-slate-600 bg-slate-50/50"}`}>
                💬 Comentários{comentarios.length > 0 && <span className="ml-1.5 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded-full">{comentarios.length}</span>}
              </button>
              <button type="button" onClick={() => setRightTab("versoes")} className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${rightTab === "versoes" ? "text-slate-900 border-b-2 border-slate-900 bg-white" : "text-slate-400 hover:text-slate-600 bg-slate-50/50"}`}>
                🕐 Versões{versoes.length > 0 && <span className="ml-1.5 bg-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-full">{versoes.length}</span>}
              </button>
            </div>
            {rightTab === "comentarios" ? (
              <CommentSection comentarios={comentarios} novoComentario={novoComentario} onNovoComentarioChange={setNovoComentario} onAddComentario={() => void handleAddComentario()} />
            ) : (
              <VersionList versoes={versoes} onLoadVersion={(id) => confirmLoadVersion(id)} />
            )}
          </aside>

        </div>
      </section>

      {/* Preview Modal */}
      {previewOpen && (
        <PreviewModal
          content={editorContent}
          candidatoNome={currentParecer?.candidato_nome || candidatos.find((c) => String(c.id) === selectedCandidatoId)?.nome || "Candidato"}
          vagaTitulo={currentParecer?.vaga_titulo || vagas.find((v) => String(v.id) === selectedVagaId)?.titulo || "Vaga"}
          status={status}
          onClose={() => setPreviewOpen(false)}
          onPrint={() => window.print()}
          onDownload={handleExportHtml}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(null)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[130] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className={`px-5 py-4 rounded-xl text-sm font-bold shadow-2xl flex items-center gap-3 ${toast.kind === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.kind === "success" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </main>
  );
}
