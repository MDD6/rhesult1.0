"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AppContext";

type NavItem = {
  label: string;
  href: string;
};

function resolveAvatarUrl(value?: string) {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.startsWith("/uploads/")) {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
    return `${backendUrl}${url}`;
  }

  return url;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Corporativo", href: "/corporativo" },
  { label: "Automação", href: "/" },
  { label: "Empresas", href: "/" },
];

const recruitingNav: NavItem[] = [
  { label: "Gerenciar vagas", href: "/vagas" },
  { label: "Banco de talentos", href: "/banco-talentos" },
  { label: "Pareceres", href: "/parecer" },
  { label: "Entrevistados", href: "/entrevistados" },
  { label: "Entrevistas", href: "/agenda" },
  { label: "Onboarding", href: "/onboarding" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);

  const userName = useMemo(() => user?.nome || "Usuário", [user?.nome]);
  const userEmail = useMemo(() => user?.email || "usuario@rhesult.com", [user?.email]);
  const userRole = useMemo(() => {
    if (!user?.role) return "Usuário";
    const roleMap = { admin: "Administrador", rh: "RH", recruiter: "Recrutador", candidate: "Candidato" };
    return roleMap[user.role as keyof typeof roleMap] || user.role;
  }, [user?.role]);
  const avatarLetter = useMemo(() => user?.nome?.charAt(0).toUpperCase() || "U", [user?.nome]);
  const avatarUrl = useMemo(
    () => resolveAvatarUrl((user as { avatar_url?: string } | null)?.avatar_url),
    [user],
  );
  const hasAvatar = Boolean(avatarUrl);
  const isRecruitingActive =
    pathname.startsWith("/vagas") ||
    pathname.startsWith("/banco-talentos") ||
    pathname.startsWith("/parecer") ||
    pathname.startsWith("/entrevistados") ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/onboarding");

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
        setShowUserMenu(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header className="app-header sticky top-4 z-50 px-3 sm:px-5 flex justify-center">
      <div className="navPanel rounded-full pl-4 sm:pl-6 pr-2 py-2 flex items-center justify-between gap-4 sm:gap-8 max-w-6xl w-full max-w-[calc(100vw-1.5rem)] transition-all duration-300 hover:-translate-y-px">
        <div className="flex items-center gap-2 min-w-fit">
          <button
            type="button"
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-700 border border-slate-200"
            aria-label="Abrir menu"
            aria-controls="mobileNav"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            ≡
          </button>

          <Link href="/" className="flex items-center gap-2 mr-auto md:mr-0 group">
            <Image
              src="/Rhesult.png"
              alt="RHesult"
              width={122}
              height={32}
              className="h-8 w-auto group-hover:-rotate-6 transition-transform duration-300"
              priority
            />
          </Link>
        </div>

        <div className="hidden xl:flex items-center gap-2 min-w-0 flex-1">
          <nav className="flex items-center gap-1">
            {mainNav.slice(0, 2).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive(pathname, item.href)
                    ? "text-[var(--accent)]"
                    : "text-slate-500 hover-accent"
                }`}
              >
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="relative group">
              <button
                type="button"
                className={`nav-dropdown flex items-center gap-1 relative px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  isRecruitingActive
                    ? "text-[var(--accent)]"
                    : "text-slate-500 hover-accent"
                }`}
              >
                Recrutamento
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="group-hover:rotate-180 transition-transform duration-200">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl hidden group-hover:block z-[9999] py-2 overflow-hidden">
                {recruitingNav.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`px-4 py-2.5 flex items-center text-sm font-medium transition-colors ${
                      isActive(pathname, item.href) ? "text-[var(--brand)] bg-[var(--brand)]/10" : "text-[var(--ink)] hover:bg-[var(--brand)]/10"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {mainNav.slice(2).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive(pathname, item.href)
                    ? "text-[var(--accent)]"
                    : "text-slate-500 hover-accent"
                }`}
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 relative flex-shrink-0 min-w-0">
          <button type="button" className="hidden lg:inline-flex w-9 h-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-all" aria-label="Buscar">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <Link
            href="/vagas#nova"
            className="hidden lg:inline-flex px-6 py-2.5 rounded-full bg-ink text-white text-xs font-bold hover-bg-accent hover:shadow-lg hover:-translate-y-0.5 transition-all items-center gap-2"
          >
            <span>+</span>
            <span>Nova vaga</span>
          </Link>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="rounded-full p-2 text-slate-700 hover:bg-slate-100 transition-all relative"
              aria-label="Notificações"
              aria-haspopup="true"
              aria-expanded={showNotifications}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 z-40">
                <div className="p-4 bg-white/95 border border-slate-200 rounded-xl shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900">Notificações</h3>
                    <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-700">Marcar como lidas</button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    <div className="px-3 py-3 text-xs text-slate-500 text-center bg-slate-50 rounded-lg">Sem notificações no momento</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 hover:bg-slate-100 rounded-full px-2 py-1.5 transition-all duration-200"
              aria-label="Menu do usuário"
              aria-haspopup="true"
              aria-expanded={showUserMenu}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 border-[var(--brand)]/60 shadow-sm ${
                  hasAvatar
                    ? "bg-center bg-cover bg-no-repeat"
                    : "bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm"
                }`}
                style={hasAvatar ? { backgroundImage: `url(${avatarUrl})` } : undefined}
              >
                {!hasAvatar && avatarLetter}
              </div>
              <div className="hidden lg:flex flex-col items-start min-w-0">
                <span className="text-slate-900 text-sm font-bold leading-tight max-w-[100px] truncate">{userName}</span>
                <span className="text-slate-500 text-xs font-medium leading-tight">{userRole}</span>
              </div>
              <svg width="16" height="16" fill="none" stroke="var(--ink)" strokeWidth="2" viewBox="0 0 24 24" className="hidden sm:block text-slate-600">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 z-40">
                <div className="py-2 bg-white/95 border border-slate-200 rounded-xl shadow-xl backdrop-blur-xl">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full shadow-sm ${
                        hasAvatar
                          ? "bg-center bg-cover bg-no-repeat"
                          : "bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg"
                      }`}
                      style={hasAvatar ? { backgroundImage: `url(${avatarUrl})` } : undefined}
                    >
                      {!hasAvatar && avatarLetter}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-semibold">CONECTADO COMO</p>
                      <p className="text-sm text-slate-900 font-bold mt-1 truncate">{userName}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{userEmail}</p>
                      <p className="text-xs text-orange-600 font-semibold mt-1">{userRole}</p>
                    </div>
                  </div>
                  <Link href="/perfil" className="px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3 text-sm font-semibold transition-colors">
                    <div>
                      <p>Meu Perfil</p>
                      <p className="text-xs text-slate-500 font-normal">Edite suas informações</p>
                    </div>
                  </Link>
                  <Link href="/perfil" className="px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3 text-sm font-semibold transition-colors border-b border-slate-100">
                    <div>
                      <p>Segurança</p>
                      <p className="text-xs text-slate-500 font-normal">Senhas e permissões</p>
                    </div>
                  </Link>
                  <Link href="/" className="px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3 text-sm font-semibold transition-colors">
                    <div>
                      <p>Configurações</p>
                      <p className="text-xs text-slate-500 font-normal">Sistema e preferências</p>
                    </div>
                  </Link>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                      router.push("/login");
                    }}
                    className="w-full px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-3 text-sm font-semibold transition-colors text-left"
                  >
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute top-20 left-0 w-full px-4 md:hidden z-50">
          <nav 
            ref={mobileNavRef} 
            id="mobileNav" 
            className="w-full max-w-sm mx-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200"
          >
            {/* User Profile Section */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl shadow-sm border-2 border-white ${
                    hasAvatar
                      ? "bg-center bg-cover bg-no-repeat"
                      : "bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg"
                  }`}
                  style={hasAvatar ? { backgroundImage: `url(${avatarUrl})` } : undefined}
                >
                  {!hasAvatar && avatarLetter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                  <p className="text-xs text-slate-500 font-medium truncate">{userEmail}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-1">
              <Link 
                href="/" 
                onClick={() => setMobileOpen(false)}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  pathname === "/" 
                    ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/20" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                <span className="font-bold text-sm">Dashboard</span>
              </Link>
              
              <Link 
                href="/corporativo" 
                onClick={() => setMobileOpen(false)}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  pathname === "/corporativo" 
                    ? "bg-orange-50 text-orange-700 font-bold" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="text-sm">Corporativo</span>
              </Link>

              {/* Recrutamento Accordion */}
              <div className="pt-2">
                <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recrutamento</p>
                <div className="space-y-1">
                  {recruitingNav.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                        isActive(pathname, item.href)
                          ? "bg-orange-50 text-orange-700 font-bold"
                          : "text-slate-600 hover:bg-slate-50 font-medium"
                      }`}
                    >
                       <span className={`w-1.5 h-1.5 rounded-full ${isActive(pathname, item.href) ? "bg-orange-500" : "bg-slate-300"}`}></span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

               {/* Outros Accordion */}
              <div className="pt-4 pb-2 border-t border-slate-100 mt-2">
                <div className="grid grid-cols-2 gap-2 px-2">
                   <Link href="/" className="px-3 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-semibold text-center hover:bg-slate-100">
                     Automação
                   </Link>
                   <Link href="/" className="px-3 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-semibold text-center hover:bg-slate-100">
                     Empresas
                   </Link>
                   <Link href="/perfil" className="px-3 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-semibold text-center hover:bg-slate-100">
                     Meu Perfil
                   </Link>
                   <button onClick={() => { logout(); setMobileOpen(false); router.push("/login"); }} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold text-center hover:bg-red-100">
                     Sair
                   </button>
                </div>
              </div>

              <div className="pt-2">
                <Link 
                  href="/vagas#nova" 
                  onClick={() => setMobileOpen(false)}
                  className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  Nova Vaga
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
