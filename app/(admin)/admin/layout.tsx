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
  ShieldCheck, 
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

  // Reusable component helper for clean code footprint
  const renderNavList = (items: typeof operationalItems, closeMobile = false) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.href;

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => closeMobile && setIsMobileOpen(false)}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 group ${
            isActive 
              ? "bg-slate-900 text-white border border-slate-800/60 shadow-inner" 
              : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
            <span>{item.label}</span>
          </div>
          {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-500 stroke-[3]" />}
        </Link>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 antialiased">
      
      {/* =========================================================================
         1. DESKTOP SIDEBAR RAIL (Persistent Widescreen View)
         ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-950 p-6 border-r border-slate-900 shrink-0 sticky top-0 h-screen justify-between z-20">
        <div className="space-y-7 overflow-y-auto scrollbar-none">
          
          {/* Main Logo Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-950/40">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">PoolLeague</h2>
              <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Admin Matrix v1.6</span>
            </div>
          </div>

          {/* Group A: League Infrastructure Settings */}
          <nav className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 block mb-2.5 px-3">
              Infrastructure
            </span>
            {renderNavList(structuralItems)}
          </nav>

          {/* Group B: Active Operations Settings */}
          <nav className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 block mb-2.5 px-3">
              Core Operations
            </span>
            {renderNavList(operationalItems)}
          </nav>
        </div>

        {/* User Identity Context Footer */}
        <div className="border-t border-slate-900 pt-4 flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-white uppercase shadow-inner">
              OP
            </div>
            <div>
              <div className="text-xs font-black text-white leading-none">Operations Principal</div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">League Director</span>
            </div>
          </div>
          <button 
            title="Sign Out Session"
            className="w-8 h-8 rounded-lg hover:bg-red-950/40 hover:text-red-400 flex items-center justify-center transition-colors text-slate-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* =========================================================================
         2. MOBILE FLOATING ACTION HEADER BAR
         ========================================================================= */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 border-b border-slate-900 px-4 flex items-center justify-between text-white z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider italic">PoolLeague Central</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all outline-none"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* =========================================================================
         3. MOBILE NAVIGATION DRAWER OVERLAY
         ========================================================================= */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40">
          <div className="w-72 bg-slate-950 h-full p-6 flex flex-col justify-between border-r border-slate-900 animate-in slide-in-from-left duration-200">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">PoolLeague</h2>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Mobile Hub</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 block mb-2 px-3">Infrastructure</span>
                {renderNavList(structuralItems, true)}
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 block mb-2 px-3">Core Operations</span>
                {renderNavList(operationalItems, true)}
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 flex items-center justify-between text-slate-400 mt-4">
              <span className="text-[10px] font-black uppercase tracking-wider">Director Operations</span>
              <LogOut className="w-4 h-4 text-slate-600" />
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