"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Trophy, 
  Users, 
  Calendar, 
  LayoutDashboard, 
  Menu, 
  X, 
  Sparkles, 
  LogOut,
  ChevronRight,
  FolderTree,
  History
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Category 1: Structural League Engine Configurations
  const structuralItems = [
    { href: "/admin/seasons", label: "Season Ledger", icon: History },
    { href: "/admin/divisions", label: "Division Tiers", icon: FolderTree },
  ];

  // Category 2: Live Match-Week Operation Panels
  const operationalItems = [
    { href: "/admin/dashboard", label: "Overview Hub", icon: LayoutDashboard },
    { href: "/admin/matches", label: "Scorecard Dispatch", icon: Calendar },
    { href: "/admin/teams", label: "Squad Directory", icon: Trophy },
    { href: "/admin/players", label: "Roster Controls", icon: Users },
  ];

  const renderNavList = (items: typeof operationalItems, closeMobile = false) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin/dashboard");

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => closeMobile && setIsMobileOpen(false)}
          className={`flex items-center justify-between px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 group ${
            isActive 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1" 
              : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}`} />
            <span>{item.label}</span>
          </div>
          {isActive && <ChevronRight className="w-3.5 h-3.5 text-white stroke-[3] animate-pulse" />}
        </Link>
      );
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex text-zinc-200 antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* =========================================================================
         1. DESKTOP SIDEBAR RAIL (Premium Dark Arena Aesthetic)
         ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-72 bg-zinc-900 p-6 border-r border-zinc-800/80 shrink-0 sticky top-0 h-screen justify-between z-20">
        <div className="space-y-8 overflow-y-auto scrollbar-none">
          
          {/* Competitive Arena Logo Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tighter italic leading-none">PoolLeague</h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mt-1 block">Arena Matrix v1.6</span>
            </div>
          </div>

          {/* Group A: League Infrastructure Settings */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 block mb-3 px-4">
              Infrastructure
            </span>
            {renderNavList(structuralItems)}
          </nav>

          {/* Group B: Active Operations Settings */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 block mb-3 px-4">
              Core Operations
            </span>
            {renderNavList(operationalItems)}
          </nav>
        </div>

        {/* User Identity Context Footer */}
        <div className="border-t border-zinc-800/60 pt-4 flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-xs font-black text-white uppercase shadow-md">
              OP
            </div>
            <div>
              <div className="text-xs font-black text-white leading-none">Operations Principal</div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1 block">League Director</span>
            </div>
          </div>
          <button 
            title="Sign Out Session"
            className="w-9 h-9 rounded-xl hover:bg-red-950/30 hover:text-red-400 flex items-center justify-center transition-colors text-zinc-500 border border-transparent hover:border-red-900/30"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* =========================================================================
         2. MOBILE FLOATING ACTION HEADER BAR
         ========================================================================= */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between text-white z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black uppercase tracking-tighter italic">PoolLeague Central</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all outline-none"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* =========================================================================
         3. MOBILE NAVIGATION DRAWER OVERLAY
         ========================================================================= */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40">
          <div className="w-72 bg-zinc-900 h-full p-6 flex flex-col justify-between border-r border-zinc-800 animate-in slide-in-from-left duration-200">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tighter italic">PoolLeague</h2>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Mobile Hub</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2 px-4">Infrastructure</span>
                {renderNavList(structuralItems, true)}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2 px-4">Core Operations</span>
                {renderNavList(operationalItems, true)}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex items-center justify-between text-zinc-500 mt-4">
              <span className="text-[10px] font-black uppercase tracking-wider">Director Operations</span>
              <LogOut className="w-4 h-4 text-zinc-600" />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         4. CORE MAIN CONTENT DISPLAY FRAME AREA
         ========================================================================= */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0 overflow-y-auto max-h-screen">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}