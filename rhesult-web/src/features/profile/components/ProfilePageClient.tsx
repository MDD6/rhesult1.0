'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/context/AppContext';
import { AppHeader } from '@/shared/components/AppHeader';

interface User {
  id?: string;
  nome: string;
  email: string;
  cargo: string;
  avatar_url?: string;
}

function resolveAvatarUrl(value?: string) {
  const url = String(value || '').trim();
  if (!url) return '';

  if (url.startsWith('/uploads/')) {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
    return `${backendUrl}${url}`;
  }

  return url;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar a imagem selecionada.'));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Falha ao gerar imagem para upload.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function parseApiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === 'object') {
    const data = payload as { error?: unknown; mensagem?: unknown };
    if (typeof data.mensagem === 'string' && data.mensagem.trim()) return data.mensagem;
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
  }
  return fallback;
}

export function ProfilePageClient() {
  const router = useRouter();
  const { token, logout, isLoading: isAuthLoading, user: authUser, setUser: setAuthUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User>({
    nome: '',
    email: '',
    cargo: '',
  });
  const [senha, setSenha] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'ok' | 'erro' | 'aviso' | ''>('');
  const [lastSync, setLastSync] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState('https://i.pravatar.cc/100');
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const carregarPerfil = useCallback(async () => {
    try {
      setMessage('');

      if (isAuthLoading) {
        return;
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      // Add authorization token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (response.status === 401) {
        setMessage('Sua sessao expirou. Faca login novamente.');
        setMessageType('aviso');
        logout();
        router.push('/login?next=/perfil');
        return;
      }

      if (!response.ok) throw new Error('Erro ao carregar perfil');

      const userData = await response.json() as User;
      setUser({
        id: userData.id || 'USR-001',
        nome: userData.nome || '',
        email: userData.email || '',
        cargo: userData.cargo || '',
      });

      setAuthUser({
        ...(authUser || {}),
        ...userData,
      } as never);

      if (userData.avatar_url) {
        setAvatar(resolveAvatarUrl(userData.avatar_url));
      }

      stampSync();
    } catch (e) {
      console.error('Erro ao carregar perfil:', e);
      setMessage('Não foi possível carregar seu perfil.');
      setMessageType('erro');
    }
  }, [authUser, isAuthLoading, logout, router, setAuthUser, token]);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  function stampSync() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setLastSync(
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!user.nome || !user.email || !user.cargo) {
        setMessage('Preencha nome, e-mail e função no sistema.');
        setMessageType('aviso');
        setLoading(false);
        return;
      }

      const payload: Record<string, string> = {
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
      };

      if (senha) payload.senha = senha;

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (response.status === 401) {
        setMessage('Sua sessao expirou. Faca login novamente.');
        setMessageType('aviso');
        logout();
        router.push('/login?next=/perfil');
        return;
      }

      if (!response.ok) throw new Error('Erro ao salvar perfil');

      const updatedUser = await response.json() as User;
      setUser((prev) => ({
        ...prev,
        id: updatedUser.id || prev.id,
        nome: updatedUser.nome || prev.nome,
        email: updatedUser.email || prev.email,
        cargo: updatedUser.cargo || prev.cargo,
      }));

      setAuthUser({
        ...(authUser || {}),
        ...updatedUser,
      } as never);

      if (updatedUser.avatar_url) {
        setAvatar(resolveAvatarUrl(updatedUser.avatar_url));
      }

      setMessage('Perfil atualizado com sucesso!');
      setMessageType('ok');
      setSenha('');
      stampSync();
    } catch (e) {
      console.error('Erro ao salvar:', e);
      setMessage('Erro ao salvar alterações.');
      setMessageType('erro');
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      setShowCropperModal(true);
    };
    reader.readAsDataURL(file);
  }

  async function handleCropConfirm() {
    if (!canvasRef.current || !imageSrc) return;

    try {
      const canvas = canvasRef.current;
      const image = await loadImage(imageSrc);
      const targetSize = 320;

      canvas.width = targetSize;
      canvas.height = targetSize;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Falha ao processar imagem.');
      }

      const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
      const sourceX = ((image.naturalWidth || image.width) - sourceSize) / 2;
      const sourceY = ((image.naturalHeight || image.height) - sourceSize) / 2;

      context.clearRect(0, 0, targetSize, targetSize);
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, targetSize, targetSize);

      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
      const formData = new FormData();
      formData.append('avatar_file', blob, 'avatar.jpg');

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let updatedUser: User | null = null;

      const multipartResponse = await fetch('/api/auth/me', {
        method: 'PUT',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (multipartResponse.status === 401) {
        setMessage('Sua sessao expirou. Faca login novamente.');
        setMessageType('aviso');
        logout();
        router.push('/login?next=/perfil');
        return;
      }

      if (multipartResponse.ok) {
        updatedUser = (await multipartResponse.json()) as User;
      } else {
        const multipartError = await parseApiError(multipartResponse, 'Erro ao salvar avatar por upload.');

        const fallbackHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          fallbackHeaders['Authorization'] = `Bearer ${token}`;
        }

        const fallbackAvatarDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const fallbackResponse = await fetch('/api/auth/me', {
          method: 'PUT',
          headers: fallbackHeaders,
          body: JSON.stringify({ avatar_url: fallbackAvatarDataUrl }),
          credentials: 'include',
        });

        if (fallbackResponse.status === 401) {
          setMessage('Sua sessao expirou. Faca login novamente.');
          setMessageType('aviso');
          logout();
          router.push('/login?next=/perfil');
          return;
        }

        if (!fallbackResponse.ok) {
          const fallbackError = await parseApiError(fallbackResponse, 'Erro ao salvar avatar.');
          throw new Error(`${multipartError} ${fallbackError}`.trim());
        }

        updatedUser = (await fallbackResponse.json()) as User;
      }

      if (!updatedUser) {
        throw new Error('Erro ao salvar avatar.');
      }

      setAuthUser({
        ...(authUser || {}),
        ...updatedUser,
      } as never);

      setAvatar(resolveAvatarUrl(updatedUser.avatar_url) || avatar);
      setMessage('Foto atualizada com sucesso!');
      setMessageType('ok');
      setShowCropperModal(false);
      setImageSrc('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Erro ao processar imagem';
      setMessage(message);
      setMessageType('erro');
    }
  }

  return (
    <main className="bg-slate-50 min-h-screen pb-12">
      <AppHeader />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Meu Perfil</h1>
            <p className="text-slate-500 font-medium">Gerencie suas informações pessoais e credenciais de acesso.</p>
          </div>
          
          <div className="flex gap-3">
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${user.cargo ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                <div className="text-xs">
                   <p className="font-bold text-slate-900">{user.cargo || 'Não definido'}</p>
                   <p className="text-slate-500 font-medium">Sua Função</p>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Form */}
          <section className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">Informações Pessoais</h2>
                <p className="text-sm text-slate-500">Atualize sua foto e dados de contato.</p>
             </div>
             
             <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                  <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <img
                      src={avatar}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white"></span>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Foto de Perfil</h3>
                      <p className="text-xs text-slate-500">Recomendado: JPG ou PNG, min. 200x200px.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                      Alterar Foto
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="nome" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Nome Completo
                    </label>
                    <input
                      id="nome"
                      type="text"
                      value={user.nome}
                      onChange={(e) => setUser({ ...user, nome: e.target.value })}
                      placeholder="Seu nome"
                      autoComplete="name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      E-mail Profissional
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      placeholder="email@empresa.com"
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label htmlFor="cargo" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Função
                    </label>
                    <div className="relative">
                      <select
                        id="cargo"
                        value={user.cargo}
                        onChange={(e) => setUser({ ...user, cargo: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 appearance-none cursor-pointer"
                      >
                        <option value="">Selecione sua função...</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="RH">Analista de RH</option>
                        <option value="GESTOR">Gestor de Área</option>
                        <option value="COLABORADOR">Colaborador</option>
                      </select>
                      <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="senha" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Alterar Senha <span className="text-slate-300 normal-case tracking-normal font-normal ml-1">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="senha"
                        type={showPassword ? 'text' : 'password'}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Nova senha..."
                        autoComplete="new-password"
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-white text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                      >
                        {showPassword ? (
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-1 ${
                    messageType === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                    messageType === 'erro' ? 'bg-red-50 text-red-700 border border-red-100' :
                    'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="pt-4 flex items-center gap-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                  >
                    {loading ? (
                       <>
                         <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         Salvando...
                       </>
                    ) : (
                       'Salvar Alterações'
                    )}
                  </button>
                  {lastSync && (
                    <span className="text-xs text-slate-400 font-medium ml-auto">
                      Sincronizado em: {lastSync}
                    </span>
                  )}
                </div>
              </form>
             </div>
          </section>

          {/* Sidebar Info */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Segurança & Acessos</h3>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               </div>
               <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                     <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">MFA / 2FA</span>
                     <span className="text-sm font-bold text-slate-300">Em breve</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                     <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Status</span>
                     <span className="text-sm font-bold text-emerald-600">Ativo</span>
                  </div>
               </div>
               <div className="px-5 pb-5">
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                     <p className="text-xs font-bold text-blue-800 mb-2">Recomendações</p>
                     <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-[11px] text-blue-700">
                           <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           Use senhas com letras e números
                        </li>
                        <li className="flex items-center gap-2 text-[11px] text-blue-700">
                           <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           Não compartilhe suas credenciais
                        </li>
                     </ul>
                  </div>
               </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white text-center">
               <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
               </div>
               <h3 className="text-lg font-bold mb-1">Precisa de Ajuda?</h3>
               <p className="text-sm text-slate-300 font-medium mb-4">Entre em contato com o suporte de TI.</p>
               <button className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors">
                  Abrir Chamado
               </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Cropper Modal */}
      {showCropperModal && imageSrc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 overflow-y-auto p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-600px max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Recortar imagem</h3>
              <button
                type="button"
                onClick={() => setShowCropperModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div className="mb-4 text-center bg-slate-50 rounded-xl p-4 border border-slate-100">
              <img
                src={imageSrc}
                alt="Preview"
                style={{ maxHeight: '400px', maxWidth: '100%' }}
                className="mx-auto rounded-lg"
              />
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCropperModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all"
              >
                Salvar Recorte
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
