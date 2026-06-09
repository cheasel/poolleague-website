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
  History,
  ExternalLink,
  MapPin,
  Sliders,
  Sun,
  Moon,
  UserCheck,
  Loader2
} from "lucide-react";
import { signOutAction } from "@/src/app/auth-actions";
import { getCurrentUserProfileAction } from "./users/actions";


interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [profile, setProfile] = useState<{ email: string; role: string } | null>(null);

  React.useEffect(() => {
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
  }, []);

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getCurrentUserProfileAction();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load user profile in layout:", err);
      }
    }
    loadProfile();
  }, []);

  const getInitials = (email: string) => {
    if (!email) return "??";
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "superadmin": return "League Super Admin";
      case "admin": return "League Administrator";
      case "captain": return "Team Captain";
      default: return "League Viewer";
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
    setTheme(nextTheme);
  };

  // Category 1: Structural League Engine Configurations
  const structuralItems = [
    { href: "/admin/seasons", label: "Season Ledger", icon: History },
    { href: "/admin/divisions", label: "Division Tiers", icon: FolderTree },
  ];

  // Category 2: Live Match-Week Operation Panels
  const operationalItems = [
    { href: "/admin", label: "Overview Hub", icon: LayoutDashboard },
    { href: "/admin/matches", label: "Match Manager", icon: Calendar },
    { href: "/admin/matches/weeks", label: "Matchweek Manager", icon: Sliders },
    { href: "/admin/teams", label: "Squad Directory", icon: Trophy },
    { href: "/admin/players", label: "Roster Controls", icon: Users },
    { href: "/admin/venues", label: "Venue Profiles", icon: MapPin },
    { href: "/admin/users", label: "Users Manager", icon: UserCheck },
  ];

  const renderNavList = (items: typeof operationalItems, closeMobile = false) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => closeMobile && setIsMobileOpen(false)}
          className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-black text-xs uppercase tracking-wide transition-all duration-200 group min-w-0 ${
            isActive 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1" 
              : "text-slate-500 hover:bg-slate-900 hover:text-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-600 group-hover:text-slate-400"}`} />
            <span className="truncate">{item.label}</span>
          </div>
          {isActive && <ChevronRight className="w-3.5 h-3.5 text-white stroke-[3] shrink-0 ml-1" />}
        </Link>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* =========================================================================
         1. DESKTOP SIDEBAR RAIL
         ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 p-5 border-r border-slate-800/80 shrink-0 sticky top-0 h-screen justify-between z-20 overflow-x-hidden select-none">
        <div className="space-y-7 overflow-y-auto overflow-x-hidden scrollbar-none min-w-0 flex-1">
          
          {/* Competitive Arena Logo Header */}
          <div className="flex items-center gap-3 px-1.5 py-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white uppercase tracking-tighter italic leading-none truncate">Lanna Pool Club</h2>
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 mt-1 block truncate">Arena Matrix v1.6</span>
            </div>
          </div>

          {/* Group A: League Infrastructure Settings */}
          <nav className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-2.5 px-3.5 truncate">
              Infrastructure
            </span>
            {renderNavList(structuralItems)}
          </nav>

          {/* Group B: Active Operations Settings */}
          <nav className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-2.5 px-3.5 truncate">
              Core Operations
            </span>
            {renderNavList(operationalItems)}
          </nav>
        </div>

        {/* Footer Configuration Section */}
        <div className="space-y-3 pt-4 border-t border-slate-800/60 mt-4 shrink-0 min-w-0">
          {/* Theme Toggle Row */}
          <div className="flex items-center justify-between w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-inner">
            <span>Theme Mode</span>
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-slate-900 border border-slate-850 transition-colors duration-200 outline-none p-0.5"
              aria-label="Toggle Theme"
            >
              {/* Sliding pill indicator */}
              <span
                className={`absolute h-5.5 w-5.5 rounded-full bg-slate-800 shadow-md transition-all duration-200 ${
                  theme === 'light' ? 'left-0.5' : 'left-6'
                }`}
              />
              <span className="relative z-10 flex w-full items-center justify-between px-1">
                <Sun className={`w-3.5 h-3.5 transition-colors duration-200 ${theme === 'light' ? 'text-slate-100 font-bold' : 'text-slate-600'}`} />
                <Moon className={`w-3.5 h-3.5 transition-colors duration-200 ${theme === 'dark' ? 'text-white' : 'text-slate-500'}`} />
              </span>
            </button>
          </div>

          {/* Public Site Return Link */}
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 w-full p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all shadow-inner"
          >
            <span>View Public Site</span>
            <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
          </Link>

          {/* User Identity Context Footer */}
          <div className="flex items-center justify-between min-w-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-xs font-black text-white uppercase shadow-md shrink-0">
                {profile ? getInitials(profile.email) : <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white leading-none truncate" title={profile?.email || "Loading..."}>
                  {profile ? profile.email : "Loading user..."}
                </div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 block truncate">
                  {profile ? getRoleLabel(profile.role) : "Please wait..."}
                </span>
              </div>
            </div>
            <button 
              title="Sign Out Session"
              onClick={async () => {
                await signOutAction();
              }}
              className="w-9 h-9 rounded-xl hover:bg-red-950/30 hover:text-red-400 flex items-center justify-center transition-colors text-slate-500 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
         2. MOBILE FLOATING ACTION HEADER BAR
         ========================================================================= */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white z-50 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black uppercase tracking-tighter italic">PoolLeague Central</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all outline-none"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* =========================================================================
         3. MOBILE NAVIGATION DRAWER OVERLAY
         ========================================================================= */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 cursor-pointer"
          onClick={() => setIsMobileOpen(false)}
        >
          <div 
            className="w-72 bg-slate-900 h-[calc(100vh-4rem)] mt-16 p-5 flex flex-col justify-between border-r border-slate-800 animate-in slide-in-from-left duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6 overflow-y-auto min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tighter italic">PoolLeague</h2>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-400">Mobile Hub</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-600 block mb-2 px-3.5">Infrastructure</span>
                {renderNavList(structuralItems, true)}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-600 block mb-2 px-3.5">Core Operations</span>
                {renderNavList(operationalItems, true)}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 mt-4">
              <div className="flex items-center justify-between w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-inner">
                <span>Theme Mode</span>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-slate-900 border border-slate-850 transition-colors duration-200 outline-none p-0.5"
                  aria-label="Toggle Theme"
                >
                  {/* Sliding pill indicator */}
                  <span
                    className={`absolute h-5.5 w-5.5 rounded-full bg-slate-800 shadow-md transition-all duration-200 ${
                      theme === 'light' ? 'left-0.5' : 'left-6'
                    }`}
                  />
                  <span className="relative z-10 flex w-full items-center justify-between px-1">
                    <Sun className={`w-3.5 h-3.5 transition-colors duration-200 ${theme === 'light' ? 'text-slate-100 font-bold' : 'text-slate-600'}`} />
                    <Moon className={`w-3.5 h-3.5 transition-colors duration-200 ${theme === 'dark' ? 'text-white' : 'text-slate-500'}`} />
                  </span>
                </button>
              </div>

              <Link 
                href="/"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                <span>View Public Site</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </Link>
              
              <button 
                onClick={async () => {
                  await signOutAction();
                }}
                className="flex items-center justify-between text-slate-500 hover:text-red-400 transition-colors w-full text-left"
              >
                <span className="text-[10px] font-black uppercase tracking-wider">Director Operations</span>
                <LogOut className="w-4 h-4 text-slate-600 group-hover:text-red-400" />
              </button>
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