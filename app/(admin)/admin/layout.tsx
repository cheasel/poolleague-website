import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  Layers, 
  CalendarDays 
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Navigation mapping object array representing your admin sections
  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/matches", label: "Matches & Scores", icon: CalendarDays }, // NEWLY CHANNED LINK
    { href: "/admin/players", label: "Player Registry", icon: Users },
    { href: "/admin/teams", label: "Club Squads", icon: ShieldAlert },
    { href: "/admin/divisions", label: "Divisions", icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900 antialiased">
      
      {/* Persistent Administrative Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 shadow-xl z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-200">
            League HQ Admin
          </span>
        </div>

        {/* Navigation Core Tickers List */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3.5 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all group"
              >
                <Icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors stroke-[2.5]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Workspace Footprint Meta Guard */}
        <div className="p-4 border-t border-slate-800 text-center">
          <Link 
            href="/standings" 
            className="block text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-950/40 border border-indigo-900/30 p-2.5 rounded-xl"
          >
            Exit to Public Site →
          </Link>
        </div>
      </aside>

      {/* Dynamic Content Frame Box */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-h-screen container mx-auto">
        {children}
      </main>

    </div>
  );
}