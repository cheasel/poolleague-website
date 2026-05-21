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
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 translate-x-1" 
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-600"}`} />
            <span>{item.label}</span>
          </div>
          {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 stroke-[3]" />}
        </Link>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* =========================================================================
         1. DESKTOP SIDEBAR RAIL (Light Minimal Premium Aesthetic)
         ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-72 bg-white p-6 border-r border-slate-200 shrink-0 sticky top-0 h-screen justify-between z-20 shadow-sm">
        <div className="space-y-8 overflow-y-auto scrollbar-none">
          
          {/* Theme Aligned Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter italic leading-none">PoolLeague</h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mt-0.5 block">Matrix Engine v1.6</span>
            </div>
          </div>

          {/* Group A: League Infrastructure Settings */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 px-4">
              Infrastructure
            </span>
            {renderNavList(structuralItems)}
          </nav>

          {/* Group B: Active Operations Settings */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 px-4">
              Core Operations
            </span>
            {renderNavList(operationalItems)}
          </nav>
        </div>

        {/* User Identity Context Footer */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white uppercase shadow-sm">
              OP
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 leading-none">Operations Principal</div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">League Director</span>
            </div>
          </div>
          <button 
            title="Sign Out Session"
            className="w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors text-slate-400 border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* =========================================================================
         2. MOBILE FLOATING ACTION HEADER BAR
         ========================================================================= */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between text-slate-900 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black uppercase tracking-tighter italic">PoolLeague Central</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all outline-none"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* =========================================================================
         3. MOBILE NAVIGATION DRAWER OVERLAY
         ========================================================================= */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40">
          <div className="w-72 bg-white h-full p-6 flex flex-col justify-between border-r border-slate-200 animate-in slide-in-from-left duration-200">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">PoolLeague</h2>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600">Mobile Hub</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-4">Infrastructure</span>
                {renderNavList(structuralItems, true)}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-4">Core Operations</span>
                {renderNavList(operationalItems, true)}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-slate-500 mt-4">
              <span className="text-[10px] font-black uppercase tracking-wider">Director Operations</span>
              <LogOut className="w-4 h-4 text-slate-400" />
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