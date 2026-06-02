'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Users, Calendar, BarChart3, Menu, X, ChevronDown, Shield, CalendarDays } from 'lucide-react';

export default function PublicNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleDocumentClick = () => {
      setIsDropdownOpen(false);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isDropdownOpen]);

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setIsOpen(false)}>
            <div className="bg-slate-900 p-1.5 rounded-lg group-hover:bg-indigo-600 border border-slate-800 transition-colors">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white uppercase tracking-tighter text-lg">
              Lanna Pool <span className="text-indigo-400">Club</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {/* Match Hub */}
            <Link
              href="/match-hub"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                pathname.startsWith('/match-hub')
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <CalendarDays className={`w-4 h-4 ${pathname.startsWith('/match-hub') ? 'text-indigo-400' : 'text-slate-500'}`} />
              Match Hub
            </Link>

            {/* Standings */}
            <Link
              href="/standings"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                pathname.startsWith('/standings')
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Trophy className={`w-4 h-4 ${pathname.startsWith('/standings') ? 'text-indigo-400' : 'text-slate-500'}`} />
              Standings
            </Link>

            {/* Stats Dropdown */}
            <div className="relative">
              <button
                onClick={handleDropdownToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all outline-none ${
                  pathname.startsWith('/players') || pathname.startsWith('/teams')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <BarChart3 className={`w-4 h-4 ${pathname.startsWith('/players') || pathname.startsWith('/teams') ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>Stats</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 mt-1 w-48 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Link
                    href="/players"
                    onClick={() => setIsDropdownOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      pathname.startsWith('/players')
                        ? 'bg-slate-900 text-indigo-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Player Stats
                  </Link>
                  <Link
                    href="/teams"
                    onClick={() => setIsDropdownOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      pathname.startsWith('/teams') && !pathname.match(/\/teams\/\d+/)
                        ? 'bg-slate-900 text-indigo-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Team Stats
                  </Link>
                </div>
              )}
            </div>

            {/* Matches */}
            <Link
              href="/matches"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                pathname.startsWith('/matches')
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Calendar className={`w-4 h-4 ${pathname.startsWith('/matches') ? 'text-indigo-400' : 'text-slate-500'}`} />
              Matches
            </Link>
          </div>

          {/* Desktop Admin Quick Link & Facebook */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href="https://www.facebook.com/LannaPoolClub"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black text-slate-400 hover:text-indigo-400 uppercase tracking-widest transition-colors"
            >
              Facebook
            </a>
            <Link 
              href="/admin" 
              className="text-[10px] font-black text-slate-400 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-white hover:text-slate-950 hover:border-white transition-all uppercase tracking-widest animate-in duration-200"
            >
              Admin
            </Link>
          </div>

          {/* Responsive Mobile Trigger Button Container */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none transition-colors border border-transparent hover:border-slate-800"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-5 w-5" /> : <Menu className="block h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown Mobile Route Navigation Panel Drawer */}
      <div 
        className={`md:hidden bg-slate-950 border-b border-slate-900 transition-all duration-200 ease-in-out ${
          isOpen ? 'block opacity-100' : 'hidden opacity-0'
        }`} 
        id="mobile-menu"
      >
        <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
          {/* Match Hub */}
          <Link
            href="/match-hub"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${
              pathname.startsWith('/match-hub')
                ? 'bg-slate-900 text-white border-l-2 border-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <CalendarDays className={`w-4 h-4 ${pathname.startsWith('/match-hub') ? 'text-indigo-400' : 'text-slate-500'}`} />
            Match Hub
          </Link>

          {/* Standings */}
          <Link
            href="/standings"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${
              pathname.startsWith('/standings')
                ? 'bg-slate-900 text-white border-l-2 border-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <Trophy className={`w-4 h-4 ${pathname.startsWith('/standings') ? 'text-indigo-400' : 'text-slate-500'}`} />
            Standings
          </Link>

          {/* Player Stats */}
          <Link
            href="/players"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${
              pathname.startsWith('/players')
                ? 'bg-slate-900 text-white border-l-2 border-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <Users className={`w-4 h-4 ${pathname.startsWith('/players') ? 'text-indigo-400' : 'text-slate-500'}`} />
            Player Stats
          </Link>

          {/* Team Stats */}
          <Link
            href="/teams"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${
              pathname.startsWith('/teams') && !pathname.match(/\/teams\/\d+/)
                ? 'bg-slate-900 text-white border-l-2 border-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <Shield className={`w-4 h-4 ${pathname.startsWith('/teams') && !pathname.match(/\/teams\/\d+/) ? 'text-indigo-400' : 'text-slate-500'}`} />
            Team Stats
          </Link>

          {/* Matches */}
          <Link
            href="/matches"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${
              pathname.startsWith('/matches')
                ? 'bg-slate-900 text-white border-l-2 border-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <Calendar className={`w-4 h-4 ${pathname.startsWith('/matches') ? 'text-indigo-400' : 'text-slate-500'}`} />
            Matches
          </Link>
          
          <div className="pt-4 mt-2 border-t border-slate-900 px-4 space-y-3">
            <a 
              href="https://www.facebook.com/LannaPoolClub"
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-center text-center text-xs font-black text-indigo-400 border border-indigo-950 px-3 py-3 rounded-xl hover:bg-slate-900 transition-all uppercase tracking-widest"
            >
              Facebook Page
            </a>
            <Link 
              href="/admin" 
              onClick={() => setIsOpen(false)}
              className="flex justify-center text-center text-xs font-black text-slate-400 border border-slate-800 px-3 py-3 rounded-xl hover:bg-white hover:text-slate-950 hover:border-white transition-all uppercase tracking-widest"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}