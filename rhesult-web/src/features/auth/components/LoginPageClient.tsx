/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/shared/context/AppContext";
import type { User } from "@/shared/types/domain";
import { loginRequest } from "../services/authApi";
import { AUTH_CONFIG } from "@/shared/constants/app";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !senha.trim()) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const response = await loginRequest({ email: email.trim(), senha: senha.trim() });
      const token = response.token || response.access_token || response.accessToken;
      if (!token) {
        throw new Error("Resposta de login sem token. Verifique o endpoint do backend.");
      }

      // Salvar em localStorage (para compatibilidade)
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_CONFIG.TOKEN_STORAGE_KEY, token);
        if (response.user) {
          localStorage.setItem("rhesult_user", JSON.stringify(response.user));
        }
      }

      setToken(token);
      if (response.user) {
        setUser(response.user as unknown as User);
      }

      // Aguardar um pouco para o cookie httpOnly ser processado pelo navegador
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirecionar para a página solicitada ou vagas (protege contra open redirect)
      const raw = searchParams.get("next") || "/vagas";
      const nextPath = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/vagas";
      router.push(nextPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao realizar login.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden premium-card">
        <div className="relative p-10 lg:p-12 flex flex-col justify-between text-white auth-hero">
          <div className="flex items-center gap-3">
            <div className="leading-tight">
              <p className="pill text-white border-white/30 bg-white/15 px-3 py-1 text-xs inline-block">Acesso seguro</p>
              <p className="text-sm text-white/80 mt-2">Plataforma Rhesult</p>
            </div>
          </div>

          <div className="mt-10 space-y-2">
            <h1 className="text-3xl lg:text-4xl font-black leading-tight">Entre e continue suas seleções</h1>
            <p className="text-sm lg:text-base text-white/85">Dashboard, vagas, entrevistas e candidatos integrados.</p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 text-xs text-white/85">
            <div className="bg-white/10 rounded-xl border border-white/15 p-3">
              <p className="font-black">SLA de vagas</p>
              <p>Controle de pipeline e métricas em tempo real.</p>
            </div>
            <div className="bg-white/10 rounded-xl border border-white/15 p-3">
              <p className="font-black">LGPD</p>
              <p>Consentimento, anonimização e auditoria nativas.</p>
            </div>
          </div>
        </div>

        <div className="p-10 lg:p-12 bg-white">
          <div className="mb-8">
            <img loading="eager" src="/Rhesult.png" alt="Logo Rhesult" className="h-10 w-auto mb-2" />
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-gray-500 mt-2">Acesse sua conta para gerenciar vagas, entrevistas e candidatos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                autoComplete="username"
                className="w-full inputPremium"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="relative">
              <label htmlFor="senha" className="block text-sm font-medium mb-1">Senha</label>
              <input
                id="senha"
                name="senha"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="current-password"
                className="w-full inputPremium pr-16"
                required
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-xs text-accent font-semibold"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <Link href="/cadastro" className="text-[#E55210] font-semibold hover:underline">Criar conta</Link>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white text-lg font-semibold shadow-md flex items-center justify-center gap-3 bg-[#F58634] disabled:opacity-70"
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              <span>{loading ? "Entrando..." : "Entrar"}</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
