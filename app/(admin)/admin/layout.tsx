import Link from "next/link";
import { 
  Trophy, 
  Layers, 
  Users, 
  UserSquare2, 
  LayoutDashboard,
  ShieldCheck
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Navigation matrix including the new Player Management portal route
  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Seasons", href: "/admin/seasons", icon: Trophy },
    { label: "Divisions", href: "/admin/divisions", icon: Layers },
    { label: "Teams", href: "/admin/teams", icon: Users },
    { label: "Players", href: "/admin/players", icon: UserSquare2 }, // <-- NEW PORTAL
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Desktop Panel */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6 border-r border-slate-800 shrink-0 hidden md:flex">
        <div className="space-y-8">
          {/* Admin Header Core */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">League Office</span>
              <span className="text-sm font-black uppercase tracking-tight italic">Admin Panel</span>
            </div>
          </div>

          {/* Navigation Links Loop */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all group"
                >
                  <Icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Branding Segment */}
        <div className="px-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          v1.4.0 • 2026 Engine
        </div>
      </aside>

      {/* Main Panel Body Viewport */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}