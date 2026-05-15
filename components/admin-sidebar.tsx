'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Trophy, 
  Layers, 
  Users, 
  Calendar, 
  Settings,
  ChevronRight
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Seasons', href: '/admin/seasons', icon: Trophy },
    { name: 'Divisions', href: '/admin/divisions', icon: Layers },
    { name: 'Teams', href: '/admin/teams', icon: Users },
    { name: 'Matches', href: '/admin/matches', icon: Calendar },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col fixed h-full border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-8 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-white uppercase tracking-tighter text-lg">
          ADMIN<span className="text-indigo-500">PANEL</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 font-bold text-xs uppercase tracking-widest">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                {item.name}
              </div>
              {isActive && <ChevronRight className="w-3 h-3" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer link back to public site */}
      <div className="p-4 border-t border-slate-800">
        <Link 
          href="/standings" 
          className="flex items-center justify-center gap-2 w-full p-3 bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
        >
          View Public Site
        </Link>
      </div>
    </aside>
  );
}