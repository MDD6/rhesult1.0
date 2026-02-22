"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { submitApplicationRequest } from "@/features/landing/services/jobsApi";
import type { JobApplication } from "@/features/landing/types";

type FormState = {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  senioridade: string;
  cargo_desejado: string;
  linkedin: string;
  pretensao: string;
  consentimento: boolean;
};

const SENIORIDADES = ["Júnior", "Pleno", "Sênior", "Especialista"];

const initialForm: FormState = {
  nome: "",
  telefone: "",
  email: "",
  cidade: "",
  senioridade: "",
  cargo_desejado: "",
  linkedin: "",
  pretensao: "",
  consentimento: false,
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatPhone(value: string) {
  const digits = onlyDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function TalentBankApplicationMobilePageClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailInvalid = useMemo(() => form.email.trim().length > 0 && !isValidEmail(form.email), [form.email]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nome.trim()) {
      setError("Informe seu nome.");
      return;
    }

    if (!form.email.trim() || !isValidEmail(form.email)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (!form.telefone.trim()) {
      setError("Informe seu telefone.");
      return;
    }

    if (!form.senioridade.trim()) {
      setError("Selecione a senioridade.");
      return;
    }

    if (!form.consentimento) {
      setError("É necessário aceitar o consentimento LGPD.");
      return;
    }

    const payload: JobApplication = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      cidade: form.cidade.trim() || undefined,
      senioridade: form.senioridade.trim(),
      cargo_desejado: form.cargo_desejado.trim() || undefined,
      linkedin: form.linkedin.trim() || undefined,
      pretensao: form.pretensao.trim() || undefined,
      consentimento: form.consentimento,
      historico: "Cadastro via página mobile de Banco de Talentos",
    };

    try {
      setSubmitting(true);
      await submitApplicationRequest(payload, curriculumFile);
      setSuccess("Aplicação enviada com sucesso! Entraremos em contato em breve.");
      setForm(initialForm);
      setCurriculumFile(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar agora.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 sm:py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">RHesult</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Aplicação - Banco de Talentos</h1>
            <p className="mt-2 text-sm text-slate-600">
              Formulário otimizado para celular. Preencha seus dados e envie seu currículo.
            </p>
          </div>

          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              required
              placeholder="Nome completo"
              className="w-full inputPremium"
              value={form.nome}
              onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
            />

            <input
              required
              placeholder="Telefone"
              inputMode="tel"
              className="w-full inputPremium"
              value={form.telefone}
              onChange={(event) => {
                const formatted = formatPhone(event.target.value);
                setForm((prev) => ({ ...prev, telefone: formatted }));
              }}
            />

            <div>
              <input
                required
                type="email"
                placeholder="E-mail"
                className={`w-full inputPremium ${emailInvalid ? "border-red-300 focus:border-red-400" : ""}`}
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              {emailInvalid && <p className="mt-1 text-xs text-red-600">E-mail inválido.</p>}
            </div>

            <input
              placeholder="Cidade"
              className="w-full inputPremium"
              value={form.cidade}
              onChange={(event) => setForm((prev) => ({ ...prev, cidade: event.target.value }))}
            />

            <select
              required
              className="w-full inputPremium"
              value={form.senioridade}
              onChange={(event) => setForm((prev) => ({ ...prev, senioridade: event.target.value }))}
            >
              <option value="">Selecione a senioridade</option>
              {SENIORIDADES.map((senioridade) => (
                <option key={senioridade} value={senioridade}>
                  {senioridade}
                </option>
              ))}
            </select>

            <input
              placeholder="Cargo desejado"
              className="w-full inputPremium"
              value={form.cargo_desejado}
              onChange={(event) => setForm((prev) => ({ ...prev, cargo_desejado: event.target.value }))}
            />

            <input
              placeholder="LinkedIn (opcional)"
              className="w-full inputPremium"
              value={form.linkedin}
              onChange={(event) => setForm((prev) => ({ ...prev, linkedin: event.target.value }))}
            />

            <input
              placeholder="Pretensão salarial (opcional)"
              className="w-full inputPremium"
              value={form.pretensao}
              onChange={(event) => setForm((prev) => ({ ...prev, pretensao: event.target.value }))}
            />

            <div>
              <label htmlFor="curriculum" className="mb-1 block text-xs font-medium text-slate-600">
                Currículo (PDF, DOC ou DOCX)
              </label>
              <input
                id="curriculum"
                type="file"
                accept=".pdf,.doc,.docx"
                className="w-full inputPremium"
                onChange={(event) => setCurriculumFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.consentimento}
                onChange={(event) => setForm((prev) => ({ ...prev, consentimento: event.target.checked }))}
                className="mt-0.5"
              />
              <span>Concordo com o armazenamento dos dados para participação no banco de talentos.</span>
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

            <button type="submit" disabled={submitting} className="w-full btnPrimary py-3 text-sm font-semibold disabled:opacity-70">
              {submitting ? "Enviando..." : "Enviar aplicação"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/" className="text-sm font-medium text-[var(--accent)] hover:underline">
              Voltar para início
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
