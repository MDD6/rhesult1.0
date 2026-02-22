"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CharacterCount from "@tiptap/extension-character-count";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FontFamily from "@tiptap/extension-font-family";
import { Extension } from "@tiptap/core";
import { useEffect, useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Custom Extensions — FontSize & LineHeight                          */
/* ------------------------------------------------------------------ */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (height: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g, "") || null,
          renderHTML: (attrs: Record<string, unknown>) => {
            if (!attrs.fontSize) return {};
            return { style: `font-size: ${attrs.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setFontSize: (fontSize: string) => ({ commands }: any) => commands.setMark("textStyle", { fontSize }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unsetFontSize: () => ({ chain }: any) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() { return { types: ["heading", "paragraph"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
          renderHTML: (attrs: Record<string, unknown>) => {
            if (!attrs.lineHeight) return {};
            return { style: `line-height: ${attrs.lineHeight}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLineHeight: (lineHeight: string) => ({ commands }: any) => {
        return ["heading", "paragraph"].every((type: string) => commands.updateAttributes(type, { lineHeight }));
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unsetLineHeight: () => ({ commands }: any) => {
        return ["heading", "paragraph"].every((type: string) => commands.resetAttributes(type, "lineHeight"));
      },
    };
  },
});

const FONT_SIZES = ["8px","9px","10px","11px","12px","14px","16px","18px","20px","22px","24px","28px","32px","36px","48px","72px"];
const LINE_HEIGHTS = [
  { label: "Simples", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "Duplo", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "3.0", value: "3" },
];

const PREMIUM_BLOCKS = [
  {
    label: "Sumário Executivo",
    html: `<h2>Sumário Executivo</h2><p><strong>Contexto:</strong> [breve cenário]</p><p><strong>Decisão:</strong> [aprovar/reprovar/ajustar]</p><p><strong>Motivos-chave:</strong></p><ul><li>Ponto 1</li><li>Ponto 2</li><li>Ponto 3</li></ul><p><strong>Próximos passos:</strong></p><ol><li>Ação 1</li><li>Ação 2</li></ol>`
  },
  {
    label: "Riscos e Mitigações",
    html: `<h2>Riscos e Mitigações</h2><table style="width:100%;border-collapse:collapse"><thead><tr><th style="border-bottom:1px solid #e2e8f0;text-align:left;padding:6px">Risco</th><th style="border-bottom:1px solid #e2e8f0;text-align:left;padding:6px">Impacto</th><th style="border-bottom:1px solid #e2e8f0;text-align:left;padding:6px">Mitigação</th></tr></thead><tbody><tr><td style="padding:6px">Risco 1</td><td style="padding:6px">Médio</td><td style="padding:6px">Ação</td></tr><tr><td style="padding:6px">Risco 2</td><td style="padding:6px">Alto</td><td style="padding:6px">Ação</td></tr></tbody></table>`
  },
  {
    label: "Recomendação Final",
    html: `<h2>Recomendação Final</h2><p><strong>Decisão:</strong> [aprovado/reprovado/ajustes]</p><p><strong>Justificativa sintética:</strong></p><ul><li>Critério técnico</li><li>Critério comportamental</li><li>Risco/Complexidade</li></ul><p><strong>Checklist de encaminhamento:</strong></p><ul><li>Documentos OK</li><li>Referências verificadas</li><li>Alinhamento salarial</li></ul>`
  },
  {
    label: "Linha do Tempo da Seleção",
    html: `<h2>Linha do Tempo</h2><table style="width:100%;border-collapse:collapse"><thead><tr><th style="border-bottom:1px solid #e2e8f0;text-align:left;padding:6px">Data</th><th style="border-bottom:1px solid #e2e8f0;text-align:left;padding:6px">Marco</th><th style="border-bottom:1px solid #e2e8f0;text-align:left;padding:6px">Responsável</th></tr></thead><tbody><tr><td style="padding:6px">DD/MM</td><td style="padding:6px">Entrevista técnica</td><td style="padding:6px">RH / Líder</td></tr><tr><td style="padding:6px">DD/MM</td><td style="padding:6px">Case/apresentação</td><td style="padding:6px">Candidato</td></tr><tr><td style="padding:6px">DD/MM</td><td style="padding:6px">Feedback final</td><td style="padding:6px">RH</td></tr></tbody></table>`
  }
];

/* ------------------------------------------------------------------ */
/*  Toolbar Button                                                     */
/* ------------------------------------------------------------------ */

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
  className = "",
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all
        ${isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}
        ${disabled ? "opacity-30 pointer-events-none" : ""}
        ${className}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-200/80 mx-1" />;
}

/* ------------------------------------------------------------------ */
/*  Toolbar                                                            */
/* ------------------------------------------------------------------ */

function EditorMenuBar({ editor, variables = [] }: { editor: Editor; variables?: { label: string; value: string }[] }) {
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [varMenuOpen, setVarMenuOpen] = useState(false);
  const [spacingMenuOpen, setSpacingMenuOpen] = useState(false);

  const insertBlock = (html: string) => {
    editor.chain().focus().insertContent(html).run();
    setBlockMenuOpen(false);
  };

  const copyHtml = async () => {
    try {
      const html = editor.getHTML();
      await navigator.clipboard.writeText(html);
      const btn = document.activeElement as HTMLButtonElement | null;
      if (btn) {
        const prev = btn.innerText;
        btn.innerText = "Copiado";
        setTimeout(() => { btn.innerText = prev; }, 1500);
      }
    } catch {
      alert("Não foi possível copiar o HTML.");
    }
  };

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-200 bg-white flex-wrap print:hidden">
      {/* Text style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Negrito (Ctrl+B)"
        className="font-black text-sm"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Itálico (Ctrl+I)"
        className="italic font-serif text-sm"
      >
        I
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Sublinhado (Ctrl+U)"
        className="underline text-sm font-medium"
      >
        U
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Tachado"
        className="line-through text-sm font-medium"
      >
        S
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive("subscript")}
        title="Subscrito"
        className="text-sm font-medium"
      >
        X<sub className="text-[10px]">2</sub>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive("superscript")}
        title="Sobrescrito"
        className="text-sm font-medium"
      >
        X<sup className="text-[10px]">2</sup>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        title="Limpar Formatação"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Destacar"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" strokeLinecap="round" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Blocos Premium */}
      <div className="relative">
        <ToolbarButton onClick={() => setBlockMenuOpen((v) => !v)} title="Blocos premium" className={blockMenuOpen ? "bg-slate-900 text-white" : ""}>
          ⚡
        </ToolbarButton>
        {blockMenuOpen && (
          <div className="absolute left-0 top-10 z-20 w-64 rounded-xl border border-slate-200 bg-white shadow-xl p-1">
            <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inserir bloco</p>
            {PREMIUM_BLOCKS.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => insertBlock(b.html)}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Variáveis dinâmicas */}
      <div className="relative">
        <ToolbarButton onClick={() => setVarMenuOpen((v) => !v)} title="Inserir variáveis do parecer" className={varMenuOpen ? "bg-slate-900 text-white" : ""}>
          {"{ }"}
        </ToolbarButton>
        {varMenuOpen && variables.length > 0 && (
          <div className="absolute left-0 top-10 z-20 w-56 rounded-xl border border-slate-200 bg-white shadow-xl p-1">
            <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variáveis</p>
            {variables.map((v) => (
              <button
                key={v.label}
                type="button"
                onClick={() => { editor.chain().focus().insertContent(v.value).run(); setVarMenuOpen(false); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                {v.label}
                <span className="block text-[10px] text-slate-400 truncate">{v.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ToolbarDivider />

      {/* Font Family */}
      <select
        className="h-8 px-2 text-xs border-none bg-transparent text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer focus:ring-0 outline-none"
        onChange={(e) => {
          if (e.target.value === "default") {
            editor.chain().focus().unsetFontFamily().run();
          } else {
            editor.chain().focus().setFontFamily(e.target.value).run();
          }
        }}
        value={editor.getAttributes("textStyle").fontFamily || "default"}
        title="Fonte"
      >
        <option value="default">Padrão</option>
        <option value="Inter, sans-serif">Inter</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Times New Roman, serif">Times New Roman</option>
        <option value="Courier New, serif">Courier New</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Verdana, serif">Verdana</option>
        <option value="Monaco, monospace">Monaco</option>
      </select>

      {/* Font Size */}
      <select
        className="h-8 w-[58px] px-1 text-xs text-center border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer focus:ring-0 outline-none font-bold tabular-nums"
        value={editor.getAttributes("textStyle").fontSize || "14px"}
        onChange={(e) => {
          if (e.target.value === "14px") {
            editor.chain().focus().unsetFontSize().run();
          } else {
            editor.chain().focus().setFontSize(e.target.value).run();
          }
        }}
        title="Tamanho da Fonte"
      >
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>{parseInt(size)}</option>
        ))}
      </select>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Título 1"
        className="font-extrabold text-[11px]"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Título 2"
        className="font-bold text-[11px]"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Título 3"
        className="font-semibold text-[11px]"
      >
        H3
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Lista com marcadores"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="9" y1="6" x2="20" y2="6" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Lista numerada"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="10" y1="6" x2="20" y2="6" />
          <line x1="10" y1="12" x2="20" y2="12" />
          <line x1="10" y1="18" x2="20" y2="18" />
          <text x="2.5" y="8" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">1</text>
          <text x="2.5" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">2</text>
          <text x="2.5" y="20" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">3</text>
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        title="Lista de tarefas"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="4" height="4" rx="1" />
          <rect x="3" y="15" width="4" height="4" rx="1" />
          <line x1="11" y1="7" x2="21" y2="7" />
          <line x1="11" y1="17" x2="21" y2="17" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Alinhar à esquerda"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Centralizar"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Alinhar à direita"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
        title="Justificar"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Line Spacing */}
      <div className="relative">
        <ToolbarButton onClick={() => setSpacingMenuOpen((v) => !v)} title="Espaçamento entre linhas" className={spacingMenuOpen ? "bg-slate-900 text-white" : ""}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="16" y2="6" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="4" y1="18" x2="16" y2="18" />
            <polyline points="19 4 21 2 23 4" /><line x1="21" y1="2" x2="21" y2="10" />
            <polyline points="19 20 21 22 23 20" /><line x1="21" y1="22" x2="21" y2="14" />
          </svg>
        </ToolbarButton>
        {spacingMenuOpen && (
          <div className="absolute left-0 top-10 z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-xl p-1">
            <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Espaçamento</p>
            {LINE_HEIGHTS.map((lh) => (
              <button
                key={lh.value}
                type="button"
                onClick={() => { editor.chain().focus().setLineHeight(lh.value).run(); setSpacingMenuOpen(false); }}
                className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 text-xs font-semibold ${
                  editor.getAttributes("paragraph").lineHeight === lh.value ? "text-slate-900 bg-slate-100" : "text-slate-600"
                }`}
              >
                {lh.label}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                type="button"
                onClick={() => { editor.chain().focus().unsetLineHeight().run(); setSpacingMenuOpen(false); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-400"
              >
                Redefinir
              </button>
            </div>
          </div>
        )}
      </div>

      <ToolbarDivider />

      {/* Block */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Citação"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.044 11 14.814c0 .896-.352 1.756-.978 2.39A3.252 3.252 0 017.7 18.2a3.57 3.57 0 01-3.117-.879zM14.583 17.321C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.986.178 3.395 1.532 3.395 3.302 0 .896-.352 1.756-.978 2.39a3.252 3.252 0 01-2.322.997 3.57 3.57 0 01-3.117-.879z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Inserir Quebra de Página"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Links & Images */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt("URL do link:");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
        isActive={editor.isActive("link")}
        title="Inserir Link"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          const url = window.prompt("URL da imagem:");
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        title="Inserir Imagem"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Color */}
      <div className="flex items-center gap-1 px-1" title="Cor do Texto">
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
          value={editor.getAttributes("textStyle").color || "#0f172a"}
          className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
        />
      </div>

      <ToolbarDivider />

      {/* AI & Advanced */}
      <ToolbarButton
        onClick={() => {
          // Mock AI action
          const btn = document.activeElement as HTMLButtonElement;
          if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            setTimeout(() => {
              btn.innerHTML = originalText;
              alert("✨ IA: O texto já está excelente! (Integração em breve)");
            }, 1500);
          }
        }}
        title="Melhorar com IA"
        className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
      >
        ✨
      </ToolbarButton>
      <ToolbarButton
        onClick={copyHtml}
        title="Copiar HTML do parecer"
        className="text-slate-500 hover:text-slate-800"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().insertContent('<p></p><table style="width: 100%; border: none;"><tbody><tr><td style="border: none; text-align: center; width: 45%; vertical-align: bottom;"><div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;"><p><strong>Assinatura do Avaliador</strong></p></div></td><td style="border: none; width: 10%;"></td><td style="border: none; text-align: center; width: 45%; vertical-align: bottom;"><div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;"><p><strong>Assinatura do Candidato</strong></p></div></td></tr></tbody></table><p></p>').run()}
        title="Inserir Bloco de Assinatura"
      >
        ✍️
      </ToolbarButton>

      <ToolbarDivider />

      {/* Table */}
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: false }).run()}
        title="Inserir Tabela"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </ToolbarButton>
      
      {editor.isActive("table") && (
        <>
          <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Adicionar Coluna Antes">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14M19 5v14M5 5v14"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Adicionar Coluna Depois">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14M19 5v14M5 5v14"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Excluir Coluna">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14M19 5v14M5 5v14M3 3l18 18"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Adicionar Linha Antes">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14M5 19h14M5 5h14"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Adicionar Linha Depois">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14M5 19h14M5 5h14"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Excluir Linha">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14M5 19h14M5 5h14M3 3l18 18"/></svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.can().deleteTable()}
            title="Excluir Tabela"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l18 18" />
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            </svg>
          </ToolbarButton>
        </>
      )}

      <ToolbarDivider />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Desfazer (Ctrl+Z)"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10h10a5 5 0 015 5v2" /><polyline points="3 10 7 6" /><polyline points="3 10 7 14" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Refazer (Ctrl+Y)"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10H11a5 5 0 00-5 5v2" /><polyline points="21 10 17 6" /><polyline points="21 10 17 14" />
        </svg>
      </ToolbarButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Editor Component                                              */
/* ------------------------------------------------------------------ */

export interface RichTextEditorProps {
  content: string;
  onContentChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onSave?: () => void;
  variables?: { label: string; value: string }[];
}

export function RichTextEditor({
  content,
  onContentChange,
  placeholder = "Comece a escrever sua avaliação técnica aqui...",
  editable = true,
  className = "",
  onSave,
  variables = [],
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 underline hover:text-blue-800 transition-colors" } }),
      Image.configure({ inline: true, HTMLAttributes: { class: "rounded-lg shadow-sm max-w-full h-auto my-4" } }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Subscript,
      Superscript,
      FontFamily,
      FontSize,
      LineHeight,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: "rhesult-editor prose prose-slate max-w-none focus:outline-none px-[72px] py-8 text-sm leading-relaxed",
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
          event.preventDefault();
          onSave?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onContentChange(ed.getHTML());
    },
  });

  // Sync content from parent (e.g. loading a parecer, loading a version)
  const syncContent = useCallback(
    (html: string) => {
      if (!editor) return;
      const currentHTML = editor.getHTML();
      // Only update if content actually changed from outside
      if (currentHTML !== html) {
        editor.commands.setContent(html, { emitUpdate: false });
      }
    },
    [editor],
  );

  useEffect(() => {
    syncContent(content);
  }, [content, syncContent]);

  if (!editor) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="animate-pulse flex flex-col gap-3 w-full p-6">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {editable && <EditorMenuBar editor={editor} variables={variables} />}
      
      {editor && editable && (
        <BubbleMenu editor={editor} className="flex items-center gap-1 px-2 py-1.5 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl print:hidden">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Negrito" className="font-black">B</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Itálico" className="italic font-serif">I</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Sublinhado" className="underline">U</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Tachado" className="line-through">S</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive("subscript")} title="Subscrito">X<sub className="text-[10px]">2</sub></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive("superscript")} title="Sobrescrito">X<sup className="text-[10px]">2</sup></ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="Título 2" className="font-bold">H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} title="Título 3" className="font-semibold">H3</ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Inserir Quebra de Página">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().insertContent('<p></p><table style="width: 100%; border: none;"><tbody><tr><td style="border: none; text-align: center; width: 45%; vertical-align: bottom;"><div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;"><p><strong>Assinatura do Avaliador</strong></p></div></td><td style="border: none; width: 10%;"></td><td style="border: none; text-align: center; width: 45%; vertical-align: bottom;"><div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;"><p><strong>Assinatura do Candidato</strong></p></div></td></tr></tbody></table><p></p>').run()} title="Inserir Bloco de Assinatura">
            ✍️
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton onClick={() => {
            const url = window.prompt("URL do link:");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }} isActive={editor.isActive("link")} title="Link">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
          </ToolbarButton>
        </BubbleMenu>
      )}

      <div className="cursor-text" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>

      {editable && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400 print:hidden">
          <div className="flex items-center gap-4">
            <span>
              {editor.storage.characterCount.words()} palavras
            </span>
            <span>
              {editor.storage.characterCount.characters()} caracteres
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${editor.isFocused ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              {editor.isFocused ? 'Editando' : 'Salvo'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

/** Strip HTML tags and return plain text (for word count etc.) */
export function stripHtml(html: string): string {
  if (typeof window !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html.replace(/<[^>]*>/g, "");
}

/** Convert plain Markdown-ish text to simple HTML for backward compat */
export function markdownToHtml(md: string): string {
  if (!md || md.startsWith("<")) return md; // Already HTML
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Convert bullet lists
  html = html.replace(/(^- .+$(\n|$))+/gm, (match) => {
    const items = match
      .trim()
      .split("\n")
      .map((line) => `<li>${line.replace(/^- /, "")}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });
  // Paragraphs
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-3]|ul|ol|li|blockquote)/.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .join("");
  // Line breaks within paragraphs
  html = html.replace(/([^>])\n([^<])/g, "$1<br>$2");
  return html;
}
