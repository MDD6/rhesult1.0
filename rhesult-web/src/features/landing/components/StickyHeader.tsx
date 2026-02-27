"use client";

import { useEffect, useRef, useState, memo } from "react";
import Image from "next/image";

interface StickyHeaderProps {
  onMobileMenuOpen: () => void;
}

export const StickyHeader = memo(function StickyHeader({ onMobileMenuOpen }: StickyHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const lastScrolled = useRef(false);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const isScrolled = window.scrollY > 20;
        if (isScrolled !== lastScrolled.current) {
          lastScrolled.current = isScrolled;
          setScrolled(isScrolled);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-500 ease-in-out ${
        scrolled
          ? "py-2 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100"
          : "py-6 px-5 pointer-events-none"
      }`}
    >
      <div
        className={`pointer-events-auto flex items-center justify-between gap-4 md:gap-8 transition-all duration-500 max-w-7xl w-full ${
          scrolled
            ? "px-6"
            : "rounded-full px-6 py-2.5 bg-white/80 backdrop-blur-lg border border-white/60 shadow-xl shadow-slate-200/40 hover:-translate-y-0.5 mx-auto w-auto"
        }`}
      >
        <a href="#" className="flex items-center gap-2 mr-auto md:mr-0 group">
          <Image
            src="/Rhesult.png"
            alt="RHesult"
            width={120}
            height={32}
            className={`transition-all duration-300 ${scrolled ? "h-7" : "h-8"} w-auto group-hover:-rotate-3`}
            priority
          />
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {["Quem Somos", "Serviços", "Vagas", "Liderança", "Time"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "")}`}
              className="relative px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-orange-600 transition-colors group"
            >
              {item}
              <span className="absolute bottom-1 left-1/2 w-0 h-0.5 bg-orange-600 group-hover:w-1/2 group-hover:left-1/4 transition-all duration-300" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="hidden sm:inline-flex px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
          >
            Entrar
          </a>
          <button
            type="button"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-700 border border-slate-200"
            aria-label="Menu"
            onClick={onMobileMenuOpen}
          >
            ≡
          </button>
          <a
            href="https://wa.me/558597000229?text=Ol%C3%A1%20gostaria%20de%20falar%20com%20a%20RHesult"
            target="_blank"
            rel="noopener noreferrer"
            className={`px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 group ${
              scrolled ? "shadow-none" : "shadow-lg shadow-slate-900/20"
            }`}
          >
            <span>Falar agora</span>
          </a>
        </div>
      </div>
    </header>
  );
});
